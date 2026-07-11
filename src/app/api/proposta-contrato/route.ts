// Orçamento → Contrato em 1 clique: aprovar a proposta gera o contrato,
// os requisitos de documentação (modelo SST), o primeiro item do cronograma
// e o centro de custos (implícito — pronto para lançamentos na Rentabilidade).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MODELOS } from "@/lib/monitor-docs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { proposalId } = await req.json();
    if (!proposalId) return NextResponse.json({ error: "proposalId obrigatório" }, { status: 400 });

    const proposta = await prisma.proposal.findUnique({ where: { id: proposalId }, include: { client: true } });
    if (!proposta) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });

    // Número sequencial do contrato no ano
    const ano = new Date().getFullYear();
    const qtd = await prisma.contract.count({ where: { number: { startsWith: `CT-${ano}` } } });
    const numero = `CT-${ano}-${String(qtd + 1).padStart(3, "0")}`;

    const inicio = new Date();
    const meses = proposta.vigenciaMeses || 12;
    const fim = new Date(inicio); fim.setMonth(fim.getMonth() + meses);
    const valorTotal = Number(proposta.totalValue) || 0;

    const contrato = await prisma.contract.create({
      data: {
        number: numero,
        clientId: proposta.clientId,
        object: proposta.object || proposta.serviceType || "Prestação de serviços",
        value: valorTotal,
        monthlyValue: meses > 0 ? valorTotal / meses : valorTotal,
        startDate: inicio,
        endDate: fim,
        status: "Ativo",
        notes: `Gerado automaticamente a partir da proposta ${proposta.number}.`,
      },
    });

    // Requisitos de documentação (modelo SST) — o Monitor de Docs nasce pronto
    await prisma.contractDocRequirement.createMany({
      data: MODELOS.SST.itens.map((m) => ({
        contractId: contrato.id, name: m.name, scope: m.scope, itemRef: m.itemRef ?? null,
        validityDays: m.validityDays ?? null, autoSource: m.autoSource ?? null, sourceHint: m.sourceHint ?? null,
      })),
    });

    // Primeiro item do cronograma: mobilização
    await prisma.scheduleItem.create({
      data: {
        contractId: contrato.id,
        date: inicio,
        activity: "Mobilização da equipe e integração",
        location: proposta.location || null,
        status: "planejado",
        notes: "Criado automaticamente na aprovação da proposta — ajuste a data e programe as demais atividades.",
      },
    });

    // Marca a proposta como aprovada
    await prisma.proposal.update({ where: { id: proposalId }, data: { status: "Aprovada", approvedAt: new Date() } });

    return NextResponse.json({
      ok: true,
      contractId: contrato.id,
      numero,
      gerado: { requisitosDocs: MODELOS.SST.itens.length, cronograma: 1 },
      proximosPassos: [
        "Mobilizar funcionários no contrato (RH → Mobilizações)",
        "Conferir o Monitor de Docs — os requisitos SST já estão criados",
        "Programar o cronograma da primeira semana",
        "Lançar custos na Rentabilidade conforme a execução",
      ],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
