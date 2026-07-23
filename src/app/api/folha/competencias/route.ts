import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { linhaFolha } from "@/lib/folha";

export const dynamic = "force-dynamic";
const COMP = /^\d{4}-(0[1-9]|1[0-2])$/;

const GenerateSchema = z.object({
  action: z.literal("generate"), competence: z.string().regex(COMP),
  extras: z.record(z.object({ he50: z.coerce.number().min(0).default(0), he100: z.coerce.number().min(0).default(0) })).default({}),
});
const UpdateSchema = z.object({
  action: z.literal("update"), entryId: z.string(), benefits: z.coerce.number().min(0).default(0),
  advances: z.coerce.number().min(0).default(0), thirteenthSalary: z.coerce.number().min(0).default(0),
  vacationPay: z.coerce.number().min(0).default(0), bonuses: z.coerce.number().min(0).default(0),
  otherEarnings: z.coerce.number().min(0).default(0), otherDeductions: z.coerce.number().min(0).default(0),
  events: z.array(z.object({ type: z.string(), description: z.string(), amount: z.coerce.number(), taxable: z.boolean().optional() })).default([]),
});
const CloseSchema = z.object({ action: z.enum(["close", "reopen"]), competence: z.string().regex(COMP), paymentDate: z.string().optional().nullable(), notes: z.string().max(1000).optional() });
const PaySchema = z.object({ action: z.literal("pay"), entryId: z.string(), paidAt: z.string().optional(), receiptPath: z.string().max(1000).optional().nullable() });

async function getPeriod(competence: string) {
  const periods = await prisma.$queryRaw<any[]>`SELECT * FROM erp_payroll_period WHERE competence = ${competence} LIMIT 1`;
  if (!periods[0]) return null;
  const entries = await prisma.$queryRaw<any[]>`
    SELECT pe.*, e.name AS employee_name, e.role AS employee_role
    FROM erp_payroll_entry pe JOIN "Employee" e ON e.id = pe.employee_id
    WHERE pe.period_id = ${periods[0].id} ORDER BY e.name`;
  return { ...periods[0], entries };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const competence = req.nextUrl.searchParams.get("competence");
    if (competence && !COMP.test(competence)) return NextResponse.json({ error: "Competência inválida" }, { status: 400 });
    if (competence) {
      const period = await getPeriod(competence);
      if (period) return NextResponse.json({ period });
      const employees = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
      return NextResponse.json({
        period: null,
        preview: employees.map((e) => linhaFolha({ ...e, salary: Number(e.salary) }, {}, { ano: Number(competence.slice(0, 4)), anexoSimples: "IV" })),
      });
    }
    const periods = await prisma.$queryRaw<any[]>`
      SELECT p.*, COUNT(e.id)::int AS employees,
        COALESCE(SUM(e.gross_amount),0) AS gross_total, COALESCE(SUM(e.net_amount),0) AS net_total,
        COALESCE(SUM(e.company_cost),0) AS company_cost_total,
        COUNT(e.id) FILTER (WHERE e.paid_at IS NULL)::int AS unpaid
      FROM erp_payroll_period p LEFT JOIN erp_payroll_entry e ON e.period_id = p.id
      GROUP BY p.id ORDER BY p.competence DESC LIMIT 36`;
    return NextResponse.json({ periods });
  } catch (e) { return erroInterno(e, "api/folha/competencias GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const raw = await req.json();
    if (raw.action === "generate") {
      const p = GenerateSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Dados inválidos", details: p.error.flatten() }, { status: 400 });
      const existing = await getPeriod(p.data.competence);
      if (existing?.status === "CLOSED") return NextResponse.json({ error: "Competência fechada; reabra antes de recalcular" }, { status: 409 });
      const employees = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
      const periodId = existing?.id || randomUUID();
      if (!existing) await prisma.$executeRaw`INSERT INTO erp_payroll_period (id, competence) VALUES (${periodId}, ${p.data.competence})`;
      const year = Number(p.data.competence.slice(0, 4));
      for (const e of employees) {
        const extra = p.data.extras[e.id] || { he50: 0, he100: 0 };
        const line = linhaFolha({ ...e, salary: Number(e.salary) }, extra, { ano: year, anexoSimples: "IV" });
        await prisma.$executeRaw`
          INSERT INTO erp_payroll_entry
            (id, period_id, employee_id, base_salary, overtime_50, overtime_100, gross_amount, net_amount, inss, irrf, fgts, company_cost, events, updated_at)
          VALUES (${randomUUID()}, ${periodId}, ${e.id}, ${Number(e.salary)}, ${extra.he50}, ${extra.he100}, ${line.salarioBruto},
            ${line.salarioLiquido}, ${line.inss}, ${line.irrf}, ${line.fgts}, ${line.custoPleno},
            ${JSON.stringify([{ type: "AUTO", description: "Cálculo gerencial da competência", amount: line.salarioBruto }])}::jsonb, NOW())
          ON CONFLICT (period_id, employee_id) DO UPDATE SET
            base_salary=EXCLUDED.base_salary, overtime_50=EXCLUDED.overtime_50, overtime_100=EXCLUDED.overtime_100,
            gross_amount=EXCLUDED.gross_amount, net_amount=EXCLUDED.net_amount, inss=EXCLUDED.inss, irrf=EXCLUDED.irrf,
            fgts=EXCLUDED.fgts, company_cost=EXCLUDED.company_cost, updated_at=NOW()`;
      }
      return NextResponse.json({ success: true, period: await getPeriod(p.data.competence) });
    }

    if (raw.action === "update") {
      const p = UpdateSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Eventos inválidos", details: p.error.flatten() }, { status: 400 });
      const b = p.data;
      const rows = await prisma.$queryRaw<any[]>`SELECT * FROM erp_payroll_entry WHERE id = ${b.entryId}`;
      const current = rows[0];
      if (!current) return NextResponse.json({ error: "Lançamento não encontrado" }, { status: 404 });
      const earnings = b.benefits + b.thirteenthSalary + b.vacationPay + b.bonuses + b.otherEarnings;
      const deductions = b.advances + b.otherDeductions;
      const gross = Number(current.gross_amount) + earnings;
      const net = Number(current.net_amount) + earnings - deductions;
      const cost = Number(current.company_cost) + earnings;
      await prisma.$executeRaw`UPDATE erp_payroll_entry SET benefits=${b.benefits}, advances=${b.advances},
        thirteenth_salary=${b.thirteenthSalary}, vacation_pay=${b.vacationPay}, bonuses=${b.bonuses},
        other_earnings=${b.otherEarnings}, other_deductions=${b.otherDeductions}, gross_amount=${gross},
        net_amount=${net}, company_cost=${cost}, events=${JSON.stringify(b.events)}::jsonb, updated_at=NOW() WHERE id=${b.entryId}`;
      return NextResponse.json({ success: true });
    }

    if (raw.action === "pay") {
      const p = PaySchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Pagamento inválido" }, { status: 400 });
      await prisma.$executeRaw`UPDATE erp_payroll_entry SET paid_at=${p.data.paidAt ? new Date(p.data.paidAt) : new Date()},
        receipt_path=${p.data.receiptPath || null}, updated_at=NOW() WHERE id=${p.data.entryId}`;
      return NextResponse.json({ success: true });
    }

    const p = CloseSchema.safeParse(raw);
    if (!p.success) return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    const status = p.data.action === "close" ? "CLOSED" : "DRAFT";
    await prisma.$executeRaw`UPDATE erp_payroll_period SET status=${status}, payment_date=${p.data.paymentDate ? new Date(p.data.paymentDate) : null},
      closed_at=${status === "CLOSED" ? new Date() : null}, closed_by=${status === "CLOSED" ? (user?.email || user?.name || user?.id) : null},
      notes=${p.data.notes || null}, updated_at=NOW() WHERE competence=${p.data.competence}`;
    return NextResponse.json({ success: true, period: await getPeriod(p.data.competence) });
  } catch (e) { return erroInterno(e, "api/folha/competencias POST"); }
}
