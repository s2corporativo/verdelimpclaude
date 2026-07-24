import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const AbastecimentoSchema = z.object({
  vehicleId: z.string().trim().min(1, "Veículo obrigatório"),
  contractId: z.string().trim().optional().nullable(),
  employeeId: z.string().trim().optional().nullable(),
  date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"), z.literal("")]).optional().nullable(),
  odometer: z.coerce.number().int().nonnegative().max(20_000_000),
  liters: z.coerce.number().positive().max(20_000),
  pricePerLiter: z.coerce.number().positive().max(1000),
  fuelType: z.enum(["Gasolina", "Diesel S10", "Diesel S500", "Etanol", "GNV"]).default("Gasolina"),
  station: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

function parseDate(value: string | null) {
  if (!value) return null;
  return parseDataOperacional(value);
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO");
  if (erro) return erro;

  try {
    const vehicleId = req.nextUrl.searchParams.get("vehicleId") || undefined;
    const contractId = req.nextUrl.searchParams.get("contractId") || undefined;
    const start = parseDate(req.nextUrl.searchParams.get("start"));
    const endRaw = parseDate(req.nextUrl.searchParams.get("end"));
    const end = endRaw ? new Date(endRaw.getTime() + 86_399_999) : null;

    const logs = await prisma.fuelLog.findMany({
      where: {
        ...(vehicleId ? { vehicleId } : {}),
        ...(contractId ? { contractId } : {}),
        ...(start || end ? { date: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
      },
      orderBy: { date: "desc" },
      take: 1000,
      include: {
        vehicle: { select: { id: true, plate: true, model: true, type: true } },
        contract: { select: { id: true, number: true, object: true } },
      },
    });
    const veiculos = await prisma.vehicle.findMany({ where: { active: true }, orderBy: [{ plate: "asc" }] });

    const agora = new Date();
    const mesAtual = logs.filter((log) => {
      const date = new Date(log.date);
      return date.getMonth() === agora.getMonth() && date.getFullYear() === agora.getFullYear();
    });
    const totalMes = mesAtual.reduce((soma, log) => soma + Number(log.totalCost), 0);
    const totalLitros = mesAtual.reduce((soma, log) => soma + Number(log.liters), 0);
    const totalPeriodo = logs.reduce((soma, log) => soma + Number(log.totalCost), 0);
    const precoMedioLitro = logs.length
      ? logs.reduce((soma, log) => soma + Number(log.totalCost), 0) / Math.max(1, logs.reduce((soma, log) => soma + Number(log.liters), 0))
      : 0;

    return NextResponse.json({
      data: logs,
      veiculos,
      totalMes: Number(totalMes.toFixed(2)),
      totalLitros: Number(totalLitros.toFixed(2)),
      totalPeriodo: Number(totalPeriodo.toFixed(2)),
      precoMedioLitro: Number(precoMedioLitro.toFixed(3)),
      total: logs.length,
      empty: logs.length === 0,
    });
  } catch (error) {
    return erroInterno(error, "api/combustivel GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO");
  if (erro || !user) return erro;

  try {
    const parsed = AbastecimentoSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Abastecimento inválido" }, { status: 400 });
    }
    const body = parsed.data;
    const date = body.date ? parseDataOperacional(body.date) : new Date();
    if (!date) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

    const [vehicle, contract, employee, previous, next] = await Promise.all([
      prisma.vehicle.findUnique({ where: { id: body.vehicleId } }),
      body.contractId ? prisma.contract.findUnique({ where: { id: body.contractId }, select: { id: true } }) : null,
      body.employeeId ? prisma.employee.findUnique({ where: { id: body.employeeId }, select: { id: true, active: true } }) : null,
      prisma.fuelLog.findFirst({
        where: { vehicleId: body.vehicleId, date: { lte: date } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { id: true, date: true, odometer: true },
      }),
      prisma.fuelLog.findFirst({
        where: { vehicleId: body.vehicleId, date: { gt: date } },
        orderBy: { date: "asc" },
        select: { id: true, date: true, odometer: true },
      }),
    ]);

    if (!vehicle || !vehicle.active) return NextResponse.json({ error: "Veículo inválido ou inativo" }, { status: 404 });
    if (body.contractId && !contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (body.employeeId && (!employee || !employee.active)) return NextResponse.json({ error: "Funcionário inválido ou inativo" }, { status: 404 });
    if (previous && body.odometer < previous.odometer) {
      return NextResponse.json({
        error: `Hodômetro inferior ao registro anterior (${previous.odometer.toLocaleString("pt-BR")} km)`,
      }, { status: 409 });
    }
    if (next && body.odometer > next.odometer) {
      return NextResponse.json({
        error: `Hodômetro superior ao registro posterior (${next.odometer.toLocaleString("pt-BR")} km)`,
      }, { status: 409 });
    }

    const totalCost = Number((body.liters * body.pricePerLiter).toFixed(2));
    const log = await prisma.fuelLog.create({
      data: {
        vehicleId: body.vehicleId,
        contractId: body.contractId || null,
        employeeId: body.employeeId || null,
        date,
        odometer: body.odometer,
        liters: body.liters,
        pricePerLiter: body.pricePerLiter,
        totalCost,
        fuelType: body.fuelType,
        station: body.station || null,
        notes: body.notes || null,
      },
    });

    await registrarAuditoria({
      userId: user.id,
      action: "CRIAR",
      module: "combustivel",
      entityType: "FuelLog",
      entityId: log.id,
      newValues: {
        vehicleId: body.vehicleId,
        contractId: body.contractId || null,
        employeeId: body.employeeId || null,
        date,
        odometer: body.odometer,
        liters: body.liters,
        pricePerLiter: body.pricePerLiter,
        totalCost,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/combustivel POST");
  }
}
