import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const READ_ROLES = ["ADMIN", "GESTOR", "RH", "OPERACIONAL"];
const WRITE_ROLES = ["ADMIN", "GESTOR", "RH"];

const TrainingSchema = z.object({
  employeeId: z.string().trim().min(1, "Funcionário obrigatório"),
  trainingType: z.string().trim().min(2, "Tipo de treinamento obrigatório").max(120),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de emissão inválida"),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento inválida"),
  institution: z.string().trim().max(200).optional().nullable(),
  certificatePath: z.string().trim().max(1000).optional().nullable(),
});

function operationalDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function derivedStatus(expiresAt: Date, persisted: string) {
  if (persisted === "cancelado") return "cancelado";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);
  if (expiresAt < today) return "vencido";
  if (expiresAt <= limit) return "a_vencer";
  return "valido";
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...READ_ROLES);
  if (erro) return erro;

  try {
    const includeCancelled = req.nextUrl.searchParams.get("includeCancelled") === "true";
    const employeeId = req.nextUrl.searchParams.get("employeeId");
    const data = await prisma.training.findMany({
      where: {
        ...(includeCancelled ? {} : { status: { not: "cancelado" } }),
        ...(employeeId ? { employeeId } : {}),
      },
      orderBy: [{ expiresAt: "asc" }, { issuedAt: "desc" }],
      include: { employee: { select: { id: true, name: true, role: true, active: true } } },
      take: 1000,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enriched = data.map((item) => {
      const status = derivedStatus(new Date(item.expiresAt), item.status);
      return {
        ...item,
        status,
        diasVenc: Math.ceil((new Date(item.expiresAt).getTime() - today.getTime()) / 86_400_000),
      };
    });

    return NextResponse.json({
      data: enriched,
      total: enriched.length,
      vencidos: enriched.filter((item) => item.status === "vencido").length,
      aVencer: enriched.filter((item) => item.status === "a_vencer").length,
      semCertificado: enriched.filter((item) => !item.certificatePath).length,
    });
  } catch (error) {
    return erroInterno(error, "api/treinamentos GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel(...WRITE_ROLES);
  if (erro || !user) return erro;

  try {
    const parsed = TrainingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Treinamento inválido", details: parsed.error.flatten() }, { status: 400 });
    }
    const body = parsed.data;
    const issuedAt = operationalDate(body.issuedAt);
    const expiresAt = operationalDate(body.expiresAt);
    if (!issuedAt || !expiresAt) return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
    if (expiresAt < issuedAt) return NextResponse.json({ error: "O vencimento não pode ser anterior à emissão" }, { status: 400 });

    const employee = await prisma.employee.findUnique({ where: { id: body.employeeId }, select: { id: true, name: true, active: true } });
    if (!employee) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    if (!employee.active) return NextResponse.json({ error: "Não é possível registrar treinamento para funcionário inativo" }, { status: 409 });

    const duplicate = await prisma.training.findFirst({
      where: {
        employeeId: body.employeeId,
        trainingType: { equals: body.trainingType, mode: "insensitive" },
        issuedAt,
        expiresAt,
        status: { not: "cancelado" },
      },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: "Este treinamento já está registrado para o funcionário e período informados", id: duplicate.id }, { status: 409 });

    const status = derivedStatus(expiresAt, "valido");
    const training = await prisma.training.create({
      data: {
        employeeId: body.employeeId,
        trainingType: body.trainingType,
        issuedAt,
        expiresAt,
        institution: body.institution || null,
        certificatePath: body.certificatePath || null,
        status,
      },
      include: { employee: { select: { name: true, role: true } } },
    });

    await registrarAuditoria({
      userId: user.id,
      action: "CRIAR",
      module: "sst",
      entityType: "Training",
      entityId: training.id,
      newValues: {
        employeeId: body.employeeId,
        employeeName: employee.name,
        trainingType: body.trainingType,
        issuedAt,
        expiresAt,
        certificatePath: body.certificatePath || null,
        status,
      },
    });

    return NextResponse.json(training, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/treinamentos POST");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel(...WRITE_ROLES);
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    const reason = req.nextUrl.searchParams.get("reason")?.trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    if (!reason || reason.length < 3) return NextResponse.json({ error: "Informe o motivo do arquivamento" }, { status: 400 });

    const current = await prisma.training.findUnique({ where: { id }, include: { employee: { select: { name: true } } } });
    if (!current) return NextResponse.json({ error: "Treinamento não encontrado" }, { status: 404 });
    if (current.status === "cancelado") return NextResponse.json({ success: true, reused: true });

    const updated = await prisma.training.update({ where: { id }, data: { status: "cancelado" } });
    await registrarAuditoria({
      userId: user.id,
      action: "ARQUIVAR",
      module: "sst",
      entityType: "Training",
      entityId: id,
      oldValues: { status: current.status, employeeId: current.employeeId, employeeName: current.employee.name, trainingType: current.trainingType },
      newValues: { status: "cancelado", reason },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return erroInterno(error, "api/treinamentos DELETE");
  }
}
