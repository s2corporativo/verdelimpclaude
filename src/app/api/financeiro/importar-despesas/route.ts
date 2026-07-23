import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const RowSchema = z.object({
  description: z.string().trim().min(1).max(250),
  amount: z.coerce.number().positive(),
  dueDate: z.string().min(8),
  paidAt: z.string().optional().nullable(),
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
const Schema = z.object({ rows: z.array(RowSchema).min(1).max(5000), fileName: z.string().max(250).optional() });
const asDate = (value?: string | null) => value ? new Date(`${value}T12:00:00`) : null;

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "FINANCEIRO");
  if (erro) return erro;
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Planilha inválida", details: parsed.error.flatten() }, { status: 400 });
    const { rows, fileName } = parsed.data;
    const errors: Array<{ line?: number; description: string; error: string }> = [];
    const created: string[] = [];
    let duplicates = 0;

    for (const row of rows) {
      try {
        const dueDate = asDate(row.dueDate)!;
        const existing = await prisma.expense.findFirst({
          where: { description: row.description, amount: row.amount, dueDate, deletedAt: null }, select: { id: true },
        });
        if (existing) { duplicates++; continue; }

        let categoryId: string | null = null;
        if (row.categoryName) {
          const category = await prisma.expenseCategory.upsert({
            where: { name: row.categoryName },
            update: { active: true },
            create: { name: row.categoryName, type: "operacional", active: true },
          });
          categoryId = category.id;
        }

        let supplierId: string | null = null;
        if (row.supplierName) {
          const supplier = row.supplierCnpj
            ? await prisma.supplier.upsert({
                where: { cnpj: row.supplierCnpj },
                update: { name: row.supplierName, active: true },
                create: { name: row.supplierName, cnpj: row.supplierCnpj, active: true },
              })
            : await prisma.supplier.findFirst({ where: { name: { equals: row.supplierName, mode: "insensitive" } } })
              || await prisma.supplier.create({ data: { name: row.supplierName, active: true } });
          supplierId = supplier.id;
        }

        const contract = row.contractNumber
          ? await prisma.contract.findUnique({ where: { number: row.contractNumber }, select: { id: true } })
          : null;
        const marker = `IMPORT:${fileName || "planilha"}:${row.sourceLine || created.length + 1}`;
        const expense = await prisma.expense.create({ data: {
          description: row.description, amount: row.amount, dueDate, paidAt: asDate(row.paidAt), status: row.status,
          categoryId, supplierId, competence: row.competence || dueDate.toISOString().slice(0, 7),
          notes: [row.notes, row.costCenter ? `CENTRO_CUSTO:${row.costCenter}` : null,
            contract?.id ? `CONTRATO:${contract.id}` : null, marker, `IMPORTADO_POR:${user?.email || user?.name || user?.id}`]
            .filter(Boolean).join(" | "),
        }});
        created.push(expense.id);
      } catch (e: any) {
        errors.push({ line: row.sourceLine, description: row.description, error: e?.message?.slice(0, 180) || "Falha no lançamento" });
      }
    }
    return NextResponse.json({ success: errors.length === 0, imported: created.length, duplicates, errors });
  } catch (e) { return erroInterno(e, "api/financeiro/importar-despesas POST"); }
}
