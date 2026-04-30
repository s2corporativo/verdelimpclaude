
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const logs = await prisma.fuelLog.findMany({ orderBy: { date: "desc" }, take: 100, include: { vehicle: { select: { plate: true, model: true } } } });
    if (!logs.length) return NextResponse.json({ data: DEMO_LOGS, veiculos: DEMO_VEIC, _demo: true });
    const veiculos = await prisma.vehicle.findMany({ where: { active: true } });
    const totalMes = logs.filter(l => new Date(l.date).getMonth() === new Date().getMonth()).reduce((s, l) => s + Number(l.totalCost), 0);
    const totalLitros = logs.reduce((s, l) => s + Number(l.liters), 0);
    return NextResponse.json({ data: logs, veiculos, totalMes, totalLitros });
  } catch { return NextResponse.json({ data: DEMO_LOGS, veiculos: DEMO_VEIC, totalMes: 1842, totalLitros: 293, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.vehicleId || !b.odometer || !b.liters || !b.pricePerLiter) return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    const total = Number(b.liters) * Number(b.pricePerLiter);
    const log = await prisma.fuelLog.create({ data: { vehicleId: b.vehicleId, contractId: b.contractId||null, employeeId: b.employeeId||null, date: b.date ? new Date(b.date) : new Date(), odometer: Number(b.odometer), liters: Number(b.liters), pricePerLiter: Number(b.pricePerLiter), totalCost: total, fuelType: b.fuelType||"Gasolina", station: b.station, notes: b.notes } });
    return NextResponse.json(log, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO_VEIC = [
  { id:"v1", plate:"QWE-1234", model:"Hilux Cabine Dupla", type:"Pickup" },
  { id:"v2", plate:"ASD-5678", model:"Iveco Daily Carroceria", type:"Caminhao" },
  { id:"v3", plate:"ZXC-9012", model:"Gol 1.0", type:"Leve" },
];
const DEMO_LOGS = [
  { id:"f1", date:"2026-04-25", vehicle:{ plate:"QWE-1234", model:"Hilux" }, odometer:48320, liters:55.4, pricePerLiter:6.29, totalCost:348.47, fuelType:"Gasolina", station:"Posto Centro Betim" },
  { id:"f2", date:"2026-04-20", vehicle:{ plate:"ASD-5678", model:"Iveco" }, odometer:62100, liters:120.0, pricePerLiter:6.09, totalCost:730.80, fuelType:"Diesel S10", station:"Posto BR Contagem" },
  { id:"f3", date:"2026-04-18", vehicle:{ plate:"QWE-1234", model:"Hilux" }, odometer:47980, liters:48.2, pricePerLiter:6.29, totalCost:303.18, fuelType:"Gasolina", station:"Posto Shell Betim" },
];
