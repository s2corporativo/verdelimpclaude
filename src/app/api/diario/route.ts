import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";
const n = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

function hoursBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const contractId = req.nextUrl.searchParams.get("contractId") || undefined;
    const [data, contracts] = await Promise.all([
      prisma.workDiary.findMany({
        where: contractId ? { contractId } : undefined,
        orderBy: { date: "desc" },
        take: 200,
        include: {
          contract: { select: { id: true, number: true, object: true } },
          composition: true,
          scopeChanges: true,
        },
      }),
      prisma.contract.findMany({
        where: { status: "Ativo" },
        select: { id: true, number: true, object: true, dossier: { include: { compositions: { orderBy: { order: "asc" } } } }, mobilizations: { where: { status: "ativa" }, select: { costPerMonth: true } } },
        orderBy: { number: "asc" },
      }),
    ]);

    const contract = contractId ? contracts.find((item) => item.id === contractId) : null;
    const hourlyLaborCost = contract?.mobilizations.length
      ? contract.mobilizations.reduce((sum, item) => sum + Number(item.costPerMonth), 0) / (contract.mobilizations.length * 220)
      : 0;
    const actualHours = data.reduce((sum, item) => sum + n(item.laborHours), 0);
    const actualQuantity = data.reduce((sum, item) => sum + n(item.quantityDone), 0);
    const actualOtherCost = data.reduce((sum, item) => sum + n(item.inputCost) + n(item.equipmentCost) + n(item.transportCost), 0);
    const plannedHours = contract?.dossier?.compositions.reduce((sum, item) => sum + Number(item.plannedLaborHours), 0) || 0;
    const plannedQuantity = contract?.dossier?.compositions.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;

    return NextResponse.json({
      data,
      contracts,
      performance: contract ? {
        plannedHours,
        actualHours,
        hoursVariance: actualHours - plannedHours,
        plannedQuantity,
        actualQuantity,
        plannedProductivity: plannedHours > 0 ? plannedQuantity / plannedHours : 0,
        actualProductivity: actualHours > 0 ? actualQuantity / actualHours : 0,
        estimatedLaborCost: actualHours * hourlyLaborCost,
        actualOtherCost,
        accepted: data.filter((item) => item.clientAccepted).length,
        pendingAcceptance: data.filter((item) => !item.clientAccepted).length,
      } : null,
    });
  } catch (error) {
    return erroInterno(error, "api/diario:get");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.contractId || !body.location || !body.activitiesDone) {
      return NextResponse.json({ error: "Contrato, local e atividades são obrigatórios" }, { status: 400 });
    }
    const date = body.date ? parseDataOperacional(body.date) : new Date();
    if (!date) return NextResponse.json({ error: "Data do diário inválida" }, { status: 400 });
    if (body.clientAccepted && !String(body.acceptedBy || "").trim()) {
      return NextResponse.json({ error: "Informe quem, pelo cliente, aceitou o apontamento" }, { status: 400 });
    }
    const contract = await prisma.contract.findUnique({ where: { id: body.contractId }, select: { id: true, status: true, dossier: { select: { id: true } } } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (contract.status !== "Ativo") return NextResponse.json({ error: "O diário só pode ser lançado em contrato ativo" }, { status: 422 });
    if (body.compositionId) {
      const composition = await prisma.serviceComposition.findUnique({ where: { id: body.compositionId }, select: { dossierId: true } });
      if (!composition || composition.dossierId !== contract.dossier?.id) {
        return NextResponse.json({ error: "A composição não pertence ao dossiê deste contrato" }, { status: 422 });
      }
    }
    const teamSize = Math.max(1, Math.ceil(n(body.teamSize, 1)));
    const laborHours = body.laborHours == null || body.laborHours === ""
      ? hoursBetween(body.startTime, body.endTime) * teamSize
      : n(body.laborHours);
    if (laborHours <= 0) return NextResponse.json({ error: "Informe horários válidos ou um total de HH maior que zero" }, { status: 400 });
    const diary = await prisma.$transaction(async (tx) => {
      const created = await tx.workDiary.create({
        data: {
          date,
          contractId: body.contractId,
          compositionId: body.compositionId || null,
          location: body.location,
          supervisor: body.supervisor || user?.name || user?.email || "",
          teamSize,
          weather: body.weather || "Bom",
          activitiesDone: body.activitiesDone,
          areasWorked: body.areasWorked || null,
          equipmentUsed: body.equipmentUsed || null,
          occurrences: body.occurrences || null,
          startTime: body.startTime || null,
          endTime: body.endTime || null,
          laborHours,
          quantityDone: body.quantityDone == null || body.quantityDone === "" ? null : n(body.quantityDone),
          quantityUnit: body.quantityUnit || null,
          inputCost: n(body.inputCost),
          equipmentCost: n(body.equipmentCost),
          transportCost: n(body.transportCost),
          clientAccepted: Boolean(body.clientAccepted),
          acceptedBy: body.clientAccepted ? String(body.acceptedBy).trim() : null,
          acceptedAt: body.clientAccepted ? new Date() : null,
        },
      });
      if (body.scopeChange?.title && body.scopeChange?.description) {
        const number = await tx.scopeChange.count({ where: { contractId: body.contractId } }) + 1;
        await tx.scopeChange.create({
          data: {
            contractId: body.contractId,
            workDiaryId: created.id,
            number,
            title: body.scopeChange.title,
            description: body.scopeChange.description,
            reason: body.scopeChange.reason || "Desvio identificado no diário de obras",
            requestedBy: user?.email || user?.name,
            impactDays: Math.ceil(n(body.scopeChange.impactDays)),
            impactValue: n(body.scopeChange.impactValue),
          },
        });
      }
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data: diary }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string })?.code === "P2034") return NextResponse.json({ error: "Outro lançamento foi salvo ao mesmo tempo. Atualize e tente novamente." }, { status: 409 });
    return erroInterno(error, "api/diario:post");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.id || body.action !== "accept") return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    if (!String(body.acceptedBy || "").trim()) return NextResponse.json({ error: "Informe o representante do cliente que aceitou" }, { status: 400 });
    const data = await prisma.workDiary.update({
      where: { id: body.id },
      data: { clientAccepted: true, acceptedBy: String(body.acceptedBy).trim(), acceptedAt: new Date() },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/diario:patch");
  }
}
