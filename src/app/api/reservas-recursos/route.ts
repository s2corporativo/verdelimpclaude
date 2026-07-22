import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["provisoria", "confirmada"];
const WRITE_ROLES = ["ADMIN", "COMERCIAL", "OPERACIONAL", "OPERACAO", "OPERAÇÃO", "RH", "DIRETORIA"];

function validDate(value: unknown) {
  return parseDataOperacional(value);
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const dossierId = req.nextUrl.searchParams.get("dossierId") || undefined;
    const contractId = req.nextUrl.searchParams.get("contractId") || undefined;
    const includeResources = req.nextUrl.searchParams.get("includeResources") === "1";
    const [reservations, employees, equipment] = await Promise.all([
      prisma.resourceReservation.findMany({
        where: dossierId ? { dossierId } : contractId ? { contractId } : undefined,
        include: {
          employee: { select: { id: true, name: true, role: true, status: true } },
          equipment: { select: { id: true, codigo: true, descricao: true, tipo: true, status: true } },
        },
        orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
        take: 300,
      }),
      includeResources
        ? prisma.employee.findMany({
            where: { active: true, status: "ativo" },
            select: { id: true, name: true, role: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
      includeResources
        ? prisma.equipment.findMany({
            where: { ativo: true },
            select: { id: true, codigo: true, descricao: true, tipo: true, status: true },
            orderBy: { descricao: "asc" },
          })
        : Promise.resolve([]),
    ]);
    return NextResponse.json({ data: reservations, resources: { employees, equipment } });
  } catch (error) {
    return erroInterno(error, "api/reservas-recursos:get");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel(...WRITE_ROLES);
  if (erro) return erro;
  try {
    const body = await req.json().catch(() => ({}));
    const resourceType = String(body.resourceType || "").toUpperCase();
    const startDate = validDate(body.startDate);
    const endDate = validDate(body.endDate);
    const dossierId = body.dossierId ? String(body.dossierId) : null;
    const contractId = body.contractId ? String(body.contractId) : null;
    const employeeId = resourceType === "EMPLOYEE" && body.employeeId ? String(body.employeeId) : null;
    const equipmentId = resourceType === "EQUIPMENT" && body.equipmentId ? String(body.equipmentId) : null;

    if (!["EMPLOYEE", "EQUIPMENT"].includes(resourceType)) {
      return NextResponse.json({ error: "Tipo de recurso inválido" }, { status: 400 });
    }
    if (!dossierId && !contractId) {
      return NextResponse.json({ error: "Vincule a reserva a um dossiê ou contrato" }, { status: 400 });
    }
    if (!startDate || !endDate || endDate < startDate) {
      return NextResponse.json({ error: "Período da reserva inválido" }, { status: 400 });
    }
    if ((resourceType === "EMPLOYEE" && !employeeId) || (resourceType === "EQUIPMENT" && !equipmentId)) {
      return NextResponse.json({ error: "Selecione o recurso que será reservado" }, { status: 400 });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      if (dossierId && !(await tx.serviceDossier.findUnique({ where: { id: dossierId }, select: { id: true } }))) {
        throw new Error("DOSSIER_NOT_FOUND");
      }
      if (contractId && !(await tx.contract.findUnique({ where: { id: contractId }, select: { id: true } }))) {
        throw new Error("CONTRACT_NOT_FOUND");
      }
      if (employeeId) {
        const employee = await tx.employee.findUnique({ where: { id: employeeId }, select: { active: true, status: true } });
        if (!employee?.active || employee.status !== "ativo") throw new Error("RESOURCE_UNAVAILABLE");
      }
      if (equipmentId) {
        const equipment = await tx.equipment.findUnique({ where: { id: equipmentId }, select: { ativo: true, status: true } });
        if (!equipment?.ativo || equipment.status !== "operacional") throw new Error("RESOURCE_UNAVAILABLE");
      }

      const conflict = await tx.resourceReservation.findFirst({
        where: {
          status: { in: ACTIVE_STATUSES },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
          ...(employeeId ? { employeeId } : { equipmentId }),
        },
        select: { id: true, startDate: true, endDate: true, dossierId: true, contractId: true },
      });
      if (conflict) throw new Error("RESOURCE_CONFLICT");

      return tx.resourceReservation.create({
        data: {
          dossierId,
          contractId,
          employeeId,
          equipmentId,
          resourceType,
          startDate,
          endDate,
          notes: body.notes ? String(body.notes) : null,
        },
        include: {
          employee: { select: { id: true, name: true, role: true, status: true } },
          equipment: { select: { id: true, codigo: true, descricao: true, tipo: true, status: true } },
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ data: reservation }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "DOSSIER_NOT_FOUND") return NextResponse.json({ error: "Dossiê não encontrado" }, { status: 404 });
    if (code === "CONTRACT_NOT_FOUND") return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (code === "RESOURCE_UNAVAILABLE") return NextResponse.json({ error: "O recurso está inativo ou indisponível" }, { status: 409 });
    if (code === "RESOURCE_CONFLICT" || (error as { code?: string })?.code === "P2034") {
      return NextResponse.json({ error: "O recurso já está reservado ou mobilizado nesse período. Atualize e tente novamente." }, { status: 409 });
    }
    return erroInterno(error, "api/reservas-recursos:post");
  }
}

export async function PATCH(req: NextRequest) {
  const { erro } = await exigirPapel(...WRITE_ROLES);
  if (erro) return erro;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id || body.status !== "cancelada") {
      return NextResponse.json({ error: "Informe a reserva e a ação de cancelamento" }, { status: 400 });
    }
    const data = await prisma.resourceReservation.update({
      where: { id: String(body.id) },
      data: { status: "cancelada", notes: body.notes ? String(body.notes) : undefined },
    });
    return NextResponse.json({ data });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2025") return NextResponse.json({ error: "Reserva não encontrada" }, { status: 404 });
    return erroInterno(error, "api/reservas-recursos:patch");
  }
}
