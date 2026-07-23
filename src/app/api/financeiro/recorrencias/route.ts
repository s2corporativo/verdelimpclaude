import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const RuleSchema = z.object({
  action: z.literal("save").default("save"),
  id: z.string().optional(),
  description: z.string().trim().min(2).max(250),
  amount: z.coerce.number().positive(),
  recurrence: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  dueDay: z.coerce.number().int().min(1).max(31),
  categoryId: z.string().optional().nullable(), supplierId: z.string().optional().nullable(),
  contractId: z.string().optional().nullable(), costCenter: z.string().trim().max(120).optional().nullable(),
  competencePrefix: z.string().trim().max(80).optional().nullable(),
  startDate: z.string(), endDate: z.string().optional().nullable(), nextDueDate: z.string(),
  active: z.boolean().default(true), defaultNotes: z.string().trim().max(1000).optional().nullable(),
});
const GenerateSchema = z.object({ action: z.literal("generate"), until: z.string().optional() });
const AttachSchema = z.object({
  action: z.literal("attach"), expenseId: z.string(), kind: z.enum(["BOLETO", "COMPROVANTE", "NOTA_FISCAL", "OUTRO"]),
  filePath: z.string().min(1).max(1000), mimeType: z.string().max(120).optional(), originalName: z.string().max(250).optional(),
});

const d = (v: string) => new Date(`${v}T12:00:00`);
const iso = (date: Date) => date.toISOString().slice(0, 10);
function nextDate(current: Date, recurrence: string, dueDay: number) {
  const out = new Date(current);
  if (recurrence === "WEEKLY") out.setDate(out.getDate() + 7);
  else if (recurrence === "QUARTERLY") out.setMonth(out.getMonth() + 3, Math.min(dueDay, 28));
  else if (recurrence === "YEARLY") out.setFullYear(out.getFullYear() + 1, out.getMonth(), Math.min(dueDay, 28));
  else out.setMonth(out.getMonth() + 1, Math.min(dueDay, 28));
  return out;
}

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "FINANCEIRO");
  if (erro) return erro;
  try {
    const [rules, attachments] = await Promise.all([
      prisma.$queryRaw<any[]>`SELECT r.*, s.name AS supplier_name, c.number AS contract_number, ec.name AS category_name
        FROM erp_financial_recurring_rule r
        LEFT JOIN "Supplier" s ON s.id = r.supplier_id
        LEFT JOIN "Contract" c ON c.id = r.contract_id
        LEFT JOIN "ExpenseCategory" ec ON ec.id = r.category_id
        ORDER BY r.active DESC, r.next_due_date, r.description`,
      prisma.$queryRaw<any[]>`SELECT * FROM erp_financial_attachment ORDER BY created_at DESC LIMIT 500`,
    ]);
    return NextResponse.json({ rules, attachments });
  } catch (e) { return erroInterno(e, "api/financeiro/recorrencias GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "FINANCEIRO");
  if (erro) return erro;
  try {
    const raw = await req.json();
    if (raw.action === "attach") {
      const p = AttachSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Anexo inválido", details: p.error.flatten() }, { status: 400 });
      const b = p.data; const id = randomUUID();
      await prisma.$executeRaw`INSERT INTO erp_financial_attachment
        (id, expense_id, kind, file_path, mime_type, original_name, uploaded_by)
        VALUES (${id}, ${b.expenseId}, ${b.kind}, ${b.filePath}, ${b.mimeType || null}, ${b.originalName || null}, ${user?.email || user?.name || null})`;
      if (b.kind === "COMPROVANTE") await prisma.expense.update({ where: { id: b.expenseId }, data: { receiptPath: b.filePath } });
      return NextResponse.json({ success: true, id });
    }

    if (raw.action === "generate") {
      const p = GenerateSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
      const until = p.data.until ? d(p.data.until) : new Date(new Date().setMonth(new Date().getMonth() + 2));
      const rules = await prisma.$queryRaw<any[]>`SELECT * FROM erp_financial_recurring_rule WHERE active = TRUE AND next_due_date <= ${until} ORDER BY next_due_date`;
      let generated = 0;
      for (const rule of rules) {
        let due = new Date(rule.next_due_date);
        const end = rule.end_date ? new Date(rule.end_date) : null;
        while (due <= until && (!end || due <= end)) {
          const marker = `RECURRENCE:${rule.id}:${iso(due)}`;
          const exists = await prisma.expense.findFirst({ where: { notes: { contains: marker }, deletedAt: null }, select: { id: true } });
          if (!exists) {
            await prisma.expense.create({ data: {
              description: rule.description, amount: Number(rule.amount), dueDate: due, status: "em_aberto",
              categoryId: rule.category_id || null, supplierId: rule.supplier_id || null,
              competence: `${rule.competence_prefix || "REC"}-${due.toISOString().slice(0, 7)}`,
              notes: [rule.default_notes, marker, rule.cost_center ? `CENTRO_CUSTO:${rule.cost_center}` : null, rule.contract_id ? `CONTRATO:${rule.contract_id}` : null].filter(Boolean).join(" | "),
            }});
            generated++;
          }
          due = nextDate(due, rule.recurrence, Number(rule.due_day));
        }
        await prisma.$executeRaw`UPDATE erp_financial_recurring_rule SET next_due_date = ${due}, updated_at = NOW() WHERE id = ${rule.id}`;
      }
      return NextResponse.json({ success: true, generated, until: iso(until) });
    }

    const p = RuleSchema.safeParse({ ...raw, action: "save" });
    if (!p.success) return NextResponse.json({ error: "Regra inválida", details: p.error.flatten() }, { status: 400 });
    const b = p.data; const id = b.id || randomUUID();
    await prisma.$executeRaw`
      INSERT INTO erp_financial_recurring_rule
        (id, description, amount, recurrence, due_day, category_id, supplier_id, contract_id, cost_center,
         competence_prefix, start_date, end_date, next_due_date, active, default_notes, updated_at)
      VALUES (${id}, ${b.description}, ${b.amount}, ${b.recurrence}, ${b.dueDay}, ${b.categoryId || null},
        ${b.supplierId || null}, ${b.contractId || null}, ${b.costCenter || null}, ${b.competencePrefix || null},
        ${d(b.startDate)}, ${b.endDate ? d(b.endDate) : null}, ${d(b.nextDueDate)}, ${b.active}, ${b.defaultNotes || null}, NOW())
      ON CONFLICT (id) DO UPDATE SET description=EXCLUDED.description, amount=EXCLUDED.amount,
        recurrence=EXCLUDED.recurrence, due_day=EXCLUDED.due_day, category_id=EXCLUDED.category_id,
        supplier_id=EXCLUDED.supplier_id, contract_id=EXCLUDED.contract_id, cost_center=EXCLUDED.cost_center,
        competence_prefix=EXCLUDED.competence_prefix, start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date,
        next_due_date=EXCLUDED.next_due_date, active=EXCLUDED.active, default_notes=EXCLUDED.default_notes, updated_at=NOW()`;
    return NextResponse.json({ success: true, id });
  } catch (e) { return erroInterno(e, "api/financeiro/recorrencias POST"); }
}
