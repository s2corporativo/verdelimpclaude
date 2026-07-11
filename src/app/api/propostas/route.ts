// src/app/api/propostas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await prisma.proposal.findMany({
      where: { deletedAt: null }, orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true, cnpjCpf: true } } },
    });
    if (data.length === 0) return NextResponse.json({ data: DEMO_PROP, _demo: true });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ data: DEMO_PROP, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.object) return NextResponse.json({ error: "Objeto obrigatório" }, { status: 400 });

    // Gerar número sequencial
    const count = await prisma.proposal.count();
    const number = `PROP-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    // Modelo completo (estilo Vallourec): itens em grupos, equipes, BDI e condições
    const itens = Array.isArray(body.itens) ? body.itens : [];
    const equipes = Array.isArray(body.equipes) ? body.equipes : [];
    const totalItens = itens.reduce((s: number, i: any) => s + Number(i.quantidade || 1) * Number(i.valorUnitario || 0), 0);

    const prop = await prisma.proposal.create({
      data: {
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
        totalValue: itens.length > 0 ? totalItens : Number(body.totalValue || 0),
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
      },
    });
    return NextResponse.json(prop, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO_PROP = [
  { id: "p1", number: "PROP-2026-001", object: "Roçada Geral Canteiros Norte", status: "Aprovada", totalValue: 38500, client: { name: "Prefeitura de BH" }, createdAt: "2026-03-15" },
  { id: "p2", number: "PROP-2026-002", object: "PRADA Linhas de Transmissão", status: "Aberta", totalValue: 42000, client: { name: "CEMIG" }, createdAt: "2026-04-01" },
];
