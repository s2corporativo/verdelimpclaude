// src/app/api/dre/route.ts
// Adaptado de: verdelimp-erp-prime-final/drizzle/schema.ts → dreSummary table
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        prisma.expense.aggregate({ where: { competence: comp, deletedAt: null }, _sum: { amount: true } }),
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
  } catch {
    // Dados demo
    const mesesDemo = [
      { competencia: `${ano}-01`, mes: 1, receitaBruta: 50000, deducoesTributos: 6200, despesasOp: 19000, lucroLiquido: 24800 },
      { competencia: `${ano}-02`, mes: 2, receitaBruta: 48600, deducoesTributos: 5900, despesasOp: 18500, lucroLiquido: 24200 },
      { competencia: `${ano}-03`, mes: 3, receitaBruta: 54200, deducoesTributos: 6600, despesasOp: 20000, lucroLiquido: 27600 },
      { competencia: `${ano}-04`, mes: 4, receitaBruta: 57000, deducoesTributos: 7870, despesasOp: 22100, lucroLiquido: 27030 },
      { competencia: `${ano}-05`, mes: 5, receitaBruta: 0, deducoesTributos: 0, despesasOp: 0, lucroLiquido: 0 },
      { competencia: `${ano}-06`, mes: 6, receitaBruta: 0, deducoesTributos: 0, despesasOp: 0, lucroLiquido: 0 },
      ...Array.from({ length: 6 }, (_, i) => ({ competencia: `${ano}-${String(i+7).padStart(2,"0")}`, mes: i+7, receitaBruta: 0, deducoesTributos: 0, despesasOp: 0, lucroLiquido: 0 })),
    ];
    const totais = mesesDemo.reduce((a, m) => ({ receitaBruta: a.receitaBruta+m.receitaBruta, deducoesTributos: a.deducoesTributos+m.deducoesTributos, despesasOp: a.despesasOp+m.despesasOp, lucroLiquido: a.lucroLiquido+m.lucroLiquido }), { receitaBruta: 0, deducoesTributos: 0, despesasOp: 0, lucroLiquido: 0 });
    return NextResponse.json({ ano, meses: mesesDemo, totais, folhaMensal: 20600, folhaAnual: 247200, _demo: true });
  }
}
