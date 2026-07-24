import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const READ_ROLES = ["ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO", "OPERACIONAL"];
const WRITE_ROLES = ["ADMIN", "GESTOR", "COMERCIAL"];

const ItemSchema = z.object({
  grupo: z.string().trim().max(150).optional(),
  codigo: z.string().trim().max(50).optional(),
  descricao: z.string().trim().min(2).max(500),
  unidade: z.string().trim().min(1).max(30).default("vb"),
  quantidade: z.coerce.number().positive().max(999999999),
  valorUnitario: z.coerce.number().min(0).max(9999999999999.99),
});

const TeamSchema = z.object({
  nome: z.string().trim().min(2).max(150),
  colaboradores: z.coerce.number().int().min(1).max(1000),
  meses: z.coerce.number().int().min(1).max(120).default(12),
  bdiRate: z.coerce.number().min(0).max(500).default(28),
  componentes: z.array(z.unknown()).max(200).default([]),
});

const CreateSchema = z.object({
  clientId: z.string().trim().optional().nullable(),
  serviceType: z.string().trim().max(150).optional().nullable(),
  object: z.string().trim().min(3, "Objeto obrigatório").max(1000),
  location: z.string().trim().max(500).optional().nullable(),
  area: z.coerce.number().positive().max(999999999999).optional().nullable(),
  unit: z.string().trim().max(30).optional().nullable(),
  days: z.coerce.number().int().positive().max(3650).optional().nullable(),
  workers: z.coerce.number().int().positive().max(10000).optional().nullable(),
  chargesRate: z.coerce.number().min(0).max(500).default(70),
  adminRate: z.coerce.number().min(0).max(500).default(10),
  riskRate: z.coerce.number().min(0).max(500).default(5),
  taxRate: z.coerce.number().min(0).max(100).default(8),
  marginRate: z.coerce.number().min(0).max(500).default(30),
  totalValue: z.coerce.number().positive().max(9999999999999.99).optional(),
  validityDays: z.coerce.number().int().min(1).max(365).default(30),
  paymentTerms: z.string().trim().max(1000).optional().nullable(),
  vigenciaMeses: z.coerce.number().int().min(1).max(120).optional().nullable(),
  premissas: z.unknown().optional(),
  condicoesComerciais: z.unknown().optional(),
  bdiEquipes: z.unknown().optional(),
  bdiSpot: z.unknown().optional(),
  itens: z.array(ItemSchema).max(1000).default([]),
  equipes: z.array(TeamSchema).max(200).default([]),
}).superRefine((value, context) => {
  const itemTotal = value.itens.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0);
  if (value.itens.length === 0 && !value.totalValue) context.addIssue({ code: "custom", message: "Informe itens ou o valor total da proposta", path: ["totalValue"] });
  if (value.itens.length > 0 && itemTotal <= 0) context.addIssue({ code: "custom", message: "A soma dos itens deve ser maior que zero", path: ["itens"] });
});

const VersionSchema = z.object({
  proposalId: z.string().trim().min(1),
  action: z.literal("newVersion"),
  price: z.coerce.number().positive().max(9999999999999.99),
  changeReason: z.string().trim().min(3).max(1000),
  snapshot: z.unknown().optional(),
});

const ApprovalSchema = z.object({
  proposalId: z.string().trim().min(1),
  action: z.literal("approve"),
  level: z.enum(["technical", "financial", "director"]),
  approved: z.boolean().default(true),
  reason: z.string().trim().max(1000).optional(),
});

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...READ_ROLES);
  if (erro) return erro;

  try {
    const status = req.nextUrl.searchParams.get("status");
    const clientId = req.nextUrl.searchParams.get("clientId");
    const search = req.nextUrl.searchParams.get("q")?.trim();
    const data = await prisma.proposal.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
        ...(search ? { OR: [{ number: { contains: search, mode: "insensitive" } }, { object: { contains: search, mode: "insensitive" } }, { client: { name: { contains: search, mode: "insensitive" } } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, cnpjCpf: true, active: true } },
        dossier: { select: { id: true, code: true, minimumPrice: true, discountLimit: true, status: true } },
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
      take: 1000,
    });
    return NextResponse.json({ data, total: data.length });
  } catch (error) {
    return erroInterno(error, "api/propostas GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel(...WRITE_ROLES);
  if (erro || !user) return erro;

  try {
    const parsed = CreateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Proposta inválida", details: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;

    if (body.clientId) {
      const client = await prisma.client.findUnique({ where: { id: body.clientId }, select: { id: true, active: true, deletedAt: true } });
      if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
      if (!client.active || client.deletedAt) return NextResponse.json({ error: "Cliente inativo não pode receber nova proposta" }, { status: 409 });
    }

    const totalItems = body.itens.reduce((sum, item) => sum + item.quantidade * item.valorUnitario, 0);
    const proposalTotal = body.itens.length ? totalItems : Number(body.totalValue);
    const year = new Date().getFullYear();
    const prefix = `PROP-${year}-`;

    const proposal = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`proposal-number:${year}`}))`;
      const count = await tx.proposal.count({ where: { number: { startsWith: prefix } } });
      const number = `${prefix}${String(count + 1).padStart(4, "0")}`;
      const created = await tx.proposal.create({
        data: {
          number,
          clientId: body.clientId || null,
          serviceType: body.serviceType || null,
          object: body.object,
          location: body.location || null,
          area: body.area ?? null,
          unit: body.unit || null,
          days: body.days ?? null,
          workers: body.workers ?? null,
          chargesRate: body.chargesRate,
          adminRate: body.adminRate,
          riskRate: body.riskRate,
          taxRate: body.taxRate,
          marginRate: body.marginRate,
          totalValue: proposalTotal,
          validityDays: body.validityDays,
          paymentTerms: body.paymentTerms || null,
          status: "Aberta",
          modelo: body.itens.length ? "completa" : "simples",
          vigenciaMeses: body.vigenciaMeses ?? null,
          premissas: body.premissas as any,
          condicoesComerciais: body.condicoesComerciais as any,
          bdiEquipes: body.bdiEquipes as any,
          bdiSpot: body.bdiSpot as any,
          items: { create: body.itens.map((item, index) => ({ grupo: item.grupo || "1.0 SERVIÇOS", codigo: item.codigo || `1.${index + 1}`, descricao: item.descricao, unidade: item.unidade, quantidade: item.quantidade, valorUnitario: item.valorUnitario, ordem: index })) },
          teams: { create: body.equipes.map((team, index) => ({ nome: team.nome, colaboradores: team.colaboradores, meses: team.meses, bdiRate: team.bdiRate, componentes: team.componentes as any, ordem: index })) },
        },
      });
      await tx.proposalVersion.create({ data: { proposalId: created.id, version: 1, snapshot: { source: "manual", payload: body } as any, price: created.totalValue, changeReason: "Criação da proposta" } });
      await tx.auditLog.create({ data: { userId: user.id, action: "CREATE", module: "propostas", entityType: "Proposal", entityId: created.id, newValues: { number, clientId: body.clientId || null, object: body.object, totalValue: proposalTotal, modelo: body.itens.length ? "completa" : "simples", items: body.itens.length, teams: body.equipes.length } } });
      return created;
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (error: any) {
    if (["P2002", "P2034"].includes(error?.code)) return NextResponse.json({ error: "Conflito ao numerar a proposta. Atualize e tente novamente." }, { status: 409 });
    return erroInterno(error, "api/propostas POST");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel(...READ_ROLES);
  if (erro || !user) return erro;

  try {
    const raw = await req.json();
    const proposalId = String(raw?.proposalId || "").trim();
    if (!proposalId) return NextResponse.json({ error: "proposalId obrigatório" }, { status: 400 });
    const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, deletedAt: null }, include: { versions: { orderBy: { version: "desc" }, take: 1 }, dossier: true } });
    if (!proposal) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    if (proposal.status === "Convertida") return NextResponse.json({ error: "Proposta convertida em contrato não pode ser alterada" }, { status: 409 });
    const latest = proposal.versions[0];
    if (!latest) return NextResponse.json({ error: "Proposta sem versão auditável" }, { status: 422 });

    if (raw.action === "newVersion") {
      if (!WRITE_ROLES.some((role) => user.roles.includes(role))) return NextResponse.json({ error: "Seu perfil não pode revisar valores comerciais" }, { status: 403 });
      const parsed = VersionSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Nova versão inválida" }, { status: 400 });
      const body = parsed.data;
      if (proposal.dossier && body.price < Number(proposal.dossier.minimumPrice)) return NextResponse.json({ error: "Preço abaixo do mínimo calculado no dossiê" }, { status: 422 });

      const created = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`proposal-version:${proposal.id}`}))`;
        const current = await tx.proposalVersion.findFirst({ where: { proposalId: proposal.id }, orderBy: { version: "desc" } });
        if (!current) throw new Error("VERSION_NOT_FOUND");
        const item = await tx.proposalVersion.create({ data: { proposalId: proposal.id, version: current.version + 1, price: body.price, snapshot: body.snapshot as any || { previousVersion: current.version }, changeReason: body.changeReason } });
        await tx.proposal.update({ where: { id: proposal.id }, data: { totalValue: body.price, status: "Em aprovação", approvedAt: null } });
        await tx.auditLog.create({ data: { userId: user.id, action: "NEW_VERSION", module: "propostas", entityType: "Proposal", entityId: proposal.id, oldValues: { version: current.version, price: Number(current.price), status: proposal.status }, newValues: { version: item.version, price: body.price, status: "Em aprovação", reason: body.changeReason } } });
        return item;
      });
      return NextResponse.json({ data: created });
    }

    if (raw.action === "approve") {
      const parsed = ApprovalSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Aprovação inválida" }, { status: 400 });
      const body = parsed.data;
      if (!body.approved && (!body.reason || body.reason.length < 3)) return NextResponse.json({ error: "Informe o motivo da rejeição" }, { status: 400 });
      const permissions: Record<string, string[]> = {
        technical: ["ADMIN", "GESTOR", "OPERACIONAL"],
        financial: ["ADMIN", "GESTOR", "FINANCEIRO"],
        director: ["ADMIN", "GESTOR", "DIRETORIA"],
      };
      if (!permissions[body.level].some((role) => user.roles.includes(role))) return NextResponse.json({ error: "Seu perfil não possui esta alçada" }, { status: 403 });
      const decision = body.approved ? "aprovado" : "rejeitado";
      const identity = user.email || user.name || user.id;
      const approvalData: Record<string, unknown> = body.level === "technical"
        ? { technicalStatus: decision, technicalApprovedBy: identity, technicalApprovedAt: new Date() }
        : body.level === "financial"
          ? { financialStatus: decision, financialApprovedBy: identity, financialApprovedAt: new Date() }
          : { directorStatus: decision, directorApprovedBy: identity, directorApprovedAt: new Date() };

      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.proposalVersion.findFirst({ where: { proposalId: proposal.id }, orderBy: { version: "desc" } });
        if (!current) throw new Error("VERSION_NOT_FOUND");
        const updated = await tx.proposalVersion.update({ where: { id: current.id }, data: approvalData });
        const allApproved = updated.technicalStatus === "aprovado" && updated.financialStatus === "aprovado" && updated.directorStatus === "aprovado";
        const rejected = [updated.technicalStatus, updated.financialStatus, updated.directorStatus].includes("rejeitado");
        const status = allApproved ? "Aprovada" : rejected ? "Rejeitada" : "Em aprovação";
        await tx.proposal.update({ where: { id: proposal.id }, data: { status, approvedAt: allApproved ? new Date() : null } });
        await tx.auditLog.create({ data: { userId: user.id, action: body.approved ? "APPROVE" : "REJECT", module: "propostas", entityType: "ProposalVersion", entityId: current.id, oldValues: { level: body.level, technicalStatus: current.technicalStatus, financialStatus: current.financialStatus, directorStatus: current.directorStatus }, newValues: { level: body.level, decision, reason: body.reason || null, proposalStatus: status } } });
        return { updated, allApproved, status };
      });
      return NextResponse.json({ data: result.updated, allApproved: result.allApproved, status: result.status });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error: any) {
    if (["P2002", "P2034"].includes(error?.code)) return NextResponse.json({ error: "A proposta mudou ao mesmo tempo. Atualize e repita a operação." }, { status: 409 });
    return erroInterno(error, "api/propostas PATCH");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel(...WRITE_ROLES);
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    const reason = req.nextUrl.searchParams.get("reason")?.trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    if (!reason || reason.length < 3) return NextResponse.json({ error: "Informe o motivo do arquivamento" }, { status: 400 });
    const current = await prisma.proposal.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    if (current.deletedAt) return NextResponse.json({ success: true, reused: true });
    if (current.status === "Convertida") return NextResponse.json({ error: "Proposta convertida não pode ser arquivada" }, { status: 409 });

    const updated = await prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.update({ where: { id }, data: { deletedAt: new Date() } });
      await tx.auditLog.create({ data: { userId: user.id, action: "ARCHIVE", module: "propostas", entityType: "Proposal", entityId: id, oldValues: { status: current.status, deletedAt: current.deletedAt }, newValues: { deletedAt: proposal.deletedAt, reason } } });
      return proposal;
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return erroInterno(error, "api/propostas DELETE");
  }
}
