// src/app/api/portal-cliente/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

async function exigirInterno() {
  const session = await getServerSession(authOptions);
  const roles = ((session?.user as any)?.roles || []) as string[];
  return roles.some((role) => ["ADMIN", "COMERCIAL", "GESTOR", "DIRETORIA"].includes(role));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const clientId = searchParams.get("clientId");

  if (clientId && !token) {
    if (!(await exigirInterno())) {
      return NextResponse.json({ error: "Emissão de acesso restrita à equipe interna" }, { status: 403 });
    }
    try {
      const cliente = await prisma.client.findFirst({
        where: { id: clientId, active: true, deletedAt: null },
        select: { id: true },
      });
      if (!cliente) return NextResponse.json({ error: "Cliente ativo não encontrado" }, { status: 404 });

      const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const segredo = randomBytes(32).toString("hex");
      const portalToken = await prisma.clientPortalToken.create({
        data: { clientId, token: segredo, expiresAt: expires },
      });
      return NextResponse.json({ success: true, token: portalToken.token, expiresAt: portalToken.expiresAt });
    } catch (error) {
      return erroInterno(error, "api/portal-cliente emitir acesso");
    }
  }

  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  try {
    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: true },
    });

    if (!portalToken || !portalToken.active || portalToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const contratos = await prisma.contract.findMany({
      where: { clientId: portalToken.clientId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const idsContratos = contratos.map((contract) => contract.id);
    const numeroPorContrato = new Map(contratos.map((contract) => [contract.id, contract.number]));

    const [medicoes, diariosBrutos] = await Promise.all([
      prisma.measurement.findMany({
        where: { contract: { clientId: portalToken.clientId } },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { contract: { select: { number: true } } },
      }),
      prisma.workDiary.findMany({
        where: { contractId: { in: idsContratos } },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);
    const diarios = diariosBrutos.map((diario) => ({
      ...diario,
      contract: { number: diario.contractId ? numeroPorContrato.get(diario.contractId) ?? null : null },
    }));

    return NextResponse.json({
      cliente: portalToken.client,
      contratos,
      medicoes,
      diarios,
      expiresAt: portalToken.expiresAt,
    });
  } catch (error) {
    return erroInterno(error, "api/portal-cliente consultar");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { token, medicaoId, acao, observacao } = await req.json();
    if (!token || !medicaoId || !["aprovar", "contestar"].includes(acao)) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ou ação inválida" }, { status: 400 });
    }

    const portalToken = await prisma.clientPortalToken.findUnique({
      where: { token },
      include: { client: { select: { name: true } } },
    });
    if (!portalToken?.active || portalToken.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const alvo = await prisma.measurement.findUnique({
      where: { id: medicaoId },
      select: {
        id: true,
        status: true,
        notes: true,
        approvedBy: true,
        approvedAt: true,
        contract: { select: { clientId: true } },
      },
    });
    if (!alvo || alvo.contract.clientId !== portalToken.clientId) {
      return NextResponse.json({ error: "Medição não encontrada para este cliente" }, { status: 404 });
    }

    const novoStatus = acao === "aprovar" ? "aprovada" : "glosada";
    if (alvo.status === novoStatus) return NextResponse.json({ success: true, reused: true });
    if (alvo.status !== "enviada") {
      return NextResponse.json({ error: "Somente medições enviadas podem ser decididas pelo portal" }, { status: 409 });
    }

    const identificacao = `${portalToken.client.name} — Portal do Cliente`;
    const notaPortal = observacao
      ? `[Portal do Cliente] ${acao === "aprovar" ? "Aprovação" : "Contestação"}: ${String(observacao).slice(0, 2000)}`
      : `[Portal do Cliente] ${acao === "aprovar" ? "Medição aprovada" : "Medição contestada"}.`;

    const medicao = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.measurement.update({
        where: { id: medicaoId },
        data: {
          status: novoStatus,
          notes: [alvo.notes, notaPortal].filter(Boolean).join("\n"),
          approvedBy: acao === "aprovar" ? identificacao : null,
          approvedAt: acao === "aprovar" ? new Date() : null,
        },
      });
      await tx.auditLog.create({
        data: {
          action: acao === "aprovar" ? "CLIENT_APPROVE" : "CLIENT_CONTEST",
          module: "portal-cliente",
          entityType: "Measurement",
          entityId: medicaoId,
          oldValues: { status: alvo.status, approvedBy: alvo.approvedBy, approvedAt: alvo.approvedAt },
          newValues: { status: novoStatus, clientId: portalToken.clientId, observation: observacao || null },
        },
      });
      return atualizada;
    });

    return NextResponse.json({
      success: true,
      medicao,
      mensagem: acao === "aprovar" ? "Medição aprovada com sucesso." : "Contestação registrada para análise da equipe.",
    });
  } catch (error) {
    return erroInterno(error, "api/portal-cliente decisão");
  }
}
