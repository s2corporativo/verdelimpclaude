// src/app/api/detetizacao/route.ts
// Módulo Dedetização — controle de pragas, produtos ANVISA, certificados, viabilidade
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Catálogo padrão de produtos (antes do banco ser populado) ────
export const CATALOGO_DEFAULT = [
  { id:"p1", nomeComercial:"Maxforce FC Select", principioAtivo:"Fipronil 0,001%", registroAnvisa:"7.205.0097.002", fabricante:"Bayer", tipo:"inseticida", alvosPrincipais:"baratas", concentracao:"0,001%", custoLitro:180 },
  { id:"p2", nomeComercial:"Demand CS", principioAtivo:"Lambda-Cialotrina 9,7%", registroAnvisa:"7.205.0073.001", fabricante:"Syngenta", tipo:"inseticida", alvosPrincipais:"baratas,formigas,mosquitos,percevejos", concentracao:"9,7%", custoLitro:320 },
  { id:"p3", nomeComercial:"Maxxthor EC", principioAtivo:"Bifentrina 10%", registroAnvisa:"7.205.0077.003", fabricante:"Sumitomo", tipo:"inseticida", alvosPrincipais:"baratas,formigas,carrapatos,escorpiao", concentracao:"10%", custoLitro:290 },
  { id:"p4", nomeComercial:"Klerat Bloco", principioAtivo:"Brodifacume 0,005%", registroAnvisa:"7.502.0052.001", fabricante:"Syngenta", tipo:"rodenticida", alvosPrincipais:"ratos,camundongos", concentracao:"0,005%", custoLitro:95 },
  { id:"p5", nomeComercial:"Mirex-S 0,3%", principioAtivo:"Sulfluramida 0,3%", registroAnvisa:"7.502.0025.001", fabricante:"Atta-Kill", tipo:"inseticida", alvosPrincipais:"formigas cortadeiras", concentracao:"0,3%", custoLitro:65 },
  { id:"p6", nomeComercial:"Bórax Barreira", principioAtivo:"Bórax", registroAnvisa:"7.502.0088.001", fabricante:"FMC", tipo:"inseticida", alvosPrincipais:"baratas,formigas", concentracao:"5%", custoLitro:45 },
  { id:"p7", nomeComercial:"Termidor SC", principioAtivo:"Fipronil 9,1%", registroAnvisa:"7.205.0097.003", fabricante:"BASF", tipo:"termicida", alvosPrincipais:"cupins", concentracao:"9,1%", custoLitro:480 },
  { id:"p8", nomeComercial:"Talstar EC", principioAtivo:"Bifentrina 10%", registroAnvisa:"7.205.0077.001", fabricante:"FMC", tipo:"inseticida", alvosPrincipais:"mosquitos,borrachudos", concentracao:"10%", custoLitro:275 },
];

// ── Precificação por tipo de serviço (R$/m²) ────────────────────
const PRECOS_BASE: Record<string, { minM2: number; maxM2: number; dosagemL100m2: number; tempoH100m2: number }> = {
  "Desinsetizacao":   { minM2: 0.80, maxM2: 2.50, dosagemL100m2: 0.4, tempoH100m2: 1.5 },
  "Desratizacao":     { minM2: 0.60, maxM2: 1.80, dosagemL100m2: 0.1, tempoH100m2: 1.0 },
  "Descupinizacao":   { minM2: 3.50, maxM2: 9.00, dosagemL100m2: 1.2, tempoH100m2: 3.0 },
  "Geral":            { minM2: 1.20, maxM2: 3.50, dosagemL100m2: 0.6, tempoH100m2: 2.0 },
  "Controle Formigas":{ minM2: 0.40, maxM2: 1.20, dosagemL100m2: 0.3, tempoH100m2: 1.0 },
  "Fumigacao":        { minM2: 4.00, maxM2: 10.0, dosagemL100m2: 0.0, tempoH100m2: 4.0 },
};

// ── Documentos obrigatórios por tipo ────────────────────────────
const DOCS_OBRIG: Record<string, string[]> = {
  "Desinsetizacao": ["Licença ANVISA/Vigilância Sanitária","Registro dos produtos (ANVISA)","ART CREA-MG","Certificado do aplicador","Laudo técnico pré-aplicação","Certificado de desinsetização","FISPQ dos produtos"],
  "Desratizacao": ["Licença ANVISA/Vigilância Sanitária","Registro dos produtos (ANVISA)","ART CREA-MG","Certificado do aplicador","Mapa de iscas (planta baixa)","Certificado de desratização"],
  "Descupinizacao": ["Licença ANVISA/Vigilância Sanitária","Registro de termicida (ANVISA)","ART CREA-MG","Laudo de inspeção prévia","Relatório fotográfico","Certificado de dedetização","Garantia mínima 5 anos"],
  "Geral": ["Licença ANVISA/Vigilância Sanitária","Registros dos produtos","ART CREA-MG","Certificado do aplicador","Laudo técnico","Certificado de dedetização","FISPQ de todos os produtos"],
  "Controle Formigas": ["Licença ANVISA","Registro do produto","Certificado aplicação","ART (se contrato público)"],
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "list";

  if (action === "catalogo") {
    try {
      const produtos = await prisma.dedetProdutoCatalogo.findMany({ where: { ativo: true } });
      return NextResponse.json({ produtos: produtos.length ? produtos : CATALOGO_DEFAULT });
    } catch {
      return NextResponse.json({ produtos: CATALOGO_DEFAULT });
    }
  }

  if (action === "viabilidade") {
    const tipo = searchParams.get("tipo") || "Desinsetizacao";
    const areaM2 = Number(searchParams.get("area")) || 500;
    const valorProposto = Number(searchParams.get("valor")) || 0;
    const CUSTO_TECNICO_H = 28; // técnico CLT+encargos R$28/h
    const CUSTO_EPI_JOB = 35;   // EPIs específicos por serviço
    const CUSTO_DESLOCAMENTO = 60; // média por serviço

    const preco = PRECOS_BASE[tipo] || PRECOS_BASE["Geral"];
    const litros = (preco.dosagemL100m2 * areaM2) / 100;
    const horasExec = (preco.tempoH100m2 * areaM2) / 100;

    // Custo do produto mais barato para aquele tipo
    const custoProduto = litros * 180; // custo médio estimado
    const custoTecnico = horasExec * CUSTO_TECNICO_H;
    const custoTotal = custoProduto + custoTecnico + CUSTO_EPI_JOB + CUSTO_DESLOCAMENTO;

    const precoMinimoTotal = custoTotal;
    const precoIdealTotal = areaM2 * preco.minM2;
    const precoMaximoTotal = areaM2 * preco.maxM2;
    const margemReal = valorProposto > 0 ? ((valorProposto - custoTotal) / valorProposto) * 100 : 0;

    return NextResponse.json({
      tipo, areaM2, litros: Number(litros.toFixed(2)), horasExec: Number(horasExec.toFixed(1)),
      custoTotal: Number(custoTotal.toFixed(2)),
      detalhamento: { produto: Number(custoProduto.toFixed(2)), tecnico: Number(custoTecnico.toFixed(2)), epi: CUSTO_EPI_JOB, deslocamento: CUSTO_DESLOCAMENTO },
      precoMinimoTotal: Number(precoMinimoTotal.toFixed(2)),
      precoIdealTotal: Number(precoIdealTotal.toFixed(2)),
      precoMaximoTotal: Number(precoMaximoTotal.toFixed(2)),
      precoMinimoM2: Number(preco.minM2.toFixed(2)),
      precoMaximoM2: Number(preco.maxM2.toFixed(2)),
      valorProposto,
      margemReal: Number(margemReal.toFixed(1)),
      viavel: valorProposto >= precoMinimoTotal || valorProposto === 0,
      recomendacao: valorProposto >= precoMaximoTotal * 0.8 ? "✅ Ótima margem" : valorProposto >= precoIdealTotal ? "✅ Lucrativo" : valorProposto >= precoMinimoTotal ? "⚠️ Margem apertada" : valorProposto > 0 ? "⛔ Prejuízo" : "Informe o valor",
      documentosObrigatorios: DOCS_OBRIG[tipo] || DOCS_OBRIG["Geral"],
    });
  }

  try {
    const jobs = await prisma.dedetJob.findMany({
      orderBy: { createdAt: "desc" },
      include: { produtos: true },
      take: 100,
    });
    if (!jobs.length) return NextResponse.json({ jobs: DEMO_DETET, _demo: true });
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ jobs: DEMO_DETET, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "update_status") {
      const j = await prisma.dedetJob.update({
        where: { id: body.id },
        data: { status: body.status, dataAplicacao: body.dataAplicacao ? new Date(body.dataAplicacao) : undefined, certificadoEmitido: body.certificadoEmitido || false, certificadoDataVal: body.certificadoDataVal ? new Date(body.certificadoDataVal) : undefined },
      });
      return NextResponse.json({ success: true, job: j });
    }

    const count = await prisma.dedetJob.count();
    const numero = `DETET-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const garantiaDias: Record<string, number> = { "Descupinizacao": 1825, "Geral": 90, "Desinsetizacao": 90, "Desratizacao": 90, "Controle Formigas": 30, "Fumigacao": 60 };

    const job = await prisma.dedetJob.create({
      data: {
        numero,
        clienteNome: body.clienteNome,
        tipoServico: body.tipoServico,
        endereco: body.endereco || "",
        municipio: body.municipio || null,
        uf: body.uf || null,
        areaM2: body.areaM2 || null,
        ambientes: body.ambientes || null,
        infestacaoNivel: body.infestacaoNivel || "leve",
        dataAplicacao: body.dataAplicacao ? new Date(body.dataAplicacao) : null,
        dataRetorno: body.dataRetorno ? new Date(body.dataRetorno) : null,
        status: body.status || "orcamento",
        valorCobrado: body.valorCobrado || null,
        custoTotal: body.custoTotal || null,
        tecnicoNome: body.tecnicoNome || null,
        artNumero: body.artNumero || null,
        garantiaDias: garantiaDias[body.tipoServico] || 90,
        observacoes: body.observacoes || null,
      },
    });

    return NextResponse.json({ success: true, job });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_DETET = [
  { id:"d1", numero:"DETET-2026-001", clienteNome:"Restaurante Bom Sabor", tipoServico:"Geral", endereco:"R. das Flores, 120", municipio:"Betim", uf:"MG", areaM2:280, infestacaoNivel:"moderado", dataAplicacao:"2026-04-15", dataRetorno:"2026-05-15", status:"concluido", valorCobrado:840, custoTotal:320, certificadoEmitido:true, garantiaDias:90, produtos:[] },
  { id:"d2", numero:"DETET-2026-002", clienteNome:"Supermercado Central", tipoServico:"Desinsetizacao", endereco:"Av. Amazonas, 2300", municipio:"Betim", uf:"MG", areaM2:1200, infestacaoNivel:"grave", dataAplicacao:"2026-05-08", status:"agendado", valorCobrado:2400, custoTotal:980, certificadoEmitido:false, garantiaDias:90, produtos:[] },
  { id:"d3", numero:"DETET-2026-003", clienteNome:"Condomínio Solar", tipoServico:"Controle Formigas", endereco:"R. Solar, 55", municipio:"Betim", uf:"MG", areaM2:3500, infestacaoNivel:"leve", status:"orcamento", valorCobrado:1400, custoTotal:620, certificadoEmitido:false, garantiaDias:30, produtos:[] },
];
