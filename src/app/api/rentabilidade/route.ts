import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const CostSchema = z.object({
  contractId: z.string().trim().min(1, "Contrato obrigatório"),
  date: z.string().optional(),
  category: z.string().trim().min(1).max(80).default("outros"),
  description: z.string().trim().min(2).max(300),
  amount: z.coerce.number().positive().max(9999999999999.99),
});

function monthsActive(startDate: Date, endDate: Date | null) {
  const start = new Date(startDate).getTime();
  const end = (endDate ? new Date(endDate) : new Date()).getTime();
  if (end <= start) return 0;
  return (end - start) / (30.44 * 24 * 3600 * 1000);
}

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "FINANCEIRO", "FISCAL", "COMERCIAL");
  if (erro) return erro;

  try {
    const contractId = req.nextUrl.searchParams.get("contractId");
    const contracts = await prisma.contract.findMany({
      where: contractId ? { id: contractId } : undefined,
      include: {
        client: { select: { name: true } },
        measurements: { select: { id: true, value: true, status: true, period: true } },
        costs: { orderBy: { date: "desc" } },
        fuelLogs: { select: { totalCost: true } },
        mobilizations: { select: { costPerMonth: true, startDate: true, endDate: true, status: true } },
        workDiaries: {
          select: {
            laborHours: true,
            inputCost: true,
            equipmentCost: true,
            transportCost: true,
            clientAccepted: true,
            quantityDone: true,
          },
        },
      },
      orderBy: { number: "asc" },
    });

    const contractIds = contracts.map((contract) => contract.id);
    const receivableRows = contractIds.length ? await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        r.contract_id,
        COALESCE(SUM(CASE WHEN r.status <> 'CANCELLED' THEN r.gross_amount ELSE 0 END), 0) AS billed,
        COALESCE(SUM(CASE WHEN r.status <> 'CANCELLED' THEN r.net_amount ELSE 0 END), 0) AS net_billed,
        COALESCE(SUM(CASE WHEN r.status <> 'CANCELLED' THEN pay.paid ELSE 0 END), 0) AS received,
        COALESCE(SUM(CASE WHEN r.status <> 'CANCELLED' THEN r.net_amount - pay.paid ELSE 0 END), 0) AS open_balance,
        COUNT(*) FILTER (WHERE r.status <> 'CANCELLED')::int AS title_count
      FROM erp_receivable r
      LEFT JOIN (
        SELECT receivable_id, COALESCE(SUM(amount),0) AS paid
        FROM erp_receivable_payment
        GROUP BY receivable_id
      ) pay ON pay.receivable_id = r.id
      WHERE r.contract_id IN (${Prisma.join(contractIds)})
      GROUP BY r.contract_id
    `) : [];
    const receivableMap = new Map(receivableRows.map((row) => [row.contract_id, row]));

    const lines = contracts.map((contract) => {
      const measuredRevenue = contract.measurements
        .filter((measurement) => ["aprovada", "faturada"].includes(measurement.status))
        .reduce((sum, measurement) => sum + Number(measurement.value), 0);
      const manualCosts = contract.costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
      const fuel = contract.fuelLogs.reduce((sum, log) => sum + Number(log.totalCost), 0);
      const labor = contract.mobilizations
        .filter((mobilization) => mobilization.status !== "suspensa")
        .reduce((sum, mobilization) => sum + Number(mobilization.costPerMonth) * monthsActive(mobilization.startDate, mobilization.endDate), 0);
      const diaryDirectCosts = contract.workDiaries.reduce((sum, diary) => sum + Number(diary.inputCost) + Number(diary.equipmentCost) + Number(diary.transportCost), 0);
      const actualLaborHours = contract.workDiaries.reduce((sum, diary) => sum + Number(diary.laborHours || 0), 0);
      const acceptedDiaries = contract.workDiaries.filter((diary) => diary.clientAccepted).length;
      const pendingDiaries = contract.workDiaries.filter((diary) => !diary.clientAccepted).length;

      const totalCost = manualCosts + fuel + labor + diaryDirectCosts;
      const receivable = receivableMap.get(contract.id) || {};
      const billed = Number(receivable.billed || 0);
      const netBilled = Number(receivable.net_billed || 0);
      const received = Number(receivable.received || 0);
      const openBalance = Number(receivable.open_balance || 0);
      const economicMargin = measuredRevenue - totalCost;
      const cashMargin = received - totalCost;

      const byCategory: Record<string, number> = {};
      for (const cost of contract.costs) byCategory[cost.category] = (byCategory[cost.category] || 0) + Number(cost.amount);
      if (fuel > 0) byCategory.combustivel_auto = Number(fuel.toFixed(2));
      if (labor > 0) byCategory.mao_de_obra_auto = Number(labor.toFixed(2));
      if (diaryDirectCosts > 0) byCategory.custos_diretos_diario = Number(diaryDirectCosts.toFixed(2));

      return {
        id: contract.id,
        number: contract.number,
        object: contract.object,
        status: contract.status,
        cliente: contract.client?.name || "—",
        valorContrato: Number(contract.value),
        valorMensal: Number(contract.monthlyValue),
        medidoAprovado: Number(measuredRevenue.toFixed(2)),
        faturadoBruto: Number(billed.toFixed(2)),
        faturadoLiquido: Number(netBilled.toFixed(2)),
        recebido: Number(received.toFixed(2)),
        saldoReceber: Number(openBalance.toFixed(2)),
        titulos: Number(receivable.title_count || 0),
        custosLancados: Number(manualCosts.toFixed(2)),
        combustivel: Number(fuel.toFixed(2)),
        maoDeObraAcumulada: Number(labor.toFixed(2)),
        custosDiretosDiario: Number(diaryDirectCosts.toFixed(2)),
        custoTotal: Number(totalCost.toFixed(2)),
        margemEconomica: Number(economicMargin.toFixed(2)),
        margemCaixa: Number(cashMargin.toFixed(2)),
        margemPct: measuredRevenue > 0 ? Number(((economicMargin / measuredRevenue) * 100).toFixed(2)) : null,
        margemCaixaPct: received > 0 ? Number(((cashMargin / received) * 100).toFixed(2)) : null,
        custoMensalEquipe: contract.mobilizations.filter((item) => item.status === "ativa").reduce((sum, item) => sum + Number(item.costPerMonth), 0),
        actualLaborHours: Number(actualLaborHours.toFixed(2)),
        acceptedDiaries,
        pendingDiaries,
        porCategoria: byCategory,
        custos: contractId === contract.id ? contract.costs : undefined,
      };
    });

    return NextResponse.json({
      linhas: lines,
      resumo: {
        medidoAprovado: lines.reduce((sum, line) => sum + line.medidoAprovado, 0),
        faturadoBruto: lines.reduce((sum, line) => sum + line.faturadoBruto, 0),
        recebido: lines.reduce((sum, line) => sum + line.recebido, 0),
        saldoReceber: lines.reduce((sum, line) => sum + line.saldoReceber, 0),
        custoTotal: lines.reduce((sum, line) => sum + line.custoTotal, 0),
        margemEconomica: lines.reduce((sum, line) => sum + line.margemEconomica, 0),
        margemCaixa: lines.reduce((sum, line) => sum + line.margemCaixa, 0),
      },
    });
  } catch (error) {
    return erroInterno(error, "api/rentabilidade GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "FINANCEIRO", "GESTOR");
  if (erro || !user) return erro;

  try {
    const parsed = CostSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Custo inválido" }, { status: 400 });
    const body = parsed.data;
    const date = body.date ? new Date(`${body.date}T12:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    const contract = await prisma.contract.findUnique({ where: { id: body.contractId }, select: { id: true } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

    const cost = await prisma.$transaction(async (tx) => {
      const created = await tx.contractCost.create({
        data: { contractId: body.contractId, date, category: body.category, description: body.description, amount: body.amount },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", module: "rentabilidade", entityType: "ContractCost", entityId: created.id, newValues: auditJson(created) },
      });
      return created;
    });
    return NextResponse.json({ ok: true, id: cost.id }, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/rentabilidade POST");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN");
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const current = await prisma.contractCost.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Custo não encontrado" }, { status: 404 });
    await prisma.$transaction([
      prisma.auditLog.create({
        data: { userId: user.id, action: "DELETE", module: "rentabilidade", entityType: "ContractCost", entityId: id, oldValues: auditJson(current) },
      }),
      prisma.contractCost.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return erroInterno(error, "api/rentabilidade DELETE");
  }
}
