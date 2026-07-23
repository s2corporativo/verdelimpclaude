import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "OPERACIONAL");
  if (erro) return erro;
  try {
    const data = await prisma.training.findMany({ orderBy: { expiresAt: "asc" }, include: { employee: { select: { name: true, role: true } } } });
    const hoje = new Date(); const em30 = new Date(hoje.getTime()+30*86400000);
    const enriched = data.map(t => ({ ...t, status: new Date(t.expiresAt) < hoje ? "vencido" : new Date(t.expiresAt) < em30 ? "a_vencer" : "valido", diasVenc: Math.ceil((new Date(t.expiresAt).getTime()-hoje.getTime())/86400000) }));
    if (!enriched.length) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data: enriched, vencidos: enriched.filter(t=>t.status==="vencido").length, aVencer: enriched.filter(t=>t.status==="a_vencer").length });
  } catch (e) { return erroInterno(e, "api/treinamentos GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const b = await req.json();
    if (!b.employeeId || !b.trainingType || !b.issuedAt || !b.expiresAt) return NextResponse.json({ error: "Funcionário, treinamento, emissão e vencimento são obrigatórios" }, { status: 400 });
    const t = await prisma.training.create({ data: {
      employeeId: b.employeeId, trainingType: b.trainingType, issuedAt: new Date(b.issuedAt), expiresAt: new Date(b.expiresAt),
      institution: b.institution || null, certificatePath: b.certificatePath || null, status: "valido",
    }});
    await registrarAuditoria({ userId: user!.id, action: "CRIAR", module: "sst", entityType: "Training", entityId: t.id, newValues: { employeeId: b.employeeId, trainingType: b.trainingType, certificatePath: b.certificatePath || null } });
    return NextResponse.json(t, { status: 201 });
  } catch (e) { return erroInterno(e, "api/treinamentos POST"); }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.training.delete({ where: { id } });
    await registrarAuditoria({ userId: user!.id, action: "EXCLUIR", module: "sst", entityType: "Training", entityId: id });
    return NextResponse.json({ success: true });
  } catch (e) { return erroInterno(e, "api/treinamentos DELETE"); }
}

const DEMO = [
  { id:"t1", employee:{ name:"Abrão Felipe", role:"Op. Roçadeira" }, trainingType:"NR-12", issuedAt:"2025-06-01", expiresAt:"2026-06-01", institution:"SENAI Betim", certificatePath:null, status:"a_vencer", diasVenc:32 },
];
