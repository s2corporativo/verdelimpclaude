// src/app/api/equipe-otimizada/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PRODUTIVIDADE_M2_DIA: Record<string, number> = {
  "Roçada Manual": 800, "Roçada Mecanizada": 2500, "Jardinagem Mensal": 1200,
  "PRADA/PTRF": 600, "Limpeza": 1500, "Podação": 200,
  "Hidrossemeadura": 5000, "Controle de Formigas": 3000, "Outro": 1000,
};
const SALARIO_POR_FUNCAO: Record<string, number> = {
  "Supervisor": 3500, "Supervisora de Obras": 3500, "Operador de Roçadeira": 2500,
  "Operador de Retroescavadeira": 3200, "Jardineiro": 2400, "Auxiliar de Jardinagem": 2200,
  "Motorista": 2800, "Pedreiro": 2700, "Líder": 2900, "Ajudante": 2100,
};
const FUNCAO_PARA_SERVICO: Record<string, string[]> = {
  "Roçada Manual": ["Operador de Roçadeira", "Auxiliar de Jardinagem", "Jardineiro", "Ajudante"],
  "Roçada Mecanizada": ["Operador de Roçadeira", "Operador de Retroescavadeira", "Motorista"],
  "Jardinagem Mensal": ["Jardineiro", "Auxiliar de Jardinagem", "Ajudante"],
  "PRADA/PTRF": ["Operador de Roçadeira", "Auxiliar de Jardinagem"],
  "Limpeza": ["Auxiliar de Jardinagem", "Ajudante"],
  "Podação": ["Jardineiro", "Auxiliar de Jardinagem"],
  "Hidrossemeadura": ["Operador de Roçadeira", "Auxiliar de Jardinagem"],
  "Controle de Formigas": ["Auxiliar de Jardinagem", "Jardineiro"],
  "Outro": ["Auxiliar de Jardinagem", "Jardineiro", "Operador de Roçadeira"],
};
const ENCARGOS = 0.7;

function round(n: number, d = 0): number { const m = Math.pow(10, d); return Math.round(n * m) / m; }

const DEMO_FUNCS = [
  { id: "e2", nome: "Ana Luiza Ribeiro", funcao: "Supervisora de Obras", salario: 3500, treinamentos: ["NR-06","NR-35"], contratosAtivos: 0, contratosNomes: [], compativel: true, ehSupervisor: true },
  { id: "e1", nome: "Abrão Felipe", funcao: "Operador de Roçadeira", salario: 2500, treinamentos: ["NR-06","NR-12"], contratosAtivos: 0, contratosNomes: [], compativel: true, ehSupervisor: false },
  { id: "e3", nome: "Gilberto Ferreira", funcao: "Operador de Roçadeira", salario: 2400, treinamentos: ["NR-06","NR-12"], contratosAtivos: 0, contratosNomes: [], compativel: true, ehSupervisor: false },
  { id: "e4", nome: "José Antonio Mariano", funcao: "Operador de Roçadeira", salario: 2500, treinamentos: ["NR-06","NR-12"], contratosAtivos: 1, contratosNomes: ["CONT-2025-001"], compativel: true, ehSupervisor: false },
  { id: "e5", nome: "Leomar Souza", funcao: "Operador de Retroescavadeira", salario: 3200, treinamentos: ["NR-06","NR-12","NR-35"], contratosAtivos: 0, contratosNomes: [], compativel: true, ehSupervisor: false },
  { id: "e6", nome: "Uanderson Nunes", funcao: "Auxiliar de Jardinagem", salario: 2200, treinamentos: ["NR-06"], contratosAtivos: 0, contratosNomes: [], compativel: true, ehSupervisor: false },
  { id: "e7", nome: "Leonardo Souza", funcao: "Motorista", salario: 2800, treinamentos: ["NR-06","CNH categoria D"], contratosAtivos: 1, contratosNomes: ["CONT-2025-002"], compativel: false, ehSupervisor: false },
];

export async function POST(req: NextRequest) {
  try {
    const { contrato } = await req.json();
    if (!contrato) return NextResponse.json({ error: "Contrato obrigatório" }, { status: 400 });

    const tipoServico = contrato.tipoServico || "Outro";
    const areaM2 = Number(contrato.areaM2) || 0;
    const diasMes = Number(contrato.diasExecucao) || 4;
    const vigenciaMeses = Number(contrato.vigenciaMeses) || 12;
    const valorMensal = Number(contrato.valorMensal) || 0;
    const prodDia = PRODUTIVIDADE_M2_DIA[tipoServico] || 1000;

    const pessoasIdeais = areaM2 ? Math.ceil(areaM2 / (prodDia * diasMes)) : 3;
    const minPessoas = Math.max(2, Math.ceil(pessoasIdeais * 0.7));
    const recPessoas = Math.max(2, pessoasIdeais);
    const confPessoas = Math.min(8, pessoasIdeais + 2);
    const funcoesRecomendadas = FUNCAO_PARA_SERVICO[tipoServico] || ["Auxiliar de Jardinagem"];

    function calcCenario(qtd: number, nome: string, descricao: string) {
      const supervisor = 1, operacionais = qtd - 1;
      const salSup = SALARIO_POR_FUNCAO["Supervisor"] || 3500;
      const salOp = funcoesRecomendadas.reduce((s, f) => s + (SALARIO_POR_FUNCAO[f] || 2500), 0) / funcoesRecomendadas.length;
      const folhaBruta = supervisor * salSup + operacionais * salOp;
      const encargos = folhaBruta * ENCARGOS;
      const custoMensalEquipe = folhaBruta + encargos;
      const tempoNec = areaM2 ? Math.ceil(areaM2 / (qtd * prodDia)) : 0;
      const margem = valorMensal - custoMensalEquipe;
      const margemPct = valorMensal ? (margem / valorMensal) * 100 : 0;
      return {
        nome, descricao, qtdPessoas: qtd, supervisor, operacionais, funcoesRecomendadas,
        folhaBruta: round(folhaBruta), encargos: round(encargos),
        custoMensalEquipe: round(custoMensalEquipe),
        custoTotalContrato: round(custoMensalEquipe * vigenciaMeses),
        tempoNecessarioDias: tempoNec, dentroPrazo: !diasMes || tempoNec <= diasMes,
        margem: round(margem), margemPct: round(margemPct, 1),
        viabilidade: margemPct >= 25 ? "ótima" : margemPct >= 15 ? "boa" : margemPct >= 0 ? "apertada" : "prejuízo",
      };
    }

    const cenarios = [
      calcCenario(minPessoas, "Mínima", "Equipe enxuta — máxima economia, prazo justo"),
      calcCenario(recPessoas, "Recomendada", "Equilíbrio entre custo e produtividade"),
      calcCenario(confPessoas, "Confortável", "Equipe robusta — folga para imprevistos"),
    ];
    const recomendado = cenarios.filter(c => c.dentroPrazo).sort((a, b) => b.margemPct - a.margemPct)[0] || cenarios[1];

    let funcionariosSugeridos: any[] = [];
    try {
      const allFuncs = await prisma.employee.findMany({
        where: { active: true, status: "ativo" },
        include: {
          trainings: { where: { status: "valido" } },
          mobilizations: { where: { status: "ativa" }, include: { contract: { select: { number: true, object: true } } } },
        },
        take: 30,
      });
      funcionariosSugeridos = allFuncs.map(f => {
        const treinamentos = f.trainings.map((t: any) => t.trainingType);
        const contratosAtivos = f.mobilizations.length;
        const ehSup = f.role.toLowerCase().includes("supervisor") || f.role.toLowerCase().includes("líder");
        const compativel = funcoesRecomendadas.some(fc => f.role.includes(fc.split(" ")[0]));
        const score = (compativel ? 50 : 0) + (treinamentos.includes("NR-06") ? 15 : 0)
          + (treinamentos.includes("NR-12") && tipoServico.includes("Roçada") ? 15 : 0)
          + (contratosAtivos === 0 ? 30 : contratosAtivos === 1 ? 15 : -10)
          + (ehSup && tipoServico !== "Limpeza" ? 10 : 0);
        return {
          id: f.id, nome: f.name, funcao: f.role, salario: Number(f.salary),
          treinamentos, contratosAtivos, contratosNomes: f.mobilizations.map((m: any) => m.contract.number),
          compativel, ehSupervisor: ehSup, score, recomendado: score >= 50,
          motivoRecomendacao: compativel ? `Função compatível${contratosAtivos === 0 ? ", disponível" : ""}` : `Função adaptável${contratosAtivos === 0 ? ", disponível" : ""}`,
        };
      }).sort((a, b) => b.score - a.score);
    } catch {
      funcionariosSugeridos = DEMO_FUNCS.map((f, i) => ({
        ...f, score: 80 - i * 5, recomendado: i < recomendado.qtdPessoas,
        motivoRecomendacao: i === 0 ? "Supervisora — sempre alocar 1" : `Função compatível com ${tipoServico}`,
      }));
    }

    const economiaVsConfortavel = cenarios[2].custoMensalEquipe - recomendado.custoMensalEquipe;
    return NextResponse.json({
      success: true, cenarios, recomendado, funcionariosSugeridos,
      analise: {
        tipoServico, produtividadeM2Dia: prodDia, areaTotal: areaM2,
        diasExecucaoMes: diasMes, funcoesRecomendadas,
        economiaVsConfortavel: round(economiaVsConfortavel),
        economiaContrato: round(economiaVsConfortavel * vigenciaMeses),
        observacoes: [
          `Produtividade ${tipoServico}: ${prodDia.toLocaleString("pt-BR")} m²/dia/pessoa`,
          areaM2 ? `Para ${areaM2.toLocaleString("pt-BR")} m² em ${diasMes} dias/mês: ${pessoasIdeais} pessoas é o ideal` : "",
          `Funções recomendadas: ${funcoesRecomendadas.join(", ")}`,
          `Encargos sociais aplicados: ${(ENCARGOS * 100).toFixed(0)}% sobre folha bruta`,
        ].filter(Boolean),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
