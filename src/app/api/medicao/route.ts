
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.measurement.findMany({ orderBy: { createdAt: "desc" }, include: { contract: { select: { number: true, object: true } }, items: true } });
    if (!data.length) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ data: DEMO, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const m = await prisma.measurement.create({ data: { contractId: b.contractId, period: b.period, startDate: new Date(b.startDate), endDate: new Date(b.endDate), value: Number(b.value||0), status: "em_elaboracao", notes: b.notes, items: { create: (b.items||[]).map((i: any) => ({ description: i.description, unit: i.unit, quantity: Number(i.quantity), unitValue: Number(i.unitValue), totalValue: Number(i.quantity)*Number(i.unitValue) })) } }, include: { items: true } });
    return NextResponse.json(m, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO = [
  { id:"m1", contract:{ number:"CONT-2026-001", object:"Roçada Canteiros Norte — PBH" }, period:"2026-04", startDate:"2026-03-21", endDate:"2026-04-20", value:38500, status:"aprovada", approvedBy:"João Silva / PBH", approvedAt:"2026-04-22", items:[ { id:"mi1", description:"Roçada manual canteiros", unit:"m²", quantity:22000, unitValue:1.75, totalValue:38500 } ] },
  { id:"m2", contract:{ number:"CONT-2026-002", object:"PRADA CEMIG" }, period:"2026-04", startDate:"2026-03-21", endDate:"2026-04-20", value:42000, status:"enviada", items:[ { id:"mi2", description:"PRADA — recuperação áreas degradadas", unit:"ha", quantity:6, unitValue:7000, totalValue:42000 } ] },
  { id:"m3", contract:{ number:"CONT-2026-001", object:"Roçada Canteiros Norte — PBH" }, period:"2026-05", startDate:"2026-04-21", endDate:"2026-05-20", value:38500, status:"em_elaboracao", items:[] },
];
