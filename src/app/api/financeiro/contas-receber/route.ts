import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const READ_ROLES = ["ADMIN", "GESTOR", "FINANCEIRO", "FISCAL", "COMERCIAL"];
const WRITE_ROLES = ["ADMIN", "FINANCEIRO"];

const TitleSchema = z.object({
  action: z.literal("save").default("save"),
  id: z.string().trim().optional(),
  clientId: z.string().trim().optional().nullable(),
  contractId: z.string().trim().optional().nullable(),
  measurementId: z.string().trim().optional().nullable(),
  nfseId: z.string().trim().optional().nullable(),
  description: z.string().trim().min(2).max(300),
  documentNumber: z.string().trim().max(100).optional().nullable(),
  installmentNumber: z.coerce.number().int().min(1).default(1),
  installmentTotal: z.coerce.number().int().min(1).default(1),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de emissão inválida"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vencimento inválido"),
  grossAmount: z.coerce.number().positive().max(9999999999999.99),
  retentionAmount: z.coerce.number().min(0).max(9999999999999.99).default(0),
  costCenter: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const PaymentSchema = z.object({
  action: z.literal("payment"),
  receivableId: z.string().trim().min(1),
  amount: z.coerce.number().positive().max(9999999999999.99),
  paidAt: z.string().optional(),
  paymentMethod: z.string().trim().max(80).optional().nullable(),
  bankAccount: z.string().trim().max(120).optional().nullable(),
  receiptPath: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const FromMeasurementSchema = z.object({
  action: z.literal("from_measurement"),
  measurementId: z.string().trim().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vencimento inválido"),
  retentionAmount: z.coerce.number().min(0).default(0),
});

const CancelSchema = z.object({
  action: z.literal("cancel"),
  receivableId: z.string().trim().min(1),
  reason: z.string().trim().min(3).max(500),
});

function localDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function receivableSnapshot(id: string) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      r.*,
      COALESCE(SUM(p.amount), 0) AS paid_amount,
      COUNT(p.id)::int AS payment_count
    FROM erp_receivable r
    LEFT JOIN erp_receivable_payment p ON p.receivable_id = r.id
    WHERE r.id = ${id}
    GROUP BY r.id
  `);
  return rows[0] || null;
}

async function recalculate(id: string) {
  const row = await receivableSnapshot(id);
  if (!row) return null;
  const paid = Number(row.paid_amount || 0);
  const net = Number(row.net_amount || 0);
  const status = row.status === "CANCELLED" ? "CANCELLED" : paid <= 0 ? "OPEN" : paid < net - 0.009 ? "PARTIAL" : "RECEIVED";
  await prisma.$executeRaw`UPDATE erp_receivable SET status=${status},updated_at=NOW() WHERE id=${id}`;
  return { ...row, status, paid_amount: paid };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...READ_ROLES);
  if (erro) return erro;

  try {
    const status = req.nextUrl.searchParams.get("status");
    const contractId = req.nextUrl.searchParams.get("contractId");
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        r.*,
        cl.name AS client_name,
        c.number AS contract_number,
        c.object AS contract_object,
        m.period AS measurement_period,
        n.number AS nfse_number,
        n.status AS nfse_status,
        n.pdf_link AS nfse_pdf_link,
        COALESCE(SUM(p.amount),0) AS paid_amount,
        COUNT(p.id)::int AS payment_count
      FROM erp_receivable r
      LEFT JOIN "Client" cl ON cl.id = r.client_id
      LEFT JOIN "Contract" c ON c.id = r.contract_id
      LEFT JOIN "Measurement" m ON m.id = r.measurement_id
      LEFT JOIN "FiscalNfse" n ON n.id = r.nfse_id
      LEFT JOIN erp_receivable_payment p ON p.receivable_id = r.id
      WHERE (${status}::text IS NULL OR r.status = ${status})
        AND (${contractId}::text IS NULL OR r.contract_id = ${contractId})
      GROUP BY r.id,cl.id,c.id,m.id,n.id
      ORDER BY r.due_date DESC
      LIMIT 1000
    `);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const data = rows.map((row) => {
      const balance = Math.max(0, Number(row.net_amount || 0) - Number(row.paid_amount || 0));
      const due = new Date(row.due_date);
      const displayStatus = row.status === "OPEN" && balance > 0 && due < today ? "OVERDUE" : row.status;
      return { ...row, balance, display_status: displayStatus };
    });

    return NextResponse.json({
      data,
      summary: {
        gross: data.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0),
        net: data.reduce((sum, row) => sum + Number(row.net_amount || 0), 0),
        received: data.reduce((sum, row) => sum + Number(row.paid_amount || 0), 0),
        open: data.reduce((sum, row) => sum + Number(row.balance || 0), 0),
        overdue: data.filter((row) => row.display_status === "OVERDUE").reduce((sum, row) => sum + Number(row.balance || 0), 0),
      },
    });
  } catch (error) {
    return erroInterno(error, "api/financeiro/contas-receber GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel(...WRITE_ROLES);
  if (erro || !user) return erro;

  try {
    const raw = await req.json();

    if (raw.action === "payment") {
      const parsed = PaymentSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Recebimento inválido" }, { status: 400 });
      const body = parsed.data;
      const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
      if (Number.isNaN(paidAt.getTime())) return NextResponse.json({ error: "Data do recebimento inválida" }, { status: 400 });

      const before = await receivableSnapshot(body.receivableId);
      if (!before) return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
      if (before.status === "CANCELLED") return NextResponse.json({ error: "Título cancelado não aceita recebimento" }, { status: 409 });
      const balance = Number(before.net_amount) - Number(before.paid_amount || 0);
      if (body.amount > balance + 0.009) return NextResponse.json({ error: "Recebimento supera o saldo do título" }, { status: 409 });

      const paymentId = randomUUID();
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO erp_receivable_payment(
            id,receivable_id,amount,paid_at,payment_method,bank_account,receipt_path,notes,registered_by
          ) VALUES (
            ${paymentId},${body.receivableId},${body.amount},${paidAt},${body.paymentMethod || null},
            ${body.bankAccount || null},${body.receiptPath || null},${body.notes || null},${user.email || user.name || user.id}
          )
        `;
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "PAYMENT",
            module: "contas-receber",
            entityType: "Receivable",
            entityId: body.receivableId,
            oldValues: auditJson({ balance, status: before.status, paidAmount: Number(before.paid_amount || 0) }),
            newValues: auditJson({ paymentId, amount: body.amount, paidAt, paymentMethod: body.paymentMethod || null, balanceAfter: balance - body.amount }),
          },
        });
      });
      const after = await recalculate(body.receivableId);
      return NextResponse.json({ success: true, paymentId, data: after });
    }

    if (raw.action === "cancel") {
      const parsed = CancelSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Cancelamento inválido" }, { status: 400 });
      const body = parsed.data;
      const before = await receivableSnapshot(body.receivableId);
      if (!before) return NextResponse.json({ error: "Título não encontrado" }, { status: 404 });
      if (Number(before.paid_amount || 0) > 0) return NextResponse.json({ error: "Título com recebimento não pode ser cancelado" }, { status: 409 });
      if (before.status === "CANCELLED") return NextResponse.json({ success: true, reused: true });

      await prisma.$transaction([
        prisma.$executeRaw`UPDATE erp_receivable SET status='CANCELLED',notes=CONCAT(COALESCE(notes,''),' | CANCELADO: ',${body.reason}),updated_at=NOW() WHERE id=${body.receivableId}`,
        prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "CANCEL",
            module: "contas-receber",
            entityType: "Receivable",
            entityId: body.receivableId,
            oldValues: auditJson(before),
            newValues: auditJson({ status: "CANCELLED", reason: body.reason }),
          },
        }),
      ]);
      return NextResponse.json({ success: true });
    }

    if (raw.action === "from_measurement") {
      const parsed = FromMeasurementSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Medição inválida" }, { status: 400 });
      const body = parsed.data;
      const dueDate = localDate(body.dueDate);
      if (!dueDate) return NextResponse.json({ error: "Vencimento inválido" }, { status: 400 });
      const measurement = await prisma.measurement.findUnique({ where: { id: body.measurementId }, include: { contract: { include: { client: true } } } });
      if (!measurement) return NextResponse.json({ error: "Medição não encontrada" }, { status: 404 });
      if (!['aprovada', 'faturada'].includes(measurement.status)) return NextResponse.json({ error: "A medição precisa estar aprovada" }, { status: 422 });
      const existing = await prisma.$queryRaw<any[]>`SELECT id FROM erp_receivable WHERE measurement_id=${measurement.id} LIMIT 1`;
      if (existing[0]) return NextResponse.json({ success: true, reused: true, id: existing[0].id });
      const gross = Number(measurement.value);
      if (body.retentionAmount > gross) return NextResponse.json({ error: "Retenções não podem superar o valor bruto" }, { status: 400 });
      const id = randomUUID();
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO erp_receivable(
            id,client_id,contract_id,measurement_id,description,document_number,issue_date,due_date,
            gross_amount,retention_amount,net_amount,status,cost_center,notes,updated_at
          ) VALUES (
            ${id},${measurement.contract.clientId || null},${measurement.contractId},${measurement.id},
            ${`Medição ${measurement.period} — ${measurement.contract.number}`},${measurement.period},CURRENT_DATE,${dueDate},
            ${gross},${body.retentionAmount},${gross - body.retentionAmount},'OPEN',${measurement.contract.number},
            ${`Título criado manualmente a partir da medição ${measurement.id}`},NOW()
          )
        `;
        await tx.auditLog.create({
          data: { userId: user.id, action: "CREATE_FROM_MEASUREMENT", module: "contas-receber", entityType: "Receivable", entityId: id, newValues: auditJson({ measurementId: measurement.id, gross, retentionAmount: body.retentionAmount, dueDate: body.dueDate }) },
        });
      });
      return NextResponse.json({ success: true, id }, { status: 201 });
    }

    const parsed = TitleSchema.safeParse({ ...raw, action: "save" });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Título inválido", details: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;
    const issueDate = localDate(body.issueDate);
    const dueDate = localDate(body.dueDate);
    if (!issueDate || !dueDate) return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
    if (body.retentionAmount > body.grossAmount) return NextResponse.json({ error: "Retenções não podem superar o valor bruto" }, { status: 400 });
    if (body.installmentNumber > body.installmentTotal) return NextResponse.json({ error: "Parcela atual não pode superar o total de parcelas" }, { status: 400 });

    const id = body.id || randomUUID();
    const before = body.id ? await receivableSnapshot(body.id) : null;
    if (before && Number(before.paid_amount || 0) > 0 && Number(before.net_amount) !== body.grossAmount - body.retentionAmount) {
      return NextResponse.json({ error: "Não altere o valor de título que já possui recebimento" }, { status: 409 });
    }
    const net = body.grossAmount - body.retentionAmount;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO erp_receivable(
          id,client_id,contract_id,measurement_id,nfse_id,description,document_number,
          installment_number,installment_total,issue_date,due_date,gross_amount,retention_amount,
          net_amount,status,cost_center,notes,updated_at
        ) VALUES (
          ${id},${body.clientId || null},${body.contractId || null},${body.measurementId || null},${body.nfseId || null},
          ${body.description},${body.documentNumber || null},${body.installmentNumber},${body.installmentTotal},
          ${issueDate},${dueDate},${body.grossAmount},${body.retentionAmount},${net},${before?.status || "OPEN"},
          ${body.costCenter || null},${body.notes || null},NOW()
        ) ON CONFLICT(id) DO UPDATE SET
          client_id=EXCLUDED.client_id,contract_id=EXCLUDED.contract_id,measurement_id=EXCLUDED.measurement_id,
          nfse_id=EXCLUDED.nfse_id,description=EXCLUDED.description,document_number=EXCLUDED.document_number,
          installment_number=EXCLUDED.installment_number,installment_total=EXCLUDED.installment_total,
          issue_date=EXCLUDED.issue_date,due_date=EXCLUDED.due_date,gross_amount=EXCLUDED.gross_amount,
          retention_amount=EXCLUDED.retention_amount,net_amount=EXCLUDED.net_amount,cost_center=EXCLUDED.cost_center,
          notes=EXCLUDED.notes,updated_at=NOW()
      `;
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: body.id ? "UPDATE" : "CREATE",
          module: "contas-receber",
          entityType: "Receivable",
          entityId: id,
          oldValues: before ? auditJson(before) : undefined,
          newValues: auditJson({ ...body, issueDate, dueDate, netAmount: net }),
        },
      });
    });
    const after = await recalculate(id);
    return NextResponse.json({ success: true, id, data: after }, { status: body.id ? 200 : 201 });
  } catch (error) {
    return erroInterno(error, "api/financeiro/contas-receber POST");
  }
}
