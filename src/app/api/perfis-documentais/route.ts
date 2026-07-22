import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
    const data = await prisma.clientRequirementProfile.findMany({
      where: clientId ? { clientId } : undefined,
      include: { client: { select: { id: true, name: true } } },
      orderBy: [{ clientId: "asc" }, { name: "asc" }, { version: "desc" }],
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/perfis-documentais:get");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.clientId || !body.name || !Array.isArray(body.requirements)) {
      return NextResponse.json({ error: "Cliente, nome e requisitos são obrigatórios" }, { status: 400 });
    }
    const requirements = body.requirements.filter((item: any) => String(item?.name || "").trim()).map((item: any) => ({
      name: String(item.name).trim(),
      scope: ["EMPRESA", "FUNCIONARIO", "EQUIPAMENTO"].includes(item.scope) ? item.scope : "FUNCIONARIO",
      validityDays: item.validityDays == null || item.validityDays === "" ? null : Number(item.validityDays),
      leadTimeDays: Number(item.leadTimeDays || 0),
      blocking: item.blocking !== false,
      activity: item.activity ? String(item.activity) : null,
      role: item.role ? String(item.role) : null,
      equipmentType: item.equipmentType ? String(item.equipmentType) : null,
    }));
    if (!requirements.length) return NextResponse.json({ error: "Inclua ao menos um requisito documental" }, { status: 400 });
    if (requirements.some((item: any) => (item.validityDays != null && (!Number.isFinite(item.validityDays) || item.validityDays < 0)) || !Number.isFinite(item.leadTimeDays) || item.leadTimeDays < 0)) {
      return NextResponse.json({ error: "Validade e antecedência devem ser números não negativos" }, { status: 400 });
    }
    const data = await prisma.$transaction(async (tx) => {
      const latest = await tx.clientRequirementProfile.findFirst({
        where: { clientId: body.clientId, name: body.name }, orderBy: { version: "desc" },
      });
      if (latest) await tx.clientRequirementProfile.updateMany({
        where: { clientId: body.clientId, name: body.name, active: true }, data: { active: false },
      });
      return tx.clientRequirementProfile.create({ data: {
        clientId: body.clientId,
        name: body.name,
        version: (latest?.version || 0) + 1,
        serviceTypes: Array.isArray(body.serviceTypes) ? body.serviceTypes : [],
        requirements,
        notes: body.notes || null,
      }});
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) return NextResponse.json({ error: "Outra versão foi criada ao mesmo tempo. Atualize e tente novamente." }, { status: 409 });
    return erroInterno(error, "api/perfis-documentais:post");
  }
}
