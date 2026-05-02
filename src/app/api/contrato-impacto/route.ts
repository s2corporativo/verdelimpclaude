// src/app/api/contrato-impacto/route.ts
// Calcula o impacto que o contrato terá em TODOS os módulos do ERP
// Mostra ANTES de salvar — para o usuário ver e confirmar
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ContratoInput {
  valorMensal: number;
  vigenciaMeses: number;
  dataInicio: string;
  tipoServico: string;
  areaM2?: number;
  diasExecucao?: number;
  equipeMinima?: number;
  municipio?: string;
  uf?: string;
  enderecos?: string[];
}

// ── Constantes fiscais ────────────────────────────────────────────
const ALIQ_DAS = 0.0672;        // Simples Nacional Anexo III ~6,72%
const ALIQ_ISS_BETIM = 0.05;    // ISS Betim para serviços de paisagismo
const ALIQ_INSS_PATRONAL = 0.07; // Simplificado para Simples
const ALIQ_FGTS = 0.08;
const SALARIO_MEDIO_OPERACIONAL = 2500;
const SALARIO_SUPERVISOR = 3500;
const CUSTO_KM = 1.80;
const VEL_MEDIA_KMH = 50;
const HORAS_DIA_TRABALHO = 8;

// Tabela de produtividade por tipo de serviço (m²/dia/pessoa)
const PRODUTIVIDADE: Record<string, number> = {
  "Roçada Manual": 800,
  "Roçada Mecanizada": 2500,
  "Jardinagem Mensal": 1200,
  "PRADA/PTRF": 600,
  "Limpeza": 1500,
  "Podação": 200,
  "Hidrossemeadura": 5000,
  "Outro": 1000,
};

// Distância média estimada entre Betim e municípios mineiros
const DIST_BETIM: Record<string, number> = {
  "Betim": 5,
  "Belo Horizonte": 35,
  "Contagem": 18,
  "Igarapé": 25,
  "Mateus Leme": 35,
  "Brumadinho": 45,
  "Sarzedo": 12,
  "Ibirité": 22,
  "Esmeraldas": 28,
  "Outro": 50,
};

export async function POST(req: NextRequest) {
  try {
    const c: ContratoInput = await req.json();

    if (!c.valorMensal || !c.vigenciaMeses) {
      return NextResponse.json({ error: "Informe valor mensal e vigência" }, { status: 400 });
    }

    // ═══ 1. PROJEÇÃO FINANCEIRA ═══════════════════════════════════
    const valorTotal = c.valorMensal * c.vigenciaMeses;
    const dataInicio = new Date(c.dataInicio || new Date());
    const dataFim = new Date(dataInicio);
    dataFim.setMonth(dataFim.getMonth() + c.vigenciaMeses);

    // ═══ 2. TRIBUTOS PROJETADOS ═══════════════════════════════════
    const dasMensal = c.valorMensal * ALIQ_DAS;
    const dasTotal = valorTotal * ALIQ_DAS;
    const issMensal = c.valorMensal * ALIQ_ISS_BETIM;
    const issTotal = valorTotal * ALIQ_ISS_BETIM;

    // ═══ 3. EQUIPE NECESSÁRIA ═════════════════════════════════════
    const prodDiaria = PRODUTIVIDADE[c.tipoServico] || 1000;
    let equipeCalculada = c.equipeMinima || 2;

    if (c.areaM2 && c.diasExecucao) {
      // m² total / (m² por pessoa por dia × dias de execução) = pessoas necessárias
      equipeCalculada = Math.ceil(c.areaM2 / (prodDiaria * c.diasExecucao));
      if (equipeCalculada < 2) equipeCalculada = 2;
      if (equipeCalculada > 8) equipeCalculada = 8; // Verdelimp tem 8 pessoas
    }

    // Custo da equipe por mês
    const supervisor = 1; // sempre 1 supervisor
    const operacionais = Math.max(equipeCalculada - 1, 1);
    const folhaBruta = (supervisor * SALARIO_SUPERVISOR) + (operacionais * SALARIO_MEDIO_OPERACIONAL);
    const inssPatronal = folhaBruta * ALIQ_INSS_PATRONAL;
    const fgts = folhaBruta * ALIQ_FGTS;
    const custoFolhaTotal = folhaBruta + inssPatronal + fgts;

    // ═══ 4. LOGÍSTICA — KM E COMBUSTÍVEL ══════════════════════════
    const distBase = c.municipio ? (DIST_BETIM[c.municipio] || DIST_BETIM["Outro"]) : DIST_BETIM["Outro"];
    const kmIda = distBase;
    const kmDiaTotal = (kmIda * 2); // ida e volta
    const diasMes = c.diasExecucao || 4; // padrão 4 dias/mês
    const kmMes = kmDiaTotal * diasMes;
    const kmTotalContrato = kmMes * c.vigenciaMeses;
    const custoKmMes = kmMes * CUSTO_KM;
    const custoKmTotal = custoKmMes * c.vigenciaMeses;
    const horasDeslocamentoMes = (kmMes / VEL_MEDIA_KMH);
    const horasOperacionaisMes = diasMes * HORAS_DIA_TRABALHO * equipeCalculada;

    // ═══ 5. ALMOXARIFADO / EPI / MATERIAL ═════════════════════════
    // Estimativa: 3% do faturamento em material + EPI mensal por funcionário
    const materialMes = c.valorMensal * 0.03;
    const materialTotal = valorTotal * 0.03;
    const epiPorFunc = 80; // R$ por mês por pessoa em EPI consumível
    const epiMes = epiPorFunc * equipeCalculada;
    const epiTotal = epiMes * c.vigenciaMeses;

    // ═══ 6. DRE PROJETADO ═════════════════════════════════════════
    const receitaMensal = c.valorMensal;
    const tributosMensal = dasMensal + issMensal;
    const custosOperacionaisMensal = custoFolhaTotal + custoKmMes + materialMes + epiMes;
    const margemMensal = receitaMensal - tributosMensal - custosOperacionaisMensal;
    const margemPct = (margemMensal / receitaMensal) * 100;
    const margemTotal = margemMensal * c.vigenciaMeses;

    // ═══ 7. PRECIFICAÇÃO — VALOR IDEAL ═══════════════════════════════
    // Custo total (folha + km + material + EPI) com margem de 25%
    const custoTotalMensal = custosOperacionaisMensal + tributosMensal;
    const valorIdealMensal = custoTotalMensal / (1 - 0.25); // markup 25%
    const aliasContratado = c.valorMensal;
    const competitividade = aliasContratado >= valorIdealMensal ? "lucrativo" 
                          : aliasContratado >= custoTotalMensal ? "apertado" 
                          : "prejuizo";

    // ═══ 8. CRONOGRAMA DE OS GERADAS NA LOGÍSTICA ═════════════════
    const osPrevistas: any[] = [];
    let dataAtual = new Date(dataInicio);
    for (let mes = 1; mes <= c.vigenciaMeses && mes <= 12; mes++) {
      for (let d = 0; d < diasMes; d++) {
        const dataOs = new Date(dataAtual);
        dataOs.setDate(dataOs.getDate() + (d * Math.floor(30 / diasMes)));
        if (osPrevistas.length < 50) { // limitar exibição
          osPrevistas.push({
            data: dataOs.toISOString().slice(0, 10),
            tipoServico: c.tipoServico,
            equipe: equipeCalculada,
            estimativaH: HORAS_DIA_TRABALHO,
          });
        }
      }
      dataAtual.setMonth(dataAtual.getMonth() + 1);
    }

    // ═══ 9. ALERTAS E RECOMENDAÇÕES ════════════════════════════════
    const alertas: string[] = [];
    const recomendacoes: string[] = [];

    if (competitividade === "prejuizo") {
      alertas.push(`⛔ PREJUÍZO: valor mensal R$${aliasContratado.toLocaleString("pt-BR")} é menor que custo R$${custoTotalMensal.toLocaleString("pt-BR")}`);
    } else if (competitividade === "apertado") {
      alertas.push(`⚠️ MARGEM APERTADA: apenas ${margemPct.toFixed(1)}% — valor ideal seria R$${valorIdealMensal.toLocaleString("pt-BR")}`);
    }

    if (equipeCalculada > 8) alertas.push(`⚠️ Equipe necessária (${equipeCalculada}) maior que disponível (8) — terceirizar ou reduzir escopo`);
    if (margemPct < 15 && competitividade !== "prejuizo") alertas.push(`⚠️ Margem abaixo de 15% — risco de inadimplência ou imprevistos`);
    if (kmMes > 2000) alertas.push(`⚠️ Deslocamento alto: ${kmMes.toFixed(0)} km/mês — considere alocar veículo dedicado`);
    if (margemPct >= 25) recomendacoes.push(`✅ Margem saudável de ${margemPct.toFixed(1)}% — boa oportunidade`);
    if (c.vigenciaMeses >= 12) recomendacoes.push(`✅ Contrato longo (${c.vigenciaMeses}m) — incluir cláusula de reajuste anual por INPC`);

    // Verificar conflitos com contratos existentes
    let conflitosEquipe = 0;
    try {
      const contratosAtivos = await prisma.contract.count({
        where: {
          status: "Ativo",
          endDate: { gte: dataInicio },
        },
      });
      if (contratosAtivos >= 3 && equipeCalculada >= 5) {
        alertas.push(`⚠️ Já há ${contratosAtivos} contratos ativos — verifique disponibilidade de equipe`);
        conflitosEquipe = contratosAtivos;
      }
    } catch { /* sem banco, ignorar */ }

    // ═══ RESPOSTA COM IMPACTO COMPLETO ════════════════════════════
    return NextResponse.json({
      success: true,
      contrato: {
        valorTotal,
        valorMensal: c.valorMensal,
        vigenciaMeses: c.vigenciaMeses,
        dataInicio: dataInicio.toISOString().slice(0, 10),
        dataFim: dataFim.toISOString().slice(0, 10),
      },
      financeiro: {
        receitaMensal,
        receitaTotal: valorTotal,
        diaPagamento: 10,
      },
      tributario: {
        dasMensal: round(dasMensal),
        dasTotal: round(dasTotal),
        issMensal: round(issMensal),
        issTotal: round(issTotal),
        tributosMensal: round(dasMensal + issMensal),
        tributosTotal: round(dasTotal + issTotal),
        aliquotaEfetiva: round((dasMensal + issMensal) / c.valorMensal * 100, 2),
      },
      rh: {
        equipeNecessaria: equipeCalculada,
        supervisor,
        operacionais,
        folhaBruta: round(folhaBruta),
        inssPatronal: round(inssPatronal),
        fgts: round(fgts),
        custoFolhaTotal: round(custoFolhaTotal),
        custoFolhaContrato: round(custoFolhaTotal * c.vigenciaMeses),
      },
      logistica: {
        municipio: c.municipio || "Não informado",
        distBase: kmIda,
        diasExecucaoMes: diasMes,
        kmMes: round(kmMes),
        kmTotal: round(kmTotalContrato),
        custoKmMes: round(custoKmMes),
        custoKmTotal: round(custoKmTotal),
        horasDeslocamentoMes: round(horasDeslocamentoMes, 1),
        horasOperacionaisMes: round(horasOperacionaisMes, 1),
        produtividadeM2Dia: prodDiaria,
        osPrevistasMes: diasMes,
        osPrevistasTotal: diasMes * c.vigenciaMeses,
        amostragemOs: osPrevistas.slice(0, 12),
      },
      almoxarifado: {
        materialMes: round(materialMes),
        materialTotal: round(materialTotal),
        epiMes: round(epiMes),
        epiTotal: round(epiTotal),
      },
      dre: {
        receitaMensal: round(receitaMensal),
        tributos: round(tributosMensal),
        folha: round(custoFolhaTotal),
        deslocamento: round(custoKmMes),
        material: round(materialMes),
        epi: round(epiMes),
        margemMensal: round(margemMensal),
        margemPct: round(margemPct, 1),
        margemTotal: round(margemTotal),
      },
      precificacao: {
        valorIdeal: round(valorIdealMensal),
        valorContratado: aliasContratado,
        diferenca: round(aliasContratado - valorIdealMensal),
        competitividade,
      },
      alertas,
      recomendacoes,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function round(n: number, decimals = 0): number {
  const m = Math.pow(10, decimals);
  return Math.round(n * m) / m;
}
