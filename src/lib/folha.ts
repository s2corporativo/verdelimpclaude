/**
 * Cálculos de folha de pagamento — lógica pura, sem dependência de banco/HTTP,
 * para ser reutilizada pela API e coberta por testes automatizados.
 *
 * ⚠️ Apoio gerencial: INSS/IRRF (tabela progressiva 2026), adicionais e horas
 * extras. Sempre validar os valores vigentes e as bases da CCT com o contador.
 */

// Tabela INSS 2026 — PROGRESSIVA POR FAIXAS (cumulativa): cada parcela do salário
// é tributada pela alíquota da sua faixa, não a alíquota da faixa toda sobre o
// salário inteiro. Ex.: R$2.500 → 1.412×7,5% + (2.500−1.412)×9% = R$203,82
// (e não 2.500×9% = R$225, que descontaria a mais do funcionário).
export const FAIXAS_INSS = [
  { ate: 1412.00, aliq: 0.075 },
  { ate: 2666.68, aliq: 0.09 },
  { ate: 4000.03, aliq: 0.12 },
  { ate: 7786.02, aliq: 0.14 }, // teto de contribuição
];

export function calcINSS(salario: number): number {
  let contribuicao = 0;
  let anterior = 0;
  for (const f of FAIXAS_INSS) {
    if (salario > anterior) {
      const parcela = Math.min(salario, f.ate) - anterior;
      contribuicao += parcela * f.aliq;
      anterior = f.ate;
    } else break;
  }
  return contribuicao; // salários acima do teto param na última faixa (máx ≈ R$908,86)
}

// Tabela IRRF 2026 (progressiva) aplicada sobre a base de cálculo.
export function tabelaIRRF(baseCalculo: number): number {
  let v = 0;
  if (baseCalculo <= 2259.20) v = 0;
  else if (baseCalculo <= 2826.65) v = baseCalculo * 0.075 - 169.44;
  else if (baseCalculo <= 3751.05) v = baseCalculo * 0.15 - 381.44;
  else if (baseCalculo <= 4664.68) v = baseCalculo * 0.225 - 662.77;
  else v = baseCalculo * 0.275 - 896.00;
  return Math.max(0, v);
}

export const DEDUCAO_DEPENDENTE = 189.59;   // por dependente/mês
export const DESCONTO_SIMPLIFICADO = 564.80; // substitui INSS + dependentes

// IRRF pelo MENOR imposto entre o modelo legal (INSS + dependentes) e o desconto
// simplificado — antes ignorava dependentes e o simplificado, retendo a mais.
export function calcIRRF(bruto: number, inss: number, dependentes: number): number {
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE;
  const baseSimplificada = bruto - DESCONTO_SIMPLIFICADO;
  return Math.min(tabelaIRRF(baseLegal), tabelaIRRF(baseSimplificada));
}

// FGTS: 8% sobre salário bruto (empresa paga, não desconta do funcionário)
export const FGTS_RATE = 0.08;
// INSS Patronal: 7% (Simples Nacional + MEI — alíquota simplificada)
export const INSS_PATRONAL = 0.07;
// Salário mínimo — base da insalubridade (validar valor vigente e a base na CCT)
export const SALARIO_MINIMO = 1518.0;

// Adicionais recorrentes: insalubridade (grau% sobre o salário mínimo) e
// periculosidade (30% sobre o salário base). Não são cumuláveis entre si —
// aplica-se o mais vantajoso ao empregado (art. 193 §2º CLT).
export function calcAdicionais(salarioBase: number, insalubridadeGrau: number, periculosidade: boolean): number {
  const insal = (Number(insalubridadeGrau) || 0) / 100 * SALARIO_MINIMO;
  const peric = periculosidade ? salarioBase * 0.30 : 0;
  return Math.max(insal, peric);
}

export const HORAS_MES = 220; // jornada mensal para o valor-hora

export interface HorasExtras { he50?: number; he100?: number }

export interface FuncionarioFolha {
  id?: string;
  name?: string;
  role?: string;
  salary: number | string;
  insalubridadeGrau?: number;
  periculosidade?: boolean;
  dependentes?: number;
}

// Calcula a linha de folha de um funcionário. `ex` traz horas extras do mês
// (50% e 100%), que são variáveis por competência — por isso vêm por requisição,
// não como campo fixo do cadastro.
export function linhaFolha(f: FuncionarioFolha, ex?: HorasExtras) {
  const r2 = (n: number) => Number(n.toFixed(2));
  const salarioBase = Number(f.salary);
  const adicionais = calcAdicionais(salarioBase, f.insalubridadeGrau || 0, f.periculosidade || false);
  const valorHora = salarioBase / HORAS_MES;
  const horasExtras = valorHora * 1.5 * Number(ex?.he50 || 0) + valorHora * 2.0 * Number(ex?.he100 || 0);
  const bruto = salarioBase + adicionais + horasExtras; // tudo integra a base de INSS/IRRF/FGTS
  const inss = calcINSS(bruto);
  const irrf = calcIRRF(bruto, inss, Number(f.dependentes || 0));
  const liquido = bruto - inss - irrf;
  const fgts = bruto * FGTS_RATE;
  const inssPatronal = bruto * INSS_PATRONAL;
  const custoTotal = bruto + fgts + inssPatronal;
  return { id: f.id, nome: f.name, cargo: f.role, salarioBase: r2(salarioBase), adicionais: r2(adicionais), horasExtras: r2(horasExtras), salarioBruto: r2(bruto), inss: r2(inss), irrf: r2(irrf), salarioLiquido: r2(liquido), fgts: r2(fgts), inssPatronal: r2(inssPatronal), custoTotal: r2(custoTotal) };
}

export type LinhaFolha = ReturnType<typeof linhaFolha>;

export function totaisDe(folha: LinhaFolha[]) {
  return folha.reduce((a, f) => ({
    bruto: a.bruto + f.salarioBruto, inss: a.inss + f.inss, irrf: a.irrf + f.irrf,
    liquido: a.liquido + f.salarioLiquido, fgts: a.fgts + f.fgts,
    inssPatronal: a.inssPatronal + f.inssPatronal, custoTotal: a.custoTotal + f.custoTotal,
  }), { bruto: 0, inss: 0, irrf: 0, liquido: 0, fgts: 0, inssPatronal: 0, custoTotal: 0 });
}

export const AVISO_FOLHA = "INSS/IRRF tabela progressiva 2026, adicionais e horas extras — validar com contador";
