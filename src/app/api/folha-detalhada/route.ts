
// Calcula INSS (tabela progressiva por faixas) + IRRF + líquido por funcionário
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sempre executar no servidor — nunca pré-renderizar com dados demo no build
export const dynamic = "force-dynamic";

// Tabela INSS 2026 — PROGRESSIVA POR FAIXAS (cumulativa): cada parcela do salário
// é tributada pela alíquota da sua faixa, não a alíquota da faixa toda sobre o
// salário inteiro. Ex.: R$2.500 → 1.412×7,5% + (2.500−1.412)×9% = R$203,82
// (e não 2.500×9% = R$225, que descontaria a mais do funcionário).
const FAIXAS_INSS = [
  { ate: 1412.00, aliq: 0.075 },
  { ate: 2666.68, aliq: 0.09 },
  { ate: 4000.03, aliq: 0.12 },
  { ate: 7786.02, aliq: 0.14 }, // teto de contribuição
];

function calcINSS(salario: number): number {
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
function tabelaIRRF(baseCalculo: number): number {
  let v = 0;
  if (baseCalculo <= 2259.20) v = 0;
  else if (baseCalculo <= 2826.65) v = baseCalculo * 0.075 - 169.44;
  else if (baseCalculo <= 3751.05) v = baseCalculo * 0.15 - 381.44;
  else if (baseCalculo <= 4664.68) v = baseCalculo * 0.225 - 662.77;
  else v = baseCalculo * 0.275 - 896.00;
  return Math.max(0, v);
}

const DEDUCAO_DEPENDENTE = 189.59;   // por dependente/mês
const DESCONTO_SIMPLIFICADO = 564.80; // substitui INSS + dependentes

// IRRF pelo MENOR imposto entre o modelo legal (INSS + dependentes) e o desconto
// simplificado — antes ignorava dependentes e o simplificado, retendo a mais.
function calcIRRF(bruto: number, inss: number, dependentes: number): number {
  const baseLegal = bruto - inss - dependentes * DEDUCAO_DEPENDENTE;
  const baseSimplificada = bruto - DESCONTO_SIMPLIFICADO;
  return Math.min(tabelaIRRF(baseLegal), tabelaIRRF(baseSimplificada));
}

// FGTS: 8% sobre salário bruto (empresa paga, não desconta do funcionário)
const FGTS_RATE = 0.08;
// INSS Patronal: 7% (Simples Nacional + MEI — alíquota simplificada)
const INSS_PATRONAL = 0.07;
// Salário mínimo — base da insalubridade (validar valor vigente e a base na CCT)
const SALARIO_MINIMO = 1518.0;

// Adicionais recorrentes: insalubridade (grau% sobre o salário mínimo) e
// periculosidade (30% sobre o salário base). Não são cumuláveis entre si —
// aplica-se o mais vantajoso ao empregado (art. 193 §2º CLT).
function calcAdicionais(salarioBase: number, insalubridadeGrau: number, periculosidade: boolean): number {
  const insal = (Number(insalubridadeGrau) || 0) / 100 * SALARIO_MINIMO;
  const peric = periculosidade ? salarioBase * 0.30 : 0;
  return Math.max(insal, peric);
}

const HORAS_MES = 220; // jornada mensal para o valor-hora

interface HorasExtras { he50?: number; he100?: number }

// Calcula a linha de folha de um funcionário. `ex` traz horas extras do mês
// (50% e 100%), que são variáveis por competência — por isso vêm por requisição,
// não como campo fixo do cadastro.
function linhaFolha(f: any, ex?: HorasExtras) {
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

function totaisDe(folha: any[]) {
  return folha.reduce((a, f) => ({
    bruto: a.bruto + f.salarioBruto, inss: a.inss + f.inss, irrf: a.irrf + f.irrf,
    liquido: a.liquido + f.salarioLiquido, fgts: a.fgts + f.fgts,
    inssPatronal: a.inssPatronal + f.inssPatronal, custoTotal: a.custoTotal + f.custoTotal,
  }), { bruto: 0, inss: 0, irrf: 0, liquido: 0, fgts: 0, inssPatronal: 0, custoTotal: 0 });
}

const AVISO = "INSS/IRRF tabela progressiva 2026, adicionais e horas extras — validar com contador";

export async function GET() {
  try {
    const funcionarios = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    if (!funcionarios.length) { const folha = DEMO_EMPLOYEES.map(f => linhaFolha(f)); return NextResponse.json({ folha, totais: totaisDe(folha), _demo: true }); }
    const folha = funcionarios.map(f => linhaFolha(f));
    return NextResponse.json({ folha, totais: totaisDe(folha), aviso: AVISO });
  } catch {
    const folha = DEMO_EMPLOYEES.map(f => linhaFolha(f));
    return NextResponse.json({ folha, totais: totaisDe(folha), _demo: true });
  }
}

// Recalcula a folha aplicando horas extras por funcionário no mês.
// body: { extras: { [employeeId]: { he50, he100 } } }
export async function POST(req: Request) {
  try {
    const { extras } = await req.json().catch(() => ({ extras: {} }));
    const funcionarios = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    const base = funcionarios.length ? funcionarios : DEMO_EMPLOYEES;
    const folha = base.map((f: any) => linhaFolha(f, extras?.[f.id]));
    return NextResponse.json({ folha, totais: totaisDe(folha), _demo: !funcionarios.length, aviso: AVISO });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Demo passa pelos MESMOS cálculos da folha real (antes tinha INSS flat obsoleto).
const DEMO_EMPLOYEES = [
  { id:"e1", name:"Abrão Felipe",      role:"Op. Roçadeira",   salary:2500 },
  { id:"e2", name:"Ana Luiza Ribeiro", role:"Supervisora",     salary:3500 },
  { id:"e3", name:"Gilberto Ferreira", role:"Op. Roçadeira",   salary:2400 },
  { id:"e4", name:"José Antonio",      role:"Op. Roçadeira",   salary:2500 },
  { id:"e5", name:"Leomar Souza",      role:"Op. Retroescav.", salary:3200 },
  { id:"e6", name:"Uanderson Nunes",   role:"Aux. Jardinagem", salary:2200 },
  { id:"e7", name:"Leonardo Souza",    role:"Motorista",       salary:2800 },
  { id:"e8", name:"Giovanna Cunha",    role:"Assistente Adm.", salary:2600 },
];
