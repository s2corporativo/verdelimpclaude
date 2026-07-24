import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const STATUS = ["Ativo", "Encerrado", "Suspenso", "Renovando", "Cancelado"] as const;
const INDICES = ["INPC", "IPCA", "IGPM"] as const;

const ConsultaSchema = z.object({
  status: z.enum(STATUS).optional(),
  clientId: z.string().trim().min(1).optional(),
  q: z.string().trim().max(150).optional(),
});

const ContratoSchema = z.object({
  clientId: z.string().trim().min(1).optional().nullable(),
  object: z.string().trim().min(3).max(1000),
  value: z.coerce.number().positive().max(1_000_000_000),
  monthlyValue: z.coerce.number().nonnegative().max(1_000_000_000).default(0),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(STATUS).default("Ativo"),
  renewalAlertDays: z.coerce.number().int().min(1).max(730).default(90),
  adjustIndex: z.enum(INDICES).default("INPC"),
  notes: z.string().trim().max(5000).optional().nullable(),
});

const ContratoUpdateSchema = ContratoSchema.partial().extend({
  id: z.string().trim().min(1),
});

function dataUtc(data: string) {
  const resultado = new Date(`${data}T00:00:00.000Z`);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

async function validarCliente(clientId?: string | null) {
  if (!clientId) return true;
  const cliente = await prisma.client.findFirst({
    where: { id: clientId, active: true, deletedAt: null },
    select: { id: true },
  });
  return Boolean(cliente);
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL", "OPERACAO", "FINANCEIRO");
  if (erro) return erro;

  try {
    const validacao = ConsultaSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    if (!validacao.success) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    const filtros = validacao.data;

    const contratos = await prisma.contract.findMany({
      where: {
        ...(filtros.status ? { status: filtros.status } : {}),
        ...(filtros.clientId ? { clientId: filtros.clientId } : {}),
        ...(filtros.q ? {
          OR: [
            { number: { contains: filtros.q, mode: "insensitive" } },
            { object: { contains: filtros.q, mode: "insensitive" } },
            { client: { name: { contains: filtros.q, mode: "insensitive" } } },
          ],
        } : {}),
      },
      orderBy: [{ status: "asc" }, { endDate: "asc" }],
      include: {
        client: { select: { id: true, name: true, cnpjCpf: true } },
        measurements: { select: { id: true, status: true, value: true, period: true } },
      },
    });

    const hoje = new Date();
    const data = contratos.map((contrato) => {
      const diasFim = Math.ceil((contrato.endDate.getTime() - hoje.getTime()) / 86_400_000);
      const alerta = contrato.status === "Cancelado" || contrato.status === "Encerrado"
        ? "inativo"
        : diasFim <= 0
          ? "vencido"
          : diasFim <= contrato.renewalAlertDays
            ? "renovar"
            : "ok";
      return { ...contrato, diasFim, alerta };
    });

    return NextResponse.json({ data, total: data.length, fonte: "contratos_transacionais" });
  } catch (e) {
    return erroInterno(e, "api/contratos GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro) return erro;

  try {
    const validacao = ContratoSchema.safeParse(await req.json());
    if (!validacao.success) {
      return NextResponse.json({
        error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      }, { status: 400 });
    }
    const dados = validacao.data;
    const inicio = dataUtc(dados.startDate);
    const fim = dataUtc(dados.endDate);
    if (!inicio || !fim || inicio > fim) {
      return NextResponse.json({ error: "A vigência do contrato é inválida." }, { status: 400 });
    }
    if (!(await validarCliente(dados.clientId))) {
      return NextResponse.json({ error: "Cliente inexistente ou inativo." }, { status: 400 });
    }

    const number = `CONT-${inicio.getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const contrato = await prisma.contract.create({
      data: {
        number,
        clientId: dados.clientId || null,
        object: dados.object,
        value: dados.value,
        monthlyValue: dados.monthlyValue,
        startDate: inicio,
        endDate: fim,
        status: dados.status,
        renewalAlertDays: dados.renewalAlertDays,
        adjustIndex: dados.adjustIndex,
        notes: dados.notes || null,
      },
    });

    await registrarAuditoria({
      userId: user!.id,
      action: "CRIAR",
      module: "contratos",
      entityType: "Contract",
      entityId: contrato.id,
      newValues: {
        number: contrato.number,
        clientId: contrato.clientId,
        value: Number(contrato.value),
        startDate: contrato.startDate.toISOString(),
        endDate: contrato.endDate.toISOString(),
        status: contrato.status,
      },
    });

    return NextResponse.json(contrato, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "Número de contrato já existente." }, { status: 409 });
    return erroInterno(e, "api/contratos POST");
  }
}

export async function PUT(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro) return erro;

  try {
    const validacao = ContratoUpdateSchema.safeParse(await req.json());
    if (!validacao.success) {
      return NextResponse.json({
        error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      }, { status: 400 });
    }
    const dados = validacao.data;
    const atual = await prisma.contract.findUnique({ where: { id: dados.id } });
    if (!atual) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
    if (atual.status === "Cancelado" && dados.status && dados.status !== "Cancelado") {
      return NextResponse.json({ error: "Contrato cancelado não pode ser reativado por edição comum." }, { status: 409 });
    }
    if (!(await validarCliente(dados.clientId))) {
      return NextResponse.json({ error: "Cliente inexistente ou inativo." }, { status: 400 });
    }

    const inicio = dados.startDate ? dataUtc(dados.startDate) : atual.startDate;
    const fim = dados.endDate ? dataUtc(dados.endDate) : atual.endDate;
    if (!inicio || !fim || inicio > fim) {
      return NextResponse.json({ error: "A vigência do contrato é inválida." }, { status: 400 });
    }

    const contrato = await prisma.contract.update({
      where: { id: dados.id },
      data: {
        ...(dados.clientId !== undefined ? { clientId: dados.clientId || null } : {}),
        ...(dados.object !== undefined ? { object: dados.object } : {}),
        ...(dados.value !== undefined ? { value: dados.value } : {}),
        ...(dados.monthlyValue !== undefined ? { monthlyValue: dados.monthlyValue } : {}),
        ...(dados.startDate !== undefined ? { startDate: inicio } : {}),
        ...(dados.endDate !== undefined ? { endDate: fim } : {}),
        ...(dados.status !== undefined ? { status: dados.status } : {}),
        ...(dados.renewalAlertDays !== undefined ? { renewalAlertDays: dados.renewalAlertDays } : {}),
        ...(dados.adjustIndex !== undefined ? { adjustIndex: dados.adjustIndex } : {}),
        ...(dados.notes !== undefined ? { notes: dados.notes || null } : {}),
      },
    });

    await registrarAuditoria({
      userId: user!.id,
      action: "EDITAR",
      module: "contratos",
      entityType: "Contract",
      entityId: contrato.id,
      oldValues: {
        clientId: atual.clientId,
        object: atual.object,
        value: Number(atual.value),
        monthlyValue: Number(atual.monthlyValue),
        startDate: atual.startDate.toISOString(),
        endDate: atual.endDate.toISOString(),
        status: atual.status,
      },
      newValues: {
        clientId: contrato.clientId,
        object: contrato.object,
        value: Number(contrato.value),
        monthlyValue: Number(contrato.monthlyValue),
        startDate: contrato.startDate.toISOString(),
        endDate: contrato.endDate.toISOString(),
        status: contrato.status,
      },
    });

    return NextResponse.json(contrato);
  } catch (e) {
    return erroInterno(e, "api/contratos PUT");
  }
}

// Cancelamento lógico: preserva medições, custos, diários e documentos vinculados.
export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR");
  if (erro) return erro;

  try {
    const id = new URL(req.url).searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });

    const atual = await prisma.contract.findUnique({ where: { id } });
    if (!atual) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
    if (atual.status === "Cancelado") {
      return NextResponse.json({ success: true, contrato: atual, idempotente: true });
    }

    const contrato = await prisma.contract.update({ where: { id }, data: { status: "Cancelado" } });
    await registrarAuditoria({
      userId: user!.id,
      action: "CANCELAR",
      module: "contratos",
      entityType: "Contract",
      entityId: id,
      oldValues: { status: atual.status },
      newValues: { status: "Cancelado" },
    });

    return NextResponse.json({ success: true, contrato });
  } catch (e) {
    return erroInterno(e, "api/contratos DELETE");
  }
}
