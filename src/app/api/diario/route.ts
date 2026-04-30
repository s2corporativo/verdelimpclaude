
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.workDiary.findMany({ orderBy: { date: "desc" }, take: 50 });
    if (!data.length) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ data: DEMO, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.location || !b.activitiesDone) return NextResponse.json({ error: "Local e atividades obrigatórios" }, { status: 400 });
    const d = await prisma.workDiary.create({ data: { date: b.date ? new Date(b.date) : new Date(), contractId: b.contractId||null, location: b.location, supervisor: b.supervisor||"", teamSize: Number(b.teamSize||1), weather: b.weather||"Bom", activitiesDone: b.activitiesDone, areasWorked: b.areasWorked, equipmentUsed: b.equipmentUsed, occurrences: b.occurrences } });
    return NextResponse.json(d, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO = [
  { id:"d1", date:"2026-04-27", location:"PBH — Canteiro Região Norte", supervisor:"Ana Luiza Ribeiro", teamSize:4, weather:"Bom", activitiesDone:"Roçada manual canteiros 1 ao 5. Recolhimento de resíduos. Aplicação de herbicida nos bordos.", areasWorked:"4.200 m²", equipmentUsed:"2 roçadeiras, 1 soprador, carrinho de mão", occurrences:"Nenhuma ocorrência" },
  { id:"d2", date:"2026-04-26", location:"CEMIG — Linha Betim-Igarapé", supervisor:"Ana Luiza Ribeiro", teamSize:5, weather:"Nublado", activitiesDone:"PRADA: semeadura de espécies nativas em área de encosta. Plantio de 120 mudas.", areasWorked:"1,5 ha", equipmentUsed:"Hidrosemedora, pás, picaretas", occurrences:"Suspensão 1h por chuva fraca às 14h. Retomada às 15h." },
];
