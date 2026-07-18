// src/app/api/dre/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ano = searchParams.get("ano") || new Date().getFullYear().toString();

  try {
    const meses: any[] = [];
    for (let m = 1; m <= 12; m++) {
      const comp = `${ano}-${String(m).padStart(2, "0")}`;
      const [nfses, tributos, despesas] = await Promise.all([
        prisma.fiscalNfse.aggregate({ where: { competence: comp }, _sum: { serviceValue: true } }),
        prisma.fiscalTaxExpense.aggregate({ where: { competence: comp }, _sum: { totalAmount: true } }),
        // Só DESPESAS de verdade: o faturamento de medição gera um lançamento de
        // categoria tipo "receita" nesta mesma tabela — somá-lo aqui subtraía a
        // receita duas vezes do lucro (double-count corrigido).
        prisma.expense.aggregate({
          where: { competence: comp, deletedAt: null, category: { isNot: { type: "receita" } } },
          _sum: { amount: true },
        }),
      ]);
      const rec = Number(nfses._sum.serviceValue || 0);
      const trib = Number(tributos._sum.totalAmount || 0);
      const desp = Number(despesas._sum.amount || 0);
      meses.push({ competencia: comp, mes: m, receitaBruta: rec, deducoesTributos: trib, despesasOp: desp, lucroLiquido: rec - trib - desp });
    }

    const totais = meses.reduce((acc, m) => ({
      receitaBruta: acc.receitaBruta + m.receitaBruta,
      deducoesTributos: acc.deducoesTributos + m.deducoesTributos,
      despesasOp: acc.despesasOp + m.despesasOp,
      lucroLiquido: acc.lucroLiquido + m.lucroLiquido,
    }), { receitaBruta: 0, deducoesTributos: 0, despesasOp: 0, lucroLiquido: 0 });

    const folha = await prisma.employee.aggregate({ where: { active: true }, _sum: { salary: true } });
    const folhaMensal = Number(folha._sum.salary || 0);
    const folhaAnual = folhaMensal * 12;

    return NextResponse.json({ ano, meses, totais, folhaMensal, folhaAnual });
  } catch (e) {
    // Relatório financeiro NUNCA devolve número fabricado quando o banco falha —
    // dado demo plausível mascarando erro é pior que erro explícito.
    return erroInterno(e, "api/dre GET");
  }
}
