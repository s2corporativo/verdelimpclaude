/**
 * Motor de Cálculo Tributário Automático — Verdelimp ERP
 * Apoio gerencial — validar com contador antes do pagamento
 */
import { prisma } from "@/lib/prisma";
import { aliquotaEfetivaSimples } from "./tributario";

interface TaxResult {
  tipo: string;
  descricao: string;
  competencia: string;
  vencimento: string;
  valor: number;
  base: number;
  aliq: number;
  status: string;
  generatedAuto: boolean;
  notes: string;
  revenueCode?: string;
  informativo?: boolean; // linha de referência — NÃO soma no total a recolher
}

function nextMonthDate(competencia: string, day: number): string {
  const [year, month] = competencia.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** As 12 competências ANTERIORES à informada (base do RBT12), formato "YYYY-MM". */
export function competenciasAnteriores(competencia: string, qtd = 12): string[] {
  const [year, month] = competencia.split("-").map(Number);
  const lista: string[] = [];
  let y = year, m = month;
  for (let i = 0; i < qtd; i++) {
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
    lista.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return lista;
}

/**
 * Converte "YYYY-MM-DD" em Date no meio-dia LOCAL — nunca `new Date("YYYY-MM-DD")`,
 * que interpreta meia-noite UTC e faz o vencimento aparecer um dia antes no Brasil.
 */
export function dataLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export async function apurarTributos(competencia: string, faturamento: number): Promise<TaxResult[]> {
  // Buscar dados do sistema
  const [config, employees, nfses, nfses12m] = await Promise.all([
    prisma.companyConfig.findFirst(),
    prisma.employee.findMany({ where: { active: true } }),
    prisma.fiscalNfse.findMany({ where: { competence: competencia } }),
    // RBT12: receita bruta das 12 competências ANTERIORES (base legal do Simples)
    prisma.fiscalNfse.findMany({
      where: { competence: { in: competenciasAnteriores(competencia) } },
      select: { serviceValue: true },
    }),
  ]);

  const folha = employees.reduce((sum, e) => sum + Number(e.salary), 0);
  const aliqFGTS = config ? Number(config.aliqFGTS) : 8.0;
  const aliqISS = config ? Number(config.aliqISS) : 5.0;

  // DAS pela alíquota EFETIVA do Anexo IV (motor progressivo da LC 123) quando
  // há histórico de faturamento; sem histórico, cai na alíquota fixa da config.
  const rbt12 = nfses12m.reduce((s, n) => s + Number(n.serviceValue), 0);
  const aliqDASConfig = config ? Number(config.aliqDAS) : 6.72;
  const efetivaIV = rbt12 > 0 ? aliquotaEfetivaSimples(rbt12, "IV") : null;
  const aliqDAS = efetivaIV ? Number(efetivaIV.efetiva.toFixed(4)) : aliqDASConfig;
  const notaDAS = efetivaIV
    ? `Alíq. efetiva ${aliqDAS}% (Anexo IV, faixa ${efetivaIV.faixa}, RBT12 R$${rbt12.toFixed(2)}). PGDAS-D obrigatório para apuração oficial.`
    : `Alíq. ${aliqDAS}% × faturamento (sem histórico de 12m — usando config). PGDAS-D obrigatório para apuração oficial.`;

  // ISS — total emitido e retido
  const issTotal = nfses.reduce((sum, n) => sum + Number(n.serviceValue) * (Number(n.issRate) / 100), 0);
  const issRetido = nfses.filter((n) => n.issRetained).reduce((sum, n) => sum + Number(n.serviceValue) * (Number(n.issRate) / 100), 0);
  const issARecolher = Math.max(0, issTotal - issRetido);

  // CSRF estimado (PIS 0.65% + COFINS 3% + CSLL 1% = 4.65% sobre ~10% do faturamento)
  const csrfEstimado = faturamento * 0.00465;

  const lancamentos: TaxResult[] = [
    {
      tipo: "DAS",
      descricao: `Simples Nacional — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 20),
      valor: parseFloat((faturamento * (aliqDAS / 100)).toFixed(2)),
      base: faturamento,
      aliq: aliqDAS,
      status: "em_aberto",
      generatedAuto: true,
      revenueCode: "6746",
      notes: notaDAS,
    },
    {
      tipo: "FGTS",
      descricao: `FGTS Folha — ${competencia}`,
      competencia,
      // FGTS Digital: vencimento no dia 20 do mês seguinte (antes era dia 7)
      vencimento: nextMonthDate(competencia, 20),
      valor: parseFloat((folha * (aliqFGTS / 100)).toFixed(2)),
      base: folha,
      aliq: aliqFGTS,
      status: "em_aberto",
      generatedAuto: true,
      notes: `8% sobre folha bruta de ${employees.length} colaboradores (R$${folha.toFixed(2)})`,
    },
    {
      // No Simples, a CPP patronal está DENTRO do DAS nos Anexos III e V; no
      // Anexo IV é recolhida à parte (~20% + RAT + terceiros). Como o módulo não
      // determina o anexo, esta linha é INFORMATIVA (não soma) — o contador
      // define o valor correto conforme o enquadramento.
      tipo: "INSS",
      descricao: `INSS Patronal (informativo) — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 20),
      valor: 0,
      base: folha,
      aliq: 0,
      status: "informativo",
      generatedAuto: true,
      informativo: true,
      revenueCode: "1007",
      notes: `Anexos III/V: incluso no DAS (não recolher à parte). Anexo IV: CPP ~26,8% sobre a folha (R$${folha.toFixed(2)}) — confirmar com o contador.`,
    },
    {
      // No Simples o ISS já está embutido no DAS. A guia separada duplicaria o
      // recolhimento — mantida como referência (retenções abatem no PGDAS-D).
      tipo: "ISS",
      descricao: `ISS (informativo — já incluso no DAS) — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 10),
      valor: 0,
      base: nfses.reduce((s, n) => s + Number(n.serviceValue), 0),
      aliq: aliqISS,
      status: "informativo",
      generatedAuto: true,
      informativo: true,
      notes: `No Simples o ISS é recolhido dentro do DAS. Referência: ISS total R$${issTotal.toFixed(2)}, retido pelos tomadores R$${issRetido.toFixed(2)} (abate no PGDAS-D).`,
    },
    {
      // Optantes do Simples geralmente NÃO sofrem retenção de CSRF (PIS/COFINS/CSLL).
      tipo: "CSRF",
      descricao: `CSRF (informativo) — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 20),
      valor: 0,
      base: faturamento,
      aliq: 0,
      status: "informativo",
      generatedAuto: true,
      informativo: true,
      revenueCode: "5952",
      notes: `Optante do Simples costuma ser dispensado da retenção de CSRF. Referência estimada R$${csrfEstimado.toFixed(2)} — validar com contador.`,
    },
  ];

  return lancamentos;
}

export async function salvarApuracao(lancamentos: TaxResult[], competencia: string): Promise<void> {
  // Remover lançamentos automáticos anteriores da mesma competência
  await prisma.fiscalTaxExpense.deleteMany({
    where: { competence: competencia, generatedAuto: true },
  });

  // Criar novos
  await prisma.fiscalTaxExpense.createMany({
    data: lancamentos.map((l) => ({
      taxType: l.tipo,
      description: l.descricao,
      competence: l.competencia,
      dueDate: dataLocal(l.vencimento), // meio-dia local — evita voltar 1 dia por fuso UTC
      principalAmount: l.valor,
      totalAmount: l.valor,
      status: l.status,
      generatedAuto: l.generatedAuto,
      revenueCode: l.revenueCode,
      notes: l.notes,
    })),
  });
}
