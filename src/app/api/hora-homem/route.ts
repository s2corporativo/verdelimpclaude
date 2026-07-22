// Custo Hora-Homem — dados para a inteligência de precificação de mão de obra:
// funções reais da folha (salário médio), parâmetros da empresa, produtividades
// e referências de mercado (PricingRule)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PARAMETROS_PADRAO, PRODUTIVIDADES_PADRAO, custoHoraHomem } from "@/lib/hora-homem";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const [funcionarios, config, mercado] = await Promise.all([
      prisma.employee.findMany({ where: { active: true }, select: { role: true, salary: true } }),
      prisma.companyConfig.findFirst(),
      prisma.pricingRule.findMany({ orderBy: { serviceType: "asc" } }).catch(() => []),
    ]);

    // Agrupa por função: salário médio e quantidade de pessoas
    const porFuncao = new Map<string, { total: number; qtd: number }>();
    for (const f of funcionarios) {
      const atual = porFuncao.get(f.role) || { total: 0, qtd: 0 };
      atual.total += Number(f.salary);
      atual.qtd += 1;
      porFuncao.set(f.role, atual);
    }

    const parametros = {
      ...PARAMETROS_PADRAO,
      fgtsPct: config ? Number(config.aliqFGTS) : PARAMETROS_PADRAO.fgtsPct,
      inssPatronalPct: config ? Number(config.aliqINSS) : PARAMETROS_PADRAO.inssPatronalPct,
    };

    const funcoes = Array.from(porFuncao.entries()).map(([funcao, v]) => {
      const salarioMedio = v.total / v.qtd;
      const custo = custoHoraHomem(salarioMedio, parametros);
      return { funcao, pessoas: v.qtd, salarioMedio, custo };
    }).sort((a, b) => a.funcao.localeCompare(b.funcao));

    return NextResponse.json({
      funcoes,
      parametros,
      produtividades: PRODUTIVIDADES_PADRAO,
      mercado: mercado.map((m: any) => ({
        serviceType: m.serviceType, unit: m.unit,
        minPrice: Number(m.minPrice), maxPrice: Number(m.maxPrice), marketReference: Number(m.marketReference),
      })),
      _semFolha: funcoes.length === 0,
    });
  } catch (error) {
    return erroInterno(error, "api/hora-homem:get");
  }
}
