// src/app/api/propostas/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarHtmlProposta, type PropostaData } from "@/lib/pdf-proposta";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposta = await prisma.proposal.findUnique({
      where: { id: params.id },
      include: {
        client: { select: { name: true, cnpjCpf: true, municipio: true, uf: true, email: true } },
      },
    });

    if (!proposta) {
      return new NextResponse("Proposta não encontrada", { status: 404 });
    }

    const config = await prisma.companyConfig.findFirst();

    const hoje = new Date();
    const validade = new Date(hoje);
    validade.setDate(validade.getDate() + (proposta.validityDays || 30));

    const total = Number(proposta.totalValue);
    const chargesRate = Number(proposta.chargesRate);
    const adminRate = Number(proposta.adminRate);
    const riscoRate = Number(proposta.riskRate);
    const impostosRate = Number(proposta.taxRate);
    const marginRate = Number(proposta.marginRate);

    // Calcular componentes do BDI a partir do total
    const sum = chargesRate + adminRate + riscoRate + impostosRate + marginRate;
    const custo = sum > 0 ? total / (1 + sum / 100) : total * 0.45;
    const encargos = custo * (chargesRate / 100);
    const admin = custo * (adminRate / 100);
    const risco = custo * (riscoRate / 100);
    const impostos = custo * (impostosRate / 100);
    const margem = custo * (marginRate / 100);
    const bdi = custo > 0 ? ((total / custo) - 1) * 100 : 0;

    const data: PropostaData = {
      numero: proposta.number,
      data: hoje.toLocaleDateString("pt-BR"),
      validade: validade.toLocaleDateString("pt-BR"),
      cliente: {
        nome: proposta.client?.name || "Cliente não vinculado",
        cnpj: proposta.client?.cnpjCpf || undefined,
        municipio: proposta.client?.municipio || undefined,
        uf: proposta.client?.uf || undefined,
        email: proposta.client?.email || undefined,
      },
      empresa: {
        razaoSocial: config?.razaoSocial || "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
        cnpj: config?.cnpj || "30.198.776/0001-29",
        endereco: `${config?.logradouro || "R. Primeiro de Janeiro, 415"}, ${config?.bairro || "Amazonas"}`,
        municipio: `${config?.municipio || "Betim"}/${config?.uf || "MG"}`,
        telefone: config?.email || "(31) 3591-4546",
        email: config?.email || "ADM@VERDELIMP.COM.BR",
      },
      servico: {
        tipo: proposta.serviceType || undefined,
        objeto: proposta.object || "Prestação de serviços",
        local: proposta.location || undefined,
        area: proposta.area ? Number(proposta.area) : undefined,
        unit: proposta.unit || undefined,
        dias: proposta.days || undefined,
        workers: proposta.workers || undefined,
      },
      valores: {
        custoMO: custo, custo,
        encargos, encargosRate: chargesRate,
        admin, adminRate,
        risco, riscoRate,
        impostos, impostosRate,
        margem, marginRate,
        total, bdi,
      },
      condicoes: proposta.paymentTerms || undefined,
    };

    const html = gerarHtmlProposta(data);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    // Retornar proposta demo se banco não estiver disponível
    const html = gerarHtmlProposta(DEMO_PROPOSTA);
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

const DEMO_PROPOSTA: PropostaData = {
  numero: "PROP-2026-001",
  data: new Date().toLocaleDateString("pt-BR"),
  validade: new Date(Date.now() + 30 * 86400000).toLocaleDateString("pt-BR"),
  cliente: { nome: "Prefeitura de Belo Horizonte", cnpj: "17.317.344/0001-19", municipio: "Belo Horizonte", uf: "MG" },
  empresa: { razaoSocial: "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA", cnpj: "30.198.776/0001-29", endereco: "R. Primeiro de Janeiro, 415, Amazonas", municipio: "Betim/MG", telefone: "(31) 3591-4546", email: "ADM@VERDELIMP.COM.BR" },
  servico: { tipo: "Roçada Manual", objeto: "Roçada Geral Canteiros Norte — Região Pampulha", local: "Belo Horizonte — Região Norte", area: 10000, unit: "m²", dias: 20, workers: 4 },
  valores: { custoMO: 13200, custo: 13200, encargos: 9240, encargosRate: 70, admin: 1320, adminRate: 10, risco: 660, riscoRate: 5, impostos: 1056, impostosRate: 8, margem: 3960, marginRate: 30, total: 29436, bdi: 123 },
  condicoes: "Faturamento mensal mediante medição aprovada pela Fiscalização",
  observacoes: "Proposta válida por 30 dias corridos. Valores incluem MO, EPIs, ferramentas, transportes e BDI completo.",
};
