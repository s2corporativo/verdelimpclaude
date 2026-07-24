import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { linhaFolha } from "@/lib/folha";

export const dynamic = "force-dynamic";

const READ_ROLES = ["ADMIN", "GESTOR", "FINANCEIRO", "FISCAL"];
const CANCELLED = ["cancelada", "cancelado", "cancelled", "CANCELLED", "Cancelado"];

function monthBounds(competencia: string) {
  const [year, month] = competencia.split("-").map(Number);
  if (!year || !month || month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...READ_ROLES);
  if (erro) return erro;

  const competencia = req.nextUrl.searchParams.get("competencia") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ error: "Competência inválida. Use AAAA-MM." }, { status: 400 });
  }
  const bounds = monthBounds(competencia);
  if (!bounds) return NextResponse.json({ error: "Competência inválida" }, { status: 400 });

  try {
    const [nfses, tributos, encargosFolha, despesas, funcionarios, pagamentos] = await Promise.all([
      prisma.fiscalNfse.findMany({
        where: { competence: competencia, status: { notIn: CANCELLED } },
        include: { client: { select: { name: true } } },
        orderBy: { issueDate: "asc" },
      }),
      prisma.fiscalTaxExpense.findMany({
        where: { competence: competencia, status: { notIn: CANCELLED } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.fiscalLaborCharge.findMany({
        where: { competence: competencia, status: { notIn: CANCELLED } },
        include: { employee: { select: { name: true } } },
        orderBy: [{ employeeName: "asc" }, { eventType: "asc" }],
      }),
      prisma.expense.findMany({
        where: {
          competence: competencia,
          deletedAt: null,
          status: { notIn: CANCELLED },
          category: { isNot: { type: "receita" } },
        },
        include: { category: { select: { name: true, type: true } }, supplier: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
      }),
      prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      prisma.$queryRaw<Array<{ recebido: Prisma.Decimal }>>(Prisma.sql`
        SELECT COALESCE(SUM(amount), 0) AS recebido
        FROM erp_receivable_payment
        WHERE paid_at >= ${bounds.start} AND paid_at < ${bounds.end}
      `),
    ]);

    const faturamento = nfses.reduce((sum, item) => sum + Number(item.serviceValue || 0), 0);
    const receitaLiquidaNfse = nfses.reduce((sum, item) => sum + Number(item.netAmount || 0), 0);
    const recebido = Number(pagamentos[0]?.recebido || 0);
    const totalTributos = tributos.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
    const totalEncargosFolha = encargosFolha.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalDesp = despesas.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const folhaReferenciaAtual = funcionarios.reduce((acc, employee) => {
      const linha = linhaFolha(employee as any);
      acc.salarioBase += Number(employee.salary || 0);
      acc.custoPleno += Number(linha.custoPleno || 0);
      return acc;
    }, { salarioBase: 0, custoPleno: 0 });

    const resultadoOperacional = faturamento - totalTributos - totalDesp;
    const resultadoAposEncargosRegistrados = resultadoOperacional - totalEncargosFolha;

    return NextResponse.json({
      competencia,
      faturamento,
      receitaLiquidaNfse,
      recebido,
      nfses,
      tributos,
      encargosFolha,
      despesas,
      totalTributos,
      totalEncargosFolha,
      totalDesp,
      resultadoOperacional,
      resultadoAposEncargosRegistrados,
      folhaReferenciaAtual,
      metadata: {
        folhaHistoricaFechada: false,
        avisoFolha: "Os salários-base e o custo pleno são uma referência do cadastro atual. Somente encargos registrados na competência afetam o resultado mensal retornado.",
        receitaFonte: "NFS-e não canceladas",
        recebimentoFonte: "erp_receivable_payment",
      },
    });
  } catch (error) {
    return erroInterno(error, "api/relatorio GET");
  }
}
