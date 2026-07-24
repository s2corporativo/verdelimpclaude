import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { linhaFolha } from "@/lib/folha";

export const dynamic = "force-dynamic";

const READ_ROLES = ["ADMIN", "GESTOR", "FINANCEIRO", "FISCAL"];
const CANCELLED = ["cancelada", "cancelado", "cancelled", "CANCELLED", "Cancelado"];

type PaymentMonth = { competencia: string; recebido: Prisma.Decimal };

function validYear(value: string) {
  return /^\d{4}$/.test(value) && Number(value) >= 2000 && Number(value) <= 2100;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...READ_ROLES);
  if (erro) return erro;

  const ano = req.nextUrl.searchParams.get("ano") || String(new Date().getFullYear());
  if (!validYear(ano)) {
    return NextResponse.json({ error: "Ano inválido" }, { status: 400 });
  }

  try {
    const start = new Date(`${ano}-01-01T00:00:00.000Z`);
    const end = new Date(`${Number(ano) + 1}-01-01T00:00:00.000Z`);

    const [nfses, tributos, despesas, recebimentos, funcionarios] = await Promise.all([
      prisma.fiscalNfse.findMany({
        where: { competence: { startsWith: `${ano}-` }, status: { notIn: CANCELLED } },
        select: { competence: true, serviceValue: true, netAmount: true, status: true },
      }),
      prisma.fiscalTaxExpense.findMany({
        where: { competence: { startsWith: `${ano}-` }, status: { notIn: CANCELLED } },
        select: { competence: true, totalAmount: true, status: true },
      }),
      prisma.expense.findMany({
        where: {
          competence: { startsWith: `${ano}-` },
          deletedAt: null,
          status: { notIn: CANCELLED },
          category: { isNot: { type: "receita" } },
        },
        select: { competence: true, amount: true, status: true },
      }),
      prisma.$queryRaw<PaymentMonth[]>(Prisma.sql`
        SELECT TO_CHAR(p.paid_at, 'YYYY-MM') AS competencia, COALESCE(SUM(p.amount), 0) AS recebido
        FROM erp_receivable_payment p
        WHERE p.paid_at >= ${start} AND p.paid_at < ${end}
        GROUP BY TO_CHAR(p.paid_at, 'YYYY-MM')
      `),
      prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    ]);

    const map = new Map<string, {
      receitaBruta: number;
      receitaLiquidaNfse: number;
      receitaRecebida: number;
      deducoesTributos: number;
      despesasOp: number;
    }>();

    for (let m = 1; m <= 12; m += 1) {
      map.set(`${ano}-${String(m).padStart(2, "0")}`, {
        receitaBruta: 0,
        receitaLiquidaNfse: 0,
        receitaRecebida: 0,
        deducoesTributos: 0,
        despesasOp: 0,
      });
    }

    for (const item of nfses) {
      const row = map.get(item.competence);
      if (!row) continue;
      row.receitaBruta += Number(item.serviceValue || 0);
      row.receitaLiquidaNfse += Number(item.netAmount || 0);
    }
    for (const item of tributos) {
      const row = map.get(item.competence);
      if (row) row.deducoesTributos += Number(item.totalAmount || 0);
    }
    for (const item of despesas) {
      const row = map.get(item.competence);
      if (row) row.despesasOp += Number(item.amount || 0);
    }
    for (const item of recebimentos) {
      const row = map.get(item.competencia);
      if (row) row.receitaRecebida += Number(item.recebido || 0);
    }

    const meses = Array.from(map.entries()).map(([competencia, values], index) => ({
      competencia,
      mes: index + 1,
      ...values,
      resultadoOperacional: values.receitaBruta - values.deducoesTributos - values.despesasOp,
    }));

    const totais = meses.reduce((acc, item) => ({
      receitaBruta: acc.receitaBruta + item.receitaBruta,
      receitaLiquidaNfse: acc.receitaLiquidaNfse + item.receitaLiquidaNfse,
      receitaRecebida: acc.receitaRecebida + item.receitaRecebida,
      deducoesTributos: acc.deducoesTributos + item.deducoesTributos,
      despesasOp: acc.despesasOp + item.despesasOp,
      resultadoOperacional: acc.resultadoOperacional + item.resultadoOperacional,
    }), {
      receitaBruta: 0,
      receitaLiquidaNfse: 0,
      receitaRecebida: 0,
      deducoesTributos: 0,
      despesasOp: 0,
      resultadoOperacional: 0,
    });

    const folhaReferenciaAtual = funcionarios.reduce((acc, employee) => {
      const linha = linhaFolha(employee as any);
      acc.salarioBase += Number(employee.salary || 0);
      acc.custoPleno += Number(linha.custoPleno || 0);
      return acc;
    }, { salarioBase: 0, custoPleno: 0 });

    return NextResponse.json({
      ano,
      meses,
      totais,
      folhaReferenciaAtual,
      metadata: {
        regime: "competencia",
        receitaFaturadaFonte: "FiscalNfse.serviceValue",
        receitaRecebidaFonte: "erp_receivable_payment.paid_at",
        folhaFonte: "cadastro atual de funcionários ativos",
        folhaHistoricaDisponivel: false,
        aviso: "A folha exibida é referência atual e não integra automaticamente o resultado histórico da DRE.",
      },
    });
  } catch (error) {
    return erroInterno(error, "api/dre GET");
  }
}
