import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";
const n = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export async function GET() {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const data = await prisma.taxProfile.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }, { version: "desc" }] });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/perfis-tributarios:get");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "FINANCEIRO", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });
    const rateFields = ["effectiveRate", "issRate", "inssRetentionRate", "irrfRetentionRate", "csllPisCofinsRetentionRate", "otherRate"] as const;
    const rates = Object.fromEntries(rateFields.map((field) => [field, n(body[field])])) as Record<(typeof rateFields)[number], number>;
    if (rateFields.some((field) => !Number.isFinite(Number(body[field] ?? 0)) || rates[field] < 0 || rates[field] > 100)) {
      return NextResponse.json({ error: "Alíquotas devem estar entre 0% e 100%" }, { status: 400 });
    }
    const data = await prisma.$transaction(async (tx) => {
      const latest = await tx.taxProfile.findFirst({ where: { name: body.name }, orderBy: { version: "desc" } });
      if (latest) await tx.taxProfile.updateMany({ where: { name: body.name, active: true }, data: { active: false, validUntil: new Date() } });
      return tx.taxProfile.create({ data: {
        name: body.name,
        version: (latest?.version || 0) + 1,
        regime: body.regime || "Simples Nacional",
        effectiveRate: rates.effectiveRate,
        issRate: rates.issRate,
        issRetained: Boolean(body.issRetained),
        issIncludedInEffectiveRate: body.issIncludedInEffectiveRate !== false,
        inssRetentionRate: rates.inssRetentionRate,
        inssRecoverable: body.inssRecoverable !== false,
        irrfRetentionRate: rates.irrfRetentionRate,
        csllPisCofinsRetentionRate: rates.csllPisCofinsRetentionRate,
        otherRate: rates.otherRate,
        notes: body.notes || null,
      }});
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) return NextResponse.json({ error: "Outra versão foi criada ao mesmo tempo. Atualize e tente novamente." }, { status: 409 });
    return erroInterno(error, "api/perfis-tributarios:post");
  }
}

export async function PATCH(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "FINANCEIRO", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const data = await prisma.taxProfile.update({
      where: { id: body.id },
      data: { active: Boolean(body.active), validUntil: body.active ? null : new Date() },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/perfis-tributarios:patch");
  }
}
