/**
 * Cálculos de folha de pagamento — lógica pura, sem dependência de banco/HTTP,
 * para ser reutilizada pela API e coberta por testes automatizados.
 *
 * As tabelas (INSS/IRRF/salário mínimo) vivem em src/lib/tabelas-fiscais.ts,
 * versionadas por ano — todos os cálculos aceitam `ano` e usam o ano corrente
 * por padrão. ⚠️ Apoio gerencial: validar valores vigentes e CCT com o contador.
 */
import {
  tabelaVigente,
  inssPatronalPct,
  type AnexoSimples,
} from "./tabelas-fiscais";

export { tabelaVigente, inssPatronalPct };
export type { AnexoSimples };

// INSS progressivo POR FAIXAS (cumulativo): cada parcela do salário é tributada
// pela alíquota da sua faixa. Ex. (tabela 2025): R$2.500 → 1.518×7,5% +
// (2.500−1.518)×9% — e não 2.500×9%, que descontaria a mais do funcionário.
export function calcINSS(salario: number, ano?: number): number {
  const { faixasINSS } = tabelaVigente(ano);
  let contribuicao = 0;
  let anterior = 0;
  for (const f of faixasINSS) {
    if (salario > anterior) {
      const parcela = Math.min(salario, f.ate) - anterior;
      contribuicao += parcela * f.aliq;
      anterior = f.ate;
    } else break;
  }
  return contribuicao; // acima do teto, para na última faixa
}

// Tabela IRRF progressiva sobre a base de cálculo (sem o redutor da Lei 15.270 —
// ele é aplicado em calcIRRF, sobre o imposto final).
export function tabelaIRRF(baseCalculo: number, ano?: number): number {
  const { irrf } = tabelaVigente(ano);
  const faixa = irrf.faixas.find((f) => baseCalculo <= f.ate) ?? irrf.faixas[irrf.faixas.length - 1];
  return Math.max(0, baseCalculo * faixa.aliq - faixa.deduzir);
}

// IRRF pelo MENOR imposto entre o modelo legal (INSS + dependentes) e o
// desconto simplificado. Em 2026, aplica ainda o redutor da Lei 15.270/2025:
// isenção efetiva até R$5.000/mês e redução linear até R$7.350/mês.
export function calcIRRF(bruto: number, inss: number, dependentes: number, ano?: number): number {
  const t = tabelaVigente(ano);
  const baseLegal = bruto - inss - dependentes * t.irrf.deducaoDependente;
  const baseSimplificada = bruto - t.irrf.descontoSimplificado;
  let imposto = Math.min(tabelaIRRF(baseLegal, ano), tabelaIRRF(baseSimplificada, ano));

  const red = t.irrf.redutorLei15270;
  if (red && bruto <= red.isencaoAte) return 0;
  if (red && bruto <= red.reducaoAte) {
    // interpolação linear: imposto integral em `reducaoAte`, zero em `isencaoAte`
    imposto = imposto * ((bruto - red.isencaoAte) / (red.reducaoAte - red.isencaoAte));
  }
  return Math.max(0, imposto);
}

// FGTS: 8% sobre salário bruto (empresa paga, não desconta do funcionário)
export const FGTS_RATE = 0.08;

export function salarioMinimo(ano?: number): number {
  return tabelaVigente(ano).salarioMinimo;
}

// Adicionais recorrentes: insalubridade (grau% sobre o salário mínimo) e
// periculosidade (30% sobre o salário base). Não são cumuláveis entre si —
// aplica-se o mais vantajoso ao empregado (art. 193 §2º CLT).
export function calcAdicionais(salarioBase: number, insalubridadeGrau: number, periculosidade: boolean, ano?: number): number {
  const insal = ((Number(insalubridadeGrau) || 0) / 100) * salarioMinimo(ano);
  const peric = periculosidade ? salarioBase * 0.3 : 0;
  return Math.max(insal, peric);
}

export const HORAS_MES = 220; // jornada mensal para o valor-hora

// Provisões mensais sobre o bruto (mesma régua do módulo Hora-Homem):
// 13º (1/12), férias + 1/3 (1,3333/12), encargos sobre provisões, rescisão.
export const PROVISOES_PCT = { decimoTerceiro: 8.33, feriasComTerco: 11.11, encargosSobreProvisoes: 3, rescisao: 4 };
export const PROVISOES_TOTAL_PCT =
  PROVISOES_PCT.decimoTerceiro + PROVISOES_PCT.feriasComTerco + PROVISOES_PCT.encargosSobreProvisoes + PROVISOES_PCT.rescisao;

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

export interface OpcoesFolha {
  ano?: number;
  anexoSimples?: AnexoSimples; // Verdelimp (limpeza/conservação) = Anexo IV
  ratPct?: number;
  fapFator?: number;
}

// Calcula a linha de folha de um funcionário. `ex` traz horas extras do mês
// (50% e 100%), que são variáveis por competência — por isso vêm por requisição,
// não como campo fixo do cadastro.
export function linhaFolha(f: FuncionarioFolha, ex?: HorasExtras, op?: OpcoesFolha) {
  const r2 = (n: number) => Number(n.toFixed(2));
  const ano = op?.ano;
  const salarioBase = Number(f.salary);
  const adicionais = calcAdicionais(salarioBase, f.insalubridadeGrau || 0, f.periculosidade || false, ano);
  const valorHora = salarioBase / HORAS_MES;
  const horasExtras = valorHora * 1.5 * Number(ex?.he50 || 0) + valorHora * 2.0 * Number(ex?.he100 || 0);
  const bruto = salarioBase + adicionais + horasExtras; // tudo integra a base de INSS/IRRF/FGTS
  const inss = calcINSS(bruto, ano);
  const irrf = calcIRRF(bruto, inss, Number(f.dependentes || 0), ano);
  const liquido = bruto - inss - irrf;
  const fgts = bruto * FGTS_RATE;
  // Patronal conforme o anexo do Simples: Anexo IV (padrão Verdelimp) = 20% + RAT×FAP;
  // Anexos III/V = 0 (CPP dentro do DAS).
  const patronalPct = inssPatronalPct(op?.anexoSimples ?? "IV", op?.ratPct, op?.fapFator);
  const inssPatronal = bruto * (patronalPct / 100);
  const custoTotal = bruto + fgts + inssPatronal; // desembolso do mês (caixa)
  const provisoes = bruto * (PROVISOES_TOTAL_PCT / 100);
  const custoPleno = custoTotal + provisoes; // caixa + provisões (13º, férias, rescisão)
  return {
    id: f.id, nome: f.name, cargo: f.role,
    salarioBase: r2(salarioBase), adicionais: r2(adicionais), horasExtras: r2(horasExtras),
    salarioBruto: r2(bruto), inss: r2(inss), irrf: r2(irrf), salarioLiquido: r2(liquido),
    fgts: r2(fgts), inssPatronal: r2(inssPatronal), custoTotal: r2(custoTotal),
    provisoes: r2(provisoes), custoPleno: r2(custoPleno),
  };
}

export type LinhaFolha = ReturnType<typeof linhaFolha>;

export function totaisDe(folha: LinhaFolha[]) {
  return folha.reduce((a, f) => ({
    bruto: a.bruto + f.salarioBruto, inss: a.inss + f.inss, irrf: a.irrf + f.irrf,
    liquido: a.liquido + f.salarioLiquido, fgts: a.fgts + f.fgts,
    inssPatronal: a.inssPatronal + f.inssPatronal, custoTotal: a.custoTotal + f.custoTotal,
    provisoes: a.provisoes + f.provisoes, custoPleno: a.custoPleno + f.custoPleno,
  }), { bruto: 0, inss: 0, irrf: 0, liquido: 0, fgts: 0, inssPatronal: 0, custoTotal: 0, provisoes: 0, custoPleno: 0 });
}

export function avisoFolha(ano?: number): string {
  const t = tabelaVigente(ano);
  const alerta = t.defasada
    ? ` ⚠️ ATENÇÃO: usando tabela de ${t.ano} (não há tabela cadastrada para o ano corrente — atualize src/lib/tabelas-fiscais.ts).`
    : t.pendenteConfirmacao
      ? " ⚠️ Valores do exercício pendentes de confirmação oficial — validar com o contador."
      : "";
  return `INSS/IRRF tabela progressiva ${t.ano} (${t.fonte}), adicionais e horas extras — validar com contador.${alerta}`;
}

// Compatibilidade com chamadas existentes
export const AVISO_FOLHA = avisoFolha();
