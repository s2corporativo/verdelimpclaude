import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { linhaFolha } from "@/lib/folha";
import { avaliarElegibilidadeDocumental, type RequisitoElegibilidade } from "@/lib/elegibilidade";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "DIRETORIA", "OPERACIONAL", "OPERACAO");
  if (erro) return erro;
  try {
    const data = await prisma.mobilization.findMany({
      orderBy: { startDate: "desc" },
      include: {
        contract: { select: { number: true, object: true, status: true } },
        employee: { select: { name: true, role: true, salary: true } },
      },
      take: 300,
    });
    const active = data.filter((item) => item.status === "ativa");
    return NextResponse.json({
      data,
      stats: {
        total: data.length,
        ativas: active.length,
        bloqueadas: data.filter((item) => item.complianceStatus === "bloqueada").length,
        custoMensal: active.reduce((sum, item) => sum + Number(item.costPerMonth), 0),
      },
    });
  } catch (error) {
    return erroInterno(error, "api/mobilizacoes:get");
  }
}

async function requirementsForEmployee(contractId: string, employee: any, startDate: Date): Promise<RequisitoElegibilidade[]> {
  const requirements = await prisma.contractDocRequirement.findMany({
    where: { contractId, required: true, scope: { in: ["EMPRESA", "FUNCIONARIO"] } },
    include: { records: { where: { OR: [{ employeeId: employee.id }, { employeeId: null }] }, orderBy: { createdAt: "desc" } } },
  });
  const [aso, trainings, epi] = await Promise.all([
    prisma.asoExam.findFirst({ where: { employeeId: employee.id, result: { in: ["apto", "apto_restricoes"] } }, orderBy: { examDate: "desc" } }),
    prisma.training.findMany({ where: { employeeId: employee.id }, orderBy: { issuedAt: "desc" } }),
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

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    const { contractId, mobilizacoes } = body;
    if (!contractId || !Array.isArray(mobilizacoes) || !mobilizacoes.length) {
      return NextResponse.json({ error: "contractId e mobilizacoes obrigatórios" }, { status: 400 });
    }
    const contract = await prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

    const results: any[] = [];
    for (const request of mobilizacoes) {
      const employee = await prisma.employee.findUnique({ where: { id: request.employeeId } });
      if (!employee || !employee.active) {
        results.push({ employeeId: request.employeeId, status: "bloqueada", reason: "Funcionário inexistente ou inativo." });
        continue;
      }
      const startDate = request.startDate ? parseDataOperacional(request.startDate) : new Date();
      const endDate = request.endDate ? parseDataOperacional(request.endDate) : contract.endDate;
      if (!startDate || !endDate || endDate < startDate) {
        results.push({ employeeId: employee.id, employeeName: employee.name, status: "bloqueada", reason: "Período de mobilização inválido." });
        continue;
      }
      const [requirements, conflictMobilization, conflictReservation] = await Promise.all([
        requirementsForEmployee(contractId, employee, startDate),
        prisma.mobilization.findFirst({
          where: { employeeId: employee.id, status: "ativa", startDate: { lte: endDate }, OR: [{ endDate: null }, { endDate: { gte: startDate } }] },
          include: { contract: { select: { number: true } } },
        }),
        prisma.resourceReservation.findFirst({
          where: { employeeId: employee.id, status: { in: ["provisoria", "confirmada"] }, startDate: { lte: endDate }, endDate: { gte: startDate }, NOT: { contractId } },
        }),
      ]);
      const eligibility = avaliarElegibilidadeDocumental(requirements, request.role || employee.role);
      const conflicts = [
        conflictMobilization ? `Já mobilizado no contrato ${conflictMobilization.contract.number}.` : "",
        conflictReservation ? "Possui reserva de recurso no mesmo período." : "",
      ].filter(Boolean);
      const reasons = [
        ...eligibility.missing.map((name) => `Faltante: ${name}`),
        ...eligibility.expired.map((name) => `Vencido: ${name}`),
        ...eligibility.pendingReview.map((name) => `Aguardando revisão: ${name}`),
        ...conflicts,
      ];
      const eligible = eligibility.eligible && conflicts.length === 0;
      const fullCost = linhaFolha(employee as any).custoPleno;
      const mobilization = await prisma.mobilization.create({
        data: {
          contractId,
          employeeId: employee.id,
          role: request.role || employee.role || "Operacional",
          startDate,
          endDate,
          hoursDay: Number(request.hoursDay || 8),
          daysWeek: Number(request.daysWeek || 5),
          costPerMonth: fullCost,
          status: eligible ? "ativa" : "suspensa",
          complianceStatus: eligible ? "liberada" : "bloqueada",
          blockedReason: reasons.join(" | ") || null,
          approvedBy: eligible ? user?.email || user?.name : null,
          approvedAt: eligible ? new Date() : null,
          notes: request.notes || null,
        },
      });
      results.push({ id: mobilization.id, employeeId: employee.id, employeeName: employee.name, status: mobilization.complianceStatus, reasons });
    }

    const blocked = results.filter((item) => item.status === "bloqueada").length;
    return NextResponse.json({ success: blocked === 0, created: results.length, blocked, results }, { status: blocked ? 207 : 201 });
  } catch (error) {
    return erroInterno(error, "api/mobilizacoes:post");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id || body.action !== "reavaliar") return NextResponse.json({ error: "Mobilização e ação válidas são obrigatórias" }, { status: 400 });
    const mobilization = await prisma.mobilization.findUnique({
      where: { id: body.id },
      include: { employee: true, contract: true },
    });
    if (!mobilization) return NextResponse.json({ error: "Mobilização não encontrada" }, { status: 404 });
    const endDate = mobilization.endDate || mobilization.contract.endDate;
    const [requirements, conflictMobilization, conflictReservation] = await Promise.all([
      requirementsForEmployee(mobilization.contractId, mobilization.employee, mobilization.startDate),
      prisma.mobilization.findFirst({
        where: { id: { not: mobilization.id }, employeeId: mobilization.employeeId, status: "ativa", startDate: { lte: endDate }, OR: [{ endDate: null }, { endDate: { gte: mobilization.startDate } }] },
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
      conflictMobilization ? `Já mobilizado no contrato ${conflictMobilization.contract.number}.` : "",
      conflictReservation ? "Possui reserva conflitante no período." : "",
    ].filter(Boolean);
    const eligible = reasons.length === 0;
    const data = await prisma.mobilization.update({
      where: { id: mobilization.id },
      data: {
        status: eligible ? "ativa" : "suspensa",
        complianceStatus: eligible ? "liberada" : "bloqueada",
        blockedReason: reasons.join(" | ") || null,
        approvedBy: eligible ? user?.email || user?.name : null,
        approvedAt: eligible ? new Date() : null,
      },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/mobilizacoes:patch");
  }
}
