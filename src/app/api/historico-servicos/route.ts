
// Adaptado de: verdelimp-erp-prime-final/drizzle/schema.ts → serviceHistory table
// serviceDate, serviceType, area(m²), cost, revenue por contractId
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const contratoId = searchParams.get("contratoId");
  try {
    // Usar WorkDiary como proxy de serviceHistory enquanto tabela dedicada não existe
    const filtro: any = {};
    if (contratoId) filtro.contractId = contratoId;
    const data = await prisma.workDiary.findMany({ where: filtro, orderBy: { date: "desc" }, take: 100 });
    if (!data.length) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ data: DEMO, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const d = await prisma.workDiary.create({ data: { contractId: b.contractId || null, date: b.serviceDate ? new Date(b.serviceDate) : new Date(), location: b.location || "", supervisor: b.supervisor || "", teamSize: Number(b.teamSize || 1), weather: b.weather || "Bom", activitiesDone: `[${b.serviceType}] ${b.description || ""}`, areasWorked: b.area ? `${b.area} m²` : null, notes: `Receita: R$${b.revenue || 0} | Custo: R$${b.cost || 0}` } });
    return NextResponse.json(d, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO = [
  { id:"s1", date:"2026-04-20", contractId:"ct1", location:"PBH — Canteiros Norte", activitiesDone:"[Roçada Manual] Roçada geral canteiros 1-12, recolhimento resíduos", areasWorked:"22.000 m²", supervisor:"Ana Luiza", teamSize:4 },
  { id:"s2", date:"2026-04-15", contractId:"ct2", location:"CEMIG — Linha Betim", activitiesDone:"[PRADA] Hidrossemeadura encosta km 12-18", areasWorked:"3,5 ha", supervisor:"Ana Luiza", teamSize:5 },
  { id:"s3", date:"2026-04-10", contractId:"ct1", location:"PBH — Canteiros Norte", activitiesDone:"[Herbicida] Aplicação de herbicida sistêmico canteiros pós-roçada", areasWorked:"22.000 m²", supervisor:"Ana Luiza", teamSize:2 },
  { id:"s4", date:"2026-03-22", contractId:"ct3", location:"Sanesul — HQ Betim", activitiesDone:"[Jardinagem] Poda sebe, adubação canteiros, rega gramado", areasWorked:"1.200 m²", supervisor:"José Antonio", teamSize:2 },
];
