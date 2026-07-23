import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const in30 = new Date(now); in30.setDate(in30.getDate() + 30);
    const in90 = new Date(now); in90.setDate(in90.getDate() + 90);

    const [
      employees, aso, trainings, lowStockRows, payable, overduePayable, expensesMonth,
      revenueMonth, contractsDue, activeContracts, workOrders, payroll, recurring,
    ] = await Promise.all([
      prisma.employee.count({ where: { active: true } }),
      prisma.$queryRaw<any[]>`SELECT
        COUNT(*) FILTER (WHERE a.id IS NULL)::int AS without_aso,
        COUNT(*) FILTER (WHERE a."expiresAt" < ${now})::int AS expired,
        COUNT(*) FILTER (WHERE a."expiresAt" >= ${now} AND a."expiresAt" <= ${in30})::int AS due_30
        FROM "Employee" e LEFT JOIN LATERAL (
          SELECT x.* FROM "AsoExam" x WHERE x."employeeId"=e.id ORDER BY x."examDate" DESC LIMIT 1
        ) a ON TRUE WHERE e.active=TRUE`,
      prisma.training.groupBy({ by: ["status"], _count: { id: true } }).catch(() => []),
      prisma.$queryRaw<any[]>`SELECT COUNT(*)::int AS total FROM "InventoryItem"
        WHERE active=TRUE AND "isEpi"=TRUE AND "currentQuantity" <= "minimumStock"`,
      prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(e.amount),0) AS total, COUNT(*)::int AS count FROM "Expense" e
        LEFT JOIN "ExpenseCategory" c ON c.id=e."categoryId"
        WHERE e."deletedAt" IS NULL AND e.status IN ('previsto','em_aberto','vencido') AND COALESCE(c.type,'despesa') <> 'receita'`,
      prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(e.amount),0) AS total, COUNT(*)::int AS count FROM "Expense" e
        LEFT JOIN "ExpenseCategory" c ON c.id=e."categoryId"
        WHERE e."deletedAt" IS NULL AND e.status IN ('em_aberto','vencido') AND e."dueDate" < ${now} AND COALESCE(c.type,'despesa') <> 'receita'`,
      prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(e.amount),0) AS total FROM "Expense" e
        LEFT JOIN "ExpenseCategory" c ON c.id=e."categoryId"
        WHERE e."deletedAt" IS NULL AND e."dueDate" >= ${startMonth} AND e."dueDate" < ${endMonth} AND COALESCE(c.type,'despesa') <> 'receita'`,
      prisma.$queryRaw<any[]>`SELECT
        COALESCE((SELECT SUM(n."serviceValue") FROM "FiscalNfse" n WHERE n."issueDate" >= ${startMonth} AND n."issueDate" < ${endMonth}),0)
        + COALESCE((SELECT SUM(e.amount) FROM "Expense" e JOIN "ExpenseCategory" c ON c.id=e."categoryId" WHERE c.type='receita' AND e."dueDate" >= ${startMonth} AND e."dueDate" < ${endMonth} AND e."deletedAt" IS NULL),0) AS total`,
      prisma.contract.count({ where: { status: "Ativo", endDate: { lte: in90 } } }),
      prisma.contract.count({ where: { status: "Ativo" } }),
      prisma.$queryRaw<any[]>`SELECT status, COUNT(*)::int AS total FROM erp_work_order GROUP BY status`,
      prisma.$queryRaw<any[]>`SELECT COUNT(DISTINCT p.id)::int AS periods,
        COUNT(e.id) FILTER (WHERE e.paid_at IS NULL)::int AS unpaid_entries,
        COALESCE(SUM(e.net_amount) FILTER (WHERE e.paid_at IS NULL),0) AS unpaid_total
        FROM erp_payroll_period p LEFT JOIN erp_payroll_entry e ON e.period_id=p.id
        WHERE p.competence >= ${previousMonth}`,
      prisma.$queryRaw<any[]>`SELECT COUNT(*)::int AS total FROM erp_financial_recurring_rule WHERE active=TRUE`,
    ]);

    const receive = await prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(e.amount),0) AS total, COUNT(*)::int AS count FROM "Expense" e
      JOIN "ExpenseCategory" c ON c.id=e."categoryId"
      WHERE e."deletedAt" IS NULL AND c.type='receita' AND e.status IN ('previsto','em_aberto','vencido')`;
    const osMap = Object.fromEntries(workOrders.map((x: any) => [x.status, Number(x.total)]));
    const revenue = Number(revenueMonth[0]?.total || 0);
    const expense = Number(expensesMonth[0]?.total || 0);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      rh: { employees, aso: aso[0] || {}, trainings },
      inventory: { lowEpiStock: Number(lowStockRows[0]?.total || 0) },
      finance: {
        payable: { total: Number(payable[0]?.total || 0), count: Number(payable[0]?.count || 0) },
        overduePayable: { total: Number(overduePayable[0]?.total || 0), count: Number(overduePayable[0]?.count || 0) },
        receivable: { total: Number(receive[0]?.total || 0), count: Number(receive[0]?.count || 0) },
        monthRevenue: revenue, monthExpenses: expense, monthProfit: revenue - expense,
        activeRecurringRules: Number(recurring[0]?.total || 0),
      },
      contracts: { active: activeContracts, due90: contractsDue },
      operations: { open: osMap.OPEN || 0, scheduled: osMap.SCHEDULED || 0, inProgress: osMap.IN_PROGRESS || 0, blocked: osMap.BLOCKED || 0, completed: osMap.COMPLETED || 0 },
      payroll: payroll[0] || { periods: 0, unpaid_entries: 0, unpaid_total: 0 },
    });
  } catch (e) { return erroInterno(e, "api/dashboard/erp-completo GET"); }
}
