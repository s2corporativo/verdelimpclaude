import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const PREFIXO_FONTE = "OPPORTUNITY:";
const urlDossie = (id: string) => `/dashboard/proposta-edital?id=${encodeURIComponent(id)}`;

function dadosAuditoria(valor: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(valor)) as Record<string, string | number | boolean | null>;
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro || !user) return erro;

  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "id da demanda é obrigatório" }, { status: 400 });

    const demanda = await prisma.opportunity.findUnique({ where: { id } });
    if (!demanda) return NextResponse.json({ error: "Demanda não encontrada" }, { status: 404 });
    if (demanda.stage === "arquivado") return NextResponse.json({ error: "Restaure a demanda antes de iniciar a análise" }, { status: 409 });

    const sourceName = `${PREFIXO_FONTE}${demanda.id}`;
    const existente = await prisma.serviceDossier.findFirst({
      where: { sourceName },
      select: { id: true, code: true, status: true },
    });
    if (existente) {
      if (demanda.stage === "lead") {
        await prisma.opportunity.update({
          where: { id: demanda.id },
          data: { stage: "qualificado", nextAction: demanda.nextAction || "Validar escopo e custos no dossiê operacional" },
        });
      }
      return NextResponse.json({
        ok: true,
        reused: true,
        dossierId: existente.id,
        code: existente.code,
        url: urlDossie(existente.id),
      });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const duplicado = await tx.serviceDossier.findFirst({
        where: { sourceName },
        select: { id: true, code: true },
      });
      if (duplicado) return { dossier: duplicado, clientId: null as string | null, criado: false };

      let cliente = await tx.client.findFirst({
        where: {
          deletedAt: null,
          name: { equals: demanda.prospectName, mode: "insensitive" },
        },
        select: { id: true },
      });

      if (!cliente) {
        cliente = await tx.client.create({
          data: {
            name: demanda.prospectName,
            type: "juridica",
            category: "Privado",
            email: demanda.email || null,
            phone: demanda.phone || null,
            contact: demanda.contactName || null,
            situacao: "Prospect convertido em cliente",
            notes: `Cadastro criado automaticamente a partir da demanda ${demanda.id}.`,
          },
          select: { id: true },
        });
      }

      const ano = new Date().getFullYear();
      const quantidade = await tx.serviceDossier.count({ where: { code: { startsWith: `DOS-${ano}-` } } });
      const code = `DOS-${ano}-${String(quantidade + 1).padStart(4, "0")}`;
      const titulo = `${demanda.serviceType || "Serviço"} — ${demanda.prospectName}`;
      const atividade = demanda.serviceType || "Escopo a definir";
      const evidencias = [
        { field: "clientName", value: demanda.prospectName, quote: "Informado no cadastro da demanda", page: null },
        { field: "object", value: atividade, quote: "Informado no cadastro da demanda", page: null },
        ...(demanda.estimatedValue ? [{ field: "estimatedValue", value: Number(demanda.estimatedValue), quote: "Estimativa comercial inicial, ainda não validada", page: null }] : []),
      ];

      const dossier = await tx.serviceDossier.create({
        data: {
          code,
          title: titulo,
          sourceType: "MANUAL",
          sourceName,
          sourceHash: createHash("sha256").update(`opportunity:${demanda.id}`).digest("hex"),
          sourceText: demanda.notes || null,
          extraction: {
            title: titulo,
            object: atividade,
            clientName: demanda.prospectName,
            location: null,
            services: [{ code: "1.1", activity: atividade, laborRole: null, quantity: null, unit: "m²", productivityPerHour: null, teamSize: null, hoursPerDay: null }],
            evidence: evidencias,
            assumptions: ["Quantidades, produtividade, equipe, prazo e custos devem ser validados antes do cálculo."],
          },
          evidence: evidencias,
          extractionStatus: "parcial",
          validationStatus: "pendente",
          status: "em_validacao",
          clientId: cliente.id,
          notes: [
            `Originado da demanda comercial ${demanda.id}.`,
            demanda.origin ? `Origem: ${demanda.origin}.` : "",
            demanda.contactName ? `Contato: ${demanda.contactName}.` : "",
            demanda.notes || "",
          ].filter(Boolean).join("\n"),
          riskMatrix: [],
        },
        select: { id: true, code: true },
      });

      await tx.opportunity.update({
        where: { id: demanda.id },
        data: {
          stage: "qualificado",
          nextAction: "Validar escopo, dimensionamento e custos no dossiê operacional",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CONVERT_TO_DOSSIER",
          module: "demandas",
          entityType: "Opportunity",
          entityId: demanda.id,
          oldValues: dadosAuditoria({ stage: demanda.stage, nextAction: demanda.nextAction }),
          newValues: dadosAuditoria({ stage: "qualificado", dossierId: dossier.id, dossierCode: dossier.code, clientId: cliente.id }),
        },
      });

      return { dossier, clientId: cliente.id, criado: true };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      ok: true,
      reused: !resultado.criado,
      dossierId: resultado.dossier.id,
      code: resultado.dossier.code,
      clientId: resultado.clientId,
      url: urlDossie(resultado.dossier.id),
      nextStep: "Validar escopo, quantidades, produtividade, equipe, custos, impostos e margem.",
    }, { status: resultado.criado ? 201 : 200 });
  } catch (error) {
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) {
      return NextResponse.json({ error: "A conversão sofreu concorrência. Atualize a página e tente novamente." }, { status: 409 });
    }
    return erroInterno(error, "api/oportunidades/converter");
  }
}
