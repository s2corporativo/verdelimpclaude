// src/app/api/propostas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const data = await prisma.proposal.findMany({
      where: { deletedAt: null }, orderBy: { createdAt: "desc" },
      include: {
        client: { select: { name: true, cnpjCpf: true } },
        dossier: { select: { id: true, code: true, minimumPrice: true, discountLimit: true } },
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    return NextResponse.json({ data });
  } catch (error) { return erroInterno(error, "api/propostas:get"); }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "COMERCIAL", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.object) return NextResponse.json({ error: "Objeto obrigatório" }, { status: 400 });

    // Gerar número sequencial
    const year = new Date().getFullYear();
    const count = await prisma.proposal.count({ where: { number: { startsWith: `PROP-${year}-` } } });
    const number = `PROP-${year}-${String(count + 1).padStart(4, "0")}`;

    // Modelo completo (estilo Vallourec): itens em grupos, equipes, BDI e condições
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const equipes = Array.isArray(body.equipes) ? body.equipes : [];
    const totalItens = itens.reduce((s: number, i: any) => s + Number(i.quantidade || 1) * Number(i.valorUnitario || 0), 0);
    const proposalTotal = itens.length > 0 ? totalItens : Number(body.totalValue || 0);
    if (!Number.isFinite(proposalTotal) || proposalTotal <= 0) {
      return NextResponse.json({ error: "O valor total da proposta deve ser maior que zero" }, { status: 400 });
    }

    const prop = await prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({ data: {
        number,
        clientId: body.clientId || null,
        serviceType: body.serviceType,
        object: body.object,
        location: body.location,
        area: body.area ? Number(body.area) : null,
        unit: body.unit,
        days: body.days ? Number(body.days) : null,
        workers: body.workers ? Number(body.workers) : null,
        chargesRate: Number(body.chargesRate || 70),
        adminRate: Number(body.adminRate || 10),
        riskRate: Number(body.riskRate || 5),
        taxRate: Number(body.taxRate || 8),
        marginRate: Number(body.marginRate || 30),
        totalValue: proposalTotal,
        validityDays: Number(body.validityDays || 30),
        paymentTerms: body.paymentTerms,
        status: "Aberta",
        modelo: itens.length > 0 ? "completa" : "simples",
        vigenciaMeses: body.vigenciaMeses ? Number(body.vigenciaMeses) : null,
        premissas: body.premissas ?? undefined,
        condicoesComerciais: body.condicoesComerciais ?? undefined,
        bdiEquipes: body.bdiEquipes ?? undefined,
        bdiSpot: body.bdiSpot ?? undefined,
        items: {
          create: itens.map((i: any, idx: number) => ({
            grupo: i.grupo || "1.0 SERVIÇOS",
            codigo: i.codigo || `1.${idx + 1}`,
            descricao: i.descricao,
            unidade: i.unidade || "vb",
            quantidade: Number(i.quantidade || 1),
            valorUnitario: Number(i.valorUnitario || 0),
            ordem: idx,
          })),
        },
        teams: {
          create: equipes.map((e: any, idx: number) => ({
            nome: e.nome,
            colaboradores: Number(e.colaboradores || 1),
            meses: Number(e.meses || 12),
            bdiRate: Number(e.bdiRate || 28),
            componentes: e.componentes || [],
            ordem: idx,
          })),
        },
      }});
      await tx.proposalVersion.create({
        data: {
          proposalId: created.id,
          version: 1,
          snapshot: { source: "manual", body } as any,
          price: created.totalValue,
        },
      });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(prop, { status: 201 });
  } catch (e: any) {
    if (["P2002", "P2034"].includes(e?.code)) return NextResponse.json({ error: "Outra proposta foi criada ao mesmo tempo. Atualize e tente novamente." }, { status: 409 });
    return erroInterno(e, "api/propostas");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.proposalId || !body.action) return NextResponse.json({ error: "proposalId e action obrigatórios" }, { status: 400 });
    const proposal = await prisma.proposal.findUnique({
      where: { id: body.proposalId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 }, dossier: true },
    });
    if (!proposal) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    const latest = proposal.versions[0];
    if (!latest) return NextResponse.json({ error: "Proposta sem versão auditável" }, { status: 422 });

    if (body.action === "newVersion") {
      if (!["ADMIN", "COMERCIAL", "DIRETORIA"].some((role) => user!.roles.includes(role))) {
        return NextResponse.json({ error: "Seu perfil não pode revisar valores comerciais" }, { status: 403 });
      }
      const version = latest.version + 1;
      const price = Number(body.price ?? proposal.totalValue);
      if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "Informe um preço válido e maior que zero" }, { status: 400 });
      if (proposal.dossier && price < Number(proposal.dossier.minimumPrice)) {
        return NextResponse.json({ error: "Preço abaixo do mínimo calculado no dossiê" }, { status: 422 });
      }
      const created = await prisma.$transaction(async (tx) => {
        const item = await tx.proposalVersion.create({
          data: { proposalId: proposal.id, version, price, snapshot: body.snapshot || { previousVersion: latest.version }, changeReason: body.changeReason || "Revisão comercial" },
        });
        await tx.proposal.update({ where: { id: proposal.id }, data: { totalValue: price, status: "Em aprovação" } });
        return item;
      }, { isolationLevel: "Serializable" });
      return NextResponse.json({ data: created });
    }

    if (body.action === "approve") {
      const level = String(body.level || "");
      const permissions: Record<string, string[]> = {
        technical: ["ADMIN", "OPERACIONAL", "OPERACAO", "OPERAÇÃO"],
        financial: ["ADMIN", "FINANCEIRO"],
        director: ["ADMIN", "DIRETORIA"],
      };
      if (!permissions[level] || !permissions[level].some((role) => user!.roles.includes(role))) {
        return NextResponse.json({ error: "Seu perfil não possui esta alçada" }, { status: 403 });
      }
      const decision = body.approved === false ? "rejeitado" : "aprovado";
      const identity = user?.email || user?.name || user?.id;
      const approvalData: Record<string, unknown> = level === "technical"
        ? { technicalStatus: decision, technicalApprovedBy: identity, technicalApprovedAt: new Date() }
        : level === "financial"
          ? { financialStatus: decision, financialApprovedBy: identity, financialApprovedAt: new Date() }
          : { directorStatus: decision, directorApprovedBy: identity, directorApprovedAt: new Date() };
      const decisionResult = await prisma.$transaction(async (tx) => {
        const current = await tx.proposalVersion.findFirst({ where: { proposalId: proposal.id }, orderBy: { version: "desc" } });
        if (!current) throw new Error("VERSION_NOT_FOUND");
        const updated = await tx.proposalVersion.update({ where: { id: current.id }, data: approvalData });
        const allApproved = updated.technicalStatus === "aprovado" && updated.financialStatus === "aprovado" && updated.directorStatus === "aprovado";
        const rejected = [updated.technicalStatus, updated.financialStatus, updated.directorStatus].includes("rejeitado");
        await tx.proposal.update({
          where: { id: proposal.id },
          data: { status: allApproved ? "Aprovada" : rejected ? "Rejeitada" : "Em aprovação", approvedAt: allApproved ? new Date() : null },
        });
        return { updated, allApproved };
      }, { isolationLevel: "Serializable" });
      return NextResponse.json({ data: decisionResult.updated, allApproved: decisionResult.allApproved });
    }
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) return NextResponse.json({ error: "A proposta mudou ao mesmo tempo. Atualize e repita a operação." }, { status: 409 });
    return erroInterno(error, "api/propostas:patch");
  }
}

// Excluir proposta (exclusão lógica via deletedAt)
export async function DELETE(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "COMERCIAL", "DIRETORIA");
  if (erro) return erro;
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.proposal.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e.code === "P2025") return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    return erroInterno(e, "api/propostas");
  }
}
