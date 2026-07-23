// Fluxo de Caixa — dados diários/mensais + centro de custos
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "FINANCEIRO");
  if (erro) return erro;
  try {
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get("periodo") || "mensal"; // diario | mensal
    const meses = parseInt(searchParams.get("meses") || "12", 10);
    const hoje = new Date();

    // Fluxo de caixa mensal
    const fluxoMensal: any[] = [];
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const comp = d.toISOString().slice(0, 7);
      const inicioMes = new Date(d.getFullYear(), d.getMonth(), 1);
      const fimMes = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const [despesas, receitasNfse, receitasLancadas, despesasPagas] = await Promise.all([
        prisma.expense.aggregate({
          where: { dueDate: { gte: inicioMes, lte: fimMes }, deletedAt: null },
          _sum: { amount: true }, _count: true,
        }),
        prisma.fiscalNfse.aggregate({
          where: { issueDate: { gte: inicioMes, lte: fimMes } },
          _sum: { serviceValue: true },
        }),
        prisma.expense.aggregate({
          where: {
            dueDate: { gte: inicioMes, lte: fimMes }, deletedAt: null,
            category: { type: "receita" },
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            paidAt: { gte: inicioMes, lte: fimMes }, deletedAt: null,
            category: { type: { not: "receita" } },
          },
          _sum: { amount: true },
        }),
      ]);

      const totalReceitas = Number(receitasNfse._sum?.serviceValue || 0) + Number(receitasLancadas._sum?.amount || 0);
      const totalDespesas = Number(despesas._sum?.amount || 0);
      const despesasPagasValor = Number(despesasPagas._sum?.amount || 0);
      const saldoMes = totalReceitas - totalDespesas;

      fluxoMensal.push({
        competencia: comp,
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        receitas: totalReceitas,
        despesas: totalDespesas,
        despesasPagas: despesasPagasValor,
        despesasAbertas: totalDespesas - despesasPagasValor,
        saldo: saldoMes,
        qtdDespesas: despesas._count,
      });
    }

    // Saldo acumulado
    let acumulado = 0;
    for (const m of fluxoMensal) {
      acumulado += m.saldo;
      m.saldoAcumulado = acumulado;
    }

    // Centro de custos — despesas por categoria
    const despesasPorCategoria = await prisma.expense.groupBy({
      by: ["categoryId"],
      where: { deletedAt: null, category: { type: { not: "receita" } } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
    });

    const categorias = await prisma.expenseCategory.findMany({
      where: { type: { not: "receita" } },
      select: { id: true, name: true, type: true },
    });
    const catMap = new Map(categorias.map(c => [c.id, c.name]));

    const centroCustos = despesasPorCategoria.map(d => ({
      categoria: catMap.get(d.categoryId || "") || "Sem categoria",
      categoryId: d.categoryId,
      total: Number(d._sum?.amount || 0),
      qtdLancamentos: d._count,
    }));

    // Despesas por fornecedor (top 10)
    const despesasPorFornecedor = await prisma.expense.groupBy({
      by: ["supplierId"],
      where: { deletedAt: null, category: { type: { not: "receita" } } },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    });
    const fornecedores = await prisma.supplier.findMany({
      select: { id: true, name: true },
    });
    const fornMap = new Map(fornecedores.map(f => [f.id, f.name]));

    const topFornecedores = despesasPorFornecedor.map(d => ({
      fornecedor: fornMap.get(d.supplierId || "") || "Sem fornecedor",
      total: Number(d._sum?.amount || 0),
      qtdLancamentos: d._count,
    }));

    // Resumo geral
    const totalReceitasGeral = fluxoMensal.reduce((s, m) => s + m.receitas, 0);
    const totalDespesasGeral = fluxoMensal.reduce((s, m) => s + m.despesas, 0);

    return NextResponse.json({
      fluxoMensal,
      centroCustos,
      topFornecedores,
      resumo: {
        totalReceitas: totalReceitasGeral,
        totalDespesas: totalDespesasGeral,
        saldoGeral: totalReceitasGeral - totalDespesasGeral,
        mediaReceitaMensal: totalReceitasGeral / (meses || 1),
        mediaDespesaMensal: totalDespesasGeral / (meses || 1),
      },
    });
  } catch (e) {
    return erroInterno(e, "api/financeiro/fluxo-caixa");
  }
}
