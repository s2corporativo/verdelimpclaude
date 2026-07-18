// Módulo Tributário — fornece os dados reais da empresa (receita 12m, folha
// 12m, ISS) para pré-preencher o simulador e a auditoria de economia.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { competenciasAnteriores } from "@/lib/fiscal-calc";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // RBT12 é conceito de COMPETÊNCIA (fato gerador), não de data de lançamento:
    // uma NFS-e digitada com atraso precisa cair no mês do serviço, não no mês
    // em que foi registrada — por isso o filtro usa competence/period, não createdAt.
    const agora = new Date();
    const compAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
    const ultimas12 = competenciasAnteriores(compAtual, 12);

    const [config, medicoes, nfse, funcionarios] = await Promise.all([
      prisma.companyConfig.findFirst(),
      prisma.measurement.findMany({ where: { status: { in: ["aprovada", "faturada"] }, period: { in: ultimas12 } }, select: { value: true } }),
      prisma.fiscalNfse.findMany({ where: { competence: { in: ultimas12 } }, select: { serviceValue: true } }).catch(() => [] as any[]),
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
