import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";
const n = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const dossierId = req.nextUrl.searchParams.get("dossierId");
    if (!dossierId) return NextResponse.json({ error: "dossierId obrigatório" }, { status: 400 });
    const data = await prisma.serviceComposition.findMany({ where: { dossierId }, orderBy: { order: "asc" } });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/composicoes:get");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "COMERCIAL", "FINANCEIRO", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.dossierId || !body.activity) return NextResponse.json({ error: "Dossiê e atividade são obrigatórios" }, { status: 400 });
    const order = await prisma.serviceComposition.count({ where: { dossierId: body.dossierId } });
    const data = await prisma.serviceComposition.create({
      data: {
        dossierId: body.dossierId,
        code: body.code || `1.${order + 1}`,
        activity: body.activity,
        laborRole: body.laborRole || null,
        quantity: n(body.quantity),
        unit: body.unit || "m²",
        productivityPerHour: n(body.productivityPerHour, 1),
        teamSize: Math.max(1, Math.ceil(n(body.teamSize, 1))),
        hoursPerDay: n(body.hoursPerDay, 8),
        workDaysPerWeek: Math.max(1, Math.ceil(n(body.workDaysPerWeek, 5))),
        efficiencyFactor: n(body.efficiencyFactor, 1),
        setupHours: n(body.setupHours),
        laborHourlyCost: n(body.laborHourlyCost),
        inputUnitCost: n(body.inputUnitCost),
        equipmentDailyCost: n(body.equipmentDailyCost),
        transportCost: n(body.transportCost),
        additionalCost: n(body.additionalCost),
        order,
      },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/composicoes:post");
  }
}

export async function PUT(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "COMERCIAL", "FINANCEIRO", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const data = await prisma.serviceComposition.update({
      where: { id: body.id },
      data: {
        code: body.code,
        activity: body.activity,
        laborRole: body.laborRole === undefined ? undefined : body.laborRole || null,
        quantity: body.quantity === undefined ? undefined : n(body.quantity),
        unit: body.unit,
        productivityPerHour: body.productivityPerHour === undefined ? undefined : n(body.productivityPerHour),
        teamSize: body.teamSize === undefined ? undefined : Math.max(1, Math.ceil(n(body.teamSize, 1))),
        hoursPerDay: body.hoursPerDay === undefined ? undefined : n(body.hoursPerDay),
        workDaysPerWeek: body.workDaysPerWeek === undefined ? undefined : Math.max(1, Math.ceil(n(body.workDaysPerWeek, 5))),
        efficiencyFactor: body.efficiencyFactor === undefined ? undefined : n(body.efficiencyFactor),
        setupHours: body.setupHours === undefined ? undefined : n(body.setupHours),
        laborHourlyCost: body.laborHourlyCost === undefined ? undefined : n(body.laborHourlyCost),
        inputUnitCost: body.inputUnitCost === undefined ? undefined : n(body.inputUnitCost),
        equipmentDailyCost: body.equipmentDailyCost === undefined ? undefined : n(body.equipmentDailyCost),
        transportCost: body.transportCost === undefined ? undefined : n(body.transportCost),
        additionalCost: body.additionalCost === undefined ? undefined : n(body.additionalCost),
      },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/composicoes:put");
  }
}

export async function DELETE(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "COMERCIAL", "DIRETORIA");
  if (erro) return erro;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.serviceComposition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return erroInterno(error, "api/composicoes:delete");
  }
}
