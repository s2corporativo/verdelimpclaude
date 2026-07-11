// Central de Alertas — tudo que vence ou exige ação, agregado num painel só:
// contratos, ASO, treinamentos/CNH, EPI (CA e reposição), licenças ambientais,
// documentos do GED, docs de funcionários e férias (período concessivo).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Alerta {
  categoria: string;
  titulo: string;
  detalhe: string;
  vence: Date | null;
  nivel: "critico" | "atencao" | "info";
  link: string;
}

export async function GET() {
  try {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);
    const em90 = new Date(hoje); em90.setDate(em90.getDate() + 90);

    const [contratos, funcionarios, treinamentos, epis, ambientais, gedDocs, empDocs, ferias] = await Promise.all([
      prisma.contract.findMany({ where: { status: "Ativo", endDate: { lte: em90 } }, include: { client: { select: { name: true } } } }),
      prisma.employee.findMany({ where: { active: true }, select: { id: true, name: true, admissionDate: true, asoExams: { orderBy: { examDate: "desc" }, take: 1 } } }),
      prisma.training.findMany({ where: { expiresAt: { lte: em30 } }, include: { employee: { select: { name: true, active: true } } } }),
      prisma.inventoryEpiDelivery.findMany({
        where: { status: "ativo", OR: [{ caExpirationDate: { lte: em30 } }, { expectedReplacementDate: { lte: em30 } }] },
        include: { employee: { select: { name: true, active: true } }, item: { select: { description: true } } },
      }),
      prisma.environmentalRecord.findMany({ where: { expiresAt: { lte: em30, not: null } }, include: { contract: { select: { number: true } } } }),
      prisma.document.findMany({ where: { status: "ativo", validade: { lte: em30, not: null } }, select: { nome: true, categoria: true, validade: true } }),
      prisma.employeeDoc.findMany({ where: { expiresAt: { lte: em30 } }, include: { employee: { select: { name: true, active: true } } } }),
      prisma.vacation.findMany({ include: { employee: { select: { id: true, name: true, active: true } } } }),
    ]);

    const alertas: Alerta[] = [];
    const nivelPorData = (d: Date | null): Alerta["nivel"] => {
      if (!d) return "info";
      return new Date(d) < hoje ? "critico" : "atencao";
    };
    const fdata = (d: Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

    // Contratos vencendo (90 dias)
    for (const c of contratos) alertas.push({
      categoria: "Contratos", nivel: nivelPorData(c.endDate),
      titulo: `Contrato ${c.number} — ${c.client?.name || c.object}`,
      detalhe: new Date(c.endDate) < hoje ? `venceu em ${fdata(c.endDate)}` : `vence em ${fdata(c.endDate)} — negociar renovação/reajuste (${c.adjustIndex})`,
      vence: c.endDate, link: "/dashboard/contratos",
    });

    // ASO: vencidos/a vencer/sem ASO
    for (const f of funcionarios) {
      const aso = f.asoExams[0];
      if (!aso) {
        alertas.push({ categoria: "ASO", nivel: "atencao", titulo: f.name, detalhe: "sem ASO registrado", vence: null, link: "/dashboard/aso" });
      } else if (aso.expiresAt && new Date(aso.expiresAt) <= em30) {
        alertas.push({ categoria: "ASO", nivel: nivelPorData(aso.expiresAt), titulo: f.name, detalhe: `ASO ${new Date(aso.expiresAt) < hoje ? "VENCIDO" : "vence"} em ${fdata(aso.expiresAt)}`, vence: aso.expiresAt, link: "/dashboard/aso" });
      }
    }

    // Treinamentos e CNH
    for (const t of treinamentos) if (t.employee?.active) alertas.push({
      categoria: t.trainingType.toUpperCase().includes("CNH") ? "CNH" : "Treinamentos NR",
      nivel: nivelPorData(t.expiresAt),
      titulo: `${t.employee.name} — ${t.trainingType}`,
      detalhe: `${new Date(t.expiresAt) < hoje ? "VENCIDO" : "vence"} em ${fdata(t.expiresAt)}`,
      vence: t.expiresAt, link: "/dashboard/treinamentos",
    });

    // EPI: CA vencendo ou reposição prevista
    for (const e of epis) if (e.employee?.active) {
      const data = e.caExpirationDate && new Date(e.caExpirationDate) <= em30 ? e.caExpirationDate : e.expectedReplacementDate;
      alertas.push({
        categoria: "EPI", nivel: nivelPorData(data),
        titulo: `${e.employee.name} — ${e.item?.description || "EPI"}`,
        detalhe: e.caExpirationDate && new Date(e.caExpirationDate) <= em30 ? `CA ${e.caNumber || ""} vence em ${fdata(e.caExpirationDate)}` : `reposição prevista para ${fdata(e.expectedReplacementDate)}`,
        vence: data, link: "/dashboard/epi",
      });
    }

    // Licenças ambientais
    for (const a of ambientais) alertas.push({
      categoria: "Ambiental", nivel: nivelPorData(a.expiresAt),
      titulo: `${a.type}${a.number ? ` ${a.number}` : ""}${a.contract ? ` — ${a.contract.number}` : ""}`,
      detalhe: `${a.expiresAt && new Date(a.expiresAt) < hoje ? "VENCIDA" : "vence"} em ${fdata(a.expiresAt)}`,
      vence: a.expiresAt, link: "/dashboard/ambiental",
    });

    // GED: certidões e documentos com validade
    for (const d of gedDocs) alertas.push({
      categoria: "Documentos (GED)", nivel: nivelPorData(d.validade),
      titulo: d.nome, detalhe: `${d.categoria} — ${d.validade && new Date(d.validade) < hoje ? "VENCIDO" : "vence"} em ${fdata(d.validade)}`,
      vence: d.validade, link: "/dashboard/documentos",
    });

    // Docs de funcionários
    for (const d of empDocs) if (d.employee?.active) alertas.push({
      categoria: "Docs de funcionário", nivel: nivelPorData(d.expiresAt),
      titulo: `${d.employee.name} — ${d.docType}`,
      detalhe: `${new Date(d.expiresAt) < hoje ? "VENCIDO" : "vence"} em ${fdata(d.expiresAt)}`,
      vence: d.expiresAt, link: "/dashboard/rh",
    });

    // Férias: período concessivo estourando (CLT: gozo até 11 meses após fim do aquisitivo)
    const comFerias = new Set(ferias.filter((v) => ["concluida", "em_gozo", "agendada"].includes(v.status)).map((v) => `${v.employeeId}:${v.acqEnd.toISOString().slice(0, 7)}`));
    for (const f of funcionarios) {
      const adm = new Date(f.admissionDate);
      // último período aquisitivo COMPLETO
      let acqEnd = new Date(adm); acqEnd.setFullYear(acqEnd.getFullYear() + 1);
      while (true) { const prox = new Date(acqEnd); prox.setFullYear(prox.getFullYear() + 1); if (prox <= hoje) acqEnd = prox; else break; }
      if (acqEnd > hoje || acqEnd <= adm) continue; // ainda não completou 1 ano
      const limiteGozo = new Date(acqEnd); limiteGozo.setMonth(limiteGozo.getMonth() + 11);
      const chave = `${f.id}:${acqEnd.toISOString().slice(0, 7)}`;
      if (!comFerias.has(chave) && limiteGozo <= em90) {
        alertas.push({
          categoria: "Férias", nivel: limiteGozo < hoje ? "critico" : limiteGozo <= em30 ? "critico" : "atencao",
          titulo: f.name,
          detalhe: limiteGozo < hoje ? `período concessivo ESTOURADO (pagamento em dobro) — limite era ${fdata(limiteGozo)}` : `precisa gozar férias até ${fdata(limiteGozo)}`,
          vence: limiteGozo, link: "/dashboard/rh-ocorrencias",
        });
      }
    }

    alertas.sort((a, b) => (a.vence ? new Date(a.vence).getTime() : 0) - (b.vence ? new Date(b.vence).getTime() : 0));
    const porCategoria: Record<string, number> = {};
    for (const a of alertas) porCategoria[a.categoria] = (porCategoria[a.categoria] || 0) + 1;

    return NextResponse.json({
      alertas,
      resumo: {
        total: alertas.length,
        criticos: alertas.filter((a) => a.nivel === "critico").length,
        atencao: alertas.filter((a) => a.nivel === "atencao").length,
        porCategoria,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, alertas: [], resumo: { total: 0, criticos: 0, atencao: 0, porCategoria: {} } }, { status: 500 });
  }
}
