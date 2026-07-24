// Histórico operacional derivado exclusivamente dos diários de obra persistidos.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const ConsultaSchema = z.object({
  contratoId: z.string().trim().min(1).optional(),
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limite: z.coerce.number().int().min(1).max(500).default(100),
});

const DiarioSchema = z.object({
  contractId: z.string().trim().min(1).optional().nullable(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  location: z.string().trim().min(2).max(300),
  supervisor: z.string().trim().min(2).max(150),
  teamSize: z.coerce.number().int().min(1).max(500),
  weather: z.enum(["Bom", "Nublado", "Chuva", "Suspensão"]).default("Bom"),
  serviceType: z.string().trim().min(2).max(120),
  description: z.string().trim().min(2).max(3000),
  area: z.string().trim().max(120).optional().nullable(),
  equipmentUsed: z.string().trim().max(1000).optional().nullable(),
  occurrences: z.string().trim().max(2000).optional().nullable(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  laborHours: z.coerce.number().nonnegative().max(10000).optional().nullable(),
  quantityDone: z.coerce.number().nonnegative().max(1_000_000_000).optional().nullable(),
  quantityUnit: z.string().trim().max(30).optional().nullable(),
  inputCost: z.coerce.number().nonnegative().max(100_000_000).default(0),
  equipmentCost: z.coerce.number().nonnegative().max(100_000_000).default(0),
  transportCost: z.coerce.number().nonnegative().max(100_000_000).default(0),
});

function dataUtc(data: string, fimDoDia = false) {
  const resultado = new Date(`${data}T${fimDoDia ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "OPERACAO", "GESTOR", "COMERCIAL", "FINANCEIRO");
  if (erro) return erro;

  try {
    const validacao = ConsultaSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    if (!validacao.success) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    const filtros = validacao.data;

    const inicio = filtros.inicio ? dataUtc(filtros.inicio) : null;
    const fim = filtros.fim ? dataUtc(filtros.fim, true) : null;
    if ((filtros.inicio && !inicio) || (filtros.fim && !fim) || (inicio && fim && inicio > fim)) {
      return NextResponse.json({ error: "Período inválido." }, { status: 400 });
    }

    const diarios = await prisma.workDiary.findMany({
      where: {
        ...(filtros.contratoId ? { contractId: filtros.contratoId } : {}),
        ...(inicio || fim ? { date: { ...(inicio ? { gte: inicio } : {}), ...(fim ? { lte: fim } : {}) } } : {}),
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: filtros.limite,
      include: { contract: { select: { id: true, number: true, object: true, status: true } } },
    });

    const data = diarios.map((diario) => ({
      ...diario,
      custoDireto: Number((
        Number(diario.inputCost) + Number(diario.equipmentCost) + Number(diario.transportCost)
      ).toFixed(2)),
      receita: null,
      receitaFonte: "não registrada no diário; consultar medição/faturamento",
    }));

    return NextResponse.json({
      data,
      total: data.length,
      fonte: "diarios_de_obra",
      limite: filtros.limite,
    });
  } catch (e) {
    return erroInterno(e, "api/historico-servicos GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "OPERACAO", "GESTOR");
  if (erro) return erro;

  try {
    const validacao = DiarioSchema.safeParse(await req.json());
    if (!validacao.success) {
      return NextResponse.json({
        error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      }, { status: 400 });
    }
    const dados = validacao.data;
    const date = dataUtc(dados.serviceDate);
    if (!date) return NextResponse.json({ error: "Data do serviço inválida." }, { status: 400 });

    if (dados.startTime && dados.endTime && dados.endTime <= dados.startTime) {
      return NextResponse.json({ error: "O horário final deve ser posterior ao inicial." }, { status: 400 });
    }

    if (dados.contractId) {
      const contrato = await prisma.contract.findFirst({
        where: { id: dados.contractId, status: { not: "Cancelado" } },
        select: { id: true },
      });
      if (!contrato) return NextResponse.json({ error: "Contrato inexistente ou cancelado." }, { status: 400 });
    }

    const diario = await prisma.workDiary.create({
      data: {
        contractId: dados.contractId || null,
        date,
        location: dados.location,
        supervisor: dados.supervisor,
        teamSize: dados.teamSize,
        weather: dados.weather,
        activitiesDone: `[${dados.serviceType}] ${dados.description}`,
        areasWorked: dados.area || null,
        equipmentUsed: dados.equipmentUsed || null,
        occurrences: dados.occurrences || null,
        startTime: dados.startTime || null,
        endTime: dados.endTime || null,
        laborHours: dados.laborHours ?? null,
        quantityDone: dados.quantityDone ?? null,
        quantityUnit: dados.quantityUnit || null,
        inputCost: dados.inputCost,
        equipmentCost: dados.equipmentCost,
        transportCost: dados.transportCost,
      },
    });

    await registrarAuditoria({
      userId: user!.id,
      action: "CRIAR",
      module: "operacao",
      entityType: "WorkDiary",
      entityId: diario.id,
      newValues: {
        contractId: diario.contractId,
        date: diario.date.toISOString(),
        location: diario.location,
        custoDireto: Number(diario.inputCost) + Number(diario.equipmentCost) + Number(diario.transportCost),
      },
    });

    return NextResponse.json(diario, { status: 201 });
  } catch (e) {
    return erroInterno(e, "api/historico-servicos POST");
  }
}
