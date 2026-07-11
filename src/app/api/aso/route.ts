// ASO — Atestados de Saúde Ocupacional com controle de vencimento.
// O exame mais recente de cada funcionário alimenta o Monitor de Documentação.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusPorValidade } from "@/lib/monitor-docs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, asoExams: { orderBy: { examDate: "desc" } } },
      orderBy: { name: "asc" },
    });

    const linhas = funcionarios.map((f) => {
      const atual = f.asoExams[0] || null;
      return {
        id: f.id, name: f.name, role: f.role,
        atual: atual ? { ...atual, status: statusPorValidade(atual.expiresAt, true) } : null,
        historico: f.asoExams.slice(1),
      };
    });

    const semAso = linhas.filter((l) => !l.atual).length;
    const vencidos = linhas.filter((l) => l.atual && statusPorValidade(l.atual.expiresAt, true) === "vencido").length;
    const aVencer = linhas.filter((l) => l.atual && statusPorValidade(l.atual.expiresAt, true) === "a_vencer").length;

    return NextResponse.json({ linhas, resumo: { total: linhas.length, semAso, vencidos, aVencer } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.employeeId || !b.examDate) return NextResponse.json({ error: "Funcionário e data do exame são obrigatórios" }, { status: 400 });
    const exame = await prisma.asoExam.create({
      data: {
        employeeId: b.employeeId,
        examType: b.examType || "periodico",
        examDate: new Date(b.examDate),
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        result: b.result || "apto",
        doctor: b.doctor || null,
        crm: b.crm || null,
        notes: b.notes || null,
      },
    });
    return NextResponse.json({ ok: true, id: exame.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.asoExam.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
