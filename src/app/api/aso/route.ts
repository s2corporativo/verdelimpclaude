// ASO — Atestados de Saúde Ocupacional com controle de vencimento.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusPorValidade } from "@/lib/monitor-docs";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "OPERACIONAL");
  if (erro) return erro;
  try {
    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, asoExams: { orderBy: { examDate: "desc" } } },
      orderBy: { name: "asc" },
    });
    const linhas = funcionarios.map((f) => {
      const exams = f.asoExams.map((x) => ({ ...x, status: statusPorValidade(x.expiresAt, true) }));
      return { id: f.id, name: f.name, role: f.role, atual: exams[0] || null, historico: exams.slice(1) };
    });
    const semAso = linhas.filter((l) => !l.atual).length;
    const vencidos = linhas.filter((l) => l.atual?.status === "vencido").length;
    const aVencer = linhas.filter((l) => l.atual?.status === "a_vencer").length;
    return NextResponse.json({ linhas, resumo: { total: linhas.length, semAso, vencidos, aVencer } });
  } catch (e) { return erroInterno(e, "api/aso GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const b = await req.json();
    if (!b.employeeId || !b.examDate) return NextResponse.json({ error: "Funcionário e data do exame são obrigatórios" }, { status: 400 });
    const exame = await prisma.asoExam.create({ data: {
      employeeId: b.employeeId, examType: b.examType || "periodico", examDate: new Date(b.examDate),
      expiresAt: b.expiresAt ? new Date(b.expiresAt) : null, result: b.result || "apto",
      doctor: b.doctor || null, crm: b.crm || null, filePath: b.filePath || null, notes: b.notes || null,
    }});
    await registrarAuditoria({ userId: user!.id, action: "CRIAR", module: "sst", entityType: "AsoExam", entityId: exame.id, newValues: { employeeId: b.employeeId, examType: b.examType, result: b.result, filePath: b.filePath || null } });
    return NextResponse.json({ ok: true, id: exame.id });
  } catch (e) { return erroInterno(e, "api/aso POST"); }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.asoExam.delete({ where: { id } });
    await registrarAuditoria({ userId: user!.id, action: "EXCLUIR", module: "sst", entityType: "AsoExam", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) { return erroInterno(e, "api/aso DELETE"); }
}
