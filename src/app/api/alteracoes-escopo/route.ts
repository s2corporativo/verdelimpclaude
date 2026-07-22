import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const contractId = req.nextUrl.searchParams.get("contractId") || undefined;
    const data = await prisma.scopeChange.findMany({
      where: contractId ? { contractId } : undefined,
      include: { contract: { select: { number: true, object: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/alteracoes-escopo:get");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.contractId || !body.title || !body.description) {
      return NextResponse.json({ error: "Contrato, título e descrição são obrigatórios" }, { status: 400 });
    }
    const number = await prisma.scopeChange.count({ where: { contractId: body.contractId } }) + 1;
    const data = await prisma.scopeChange.create({
      data: {
        contractId: body.contractId,
        workDiaryId: body.workDiaryId || null,
        number,
        title: body.title,
        description: body.description,
        reason: body.reason || null,
        requestedBy: body.requestedBy || user?.email || user?.name,
        impactDays: Number(body.impactDays || 0),
        impactValue: Number(body.impactValue || 0),
      },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/alteracoes-escopo:post");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "DIRETORIA", "FINANCEIRO");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.id || !["aprovado", "rejeitado", "incorporado"].includes(body.status)) {
      return NextResponse.json({ error: "id e status válido são obrigatórios" }, { status: 400 });
    }
    const data = await prisma.scopeChange.update({
      where: { id: body.id },
      data: {
        status: body.status,
        approvedBy: user?.email || user?.name,
        approvedAt: new Date(),
        notes: body.notes,
      },
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/alteracoes-escopo:patch");
  }
}
