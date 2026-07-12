// Módulo Tributário — fornece os dados reais da empresa (receita 12m, folha
// 12m, ISS) para pré-preencher o simulador e a auditoria de economia.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const agora = new Date();
    const dozeMesesAtras = new Date(agora); dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12);

    const [config, medicoes, nfse, funcionarios] = await Promise.all([
      prisma.companyConfig.findFirst(),
      prisma.measurement.findMany({ where: { status: { in: ["aprovada", "faturada"] }, createdAt: { gte: dozeMesesAtras } }, select: { value: true } }),
      prisma.fiscalNfse.findMany({ where: { createdAt: { gte: dozeMesesAtras } }, select: { serviceValue: true } }).catch(() => [] as any[]),
      prisma.employee.findMany({ where: { active: true }, select: { salary: true } }),
    ]);

    // Receita 12m: usa NFS-e se houver; senão, medições aprovadas/faturadas
    const receitaNfse = nfse.reduce((s: number, n: any) => s + Number(n.serviceValue), 0);
    const receitaMedicoes = medicoes.reduce((s, m) => s + Number(m.value), 0);
    const receita12 = receitaNfse > 0 ? receitaNfse : receitaMedicoes;

    // Folha 12m para o Fator R: salários × 12 + FGTS 8% (aproximação; pró-labore
    // e demais encargos devem ser somados pelo contador). Editável na tela.
    const folhaMensal = funcionarios.reduce((s, f) => s + Number(f.salary), 0);
    const folha12 = folhaMensal * 12 * 1.08;

    return NextResponse.json({
      temDados: receita12 > 0 || funcionarios.length > 0,
      receita12,
      receitaMensalMedia: receita12 / 12,
      folha12,
      folhaMensal,
      qtdFuncionarios: funcionarios.length,
      issPct: config ? Number(config.aliqISS) : 5,
      regime: config?.regimeTributario || "Simples Nacional",
      fontesReceita: { nfse: receitaNfse, medicoes: receitaMedicoes },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, temDados: false, receita12: 0, folha12: 0, issPct: 5 }, { status: 500 });
  }
}
