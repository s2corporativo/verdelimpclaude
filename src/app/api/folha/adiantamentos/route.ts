// Adiantamentos — registro, consulta e baixa de adiantamentos salariais
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET — Lista de adiantamentos
export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status"); // pendente | descontado | cancelado
    const competencia = searchParams.get("competencia"); // 2026-07

    let where = "WHERE 1=1";
    const params: any[] = [];

    if (employeeId) { where += ` AND a.employee_id = $${params.length + 1}`; params.push(employeeId); }
    if (status) { where += ` AND a.status = $${params.length + 1}`; params.push(status); }
    if (competencia) { where += ` AND a.competencia = $${params.length + 1}`; params.push(competencia); }

    const adiantamentos = await prisma.$queryRaw<any[]>`
      SELECT a.*, e.name as employee_name, e.role as employee_role, e.salary as employee_salary
      FROM erp_adiantamento a
      JOIN "Employee" e ON e.id = a.employee_id
      ${prisma.$queryRawUnsafe(where, ...params)}
      ORDER BY a.created_at DESC
    `;

    // Se a tabela não existir, retornar demo
    if (!adiantamentos.length && !employeeId && !status && !competencia) {
      return NextResponse.json({ data: DEMO_ADIANTAMENTOS, _demo: true });
    }

    return NextResponse.json({ data: adiantamentos });
  } catch {
    return NextResponse.json({ data: DEMO_ADIANTAMENTOS, _demo: true });
  }
}

// POST — Registrar adiantamento
export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const body = await req.json();
    const { employeeId, amount, competencia, notes } = body;

    if (!employeeId || !amount || !competencia) {
      return NextResponse.json({ error: "employeeId, amount e competencia são obrigatórios" }, { status: 400 });
    }

    if (Number(amount) <= 0) {
      return NextResponse.json({ error: "Valor deve ser positivo" }, { status: 400 });
    }

    // Verificar funcionário
    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

    // Limite: adiantamento não pode exceder 50% do salário (CLT)
    const limite = Number(emp.salary) * 0.5;
    if (Number(amount) > limite) {
      return NextResponse.json({
        error: `Adiantamento não pode exceder 50% do salário (R$ ${limite.toFixed(2)})`,
      }, { status: 400 });
    }

    // Criar tabela se não existir
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS erp_adiantamento (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        employee_id TEXT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        competencia TEXT NOT NULL,
        status TEXT DEFAULT 'pendente',
        notes TEXT,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(`
      INSERT INTO erp_adiantamento (id, employee_id, amount, competencia, status, notes, created_by)
      VALUES ($1, $2, $3, $4, 'pendente', $5, $6)
    `, id, employeeId, Number(amount), competencia, notes || null, user?.id || null);

    await registrarAuditoria({
      userId: user!.id, action: "CRIAR", module: "rh",
      entityType: "Adiantamento", entityId: id,
      newValues: { employeeId, amount: Number(amount), competencia },
    });

    return NextResponse.json({ success: true, id }, { status: 201 });
  } catch (e) {
    return erroInterno(e, "api/folha/adiantamentos POST");
  }
}

// PUT — Dar baixa no adiantamento (descontar da folha)
export async function PUT(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "id e status são obrigatórios" }, { status: 400 });
    }

    if (!["descontado", "cancelado"].includes(status)) {
      return NextResponse.json({ error: "Status inválido. Use: descontado ou cancelado" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(`
      UPDATE erp_adiantamento SET status = $1, updated_at = NOW() WHERE id = $2
    `, status, id);

    await registrarAuditoria({
      userId: user!.id, action: "ATUALIZAR", module: "rh",
      entityType: "Adiantamento", entityId: id,
      newValues: { status },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return erroInterno(e, "api/folha/adiantamentos PUT");
  }
}

const DEMO_ADIANTAMENTOS = [
  { id: "a1", employee_id: "e1", employee_name: "Abrão Felipe", employee_role: "Op. Roçadeira", amount: 1250, competencia: "2026-07", status: "pendente", created_at: "2026-07-01T10:00:00Z" },
  { id: "a2", employee_id: "e2", employee_name: "Ana Luiza Ribeiro", employee_role: "Supervisora", amount: 1750, competencia: "2026-07", status: "pendente", created_at: "2026-07-01T10:05:00Z" },
  { id: "a3", employee_id: "e5", employee_name: "Leomar Souza", employee_role: "Op. Retroescav.", amount: 1600, competencia: "2026-06", status: "descontado", created_at: "2026-06-01T10:00:00Z" },
];
