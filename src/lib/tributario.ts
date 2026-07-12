/**
 * Verdelimp ERP — Inteligência Tributária
 *
 * Tabelas e cálculos do Simples Nacional (Anexos III, IV e V), Fator R e uma
 * comparação simplificada com o Lucro Presumido, para orientar a economia
 * estratégica de tributos de uma prestadora de serviços (roçada, jardinagem,
 * limpeza e conservação, terceirização).
 *
 * ⚠️ Referências: LC 123/2006 e LC 155/2016 (tabelas vigentes desde 2018).
 * As alíquotas municipais (ISS) e o enquadramento do Anexo dependem do CNAE e
 * do serviço específico — TUDO deve ser confirmado com o contador antes de
 * decidir. Este módulo é ORIENTAÇÃO/SIMULAÇÃO, não fecha apuração oficial.
 */

export interface FaixaSimples { ate: number; nominal: number; deduzir: number }
export interface TabelaAnexo { anexo: "III" | "IV" | "V"; descricao: string; faixas: FaixaSimples[] }

export const ANEXOS: Record<string, TabelaAnexo> = {
  III: {
    anexo: "III",
    descricao: "Serviços em geral (inclui CPP no DAS). Aplicável a limpeza/jardinagem quando o Fator R ≥ 28%.",
    faixas: [
      { ate: 180000, nominal: 6.0, deduzir: 0 },
      { ate: 360000, nominal: 11.2, deduzir: 9360 },
      { ate: 720000, nominal: 13.5, deduzir: 17640 },
      { ate: 1800000, nominal: 16.0, deduzir: 35640 },
      { ate: 3600000, nominal: 21.0, deduzir: 125640 },
      { ate: 4800000, nominal: 33.0, deduzir: 648000 },
    ],
  },
  IV: {
    anexo: "IV",
    descricao: "Limpeza, conservação, vigilância e obras. NÃO inclui a CPP (INSS patronal) no DAS — recolhida à parte sobre a folha.",
    faixas: [
      { ate: 180000, nominal: 4.5, deduzir: 0 },
      { ate: 360000, nominal: 9.0, deduzir: 8100 },
      { ate: 720000, nominal: 10.2, deduzir: 12420 },
      { ate: 1800000, nominal: 14.0, deduzir: 39780 },
      { ate: 3600000, nominal: 22.0, deduzir: 183780 },
      { ate: 4800000, nominal: 33.0, deduzir: 828000 },
    ],
  },
  V: {
    anexo: "V",
    descricao: "Serviços com baixa folha (Fator R < 28%). Alíquotas iniciais mais altas — evitar quando possível aumentando o Fator R.",
    faixas: [
      { ate: 180000, nominal: 15.5, deduzir: 0 },
      { ate: 360000, nominal: 18.0, deduzir: 4500 },
      { ate: 720000, nominal: 19.5, deduzir: 9900 },
      { ate: 1800000, nominal: 20.5, deduzir: 17100 },
      { ate: 3600000, nominal: 23.0, deduzir: 62100 },
      { ate: 4800000, nominal: 30.5, deduzir: 540000 },
    ],
  },
};

export const TETO_SIMPLES = 4800000; // limite de receita bruta 12m para o Simples

/** Alíquota efetiva do Simples: (RBT12 × nominal% − parcela a deduzir) / RBT12. */
export function aliquotaEfetivaSimples(rbt12: number, anexo: "III" | "IV" | "V"): { efetiva: number; faixa: number; nominal: number; deduzir: number } {
  const tab = ANEXOS[anexo];
  const rbt = Math.max(rbt12, 1);
  let idx = tab.faixas.findIndex((f) => rbt <= f.ate);
  if (idx < 0) idx = tab.faixas.length - 1;
  const f = tab.faixas[idx];
  const efetiva = Math.max(0, (rbt * (f.nominal / 100) - f.deduzir) / rbt) * 100;
  return { efetiva, faixa: idx + 1, nominal: f.nominal, deduzir: f.deduzir };
}

/** Fator R = folha de 12 meses (salários + pró-labore + FGTS) ÷ receita bruta 12m. */
export function fatorR(folha12: number, receita12: number): number {
  if (receita12 <= 0) return 0;
  return (folha12 / receita12) * 100;
}

export interface ResultadoSimples {
  anexo: "III" | "IV" | "V";
  aliquotaEfetiva: number;
  faixa: number;
  dasMensal: number;       // DAS sobre a receita do mês
  inssForaDas: number;     // só no Anexo IV: CPP recolhida à parte
  cargaTotalMensal: number;
  cargaTotalPct: number;
}

/**
 * Simula a carga do Simples num mês.
 * No Anexo IV a CPP (≈ 20% + RAT + terceiros ≈ 26,8%) incide sobre a folha e é
 * recolhida FORA do DAS — por isso somamos essa parcela para comparar regimes.
 */
export function simularSimples(receitaMes: number, rbt12: number, anexo: "III" | "IV" | "V", folhaMes = 0, cppPct = 26.8): ResultadoSimples {
  const { efetiva, faixa } = aliquotaEfetivaSimples(rbt12, anexo);
  const das = receitaMes * (efetiva / 100);
  const inssFora = anexo === "IV" ? folhaMes * (cppPct / 100) : 0;
  const total = das + inssFora;
  return {
    anexo, aliquotaEfetiva: efetiva, faixa,
    dasMensal: das, inssForaDas: inssFora,
    cargaTotalMensal: total,
    cargaTotalPct: receitaMes > 0 ? (total / receitaMes) * 100 : 0,
  };
}

export interface ResultadoPresumido {
  irpj: number; adicionalIr: number; csll: number; pis: number; cofins: number; iss: number;
  inssPatronal: number;
  cargaTotalMensal: number; cargaTotalPct: number;
  detalhe: { nome: string; base: string; valor: number }[];
}

/**
 * Lucro Presumido (serviços — presunção de 32%). Comparação simplificada:
 * IRPJ 15% s/ base 32% + adicional 10% sobre base que exceder R$20.000/mês;
 * CSLL 9% s/ base 32%; PIS 0,65% e COFINS 3% s/ receita (cumulativo);
 * ISS municipal; INSS patronal (CPP+RAT+terceiros) sobre a folha.
 */
export function simularPresumido(receitaMes: number, folhaMes: number, issPct = 5, cppPct = 26.8): ResultadoPresumido {
  const baseIr = receitaMes * 0.32;
  const irpj = baseIr * 0.15;
  const adicional = Math.max(0, baseIr - 20000) * 0.10;
  const csll = baseIr * 0.09;
  const pis = receitaMes * 0.0065;
  const cofins = receitaMes * 0.03;
  const iss = receitaMes * (issPct / 100);
  const inss = folhaMes * (cppPct / 100);
  const total = irpj + adicional + csll + pis + cofins + iss + inss;
  return {
    irpj, adicionalIr: adicional, csll, pis, cofins, iss, inssPatronal: inss,
    cargaTotalMensal: total,
    cargaTotalPct: receitaMes > 0 ? (total / receitaMes) * 100 : 0,
    detalhe: [
      { nome: "IRPJ (15% s/ base 32%)", base: "receita", valor: irpj },
      { nome: "Adicional IRPJ (10% acima de R$20k)", base: "base", valor: adicional },
      { nome: "CSLL (9% s/ base 32%)", base: "receita", valor: csll },
      { nome: "PIS (0,65%)", base: "receita", valor: pis },
      { nome: "COFINS (3%)", base: "receita", valor: cofins },
      { nome: `ISS (${issPct}%)`, base: "receita", valor: iss },
      { nome: `INSS patronal (${cppPct}% s/ folha)`, base: "folha", valor: inss },
    ],
  };
}

/** Fator R alvo: quanto de folha falta para atingir 28% e migrar do Anexo V para o III. */
export function folhaParaFatorR(receita12: number, alvoPct = 28): number {
  return receita12 * (alvoPct / 100);
}
