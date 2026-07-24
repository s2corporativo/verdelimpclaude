import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const STAGES = ["monitorando", "analisando", "proposta_enviada", "em_julgamento", "ganho", "perdido"] as const;
const PRIORIDADES = ["alta", "media", "baixa"] as const;

const ConsultaSchema = z.object({
  stage: z.enum(STAGES).optional(),
  q: z.string().trim().max(150).optional(),
  limite: z.coerce.number().int().min(1).max(500).default(200),
});

const CamposBidSchema = z.object({
  titulo: z.string().trim().min(3).max(300),
  orgao: z.string().trim().min(2).max(250),
  editalNumero: z.string().trim().max(100).optional().nullable(),
  objeto: z.string().trim().max(3000).optional().nullable(),
  valorEstimado: z.coerce.number().nonnegative().max(10_000_000_000).optional().nullable(),
  dataAbertura: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  dataLimite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  modalidade: z.string().trim().max(120).optional().nullable(),
  stage: z.enum(STAGES).default("monitorando"),
  prioridade: z.enum(PRIORIDADES).default("media"),
  probabilidade: z.coerce.number().int().min(0).max(100).default(30),
  municipio: z.string().trim().max(150).optional().nullable(),
  uf: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional().nullable(),
  url: z.string().trim().url().max(1500).optional().nullable().or(z.literal("")),
  pncpId: z.string().trim().max(200).optional().nullable(),
  proposalId: z.string().trim().max(80).optional().nullable(),
  contratoId: z.string().trim().max(80).optional().nullable(),
  responsavel: z.string().trim().max(150).optional().nullable(),
  notas: z.string().trim().max(5000).optional().nullable(),
  perdaMotivo: z.string().trim().max(1000).optional().nullable(),
});

const CriarSchema = CamposBidSchema.extend({ action: z.undefined().optional() });
const AtualizarSchema = CamposBidSchema.partial().extend({
  action: z.literal("update"),
  id: z.string().trim().min(1),
});
const MoverSchema = z.object({
  action: z.literal("move_stage"),
  id: z.string().trim().min(1),
  stage: z.enum(STAGES),
  perdaMotivo: z.string().trim().max(1000).optional().nullable(),
});

function dataUtc(data?: string | null) {
  if (!data) return null;
  const resultado = new Date(`${data}T00:00:00.000Z`);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "COMERCIAL", "GESTOR", "FINANCEIRO");
  if (erro) return erro;

  try {
    const validacao = ConsultaSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    if (!validacao.success) return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    const filtros = validacao.data;

    const bids = await prisma.bidPipeline.findMany({
      where: {
        ...(filtros.stage ? { stage: filtros.stage } : {}),
        ...(filtros.q ? {
          OR: [
            { titulo: { contains: filtros.q, mode: "insensitive" } },
            { orgao: { contains: filtros.q, mode: "insensitive" } },
            { objeto: { contains: filtros.q, mode: "insensitive" } },
            { editalNumero: { contains: filtros.q, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: [{ stage: "asc" }, { prioridade: "asc" }, { dataAbertura: "asc" }, { createdAt: "desc" }],
      take: filtros.limite,
    });

    return NextResponse.json({ bids, total: bids.length, fonte: "pipeline_licitacoes" });
  } catch (e) {
    return erroInterno(e, "api/bid-pipeline GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "COMERCIAL", "GESTOR");
  if (erro) return erro;

  try {
    const body = await req.json();

    if (body?.action === "move_stage") {
      const validacao = MoverSchema.safeParse(body);
      if (!validacao.success) return NextResponse.json({ error: "Movimentação inválida." }, { status: 400 });
      const dados = validacao.data;
      const atual = await prisma.bidPipeline.findUnique({ where: { id: dados.id } });
      if (!atual) return NextResponse.json({ error: "Licitação não encontrada." }, { status: 404 });
      if (dados.stage === "perdido" && !dados.perdaMotivo) {
        return NextResponse.json({ error: "Informe o motivo da perda." }, { status: 400 });
      }

      const bid = await prisma.bidPipeline.update({
        where: { id: dados.id },
        data: {
          stage: dados.stage,
          perdaMotivo: dados.stage === "perdido" ? dados.perdaMotivo : null,
          ...(dados.stage === "ganho" ? { probabilidade: 100 } : {}),
          ...(dados.stage === "perdido" ? { probabilidade: 0 } : {}),
        },
      });
      await registrarAuditoria({
        userId: user!.id,
        action: "MOVER_ETAPA",
        module: "licitacoes",
        entityType: "BidPipeline",
        entityId: bid.id,
        oldValues: { stage: atual.stage, probabilidade: atual.probabilidade, perdaMotivo: atual.perdaMotivo },
        newValues: { stage: bid.stage, probabilidade: bid.probabilidade, perdaMotivo: bid.perdaMotivo },
      });
      return NextResponse.json({ success: true, bid });
    }

    if (body?.action === "update") {
      const validacao = AtualizarSchema.safeParse(body);
      if (!validacao.success) {
        return NextResponse.json({
          error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
        }, { status: 400 });
      }
      const dados = validacao.data;
      const atual = await prisma.bidPipeline.findUnique({ where: { id: dados.id } });
      if (!atual) return NextResponse.json({ error: "Licitação não encontrada." }, { status: 404 });
      const stageFinal = dados.stage || atual.stage;
      const perdaMotivo = dados.perdaMotivo !== undefined ? dados.perdaMotivo : atual.perdaMotivo;
      if (stageFinal === "perdido" && !perdaMotivo) {
        return NextResponse.json({ error: "Informe o motivo da perda." }, { status: 400 });
      }

      const bid = await prisma.bidPipeline.update({
        where: { id: dados.id },
        data: {
          ...(dados.titulo !== undefined ? { titulo: dados.titulo } : {}),
          ...(dados.orgao !== undefined ? { orgao: dados.orgao } : {}),
          ...(dados.editalNumero !== undefined ? { editalNumero: dados.editalNumero || null } : {}),
          ...(dados.objeto !== undefined ? { objeto: dados.objeto || dados.titulo || atual.titulo } : {}),
          ...(dados.valorEstimado !== undefined ? { valorEstimado: dados.valorEstimado } : {}),
          ...(dados.dataAbertura !== undefined ? { dataAbertura: dataUtc(dados.dataAbertura) } : {}),
          ...(dados.dataLimite !== undefined ? { dataLimite: dataUtc(dados.dataLimite) } : {}),
          ...(dados.modalidade !== undefined ? { modalidade: dados.modalidade || null } : {}),
          ...(dados.stage !== undefined ? { stage: dados.stage } : {}),
          ...(dados.prioridade !== undefined ? { prioridade: dados.prioridade } : {}),
          ...(dados.probabilidade !== undefined ? { probabilidade: dados.probabilidade } : {}),
          ...(dados.municipio !== undefined ? { municipio: dados.municipio || null } : {}),
          ...(dados.uf !== undefined ? { uf: dados.uf || null } : {}),
          ...(dados.url !== undefined ? { url: dados.url || null } : {}),
          ...(dados.pncpId !== undefined ? { pncpId: dados.pncpId || null } : {}),
          ...(dados.proposalId !== undefined ? { proposalId: dados.proposalId || null } : {}),
          ...(dados.contratoId !== undefined ? { contratoId: dados.contratoId || null } : {}),
          ...(dados.responsavel !== undefined ? { responsavel: dados.responsavel || null } : {}),
          ...(dados.notas !== undefined ? { notas: dados.notas || null } : {}),
          ...(dados.perdaMotivo !== undefined ? { perdaMotivo: dados.perdaMotivo || null } : {}),
        },
      });
      await registrarAuditoria({
        userId: user!.id,
        action: "EDITAR",
        module: "licitacoes",
        entityType: "BidPipeline",
        entityId: bid.id,
        oldValues: { titulo: atual.titulo, orgao: atual.orgao, stage: atual.stage, probabilidade: atual.probabilidade },
        newValues: { titulo: bid.titulo, orgao: bid.orgao, stage: bid.stage, probabilidade: bid.probabilidade },
      });
      return NextResponse.json({ success: true, bid });
    }

    const validacao = CriarSchema.safeParse(body);
    if (!validacao.success) {
      return NextResponse.json({
        error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      }, { status: 400 });
    }
    const dados = validacao.data;
    if (dados.stage === "perdido" && !dados.perdaMotivo) {
      return NextResponse.json({ error: "Informe o motivo da perda." }, { status: 400 });
    }

    if (dados.pncpId) {
      const existente = await prisma.bidPipeline.findFirst({ where: { pncpId: dados.pncpId }, select: { id: true } });
      if (existente) return NextResponse.json({ error: "Esta contratação do PNCP já está no pipeline.", id: existente.id }, { status: 409 });
    } else if (dados.editalNumero) {
      const existente = await prisma.bidPipeline.findFirst({
        where: { editalNumero: dados.editalNumero, orgao: { equals: dados.orgao, mode: "insensitive" } },
        select: { id: true },
      });
      if (existente) return NextResponse.json({ error: "Este edital já está no pipeline para o órgão informado.", id: existente.id }, { status: 409 });
    }

    const bid = await prisma.bidPipeline.create({
      data: {
        titulo: dados.titulo,
        orgao: dados.orgao,
        editalNumero: dados.editalNumero || null,
        objeto: dados.objeto || dados.titulo,
        valorEstimado: dados.valorEstimado ?? null,
        dataAbertura: dataUtc(dados.dataAbertura),
        dataLimite: dataUtc(dados.dataLimite),
        modalidade: dados.modalidade || null,
        stage: dados.stage,
        prioridade: dados.prioridade,
        probabilidade: dados.stage === "ganho" ? 100 : dados.stage === "perdido" ? 0 : dados.probabilidade,
        municipio: dados.municipio || null,
        uf: dados.uf || null,
        url: dados.url || null,
        pncpId: dados.pncpId || null,
        proposalId: dados.proposalId || null,
        contratoId: dados.contratoId || null,
        responsavel: dados.responsavel || null,
        notas: dados.notas || null,
        perdaMotivo: dados.stage === "perdido" ? dados.perdaMotivo : null,
      },
    });

    await registrarAuditoria({
      userId: user!.id,
      action: "CRIAR",
      module: "licitacoes",
      entityType: "BidPipeline",
      entityId: bid.id,
      newValues: { titulo: bid.titulo, orgao: bid.orgao, stage: bid.stage, valorEstimado: Number(bid.valorEstimado || 0) },
    });

    return NextResponse.json({ success: true, bid }, { status: 201 });
  } catch (e) {
    return erroInterno(e, "api/bid-pipeline POST");
  }
}
