import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const RowSchema = z.object({
  description: z.string().trim().min(1).max(250),
  amount: z.coerce.number().positive().max(9999999999999.99),
  dueDate: z.string().trim().min(8).max(10),
  paidAt: z.string().trim().optional().nullable(),
  status: z.enum(["previsto", "em_aberto", "pago", "recebido", "vencido", "cancelado"]).default("em_aberto"),
  categoryName: z.string().trim().max(120).optional().nullable(),
  supplierName: z.string().trim().max(180).optional().nullable(),
  supplierCnpj: z.string().trim().max(30).optional().nullable(),
  competence: z.string().trim().max(30).optional().nullable(),
  costCenter: z.string().trim().max(120).optional().nullable(),
  contractNumber: z.string().trim().max(80).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  sourceLine: z.coerce.number().int().positive().optional(),
});

const ImportSchema = z.object({
  rows: z.array(RowSchema).min(1).max(5000),
  fileName: z.string().trim().max(250).optional(),
  mode: z.enum(["preview", "import"]).default("preview"),
});

const RollbackSchema = z.object({
  action: z.literal("rollback"),
  batchId: z.string().trim().min(8).max(100),
});

type Row = z.infer<typeof RowSchema>;
type LinhaAnalisada = {
  row: Row;
  state: "valid" | "duplicate_file" | "duplicate_database" | "error";
  error?: string;
  dueDate?: Date;
  paidAt?: Date | null;
  key?: string;
};

function jsonSeguro(valor: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}

function normalizarTexto(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizarCnpj(valor?: string | null) {
  const numeros = String(valor || "").replace(/\D/g, "");
  return numeros || null;
}

function analisarData(valor?: string | null, obrigatoria = false): Date | null {
  const texto = String(valor || "").trim();
  if (!texto) {
    if (obrigatoria) throw new Error("Data obrigatória não informada");
    return null;
  }

  const partes = texto.includes("/") ? texto.split("/").reverse() : texto.split("-");
  if (partes.length !== 3) throw new Error(`Data inválida: ${texto}`);
  const [ano, mes, dia] = partes.map(Number);
  if (!ano || !mes || !dia) throw new Error(`Data inválida: ${texto}`);
  const data = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    throw new Error(`Data inexistente: ${texto}`);
  }
  return data;
}

function chaveDuplicidade(description: string, amount: number, dueDate: Date) {
  return `${normalizarTexto(description)}|${amount.toFixed(2)}|${dueDate.toISOString().slice(0, 10)}`;
}

function gerarBatchId() {
  const data = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `IMP-${data}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

async function analisarLinhas(rows: Row[]): Promise<LinhaAnalisada[]> {
  const analisadas: LinhaAnalisada[] = [];
  const vistas = new Set<string>();

  for (const row of rows) {
    try {
      const dueDate = analisarData(row.dueDate, true)!;
      const paidAt = analisarData(row.paidAt, false);
      if (paidAt && row.status !== "pago") row.status = "pago";
      const key = chaveDuplicidade(row.description, row.amount, dueDate);
      if (vistas.has(key)) {
        analisadas.push({ row, state: "duplicate_file", dueDate, paidAt, key, error: "Linha repetida no próprio arquivo" });
      } else {
        vistas.add(key);
        analisadas.push({ row, state: "valid", dueDate, paidAt, key });
      }
    } catch (error) {
      analisadas.push({ row, state: "error", error: error instanceof Error ? error.message : "Linha inválida" });
    }
  }

  const validas = analisadas.filter((item) => item.state === "valid" && item.dueDate);
  if (!validas.length) return analisadas;
  const datas = validas.map((item) => item.dueDate!.getTime());
  const inicio = new Date(Math.min(...datas));
  const fim = new Date(Math.max(...datas));
  fim.setHours(23, 59, 59, 999);

  const existentes = await prisma.expense.findMany({
    where: { deletedAt: null, dueDate: { gte: inicio, lte: fim } },
    select: { description: true, amount: true, dueDate: true },
  });
  const chavesExistentes = new Set(existentes.map((item) => chaveDuplicidade(item.description, Number(item.amount), item.dueDate)));

  for (const item of validas) {
    if (item.key && chavesExistentes.has(item.key)) {
      item.state = "duplicate_database";
      item.error = "Despesa já cadastrada com mesma descrição, valor e vencimento";
    }
  }
  return analisadas;
}

function resumo(analisadas: LinhaAnalisada[]) {
  return {
    total: analisadas.length,
    valid: analisadas.filter((item) => item.state === "valid").length,
    duplicatesFile: analisadas.filter((item) => item.state === "duplicate_file").length,
    duplicatesDatabase: analisadas.filter((item) => item.state === "duplicate_database").length,
    errors: analisadas.filter((item) => item.state === "error").length,
    amountValid: analisadas.filter((item) => item.state === "valid").reduce((soma, item) => soma + item.row.amount, 0),
  };
}

async function rollback(batchId: string, userId: string) {
  const importacao = await prisma.auditLog.findFirst({
    where: { module: "financeiro-importacao", entityType: "ExpenseImportBatch", entityId: batchId, action: "IMPORT" },
    orderBy: { createdAt: "desc" },
  });
  if (!importacao) return NextResponse.json({ error: "Lote de importação não encontrado" }, { status: 404 });

  const jaRevertido = await prisma.auditLog.findFirst({
    where: { module: "financeiro-importacao", entityType: "ExpenseImportBatch", entityId: batchId, action: "ROLLBACK" },
  });
  if (jaRevertido) return NextResponse.json({ error: "Este lote já foi revertido" }, { status: 409 });

  const dados = importacao.newValues && typeof importacao.newValues === "object" && !Array.isArray(importacao.newValues)
    ? importacao.newValues as Record<string, unknown>
    : {};
  const ids = Array.isArray(dados.expenseIds) ? dados.expenseIds.filter((id): id is string => typeof id === "string") : [];
  if (!ids.length) return NextResponse.json({ error: "O lote não possui lançamentos reversíveis" }, { status: 409 });

  const agora = new Date();
  const resultado = await prisma.$transaction(async (tx) => {
    const alterados = await tx.expense.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt: agora } });
    await tx.auditLog.create({
      data: {
        userId,
        action: "ROLLBACK",
        module: "financeiro-importacao",
        entityType: "ExpenseImportBatch",
        entityId: batchId,
        oldValues: jsonSeguro({ expenseIds: ids }),
        newValues: jsonSeguro({ reversedAt: agora.toISOString(), reversedCount: alterados.count }),
      },
    });
    return alterados.count;
  });

  return NextResponse.json({ ok: true, batchId, reversed: resultado });
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "FINANCEIRO");
  if (erro || !user) return erro;

  try {
    const body = await req.json();
    if (body?.action === "rollback") {
      const parsedRollback = RollbackSchema.safeParse(body);
      if (!parsedRollback.success) return NextResponse.json({ error: "Identificador de lote inválido" }, { status: 400 });
      return rollback(parsedRollback.data.batchId, user.id);
    }

    const parsed = ImportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Planilha inválida", details: parsed.error.flatten() }, { status: 400 });
    }

    const { rows, fileName, mode } = parsed.data;
    const analisadas = await analisarLinhas(rows);
    const summary = resumo(analisadas);
    const preview = analisadas.map((item) => ({
      sourceLine: item.row.sourceLine,
      description: item.row.description,
      amount: item.row.amount,
      dueDate: item.dueDate?.toISOString().slice(0, 10) || item.row.dueDate,
      categoryName: item.row.categoryName || null,
      supplierName: item.row.supplierName || null,
      contractNumber: item.row.contractNumber || null,
      state: item.state,
      error: item.error || null,
    }));

    if (mode === "preview") {
      return NextResponse.json({ ok: true, mode, summary, preview });
    }
    if (!summary.valid) return NextResponse.json({ error: "Nenhuma linha válida para importar", summary, preview }, { status: 422 });

    const batchId = gerarBatchId();
    const errors: Array<{ line?: number; description: string; error: string }> = [];
    const created: string[] = [];
    const categorias = new Map<string, string>();
    const fornecedores = new Map<string, string>();
    const contratos = new Map<string, string | null>();

    for (const item of analisadas.filter((linha) => linha.state === "valid" && linha.dueDate)) {
      const row = item.row;
      try {
        let categoryId: string | null = null;
        if (row.categoryName) {
          const chave = normalizarTexto(row.categoryName);
          categoryId = categorias.get(chave) || null;
          if (!categoryId) {
            const existente = await prisma.expenseCategory.findFirst({ where: { name: { equals: row.categoryName, mode: "insensitive" } } });
            const categoria = existente || await prisma.expenseCategory.create({ data: { name: row.categoryName, type: "operacional", active: true } });
            if (!categoria.active) await prisma.expenseCategory.update({ where: { id: categoria.id }, data: { active: true } });
            categoryId = categoria.id;
            categorias.set(chave, categoryId);
          }
        }

        let supplierId: string | null = null;
        if (row.supplierName) {
          const cnpj = normalizarCnpj(row.supplierCnpj);
          const chave = cnpj || normalizarTexto(row.supplierName);
          supplierId = fornecedores.get(chave) || null;
          if (!supplierId) {
            const fornecedor = cnpj
              ? await prisma.supplier.upsert({ where: { cnpj }, update: { name: row.supplierName, active: true }, create: { name: row.supplierName, cnpj, active: true } })
              : await prisma.supplier.findFirst({ where: { deletedAt: null, name: { equals: row.supplierName, mode: "insensitive" } } })
                || await prisma.supplier.create({ data: { name: row.supplierName, active: true } });
            supplierId = fornecedor.id;
            fornecedores.set(chave, supplierId);
          }
        }

        let contractId: string | null = null;
        if (row.contractNumber) {
          if (!contratos.has(row.contractNumber)) {
            const contrato = await prisma.contract.findUnique({ where: { number: row.contractNumber }, select: { id: true } });
            contratos.set(row.contractNumber, contrato?.id || null);
          }
          contractId = contratos.get(row.contractNumber) || null;
        }

        const marker = `IMPORT_BATCH:${batchId}:LINE:${row.sourceLine || created.length + 2}`;
        const expense = await prisma.expense.create({
          data: {
            description: row.description,
            amount: row.amount,
            dueDate: item.dueDate!,
            paidAt: item.paidAt,
            status: row.status,
            categoryId,
            supplierId,
            competence: row.competence || item.dueDate!.toISOString().slice(0, 7),
            notes: [
              row.notes,
              row.costCenter ? `CENTRO_CUSTO:${row.costCenter}` : null,
              contractId ? `CONTRATO:${contractId}` : row.contractNumber ? `CONTRATO_NAO_LOCALIZADO:${row.contractNumber}` : null,
              marker,
              `ARQUIVO:${fileName || "planilha.csv"}`,
              `IMPORTADO_POR:${user.email || user.name || user.id}`,
            ].filter(Boolean).join(" | "),
          },
        });
        created.push(expense.id);
      } catch (error) {
        errors.push({
          line: row.sourceLine,
          description: row.description,
          error: error instanceof Error ? error.message.slice(0, 180) : "Falha no lançamento",
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "IMPORT",
        module: "financeiro-importacao",
        entityType: "ExpenseImportBatch",
        entityId: batchId,
        newValues: jsonSeguro({
          batchId,
          fileName: fileName || "planilha.csv",
          expenseIds: created,
          imported: created.length,
          duplicatesFile: summary.duplicatesFile,
          duplicatesDatabase: summary.duplicatesDatabase,
          validationErrors: summary.errors,
          creationErrors: errors,
          importedAt: new Date().toISOString(),
          importedBy: user.email || user.name || user.id,
        }),
      },
    });

    return NextResponse.json({
      ok: errors.length === 0,
      mode,
      batchId,
      imported: created.length,
      duplicates: summary.duplicatesFile + summary.duplicatesDatabase,
      validationErrors: summary.errors,
      errors,
      canRollback: created.length > 0,
    }, { status: errors.length ? 207 : 201 });
  } catch (error) {
    return erroInterno(error, "api/financeiro/importar-despesas POST");
  }
}
