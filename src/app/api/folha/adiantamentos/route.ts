// Adiantamentos — registro, consulta e baixa de adiantamentos salariais
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/admin";

export const dynamic = "force-dynamic";

const CompetenciaSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "competência deve estar no formato YYYY-MM");
const StatusSchema = z.enum(["pendente", "descontado", "cancelado"]);

const CriarSchema = z.object({
  employeeId: z.string().trim().min(1),
  amount: z.coerce.number().positive().max(10_000_000),
  competencia: CompetenciaSchema,
  notes: z.string().trim().max(2000).optional().nullable(),
});

const BaixaSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["descontado", "cancelado"]),
});

function erroValidacao(error: z.ZodError) {
  return NextResponse.json({ error: "Dados inválidos", details: error.flatten() }, { status: 400 });
}

// GET — lista registros reais, sem fallback demonstrativo.
export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId")?.trim() || null;
    const statusRaw = searchParams.get("status")?.trim() || null;
    const competenciaRaw = searchParams.get("competencia")?.trim() || null;

    const status = statusRaw ? StatusSchema.safeParse(statusRaw) : null;
    if (status && !status.success) return erroValidacao(status.error);
    const competencia = competenciaRaw ? CompetenciaSchema.safeParse(competenciaRaw) : null;
    if (competencia && !competencia.success) return erroValidacao(competencia.error);

    const conditions: Prisma.Sql[] = [Prisma.sql`TRUE`];
    if (employeeId) conditions.push(Prisma.sql`a.employee_id = ${employeeId}`);
    if (status?.success) conditions.push(Prisma.sql`a.status = ${status.data}`);
    if (competencia?.success) conditions.push(Prisma.sql`a.competencia = ${competencia.data}`);

    const data = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        a.id,
        a.employee_id,
        a.amount,
        a.competencia,
        a.status,
        a.notes,
        a.created_by,
        a.updated_by,
        a.discounted_at,
        a.cancelled_at,
        a.created_at,
        a.updated_at,
        e.name AS employee_name,
        e.role AS employee_role,
        e.salary AS employee_salary,
        e.active AS employee_active
      FROM erp_adiantamento a
      JOIN "Employee" e ON e.id = a.employee_id
      WHERE ${Prisma.join(conditions, " AND ")}
      ORDER BY a.created_at DESC
      LIMIT 1000
    `);

    const totalPendente = data
      .filter((item) => item.status === "pendente")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return NextResponse.json({
      data,
      total: data.length,
      totalPendente: Number(totalPendente.toFixed(2)),
      empty: data.length === 0,
    });
  } catch (e) {
    return erroInterno(e, "api/folha/adiantamentos GET");
  }
}

// POST — registra um adiantamento real.
export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;

  try {
    const parsed = CriarSchema.safeParse(await req.json());
    if (!parsed.success) return erroValidacao(parsed.error);
    const body = parsed.data;

    const employee = await prisma.employee.findFirst({
      where: { id: body.employeeId, active: true },
      select: { id: true, name: true, salary: true, status: true },
    });
    if (!employee) return NextResponse.json({ error: "Funcionário ativo não encontrado" }, { status: 404 });

    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM erp_adiantamento
      WHERE employee_id = ${body.employeeId}
        AND competencia = ${body.competencia}
        AND status = 'pendente'
      LIMIT 1
    `;
    if (existing.length) {
      return NextResponse.json({ error: "Já existe adiantamento pendente para este funcionário e competência" }, { status: 409 });
    }

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO erp_adiantamento
        (id, employee_id, amount, competencia, status, notes, created_by, updated_by)
      VALUES
        (${id}, ${body.employeeId}, ${body.amount}, ${body.competencia}, 'pendente', ${body.notes || null}, ${user!.id}, ${user!.id})
    `;

    const salary = Number(employee.salary);
    const warning = body.amount > salary * 0.5
      ? "O valor supera 50% do salário-base cadastrado. Trata-se de alerta interno, não de conclusão jurídica automática."
      : null;

    await registrarAuditoria({
      userId: user!.id,
      action: "CRIAR",
      module: "rh",
      entityType: "Adiantamento",
      entityId: id,
      newValues: {
        employeeId: body.employeeId,
        employeeName: employee.name,
        amount: body.amount,
        competencia: body.competencia,
        warning,
      },
    });

    return NextResponse.json({ success: true, id, warning }, { status: 201 });
  } catch (e) {
    return erroInterno(e, "api/folha/adiantamentos POST");
  }
}

// PUT — transição única de pendente para descontado ou cancelado.
export async function PUT(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;

  try {
    const parsed = BaixaSchema.safeParse(await req.json());
    if (!parsed.success) return erroValidacao(parsed.error);
    const body = parsed.data;

    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, employee_id, amount, competencia, status
      FROM erp_adiantamento
      WHERE id = ${body.id}
      LIMIT 1
    `;
    const current = rows[0];
    if (!current) return NextResponse.json({ error: "Adiantamento não encontrado" }, { status: 404 });
    if (current.status !== "pendente") {
      return NextResponse.json({ error: `Adiantamento já está ${current.status}` }, { status: 409 });
    }

    const affected = await prisma.$executeRaw`
      UPDATE erp_adiantamento
      SET status = ${body.status},
          updated_by = ${user!.id},
          discounted_at = CASE WHEN ${body.status} = 'descontado' THEN NOW() ELSE discounted_at END,
          cancelled_at = CASE WHEN ${body.status} = 'cancelado' THEN NOW() ELSE cancelled_at END,
          updated_at = NOW()
      WHERE id = ${body.id} AND status = 'pendente'
    `;
    if (affected !== 1) {
      return NextResponse.json({ error: "O registro foi alterado por outro usuário. Atualize a tela." }, { status: 409 });
    }

    await registrarAuditoria({
      userId: user!.id,
      action: "ATUALIZAR",
      module: "rh",
      entityType: "Adiantamento",
      entityId: body.id,
      oldValues: { status: current.status },
      newValues: { status: body.status },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return erroInterno(e, "api/folha/adiantamentos PUT");
  }
}
