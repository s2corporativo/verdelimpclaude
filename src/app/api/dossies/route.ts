import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { groqChat } from "@/lib/groq";
import { calcularDossieOperacional, type DossieCalculoEntrada } from "@/lib/dossie-operacional";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

async function extractScope(sourceText: string) {
  const prompt = `Leia o escopo de serviço abaixo e devolva APENAS JSON válido.
Não invente quantidades, produtividade, prazos ou custos. Use null quando não houver informação.
Cada fato deve trazer uma evidência curta copiada do texto e, se identificável, a página/seção.

Estrutura:
{
  "title":"",
  "object":"",
  "clientName":"",
  "location":"",
  "startDate":null,
  "deadlineDays":null,
  "paymentTermDays":null,
  "services":[{"code":"1.1","activity":"","laborRole":null,"quantity":null,"unit":"m²","productivityPerHour":null,"teamSize":null,"hoursPerDay":null}],
  "requirements":[{"name":"","scope":"EMPRESA|FUNCIONARIO|EQUIPAMENTO","activity":null,"role":null,"equipmentType":null,"validityDays":null,"blocking":true}],
  "risks":[{"categoria":"escopo","descricao":"","probabilidade":1,"impacto":1,"mitigacao":""}],
  "evidence":[{"field":"","value":"","quote":"","page":null}],
  "assumptions":[]
}

ESCOPO:
${sourceText.slice(0, 18000)}`;
  const raw = await groqChat([
    { role: "system", content: "Você extrai fatos auditáveis de editais, termos de referência e escopos operacionais brasileiros." },
    { role: "user", content: prompt },
  ], 3500);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

function calculationInput(dossier: any): DossieCalculoEntrada {
  const profile = dossier.taxProfile || {};
  const evidence = jsonArray(dossier.evidence);
  const extraction = dossier.extraction && typeof dossier.extraction === "object" ? dossier.extraction : {};
  const relevantEvidence = evidence.filter((item) => item?.field && item?.quote).length;
  const extractedFields = ["object", "location", "deadlineDays", "paymentTermDays", "services"]
    .filter((key) => extraction?.[key] != null).length;
  const evidenceCoverage = extractedFields ? Math.min(100, relevantEvidence / extractedFields * 100) : 0;

  return {
    validated: dossier.validationStatus === "validado",
    deadlineDays: dossier.deadlineDays,
    paymentTermDays: dossier.paymentTermDays,
    mobilizationCost: asNumber(dossier.mobilizationCost),
    demobilizationCost: asNumber(dossier.demobilizationCost),
    overheadRate: asNumber(dossier.overheadRate),
    riskRate: asNumber(dossier.riskRate),
    marginRate: asNumber(dossier.marginRate),
    workingCapitalRate: asNumber(dossier.workingCapitalRate),
    taxProfile: {
      effectiveRate: asNumber(profile.effectiveRate),
      issRate: asNumber(profile.issRate),
      issRetained: Boolean(profile.issRetained),
      issIncludedInEffectiveRate: profile.issIncludedInEffectiveRate !== false,
      inssRetentionRate: asNumber(profile.inssRetentionRate),
      inssRecoverable: profile.inssRecoverable !== false,
      irrfRetentionRate: asNumber(profile.irrfRetentionRate),
      csllPisCofinsRetentionRate: asNumber(profile.csllPisCofinsRetentionRate),
      otherRate: asNumber(profile.otherRate),
    },
    compositions: dossier.compositions.map((item: any) => ({
      id: item.id,
      code: item.code,
      activity: item.activity,
      laborRole: item.laborRole,
      quantity: asNumber(item.quantity),
      unit: item.unit,
      productivityPerHour: asNumber(item.productivityPerHour),
      teamSize: asNumber(item.teamSize, 1),
      hoursPerDay: asNumber(item.hoursPerDay, 8),
      workDaysPerWeek: asNumber(item.workDaysPerWeek, 5),
      efficiencyFactor: asNumber(item.efficiencyFactor, 1),
      setupHours: asNumber(item.setupHours),
      laborHourlyCost: asNumber(item.laborHourlyCost),
      inputUnitCost: asNumber(item.inputUnitCost),
      equipmentDailyCost: asNumber(item.equipmentDailyCost),
      transportCost: asNumber(item.transportCost),
      additionalCost: asNumber(item.additionalCost),
    })),
    risks: jsonArray(dossier.riskMatrix),
    evidenceCoverage,
  };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const dossier = await prisma.serviceDossier.findUnique({
        where: { id },
        include: {
          client: { select: { id: true, name: true } },
          taxProfile: true,
          requirementProfile: true,
          compositions: { orderBy: { order: "asc" } },
          proposal: { include: { versions: { orderBy: { version: "desc" } } } },
          reservations: {
            include: {
              employee: { select: { id: true, name: true, role: true, status: true } },
              equipment: { select: { id: true, codigo: true, descricao: true, tipo: true, status: true } },
            },
            orderBy: { startDate: "asc" },
          },
        },
      });
      if (!dossier) return NextResponse.json({ error: "Dossiê não encontrado" }, { status: 404 });
      return NextResponse.json({ data: dossier });
    }
    const data = await prisma.serviceDossier.findMany({
      include: {
        client: { select: { id: true, name: true } },
        taxProfile: { select: { id: true, name: true, version: true } },
        _count: { select: { compositions: true, reservations: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return erroInterno(error, "api/dossies:get");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "COMERCIAL", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json().catch(() => ({}));
    let sourceText = String(body.sourceText || "").trim();
    if (body.pdfBase64) {
      const buffer = Buffer.from(String(body.pdfBase64), "base64");
      if (buffer.length > MAX_FILE_BYTES) return NextResponse.json({ error: "Arquivo acima de 10 MB" }, { status: 413 });
      try {
        sourceText = `${(await pdfParse(buffer)).text || ""}\n${sourceText}`.trim();
      } catch {
        return NextResponse.json({ error: "PDF protegido, escaneado ou ilegível. Use OCR ou cole o texto." }, { status: 422 });
      }
    }
    if (body.txtBase64) {
      const buffer = Buffer.from(String(body.txtBase64), "base64");
      if (buffer.length > MAX_FILE_BYTES) return NextResponse.json({ error: "Arquivo acima de 10 MB" }, { status: 413 });
      sourceText = `${buffer.toString("utf8")}\n${sourceText}`.trim();
    }

    let extraction = body.extraction || null;
    let extractionStatus = extraction ? "extraido" : "pendente";
    let extractionWarning: string | null = null;
    if (!extraction && sourceText.length >= 20) {
      try {
        extraction = await extractScope(sourceText);
        extractionStatus = "extraido";
      } catch {
        extraction = { title: body.title || body.sourceName || "Novo dossiê", assumptions: ["Extração automática indisponível; preencher e validar manualmente."] };
        extractionStatus = "parcial";
        extractionWarning = "O dossiê foi criado, mas a extração por IA não concluiu. Revise os campos manualmente.";
      }
    }

    const services = jsonArray(extraction?.services);
    const year = new Date().getFullYear();
    const sequence = await prisma.serviceDossier.count({ where: { code: { startsWith: `DOS-${year}-` } } });
    const code = `DOS-${year}-${String(sequence + 1).padStart(4, "0")}`;
    const dossier = await prisma.serviceDossier.create({
      data: {
        code,
        title: body.title || extraction?.title || extraction?.object || body.sourceName || "Novo dossiê operacional",
        sourceType: body.sourceType || (body.pdfBase64 ? "PDF" : body.txtBase64 ? "TXT" : "MANUAL"),
        sourceName: body.sourceName || null,
        sourceHash: sourceText ? createHash("sha256").update(sourceText).digest("hex") : null,
        sourceText: sourceText || null,
        extraction: extraction || undefined,
        evidence: extraction?.evidence || [],
        extractionStatus,
        validationStatus: "pendente",
        status: "em_validacao",
        clientId: body.clientId || null,
        taxProfileId: body.taxProfileId || null,
        location: body.location || extraction?.location || null,
        startDate: parseDataOperacional(body.startDate || extraction?.startDate),
        deadlineDays: body.deadlineDays ? asNumber(body.deadlineDays) : extraction?.deadlineDays ? asNumber(extraction.deadlineDays) : null,
        paymentTermDays: asNumber(body.paymentTermDays ?? extraction?.paymentTermDays, 30),
        riskMatrix: extraction?.risks || [],
        notes: body.notes || null,
        compositions: {
          create: services.map((service: any, index: number) => ({
            code: service.code || `1.${index + 1}`,
            activity: service.activity || `Serviço ${index + 1}`,
            laborRole: service.laborRole || null,
            quantity: asNumber(service.quantity),
            unit: service.unit || "m²",
            productivityPerHour: asNumber(service.productivityPerHour, 1),
            teamSize: Math.max(1, Math.ceil(asNumber(service.teamSize, 1))),
            hoursPerDay: asNumber(service.hoursPerDay, 8),
            order: index,
          })),
        },
      },
      include: { compositions: true, taxProfile: true },
    });

    return NextResponse.json({ data: dossier, warning: extractionWarning, createdBy: user?.email }, { status: 201 });
  } catch (error) {
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) return NextResponse.json({ error: "Outro dossiê foi criado ao mesmo tempo. Atualize e tente novamente." }, { status: 409 });
    return erroInterno(error, "api/dossies:post");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "COMERCIAL", "FINANCEIRO", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.id || !body.action) return NextResponse.json({ error: "id e action são obrigatórios" }, { status: 400 });

    if (body.action === "update") {
      const allowed: Record<string, unknown> = {};
      if (body.title !== undefined) {
        const title = String(body.title || "").trim();
        if (!title) return NextResponse.json({ error: "O título/objeto não pode ficar vazio" }, { status: 400 });
        allowed.title = title;
      }
      for (const field of ["clientId", "taxProfileId", "requirementProfileId", "location", "notes"] as const) {
        if (body[field] !== undefined) allowed[field] = body[field] || null;
      }
      for (const field of ["deadlineDays", "paymentTermDays", "mobilizationCost", "demobilizationCost", "overheadRate", "riskRate", "marginRate", "workingCapitalRate"] as const) {
        if (body[field] === undefined) continue;
        const value = Number(body[field]);
        if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: `${field} deve ser um número não negativo` }, { status: 400 });
        allowed[field] = field === "deadlineDays" ? Math.ceil(value) || null : value;
      }
      if (body.marginRate != null && Number(body.marginRate) >= 80) return NextResponse.json({ error: "A margem deve ser menor que 80%" }, { status: 400 });
      if (body.startDate !== undefined) {
        const startDate = parseDataOperacional(body.startDate);
        if (body.startDate && !startDate) return NextResponse.json({ error: "Data de início inválida" }, { status: 400 });
        allowed.startDate = startDate;
      }
      if (body.riskMatrix !== undefined) {
        if (!Array.isArray(body.riskMatrix)) return NextResponse.json({ error: "Matriz de riscos inválida" }, { status: 400 });
        allowed.riskMatrix = body.riskMatrix;
      }
      const data = await prisma.serviceDossier.update({ where: { id: body.id }, data: allowed });
      return NextResponse.json({ data });
    }

    if (body.action === "validate") {
      if (!["ADMIN", "COMERCIAL", "DIRETORIA"].some((role) => user!.roles.includes(role))) {
        return NextResponse.json({ error: "A validação do escopo exige perfil comercial ou diretivo" }, { status: 403 });
      }
      const data = await prisma.serviceDossier.update({
        where: { id: body.id },
        data: {
          validationStatus: body.approved === false ? "rejeitado" : "validado",
          validatedBy: user?.email || user?.name || user?.id,
          validatedAt: new Date(),
          status: body.approved === false ? "em_validacao" : "validado",
          notes: body.notes,
        },
      });
      return NextResponse.json({ data });
    }

    const dossier = await prisma.serviceDossier.findUnique({
      where: { id: body.id },
      include: { compositions: { orderBy: { order: "asc" } }, taxProfile: true },
    });
    if (!dossier) return NextResponse.json({ error: "Dossiê não encontrado" }, { status: 404 });

    if (body.action === "calculate") {
      const result = calcularDossieOperacional(calculationInput(dossier));
      await prisma.$transaction([
        prisma.serviceDossier.update({
          where: { id: dossier.id },
          data: {
            calculation: result as any,
            qualityScore: result.qualityScore,
            decisionScore: result.decisionScore,
            minimumPrice: result.totals.minimumPrice,
            recommendedPrice: result.totals.recommendedPrice,
            commercialPrice: result.totals.commercialPrice,
            discountLimit: result.totals.discountLimit,
            status: result.blocks.length ? "em_validacao" : "calculado",
          },
        }),
        ...result.compositions.map((composition) => prisma.serviceComposition.update({
          where: { id: composition.id! },
          data: {
            plannedLaborHours: composition.plannedLaborHours,
            plannedWorkers: composition.plannedWorkers,
            plannedDays: composition.plannedDays,
            directCost: composition.directCost,
          },
        })),
      ]);
      return NextResponse.json({ data: result });
    }

    if (body.action === "createProposal") {
      if (!["ADMIN", "COMERCIAL", "DIRETORIA"].some((role) => user!.roles.includes(role))) {
        return NextResponse.json({ error: "A criação da proposta exige perfil comercial ou diretivo" }, { status: 403 });
      }
      const result = calcularDossieOperacional(calculationInput(dossier));
      if (result.blocks.length) return NextResponse.json({ error: "Dossiê bloqueado", blocks: result.blocks }, { status: 422 });
      if (dossier.proposalId) return NextResponse.json({ error: "Este dossiê já possui proposta" }, { status: 409 });
      if (dossier.clientId && !dossier.requirementProfileId) {
        const hasProfiles = await prisma.clientRequirementProfile.count({ where: { clientId: dossier.clientId, active: true } });
        if (hasProfiles) return NextResponse.json({ error: "Selecione explicitamente o perfil documental ativo deste serviço" }, { status: 422 });
      }
      if (dossier.requirementProfileId) {
        const profile = await prisma.clientRequirementProfile.findFirst({ where: { id: dossier.requirementProfileId, clientId: dossier.clientId || undefined, active: true } });
        if (!profile) return NextResponse.json({ error: "O perfil documental selecionado não está ativo ou não pertence ao cliente" }, { status: 422 });
      }
      const year = new Date().getFullYear();
      const count = await prisma.proposal.count({ where: { number: { startsWith: `PROP-${year}-` } } });
      const number = `PROP-${year}-${String(count + 1).padStart(4, "0")}`;
      const proposal = await prisma.$transaction(async (tx) => {
        const created = await tx.proposal.create({
          data: {
            number,
            clientId: dossier.clientId,
            object: dossier.title,
            location: dossier.location,
            days: dossier.deadlineDays,
            workers: result.totals.workers,
            taxRate: result.totals.taxBurdenRate,
            adminRate: asNumber(dossier.overheadRate),
            riskRate: asNumber(dossier.riskRate),
            marginRate: asNumber(dossier.marginRate),
            totalValue: result.totals.commercialPrice,
            status: "Em aprovação",
            modelo: "completa",
            technicalNotes: `Gerada pelo dossiê ${dossier.code}. Preço mínimo: R$ ${result.totals.minimumPrice.toFixed(2)}.`,
          },
        });
        await tx.proposalVersion.create({
          data: {
            proposalId: created.id,
            version: 1,
            snapshot: { dossierId: dossier.id, dossierCode: dossier.code, result } as any,
            price: result.totals.commercialPrice,
          },
        });
        await tx.serviceDossier.update({
          where: { id: dossier.id },
          data: { proposalId: created.id, calculation: result as any, status: "em_aprovacao" },
        });
        return created;
      }, { isolationLevel: "Serializable" });
      return NextResponse.json({ data: proposal }, { status: 201 });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) return NextResponse.json({ error: "O dossiê mudou ao mesmo tempo. Atualize e tente novamente." }, { status: 409 });
    return erroInterno(error, "api/dossies:patch");
  }
}
