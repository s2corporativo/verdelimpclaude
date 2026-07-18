// RH — Férias e ocorrências disciplinares (advertências/suspensões).
// Períodos aquisitivos são calculados a partir da admissão; o limite de gozo
// (11 meses após o fim do aquisitivo) alimenta a Central de Alertas.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPapel, erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      select: {
        id: true, name: true, role: true, admissionDate: true,
        vacations: { orderBy: { acqEnd: "desc" } },
        disciplinary: { orderBy: { date: "desc" } },
      },
      orderBy: { name: "asc" },
    });

    const linhas = funcionarios.map((f) => {
      // último período aquisitivo completo
      const adm = new Date(f.admissionDate);
      let acqEnd = new Date(adm); acqEnd.setFullYear(acqEnd.getFullYear() + 1);
      let temPeriodo = acqEnd <= hoje;
      while (temPeriodo) { const prox = new Date(acqEnd); prox.setFullYear(prox.getFullYear() + 1); if (prox <= hoje) acqEnd = prox; else break; }
      const acqStart = new Date(acqEnd); acqStart.setFullYear(acqStart.getFullYear() - 1);
      // Período concessivo (CLT art. 134): 12 meses após o período aquisitivo.
      // A dobra (art. 137) ocorre se as férias não forem concedidas nesse prazo.
      const limiteGozo = new Date(acqEnd); limiteGozo.setMonth(limiteGozo.getMonth() + 12);

      const feriasDoPeriodo = f.vacations.find((v) => Math.abs(new Date(v.acqEnd).getTime() - acqEnd.getTime()) < 45 * 24 * 3600 * 1000);
      let situacaoFerias: string;
      if (!temPeriodo) situacaoFerias = "sem_periodo";
      else if (feriasDoPeriodo && ["concluida", "em_gozo"].includes(feriasDoPeriodo.status)) situacaoFerias = "em_dia";
      else if (feriasDoPeriodo && feriasDoPeriodo.status === "agendada") situacaoFerias = "agendada";
      else if (limiteGozo < hoje) situacaoFerias = "estourada";
      else {
        const em90 = new Date(hoje); em90.setDate(em90.getDate() + 90);
        situacaoFerias = limiteGozo <= em90 ? "a_vencer" : "pendente";
      }

      return {
        id: f.id, name: f.name, role: f.role, admissionDate: f.admissionDate,
        periodoAquisitivo: temPeriodo ? { inicio: acqStart, fim: acqEnd, limiteGozo } : null,
        situacaoFerias,
        ferias: f.vacations,
        ocorrencias: f.disciplinary,
      };
    });

    return NextResponse.json({
      linhas,
      resumo: {
        estouradas: linhas.filter((l) => l.situacaoFerias === "estourada").length,
        aVencer: linhas.filter((l) => l.situacaoFerias === "a_vencer").length,
        pendentes: linhas.filter((l) => l.situacaoFerias === "pendente").length,
        ocorrencias30d: linhas.reduce((s, l) => s + l.ocorrencias.filter((o: any) => new Date(o.date) >= new Date(Date.now() - 30 * 24 * 3600 * 1000)).length, 0),
      },
    });
  } catch (e: any) {
    return erroInterno(e, "api/rh-ocorrencias");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const b = await req.json();

    if (b.tipo === "ferias") {
      if (!b.employeeId || !b.acqStart || !b.acqEnd) return NextResponse.json({ error: "Funcionário e período aquisitivo são obrigatórios" }, { status: 400 });
      const v = await prisma.vacation.create({
        data: {
          employeeId: b.employeeId,
          acqStart: new Date(b.acqStart), acqEnd: new Date(b.acqEnd),
          startDate: b.startDate ? new Date(b.startDate) : null,
          endDate: b.endDate ? new Date(b.endDate) : null,
          days: b.days ? Number(b.days) : 30,
          soldDays: b.soldDays ? Number(b.soldDays) : 0,
          status: b.status || (b.startDate ? "agendada" : "prevista"),
          notes: b.notes || null,
        },
      });
      return NextResponse.json({ ok: true, id: v.id });
    }

    if (b.tipo === "ocorrencia") {
      if (!b.employeeId || !b.type || !b.date || !b.reason) return NextResponse.json({ error: "Funcionário, tipo, data e motivo são obrigatórios" }, { status: 400 });
      const o = await prisma.disciplinaryAction.create({
        data: {
          employeeId: b.employeeId, type: b.type, date: new Date(b.date), reason: b.reason,
          suspensionDays: b.suspensionDays ? Number(b.suspensionDays) : null, notes: b.notes || null,
        },
      });
      return NextResponse.json({ ok: true, id: o.id });
    }

    return NextResponse.json({ error: "tipo deve ser 'ferias' ou 'ocorrencia'" }, { status: 400 });
  } catch (e: any) {
    return erroInterno(e, "api/rh-ocorrencias");
  }
}

export async function PUT(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const b = await req.json();
    if (!b.id || !b.tipo) return NextResponse.json({ error: "id e tipo obrigatórios" }, { status: 400 });
    if (b.tipo === "ferias") {
      const data: any = {};
      for (const k of ["status", "notes"]) if (b[k] !== undefined) data[k] = b[k];
      if (b.startDate !== undefined) data.startDate = b.startDate ? new Date(b.startDate) : null;
      if (b.endDate !== undefined) data.endDate = b.endDate ? new Date(b.endDate) : null;
      if (b.days !== undefined) data.days = Number(b.days);
      await prisma.vacation.update({ where: { id: b.id }, data });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "tipo inválido" }, { status: 400 });
  } catch (e: any) {
    return erroInterno(e, "api/rh-ocorrencias");
  }
}

export async function DELETE(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const id = req.nextUrl.searchParams.get("id");
    const tipo = req.nextUrl.searchParams.get("tipo");
    if (!id || !tipo) return NextResponse.json({ error: "id e tipo obrigatórios" }, { status: 400 });
    if (tipo === "ferias") await prisma.vacation.delete({ where: { id } });
    else await prisma.disciplinaryAction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return erroInterno(e, "api/rh-ocorrencias");
  }
}
