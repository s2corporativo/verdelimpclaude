import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/admin";
import { linhaFolha } from "@/lib/folha";
import { avaliarElegibilidadeDocumental, type RequisitoElegibilidade } from "@/lib/elegibilidade";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const READ_ROLES = ["ADMIN", "GESTOR", "RH", "OPERACIONAL", "FINANCEIRO"];
const WRITE_ROLES = ["ADMIN", "GESTOR", "RH"];
const ACTIVE_CONTRACT_STATUS = ["Ativo", "Renovando"];

const MobilizationItemSchema = z.object({
  employeeId: z.string().trim().min(1),
  role: z.string().trim().min(2).max(120).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  hoursDay: z.coerce.number().int().min(1).max(12).default(8),
  daysWeek: z.coerce.number().int().min(1).max(7).default(5),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const CreateSchema = z.object({
  contractId: z.string().trim().min(1),
  mobilizacoes: z.array(MobilizationItemSchema).min(1).max(100),
});

const PatchSchema = z.object({
  id: z.string().trim().min(1),
  action: z.enum(["reavaliar", "suspender", "encerrar"]),
  reason: z.string().trim().max(500).optional(),
  endDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...READ_ROLES);
  if (erro) return erro;

  try {
    const contractId = req.nextUrl.searchParams.get("contractId");
    const employeeId = req.nextUrl.searchParams.get("employeeId");
    const status = req.nextUrl.searchParams.get("status");
    const data = await prisma.mobilization.findMany({
      where: {
        ...(contractId ? { contractId } : {}),
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { startDate: "desc" },
      include: {
        contract: { select: { id: true, number: true, object: true, status: true, startDate: true, endDate: true } },
        employee: { select: { id: true, name: true, role: true, salary: true, active: true } },
      },
      take: 1000,
    });
    const active = data.filter((item) => item.status === "ativa");
    return NextResponse.json({
      data,
      stats: {
        total: data.length,
        ativas: active.length,
        suspensas: data.filter((item) => item.status === "suspensa").length,
        encerradas: data.filter((item) => item.status === "encerrada").length,
        bloqueadas: data.filter((item) => item.complianceStatus === "bloqueada").length,
        custoMensal: active.reduce((sum, item) => sum + Number(item.costPerMonth), 0),
      },
    });
  } catch (error) {
    return erroInterno(error, "api/mobilizacoes GET");
  }
}

async function requirementsForEmployee(contractId: string, employee: any, startDate: Date): Promise<RequisitoElegibilidade[]> {
  const requirements = await prisma.contractDocRequirement.findMany({
    where: { contractId, required: true, scope: { in: ["EMPRESA", "FUNCIONARIO"] } },
    include: { records: { where: { OR: [{ employeeId: employee.id }, { employeeId: null }] }, orderBy: { createdAt: "desc" } } },
  });
  const [aso, trainings, epi] = await Promise.all([
    prisma.asoExam.findFirst({ where: { employeeId: employee.id, result: { in: ["apto", "apto_restricoes"] } }, orderBy: { examDate: "desc" } }),
    prisma.training.findMany({ where: { employeeId: employee.id, status: { not: "cancelado" } }, orderBy: { issuedAt: "desc" } }),
    prisma.inventoryEpiDelivery.findFirst({ where: { employeeId: employee.id, status: "ativo" }, orderBy: { deliveryDate: "desc" } }),
  ]);

  return requirements.map((requirement) => {
    const manual = requirement.records.find((record) => requirement.scope === "EMPRESA" ? !record.employeeId : record.employeeId === employee.id);
    let automatic: any = null;
    if (!manual && requirement.scope === "FUNCIONARIO") {
      if (requirement.autoSource === "ASO" && aso) automatic = { exists: true, expiresAt: aso.expiresAt, status: "aprovado", source: "automatico" };
      if (requirement.autoSource === "TREINAMENTO") {
        const hint = (requirement.sourceHint || "").toUpperCase();
        const training = trainings.find((item) => !hint || item.trainingType.toUpperCase().includes(hint));
        if (training) automatic = { exists: true, expiresAt: training.expiresAt, status: "aprovado", source: "automatico" };
      }
      if (requirement.autoSource === "EPI" && epi) automatic = { exists: true, expiresAt: epi.expectedReplacementDate, status: "aprovado", source: "automatico" };
    }
    const requiredUntil = new Date(startDate);
    requiredUntil.setDate(requiredUntil.getDate() + requirement.leadTimeDays);
    return {
      id: requirement.id,
      name: requirement.name,
      scope: requirement.scope,
      blocking: requirement.blocking,
      role: requirement.role,
      requiredUntil,
      evidence: manual ? { exists: true, expiresAt: manual.expiresAt, status: manual.status, source: "manual" as const } : automatic,
    };
  });
}

function normalizePeriod(startValue: string | undefined, endValue: string | undefined, contract: { startDate: Date; endDate: Date }) {
  const startDate = startValue ? parseDataOperacional(startValue) : new Date(contract.startDate);
  const endDate = endValue ? parseDataOperacional(endValue) : new Date(contract.endDate);
  if (!startDate || !endDate || endDate < startDate) return null;
  if (startDate < contract.startDate || endDate > contract.endDate) return null;
  return { startDate, endDate };
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel(...WRITE_ROLES);
  if (erro || !user) return erro;

  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Mobilização inválida", details: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;
    const contract = await prisma.contract.findUnique({ where: { id: body.contractId } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (!ACTIVE_CONTRACT_STATUS.includes(contract.status)) return NextResponse.json({ error: "Somente contratos ativos ou em renovação aceitam mobilização" }, { status: 409 });

    const repeated = body.mobilizacoes.map((item) => item.employeeId).filter((id, index, all) => all.indexOf(id) !== index);
    if (repeated.length) return NextResponse.json({ error: "O mesmo funcionário foi informado mais de uma vez na solicitação" }, { status: 400 });

    const results: any[] = [];
    for (const request of body.mobilizacoes) {
      const employee = await prisma.employee.findUnique({ where: { id: request.employeeId } });
      if (!employee || !employee.active) {
        results.push({ employeeId: request.employeeId, status: "bloqueada", reason: "Funcionário inexistente ou inativo." });
        continue;
      }
      const period = normalizePeriod(request.startDate, request.endDate, contract);
      if (!period) {
        results.push({ employeeId: employee.id, employeeName: employee.name, status: "bloqueada", reason: "Período inválido ou fora da vigência contratual." });
        continue;
      }

      const [requirements, conflictMobilization, conflictReservation] = await Promise.all([
        requirementsForEmployee(contract.id, employee, period.startDate),
        prisma.mobilization.findFirst({
          where: { employeeId: employee.id, status: { in: ["ativa", "suspensa"] }, startDate: { lte: period.endDate }, OR: [{ endDate: null }, { endDate: { gte: period.startDate } }] },
          include: { contract: { select: { number: true } } },
        }),
        prisma.resourceReservation.findFirst({
          where: { employeeId: employee.id, status: { in: ["provisoria", "confirmada"] }, startDate: { lte: period.endDate }, endDate: { gte: period.startDate }, NOT: { contractId: contract.id } },
        }),
      ]);

      const eligibility = avaliarElegibilidadeDocumental(requirements, request.role || employee.role, period.startDate);
      const reasons = [
        ...eligibility.missing.map((name) => `Faltante: ${name}`),
        ...eligibility.expired.map((name) => `Vencido/validade insuficiente: ${name}`),
        ...eligibility.pendingReview.map((name) => `Aguardando revisão: ${name}`),
        conflictMobilization ? `Conflito com mobilização no contrato ${conflictMobilization.contract.number}.` : "",
        conflictReservation ? "Possui reserva de recurso conflitante no período." : "",
      ].filter(Boolean);
      const eligible = reasons.length === 0;
      const fullCost = Number(linhaFolha(employee as any).custoPleno || 0);

      const mobilization = await prisma.$transaction(async (tx) => {
        const created = await tx.mobilization.create({
          data: {
            contractId: contract.id,
            employeeId: employee.id,
            role: request.role || employee.role || "Operacional",
            startDate: period.startDate,
            endDate: period.endDate,
            hoursDay: request.hoursDay,
            daysWeek: request.daysWeek,
            costPerMonth: fullCost,
            status: eligible ? "ativa" : "suspensa",
            complianceStatus: eligible ? "liberada" : "bloqueada",
            blockedReason: reasons.join(" | ") || null,
            approvedBy: eligible ? user.email || user.name || user.id : null,
            approvedAt: eligible ? new Date() : null,
            notes: request.notes || null,
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CREATE",
            module: "mobilizacoes",
            entityType: "Mobilization",
            entityId: created.id,
            newValues: { contractId: contract.id, employeeId: employee.id, startDate: period.startDate, endDate: period.endDate, status: created.status, complianceStatus: created.complianceStatus, reasons, costPerMonth: fullCost },
          },
        });
        return created;
      });
      results.push({ id: mobilization.id, employeeId: employee.id, employeeName: employee.name, status: mobilization.complianceStatus, reasons });
    }

    const blocked = results.filter((item) => item.status === "bloqueada").length;
    return NextResponse.json({ success: blocked === 0, processed: results.length, blocked, results }, { status: blocked ? 207 : 201 });
  } catch (error) {
    return erroInterno(error, "api/mobilizacoes POST");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel(...WRITE_ROLES);
  if (erro || !user) return erro;

  try {
    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Ação inválida" }, { status: 400 });
    const body = parsed.data;
    const mobilization = await prisma.mobilization.findUnique({ where: { id: body.id }, include: { employee: true, contract: true } });
    if (!mobilization) return NextResponse.json({ error: "Mobilização não encontrada" }, { status: 404 });

    if (body.action === "suspender" || body.action === "encerrar") {
      if (!body.reason || body.reason.length < 3) return NextResponse.json({ error: "Informe o motivo da alteração" }, { status: 400 });
      const endDate = body.action === "encerrar" ? (body.endDate ? parseDataOperacional(body.endDate) : new Date()) : mobilization.endDate;
      if (body.action === "encerrar" && (!endDate || endDate < mobilization.startDate)) return NextResponse.json({ error: "Data de encerramento inválida" }, { status: 400 });
      const updated = await prisma.mobilization.update({
        where: { id: mobilization.id },
        data: {
          status: body.action === "encerrar" ? "encerrada" : "suspensa",
          endDate: body.action === "encerrar" ? endDate : mobilization.endDate,
          complianceStatus: body.action === "encerrar" ? mobilization.complianceStatus : "bloqueada",
          blockedReason: body.action === "suspender" ? body.reason : mobilization.blockedReason,
          notes: `${mobilization.notes || ""}${mobilization.notes ? " | " : ""}${body.action.toUpperCase()}: ${body.reason}`,
        },
      });
      await registrarAuditoria({ userId: user.id, action: body.action.toUpperCase(), module: "mobilizacoes", entityType: "Mobilization", entityId: mobilization.id, oldValues: { status: mobilization.status, complianceStatus: mobilization.complianceStatus, endDate: mobilization.endDate }, newValues: { status: updated.status, complianceStatus: updated.complianceStatus, endDate: updated.endDate, reason: body.reason } });
      return NextResponse.json({ data: updated });
    }

    if (mobilization.status === "encerrada") return NextResponse.json({ error: "Mobilização encerrada não pode ser reavaliada" }, { status: 409 });
    const endDate = mobilization.endDate || mobilization.contract.endDate;
    const [requirements, conflictMobilization, conflictReservation] = await Promise.all([
      requirementsForEmployee(mobilization.contractId, mobilization.employee, mobilization.startDate),
      prisma.mobilization.findFirst({
        where: { id: { not: mobilization.id }, employeeId: mobilization.employeeId, status: { in: ["ativa", "suspensa"] }, startDate: { lte: endDate }, OR: [{ endDate: null }, { endDate: { gte: mobilization.startDate } }] },
        include: { contract: { select: { number: true } } },
      }),
      prisma.resourceReservation.findFirst({
        where: { employeeId: mobilization.employeeId, status: { in: ["provisoria", "confirmada"] }, startDate: { lte: endDate }, endDate: { gte: mobilization.startDate }, NOT: { contractId: mobilization.contractId } },
      }),
    ]);
    const eligibility = avaliarElegibilidadeDocumental(requirements, mobilization.role || mobilization.employee.role, mobilization.startDate);
    const reasons = [
      ...eligibility.missing.map((name) => `Faltante: ${name}`),
      ...eligibility.expired.map((name) => `Vencido/validade insuficiente: ${name}`),
      ...eligibility.pendingReview.map((name) => `Aguardando revisão: ${name}`),
      conflictMobilization ? `Conflito com mobilização no contrato ${conflictMobilization.contract.number}.` : "",
      conflictReservation ? "Possui reserva conflitante no período." : "",
    ].filter(Boolean);
    const eligible = reasons.length === 0 && mobilization.employee.active && ACTIVE_CONTRACT_STATUS.includes(mobilization.contract.status);
    if (!mobilization.employee.active) reasons.push("Funcionário inativo.");
    if (!ACTIVE_CONTRACT_STATUS.includes(mobilization.contract.status)) reasons.push("Contrato não está ativo ou em renovação.");

    const updated = await prisma.mobilization.update({
      where: { id: mobilization.id },
      data: {
        status: eligible ? "ativa" : "suspensa",
        complianceStatus: eligible ? "liberada" : "bloqueada",
        blockedReason: reasons.join(" | ") || null,
        approvedBy: eligible ? user.email || user.name || user.id : null,
        approvedAt: eligible ? new Date() : null,
      },
    });
    await registrarAuditoria({ userId: user.id, action: "REEVALUATE", module: "mobilizacoes", entityType: "Mobilization", entityId: mobilization.id, oldValues: { status: mobilization.status, complianceStatus: mobilization.complianceStatus, blockedReason: mobilization.blockedReason }, newValues: { status: updated.status, complianceStatus: updated.complianceStatus, blockedReason: updated.blockedReason } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    return erroInterno(error, "api/mobilizacoes PATCH");
  }
}
