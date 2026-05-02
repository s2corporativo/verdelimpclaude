// src/app/api/equipe-otimizada/route.ts
// Calcula 3 cenários de equipe para o contrato
// Identifica qualificações requeridas e funcionários compatíveis
// Otimização para reduzir custo mantendo viabilidade
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Salário médio por função (mercado MG, 2026)
const SALARIO_FUNCAO: Record<string, number> = {
  "Supervisor de Obras": 3500,
  "Supervisora de Obras": 3500,
  "Supervisor": 3500,
  "Operador de Roçadeira": 2500,
  "Operador de Retroescavadeira": 3200,
  "Motorista": 2800,
  "Auxiliar de Jardinagem": 2200,
  "Jardineiro": 2400,
  "Assistente Administrativa": 2600,
  "Assistente Administrativo": 2600,
};

// Qualificações requeridas por tipo de serviço
const QUALIFICACOES: Record<string, { obrigatorias: string[]; recomendadas: string[]; }> = {
  "Roçada Manual": { obrigatorias: ["NR-06"], recomendadas: ["NR-12"] },
  "Roçada Mecanizada": { obrigatorias: ["NR-06","NR-12"], recomendadas: ["NR-35"] },
  "Jardinagem Mensal": { obrigatorias: ["NR-06"], recomendadas: [] },
  "PRADA/PTRF": { obrigatorias: ["NR-06","NR-35"], recomendadas: ["NR-12"] },
  "Limpeza": { obrigatorias: ["NR-06"], recomendadas: [] },
  "Podação": { obrigatorias: ["NR-06","NR-35"], recomendadas: ["NR-12"] },
  "Hidrossemeadura": { obrigatorias: ["NR-06"], recomendadas: [] },
  "Controle de Formigas": { obrigatorias: ["NR-06","NR-31"], recomendadas: [] },
  "Outro": { obrigatorias: ["NR-06"], recomendadas: [] },
};

// Produtividade m²/dia/pessoa
const PRODUTIVIDADE: Record<string, number> = {
  "Roçada Manual": 800,
  "Roçada Mecanizada": 2500,
  "Jardinagem Mensal": 1200,
  "PRADA/PTRF": 600,
  "Limpeza": 1500,
  "Podação": 200,
  "Hidrossemeadura": 5000,
  "Controle de Formigas": 3000,
  "Outro": 1000,
};

const ENCARGOS_PCT = 0.70; // 70% encargos sobre salário (CLT + INSS patronal + FGTS + 13º + férias)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const c = body.contrato;
    if (!c?.tipoServico || !c?.vigenciaMeses) {
      return NextResponse.json({ error: "Tipo de serviço e vigência obrigatórios" }, { status: 400 });
    }

    const tipoServico = c.tipoServico;
    const areaM2 = Number(c.areaM2) || 0;
    const diasMes = Number(c.diasExecucao) || 4;
    const vigencia = Number(c.vigenciaMeses);
    const valorMensal = Number(c.valorMensal) || 0;
    const prodDiaria = PRODUTIVIDADE[tipoServico] || 1000;
    const qualReq = QUALIFICACOES[tipoServico] || QUALIFICACOES["Outro"];

    // ── 1. Calcular equipe mínima necessária ──────────────────────
    let pessoasMinimas = 2; // mínimo absoluto
    if (areaM2 > 0 && diasMes > 0) {
      pessoasMinimas = Math.ceil(areaM2 / (prodDiaria * diasMes));
      if (pessoasMinimas < 2) pessoasMinimas = 2;
    }

    // ── 2. Buscar funcionários disponíveis ────────────────────────
    let funcsAtivos: any[] = [];
    try {
      const list = await prisma.employee.findMany({
        where: { active: true },
        include: {
          trainings: { where: { status: { not: "vencido" } } },
          mobilizations: { where: { status: "ativa" } },
        },
      });
      funcsAtivos = list.map(f => ({
        id: f.id,
        name: f.name,
        role: f.role,
        salary: Number(f.salary),
        cpf: f.cpf,
        admissionDate: f.admissionDate,
        treinamentos: f.trainings.map(t => t.trainingType),
        mobilizacoesAtivas: f.mobilizations.length,
        disponivel: f.mobilizations.length === 0,
      }));
    } catch {
      funcsAtivos = DEMO_FUNCS;
    }

    // ── 3. Score de compatibilidade ────────────────────────────────
    const funcsComScore = funcsAtivos.map(f => {
      let score = 0;
      let qualif: { ok: string[]; falta: string[]; } = { ok: [], falta: [] };
      
      qualReq.obrigatorias.forEach(q => {
        if (f.treinamentos?.includes(q)) {
          score += 30;
          qualif.ok.push(q);
        } else {
          score -= 50; // penalidade alta por falta de obrigatório
          qualif.falta.push(q);
        }
      });
      qualReq.recomendadas.forEach(q => {
        if (f.treinamentos?.includes(q)) {
          score += 10;
          qualif.ok.push(q);
        }
      });

      // Bonificação por função adequada
      if (tipoServico.includes("Roçada") && f.role.includes("Roçadeira")) score += 20;
      if (tipoServico === "Jardinagem Mensal" && f.role.includes("Jardin")) score += 20;
      if (tipoServico.includes("Podação") && f.role.includes("Roçadeira")) score += 10;
      if (f.role.includes("Supervisor")) score += 15;

      // Penalidade por não disponibilidade
      if (!f.disponivel) score -= 20;

      const salario = f.salary || SALARIO_FUNCAO[f.role] || 2500;
      const custoTotal = salario * (1 + ENCARGOS_PCT);

      return {
        ...f,
        score,
        qualif,
        custoMensal: custoTotal,
        recomendado: score >= 30 && f.disponivel,
      };
    }).sort((a, b) => b.score - a.score);

    // ── 4. Gerar 3 cenários ────────────────────────────────────────
    function montarCenario(qtdPessoas: number, label: string) {
      const escolhidos = funcsComScore.slice(0, qtdPessoas);
      const folhaBruta = escolhidos.reduce((s, f) => s + (f.salary || 2500), 0);
      const encargos = folhaBruta * ENCARGOS_PCT;
      const custoMensal = folhaBruta + encargos;
      const custoTotal = custoMensal * vigencia;
      const margemMensal = valorMensal - custoMensal;
      const margemPct = valorMensal > 0 ? (margemMensal / valorMensal) * 100 : 0;
      
      const produtividadeTotal = qtdPessoas * prodDiaria;
      const cobreArea = areaM2 === 0 || (produtividadeTotal * diasMes) >= areaM2;
      
      const todosTreinados = escolhidos.every((f: any) => f.qualif.falta.length === 0);
      
      return {
        label,
        qtdPessoas,
        funcionarios: escolhidos,
        folhaBruta,
        encargos,
        custoMensal,
        custoTotal,
        margemMensal,
        margemPct: Math.round(margemPct * 10) / 10,
        cobreArea,
        todosTreinados,
        viavel: cobreArea && qtdPessoas >= 2 && qtdPessoas <= funcsComScore.filter((f:any)=>f.disponivel).length,
        produtividadeM2Mes: produtividadeTotal * diasMes,
      };
    }

    const cenarios = {
      minima: montarCenario(Math.max(pessoasMinimas, 2), "🟢 Equipe Mínima — menor custo"),
      recomendada: montarCenario(pessoasMinimas + 1, "🔵 Recomendada — equilibrada"),
      confortavel: montarCenario(pessoasMinimas + 2, "🟣 Confortável — folga operacional"),
    };

    // Economia entre cenários
    const economia = {
      minimaVsRecomendada: cenarios.recomendada.custoTotal - cenarios.minima.custoTotal,
      recomendadaVsConfortavel: cenarios.confortavel.custoTotal - cenarios.recomendada.custoTotal,
    };

    return NextResponse.json({
      success: true,
      cenarios,
      economia,
      pessoasMinimas,
      qualificacoesRequeridas: qualReq,
      funcionariosCompativeis: funcsComScore.filter(f => f.score >= 0),
      funcionariosTodos: funcsComScore,
      totalDisponiveis: funcsComScore.filter(f => f.disponivel).length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_FUNCS = [
  { id:"e1", name:"Abrão Felipe", role:"Operador de Roçadeira", salary:2500, treinamentos:["NR-12","NR-06"], disponivel:true, mobilizacoesAtivas:0 },
  { id:"e2", name:"Ana Luiza Ribeiro", role:"Supervisora de Obras", salary:3500, treinamentos:["NR-35","NR-06","NR-12"], disponivel:true, mobilizacoesAtivas:0 },
  { id:"e3", name:"Gilberto Ferreira", role:"Operador de Roçadeira", salary:2400, treinamentos:["NR-06"], disponivel:true, mobilizacoesAtivas:0 },
  { id:"e4", name:"José Antonio", role:"Operador de Roçadeira", salary:2500, treinamentos:["NR-12","NR-06"], disponivel:true, mobilizacoesAtivas:0 },
  { id:"e5", name:"Leomar Souza", role:"Operador de Retroescavadeira", salary:3200, treinamentos:[], disponivel:true, mobilizacoesAtivas:0 },
  { id:"e6", name:"Uanderson Nunes", role:"Auxiliar de Jardinagem", salary:2200, treinamentos:["NR-06"], disponivel:true, mobilizacoesAtivas:0 },
  { id:"e7", name:"Leonardo Souza", role:"Motorista", salary:2800, treinamentos:["NR-06"], disponivel:true, mobilizacoesAtivas:0 },
  { id:"e8", name:"Giovanna Cunha", role:"Assistente Administrativa", salary:2600, treinamentos:[], disponivel:true, mobilizacoesAtivas:0 },
];
