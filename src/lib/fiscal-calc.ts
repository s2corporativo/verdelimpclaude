/**
 * Motor de Cálculo Tributário Automático — Verdelimp ERP
 * Apoio gerencial — validar com contador antes do pagamento
 */
import { prisma } from "@/lib/prisma";

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
}

function nextMonthDate(competencia: string, day: number): string {
  const [year, month] = competencia.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function apurarTributos(competencia: string, faturamento: number): Promise<TaxResult[]> {
  // Buscar dados do sistema
  const [config, employees, nfses] = await Promise.all([
    prisma.companyConfig.findFirst(),
    prisma.employee.findMany({ where: { active: true } }),
    prisma.fiscalNfse.findMany({ where: { competence: competencia } }),
  ]);

  const folha = employees.reduce((sum, e) => sum + Number(e.salary), 0);
  const aliqDAS = config ? Number(config.aliqDAS) : 6.72;
  const aliqFGTS = config ? Number(config.aliqFGTS) : 8.0;
  const aliqINSS = config ? Number(config.aliqINSS) : 7.0;
  const aliqISS = config ? Number(config.aliqISS) : 5.0;

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
      notes: `Alíq. ${aliqDAS}% × faturamento. PGDAS-D obrigatório para apuração oficial.`,
    },
    {
      tipo: "FGTS",
      descricao: `FGTS Folha — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 7),
      valor: parseFloat((folha * (aliqFGTS / 100)).toFixed(2)),
      base: folha,
      aliq: aliqFGTS,
      status: "em_aberto",
      generatedAuto: true,
      notes: `8% sobre folha bruta de ${employees.length} colaboradores (R$${folha.toFixed(2)})`,
    },
    {
      tipo: "INSS",
      descricao: `INSS Patronal — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 20),
      valor: parseFloat((folha * (aliqINSS / 100)).toFixed(2)),
      base: folha,
      aliq: aliqINSS,
      status: "em_aberto",
      generatedAuto: true,
      revenueCode: "1007",
      notes: `${aliqINSS}% contribuição patronal — regime Simples Nacional`,
    },
    {
      tipo: "ISS",
      descricao: `ISS Betim LC 33/2003 — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 10),
      valor: parseFloat(issARecolher.toFixed(2)),
      base: nfses.reduce((s, n) => s + Number(n.serviceValue), 0),
      aliq: aliqISS,
      status: "em_aberto",
      generatedAuto: true,
      notes: `ISS total R$${issTotal.toFixed(2)} − retido pelos tomadores R$${issRetido.toFixed(2)} = a recolher R$${issARecolher.toFixed(2)}`,
    },
    {
      tipo: "CSRF",
      descricao: `CSRF Estimado — ${competencia}`,
      competencia,
      vencimento: nextMonthDate(competencia, 20),
      valor: parseFloat(csrfEstimado.toFixed(2)),
      base: faturamento,
      aliq: 0.465,
      status: "em_aberto",
      generatedAuto: true,
      revenueCode: "5952",
      notes: "PIS+COFINS+CSLL retidos por tomadores — validar com contador antes de recolher",
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
      dueDate: new Date(l.vencimento),
      principalAmount: l.valor,
      totalAmount: l.valor,
      status: l.status,
      generatedAuto: l.generatedAuto,
      revenueCode: l.revenueCode,
      notes: l.notes,
    })),
  });
}
