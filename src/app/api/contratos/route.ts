
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.contract.findMany({ orderBy: { endDate: "asc" }, include: { measurements: { select: { id: true, status: true, value: true } } } });
    const hoje = new Date();
    const enriched = data.map(c => {
      const diasFim = Math.ceil((new Date(c.endDate).getTime() - hoje.getTime()) / 86400000);
      return { ...c, diasFim, alerta: diasFim <= c.renewalAlertDays && diasFim > 0 ? "renovar" : diasFim <= 0 ? "vencido" : "ok" };
    });
    if (!enriched.length) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data: enriched });
  } catch { return NextResponse.json({ data: DEMO, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.object || !b.value || !b.startDate || !b.endDate) return NextResponse.json({ error: "Campos obrigatórios: objeto, valor, início, fim" }, { status: 400 });
    const count = await prisma.contract.count();
    const number = `CONT-${new Date().getFullYear()}-${String(count+1).padStart(3,"0")}`;
    const c = await prisma.contract.create({ data: { number, clientId: b.clientId||null, object: b.object, value: Number(b.value), monthlyValue: Number(b.monthlyValue||0), startDate: new Date(b.startDate), endDate: new Date(b.endDate), status: b.status||"Ativo", notes: b.notes } });
    return NextResponse.json(c, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO = [
  { id:"ct1", number:"CONT-2026-001", object:"Roçada Canteiros Norte — PBH", value:462000, monthlyValue:38500, startDate:"2026-01-01", endDate:"2026-12-31", status:"Ativo", diasFim:245, alerta:"ok", measurements:[] },
  { id:"ct2", number:"CONT-2026-002", object:"PRADA Linhas Transmissão — CEMIG", value:504000, monthlyValue:42000, startDate:"2026-03-01", endDate:"2027-02-28", status:"Ativo", diasFim:304, alerta:"ok", measurements:[] },
  { id:"ct3", number:"CONT-2025-003", object:"Jardinagem Mensal HQ Betim — Sanesul", value:102000, monthlyValue:8500, startDate:"2025-07-01", endDate:"2026-06-30", status:"Ativo", diasFim:61, alerta:"renovar", measurements:[] },
];
