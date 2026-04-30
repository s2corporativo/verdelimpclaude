
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.training.findMany({ orderBy: { expiresAt: "asc" }, include: { employee: { select: { name: true, role: true } } } });
    const hoje = new Date(); const em30 = new Date(hoje.getTime()+30*86400000);
    const enriched = data.map(t => ({ ...t, status: new Date(t.expiresAt) < hoje ? "vencido" : new Date(t.expiresAt) < em30 ? "a_vencer" : "valido", diasVenc: Math.ceil((new Date(t.expiresAt).getTime()-hoje.getTime())/86400000) }));
    if (!enriched.length) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data: enriched, vencidos: enriched.filter(t=>t.status==="vencido").length, aVencer: enriched.filter(t=>t.status==="a_vencer").length });
  } catch { return NextResponse.json({ data: DEMO, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const t = await prisma.training.create({ data: { employeeId: b.employeeId, trainingType: b.trainingType, issuedAt: new Date(b.issuedAt), expiresAt: new Date(b.expiresAt), institution: b.institution, status: "valido" } });
    return NextResponse.json(t, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO = [
  { id:"t1", employee:{ name:"Abrão Felipe", role:"Op. Roçadeira" }, trainingType:"NR-12", issuedAt:"2025-06-01", expiresAt:"2026-06-01", institution:"SENAI Betim", status:"a_vencer", diasVenc:32 },
  { id:"t2", employee:{ name:"Ana Luiza Ribeiro", role:"Supervisora" }, trainingType:"NR-35", issuedAt:"2025-04-01", expiresAt:"2027-04-01", institution:"Empresa de Treinamentos", status:"valido", diasVenc:336 },
  { id:"t3", employee:{ name:"Gilberto Ferreira", role:"Op. Roçadeira" }, trainingType:"NR-06", issuedAt:"2024-06-07", expiresAt:"2026-06-07", institution:"SESI Contagem", status:"a_vencer", diasVenc:38 },
  { id:"t4", employee:{ name:"Leomar Souza", role:"Op. Retroescavadeira" }, trainingType:"CNH Cat. B", issuedAt:"2020-01-01", expiresAt:"2025-01-01", institution:"DETRAN/MG", status:"vencido", diasVenc:-119 },
  { id:"t5", employee:{ name:"José Antonio", role:"Op. Roçadeira" }, trainingType:"NR-12", issuedAt:"2026-01-01", expiresAt:"2027-01-01", institution:"SENAI Betim", status:"valido", diasVenc:246 },
];
