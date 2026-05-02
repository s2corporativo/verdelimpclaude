// src/app/api/bid-pipeline/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STAGES = ["monitorando","analisando","proposta_enviada","em_julgamento","ganho","perdido"];

export async function GET() {
  try {
    const bids = await prisma.bidPipeline.findMany({
      orderBy: [{ stage: "asc" }, { dataAbertura: "asc" }],
      take: 200,
    });

    if (!bids.length) return NextResponse.json({ bids: DEMO_BIDS, _demo: true });

    return NextResponse.json({ bids });
  } catch {
    return NextResponse.json({ bids: DEMO_BIDS, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "move_stage") {
      const bid = await prisma.bidPipeline.update({
        where: { id: body.id },
        data: { stage: body.stage, perdaMotivo: body.perdaMotivo || null },
      });
      return NextResponse.json({ success: true, bid });
    }

    if (body.action === "update") {
      const bid = await prisma.bidPipeline.update({
        where: { id: body.id },
        data: {
          titulo: body.titulo,
          orgao: body.orgao,
          objeto: body.objeto,
          valorEstimado: body.valorEstimado || null,
          dataAbertura: body.dataAbertura ? new Date(body.dataAbertura) : null,
          dataLimite: body.dataLimite ? new Date(body.dataLimite) : null,
          modalidade: body.modalidade || null,
          stage: body.stage,
          prioridade: body.prioridade || "media",
          probabilidade: body.probabilidade || 50,
          municipio: body.municipio || null,
          uf: body.uf || null,
          url: body.url || null,
          responsavel: body.responsavel || null,
          notas: body.notas || null,
        },
      });
      return NextResponse.json({ success: true, bid });
    }

    // Criar novo
    const bid = await prisma.bidPipeline.create({
      data: {
        titulo: body.titulo || "Licitação sem título",
        orgao: body.orgao || "",
        editalNumero: body.editalNumero || null,
        objeto: body.objeto || "",
        valorEstimado: body.valorEstimado || null,
        dataAbertura: body.dataAbertura ? new Date(body.dataAbertura) : null,
        dataLimite: body.dataLimite ? new Date(body.dataLimite) : null,
        modalidade: body.modalidade || null,
        stage: body.stage || "monitorando",
        prioridade: body.prioridade || "media",
        probabilidade: body.probabilidade || 30,
        municipio: body.municipio || null,
        uf: body.uf || null,
        url: body.url || null,
        responsavel: body.responsavel || null,
        notas: body.notas || null,
      },
    });
    return NextResponse.json({ success: true, bid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_BIDS = [
  { id:"b1", titulo:"Roçada Áreas Verdes Norte", orgao:"Prefeitura de BH", objeto:"Manutenção de canteiros cicloviários — Zona Norte", valorEstimado:420000, dataAbertura:"2026-05-15", modalidade:"Pregão Eletrônico", stage:"monitorando", prioridade:"alta", probabilidade:40, municipio:"Belo Horizonte", uf:"MG", url:"https://pncp.gov.br", responsavel:"Ana Luiza" },
  { id:"b2", titulo:"PTRF Linhas Alta Tensão Leste", orgao:"CEMIG", objeto:"Supressão e PRADA em faixa de servidão — lote Leste", valorEstimado:890000, dataAbertura:"2026-06-03", modalidade:"Concorrência", stage:"analisando", prioridade:"alta", probabilidade:55, municipio:"Contagem", uf:"MG", responsavel:"Giovanna" },
  { id:"b3", titulo:"Manutenção Parque Ecológico", orgao:"Sanesul", objeto:"Jardinagem e limpeza parques — lote 3 municípios", valorEstimado:1200000, dataAbertura:"2026-04-20", modalidade:"Pregão Eletrônico", stage:"proposta_enviada", prioridade:"alta", probabilidade:70, municipio:"Campo Grande", uf:"MS", responsavel:"Giovanna" },
  { id:"b4", titulo:"Controle Vegetação Rodovias", orgao:"DNIT", objeto:"Roçada mecanizada rodovias federais — MG/GO", valorEstimado:3400000, dataAbertura:"2026-03-10", modalidade:"Pregão Eletrônico", stage:"em_julgamento", prioridade:"alta", probabilidade:60, municipio:"Betim", uf:"MG", responsavel:"Ana Luiza" },
  { id:"b5", titulo:"Jardinagem HQ COPASA", orgao:"COPASA MG", objeto:"Manutenção jardins sede administrativa", valorEstimado:180000, dataAbertura:"2026-02-01", modalidade:"Dispensa", stage:"ganho", prioridade:"media", probabilidade:100, municipio:"Belo Horizonte", uf:"MG", responsavel:"Giovanna" },
  { id:"b6", titulo:"Limpeza Terminal Ônibus Sul", orgao:"BHTrans", objeto:"Limpeza áreas externas terminal", valorEstimado:95000, dataAbertura:"2026-01-15", modalidade:"Pregão Eletrônico", stage:"perdido", prioridade:"baixa", probabilidade:0, municipio:"Belo Horizonte", uf:"MG", responsavel:"Giovanna", perdaMotivo:"Menor preço — concorrente 18% abaixo" },
];
