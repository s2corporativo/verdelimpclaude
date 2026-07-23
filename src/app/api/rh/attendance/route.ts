// Attendance — registro de faltas, atestados e horas extras
// Methods: GET (list), POST (create), PATCH (update)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { exigirPapel, erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS erp_attendance (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT NOT NULL REFERENCES "Employee"(id),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('falta','atestado','hora_extra','bonificacao','desconto')),
  hours DECIMAL(5,2),
  description TEXT,
  amount DECIMAL(15,2),
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)`;

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(CREATE_TABLE);
  tableReady = true;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "OPERACIONAL");
  if (erro) return erro;
  try {
    await ensureTable();
    const { searchParams } = req.nextUrl;
    const employeeId = searchParams.get("employeeId");
    const month = searchParams.get("month");
    const type = searchParams.get("type");

    let where = "WHERE 1=1";
    const params: any[] = [];
    let idx = 1;

    if (employeeId) { where += ` AND a.employee_id = $${idx++}`; params.push(employeeId); }
    if (month) { where += ` AND TO_CHAR(a.date, 'YYYY-MM') = $${idx++}`; params.push(month); }
    if (type) { where += ` AND a.type = $${idx++}`; params.push(type); }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT a.*, e.name AS employee_name, e.role AS employee_role
       FROM erp_attendance a
       LEFT JOIN "Employee" e ON e.id = a.employee_id
       ${where}
       ORDER BY a.date DESC
       LIMIT 500`,
      ...params
    );

    const data = rows.map((r) => ({
      id: r.id,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      employeeRole: r.employee_role,
      date: r.date,
      type: r.type,
      hours: r.hours ? Number(r.hours) : null,
      description: r.description,
      amount: r.amount ? Number(r.amount) : null,
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));

    const totals = { faltas: 0, atestados: 0, horasExtras: 0, bonificacoes: 0 };
    for (const r of data) {
      if (r.type === "falta") totals.faltas++;
      else if (r.type === "atestado") totals.atestados++;
      else if (r.type === "hora_extra") totals.horasExtras += r.hours || 0;
      else if (r.type === "bonificacao") totals.bonificacoes += r.amount || 0;
    }

    return NextResponse.json({ data, totals });
  } catch (e: any) {
    return erroInterno(e, "api/rh/attendance GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "OPERACIONAL");
  if (erro) return erro;
  try {
    await ensureTable();
    const b = await req.json();
    if (!b.employeeId || !b.date || !b.type) {
      return NextResponse.json({ error: "employeeId, date e type são obrigatórios" }, { status: 400 });
    }
    const validTypes = ["falta", "atestado", "hora_extra", "bonificacao", "desconto"];
    if (!validTypes.includes(b.type)) {
      return NextResponse.json({ error: `type deve ser um de: ${validTypes.join(", ")}` }, { status: 400 });
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `INSERT INTO erp_attendance (employee_id, date, type, hours, description, amount, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      b.employeeId,
      b.date,
      b.type,
      b.hours ?? null,
      b.description ?? null,
      b.amount ?? null,
      user?.email || user?.name || user?.id
    );

    const id = rows[0].id;

    await registrarAuditoria({
      userId: user!.id,
      action: "CRIAR",
      module: "rh",
      entityType: "erp_attendance",
      entityId: id,
      newValues: { employeeId: b.employeeId, date: b.date, type: b.type, hours: b.hours, amount: b.amount, description: b.description },
    });

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (e: any) {
    return erroInterno(e, "api/rh/attendance POST");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    await ensureTable();
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const allowed = ["date", "type", "hours", "description", "amount"];
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const k of allowed) {
      if (b[k] !== undefined) { sets.push(`${k === "type" ? "type" : k === "date" ? "date" : k} = $${idx++}`); params.push(b[k]); }
    }
    if (!sets.length) return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    params.push(b.id);

    await prisma.$executeRawUnsafe(
      `UPDATE erp_attendance SET ${sets.join(", ")} WHERE id = $${idx}`,
      ...params
    );

    await registrarAuditoria({
      userId: user!.id,
      action: "ATUALIZAR",
      module: "rh",
      entityType: "erp_attendance",
      entityId: b.id,
      newValues: b,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return erroInterno(e, "api/rh/attendance PATCH");
  }
}
