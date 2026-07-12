
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function userId() {
  const s = await getServerSession(authOptions);
  return (s?.user as any)?.id || null;
}

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
    await registrarAuditoria({ userId: await userId(), action: "CRIAR", module: "contratos", entityType: "Contract", entityId: c.id, newValues: { number: c.number, value: Number(c.value) } });
    return NextResponse.json(c, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

// Editar contrato
export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const data: any = {};
    if (b.object !== undefined) { if (!String(b.object).trim()) return NextResponse.json({ error: "Objeto não pode ficar vazio" }, { status: 400 }); data.object = b.object; }
    if (b.clientId !== undefined) data.clientId = b.clientId || null;
    if (b.value !== undefined) data.value = Number(b.value);
    if (b.monthlyValue !== undefined) data.monthlyValue = Number(b.monthlyValue || 0);
    if (b.startDate) data.startDate = new Date(b.startDate);
    if (b.endDate) data.endDate = new Date(b.endDate);
    if (b.status !== undefined) data.status = b.status;
    if (b.notes !== undefined) data.notes = b.notes || null;
    const c = await prisma.contract.update({ where: { id: b.id }, data });
    await registrarAuditoria({ userId: await userId(), action: "EDITAR", module: "contratos", entityType: "Contract", entityId: b.id, newValues: data });
    return NextResponse.json(c);
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// "Excluir": marca como Cancelado (preserva medições/custos vinculados)
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const c = await prisma.contract.update({ where: { id }, data: { status: "Cancelado" } });
    await registrarAuditoria({ userId: await userId(), action: "CANCELAR", module: "contratos", entityType: "Contract", entityId: id });
    return NextResponse.json({ success: true, contrato: c });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO = [
  { id:"ct1", number:"CONT-2026-001", object:"Roçada Canteiros Norte — PBH", value:462000, monthlyValue:38500, startDate:"2026-01-01", endDate:"2026-12-31", status:"Ativo", diasFim:245, alerta:"ok", measurements:[] },
  { id:"ct2", number:"CONT-2026-002", object:"PRADA Linhas Transmissão — CEMIG", value:504000, monthlyValue:42000, startDate:"2026-03-01", endDate:"2027-02-28", status:"Ativo", diasFim:304, alerta:"ok", measurements:[] },
  { id:"ct3", number:"CONT-2025-003", object:"Jardinagem Mensal HQ Betim — Sanesul", value:102000, monthlyValue:8500, startDate:"2025-07-01", endDate:"2026-06-30", status:"Ativo", diasFim:61, alerta:"renovar", measurements:[] },
];
