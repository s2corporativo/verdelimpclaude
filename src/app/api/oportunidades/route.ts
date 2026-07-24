// Demandas comerciais — entrada única para clientes privados, renovações e serviços emergenciais.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const estagiosAtivos = ["lead", "qualificado", "proposta", "negociacao", "ganho", "perdido"] as const;
const PREFIXO_DOSSIE = "OPPORTUNITY:";

const textoOpcional = (limite: number) => z.string().trim().max(limite).optional().nullable();

const demandaSchema = z.object({
  prospectName: z.string().trim().min(1, "Nome do cliente é obrigatório").max(180),
  contactName: textoOpcional(150),
  phone: textoOpcional(40),
  email: z.union([z.string().trim().email("E-mail inválido").max(180), z.literal("")]).optional().nullable(),
  origin: textoOpcional(80),
  serviceType: textoOpcional(180),
  estimatedValue: z.union([z.string(), z.number()]).optional().nullable(),
  stage: z.enum(estagiosAtivos).optional(),
  nextAction: textoOpcional(300),
  nextActionDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"), z.literal("")]).optional().nullable(),
  notes: textoOpcional(4000),
});

const atualizacaoSchema = demandaSchema.partial().extend({
  id: z.string().trim().min(1, "id obrigatório"),
});

const arquivoSchema = z.object({
  id: z.string().trim().min(1, "id obrigatório"),
  action: z.enum(["archive", "restore"]),
  restoreStage: z.enum(estagiosAtivos).optional(),
});

function valorMonetario(valor: string | number | null | undefined) {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0 || numero > 9999999999999.99) {
    throw new Error("Valor estimado inválido");
  }
  return numero;
}

function dataOpcional(valor: string | null | undefined) {
  if (!valor) return null;
  const data = new Date(`${valor}T12:00:00`);
  if (Number.isNaN(data.getTime())) throw new Error("Data inválida");
  return data;
}

function paraAuditoria(oportunidade: any): Record<string, string | number | null> {
  return {
    id: oportunidade.id,
    prospectName: oportunidade.prospectName,
    contactName: oportunidade.contactName,
    phone: oportunidade.phone,
    email: oportunidade.email,
    origin: oportunidade.origin,
    serviceType: oportunidade.serviceType,
    estimatedValue: oportunidade.estimatedValue === null ? null : Number(oportunidade.estimatedValue),
    stage: oportunidade.stage,
    nextAction: oportunidade.nextAction,
    nextActionDate: oportunidade.nextActionDate ? new Date(oportunidade.nextActionDate).toISOString() : null,
    notes: oportunidade.notes,
  };
}

async function enriquecerComDossies(oportunidades: any[]) {
  if (!oportunidades.length) return oportunidades;
  const fontes = oportunidades.map((oportunidade) => `${PREFIXO_DOSSIE}${oportunidade.id}`);
  const dossies = await prisma.serviceDossier.findMany({
    where: { sourceName: { in: fontes } },
    select: { id: true, code: true, sourceName: true, status: true, validationStatus: true, proposalId: true, contractId: true },
  });
  const porDemanda = new Map(
    dossies.map((dossie) => [String(dossie.sourceName || "").replace(PREFIXO_DOSSIE, ""), dossie]),
  );
  return oportunidades.map((oportunidade) => ({ ...oportunidade, dossier: porDemanda.get(oportunidade.id) || null }));
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro) return erro;

  try {
    const arquivadas = req.nextUrl.searchParams.get("arquivadas") === "1";
    const oportunidadesBase = await prisma.opportunity.findMany({
      where: arquivadas ? { stage: "arquivado" } : { stage: { not: "arquivado" } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    });
    const oportunidades = await enriquecerComDossies(oportunidadesBase);
    const total = oportunidades
      .filter((oportunidade) => !["ganho", "perdido", "arquivado"].includes(oportunidade.stage))
      .reduce((soma, oportunidade) => soma + Number(oportunidade.estimatedValue || 0), 0);

    return NextResponse.json({ oportunidades, valorEmAberto: total, arquivadas });
  } catch (e) {
    return erroInterno(e, "api/oportunidades GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro || !user) return erro;

  try {
    const validacao = demandaSchema.safeParse(await req.json());
    if (!validacao.success) {
      return NextResponse.json({ error: validacao.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    }

    const b = validacao.data;
    const oportunidade = await prisma.opportunity.create({
      data: {
        prospectName: b.prospectName,
        contactName: b.contactName || null,
        phone: b.phone || null,
        email: b.email || null,
        origin: b.origin || null,
        serviceType: b.serviceType || null,
        estimatedValue: valorMonetario(b.estimatedValue),
        stage: b.stage || "lead",
        nextAction: b.nextAction || null,
        nextActionDate: dataOpcional(b.nextActionDate),
        notes: b.notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        module: "demandas",
        entityType: "Opportunity",
        entityId: oportunidade.id,
        newValues: paraAuditoria(oportunidade),
      },
    });

    return NextResponse.json({ ok: true, id: oportunidade.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && ["Valor estimado inválido", "Data inválida"].includes(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return erroInterno(e, "api/oportunidades POST");
  }
}

export async function PUT(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro || !user) return erro;

  try {
    const validacao = atualizacaoSchema.safeParse(await req.json());
    if (!validacao.success) {
      return NextResponse.json({ error: validacao.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    }

    const b = validacao.data;
    const anterior = await prisma.opportunity.findUnique({ where: { id: b.id } });
    if (!anterior) return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });
    if (anterior.stage === "arquivado") return NextResponse.json({ error: "Restaure a demanda antes de editá-la" }, { status: 409 });

    const data: Record<string, any> = {};
    for (const chave of ["prospectName", "contactName", "phone", "email", "origin", "serviceType", "stage", "nextAction", "notes"] as const) {
      if (b[chave] !== undefined) data[chave] = b[chave] || null;
    }
    if (b.prospectName !== undefined) data.prospectName = b.prospectName;
    if (b.estimatedValue !== undefined) data.estimatedValue = valorMonetario(b.estimatedValue);
    if (b.nextActionDate !== undefined) data.nextActionDate = dataOpcional(b.nextActionDate);

    const atualizada = await prisma.opportunity.update({ where: { id: b.id }, data });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        module: "demandas",
        entityType: "Opportunity",
        entityId: atualizada.id,
        oldValues: paraAuditoria(anterior),
        newValues: paraAuditoria(atualizada),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && ["Valor estimado inválido", "Data inválida"].includes(e.message)) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return erroInterno(e, "api/oportunidades PUT");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro || !user) return erro;

  try {
    const validacao = arquivoSchema.safeParse(await req.json());
    if (!validacao.success) return NextResponse.json({ error: validacao.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    const { id, action, restoreStage } = validacao.data;
    const anterior = await prisma.opportunity.findUnique({ where: { id } });
    if (!anterior) return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });

    if (action === "archive") {
      if (anterior.stage === "arquivado") return NextResponse.json({ ok: true, unchanged: true });
      const atualizada = await prisma.opportunity.update({
        where: { id },
        data: { stage: "arquivado", nextAction: null, nextActionDate: null },
      });
      await prisma.auditLog.create({
        data: { userId: user.id, action: "ARCHIVE", module: "demandas", entityType: "Opportunity", entityId: id, oldValues: paraAuditoria(anterior), newValues: paraAuditoria(atualizada) },
      });
      return NextResponse.json({ ok: true });
    }

    if (anterior.stage !== "arquivado") return NextResponse.json({ ok: true, unchanged: true });
    const atualizada = await prisma.opportunity.update({
      where: { id },
      data: { stage: restoreStage || "lead", nextAction: "Revisar demanda restaurada" },
    });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "RESTORE", module: "demandas", entityType: "Opportunity", entityId: id, oldValues: paraAuditoria(anterior), newValues: paraAuditoria(atualizada) },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroInterno(e, "api/oportunidades PATCH");
  }
}

// Compatibilidade: requisições DELETE antigas agora arquivam logicamente o registro.
export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const anterior = await prisma.opportunity.findUnique({ where: { id } });
    if (!anterior) return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });
    if (anterior.stage === "arquivado") return NextResponse.json({ ok: true, unchanged: true });

    const atualizada = await prisma.opportunity.update({
      where: { id },
      data: { stage: "arquivado", nextAction: null, nextActionDate: null },
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ARCHIVE",
        module: "demandas",
        entityType: "Opportunity",
        entityId: id,
        oldValues: paraAuditoria(anterior),
        newValues: paraAuditoria(atualizada),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return erroInterno(e, "api/oportunidades DELETE");
  }
}
