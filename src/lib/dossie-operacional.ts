/**
 * Núcleo determinístico do Dossiê Operacional.
 *
 * A IA apenas extrai fatos e aponta evidências. Dimensionamento e preço são
 * calculados aqui, de forma auditável e reproduzível. Todas as alíquotas são
 * percentuais (8 = 8%), nunca frações.
 */

export type NivelRisco = 1 | 2 | 3 | 4 | 5;

export interface ItemRisco {
  id?: string;
  categoria: string;
  descricao: string;
  probabilidade: NivelRisco;
  impacto: NivelRisco;
  mitigacao?: string;
}

export interface ComposicaoEntrada {
  id?: string;
  code: string;
  activity: string;
  laborRole?: string | null;
  quantity: number;
  unit: string;
  /** Produção de um trabalhador em uma hora, na unidade da composição. */
  productivityPerHour: number;
  /** Equipe mínima tecnicamente necessária. */
  teamSize: number;
  hoursPerDay: number;
  workDaysPerWeek?: number;
  /** Fator entre 0 e 1 para deslocamento, pausas, interferências etc. */
  efficiencyFactor?: number;
  /** Horas de preparação, convertidas em HH pela equipe mínima. */
  setupHours?: number;
  laborHourlyCost: number;
  inputUnitCost?: number;
  equipmentDailyCost?: number;
  transportCost?: number;
  additionalCost?: number;
}

export interface PerfilTributarioEntrada {
  effectiveRate: number;
  issRate?: number;
  issRetained?: boolean;
  issIncludedInEffectiveRate?: boolean;
  inssRetentionRate?: number;
  inssRecoverable?: boolean;
  irrfRetentionRate?: number;
  csllPisCofinsRetentionRate?: number;
  otherRate?: number;
}

export interface DossieCalculoEntrada {
  validated: boolean;
  deadlineDays?: number | null;
  paymentTermDays?: number;
  mobilizationCost?: number;
  demobilizationCost?: number;
  overheadRate: number;
  riskRate: number;
  marginRate: number;
  /** Custo financeiro aplicado ao capital imobilizado durante o prazo. */
  workingCapitalRate?: number;
  taxProfile: PerfilTributarioEntrada;
  compositions: ComposicaoEntrada[];
  risks?: ItemRisco[];
  evidenceCoverage?: number;
}

export interface ComposicaoCalculada extends ComposicaoEntrada {
  effectiveProductivity: number;
  plannedLaborHours: number;
  plannedWorkers: number;
  plannedDays: number;
  laborCost: number;
  inputCost: number;
  equipmentCost: number;
  directCost: number;
}

export interface CenarioCalculado {
  name: "otimista" | "base" | "adverso";
  productivityFactor: number;
  costFactor: number;
  laborHours: number;
  workers: number;
  durationDays: number;
  directCost: number;
  minimumPrice: number;
  recommendedPrice: number;
  commercialPrice: number;
  marginValue: number;
}

export interface ResultadoDossie {
  compositions: ComposicaoCalculada[];
  totals: {
    laborHours: number;
    workers: number;
    durationDays: number;
    laborCost: number;
    inputCost: number;
    equipmentCost: number;
    transportAndAdditionalCost: number;
    directCost: number;
    mobilizationCost: number;
    demobilizationCost: number;
    overheadCost: number;
    riskCost: number;
    workingCapitalNeed: number;
    workingCapitalCost: number;
    taxBurdenRate: number;
    retainedCashRate: number;
    recoverableRetentionRate: number;
    definitiveRetentionRate: number;
    minimumPrice: number;
    recommendedPrice: number;
    commercialPrice: number;
    discountLimit: number;
  };
  scenarios: CenarioCalculado[];
  risks: Array<ItemRisco & { score: number; level: "baixo" | "medio" | "alto" | "critico" }>;
  riskScore: number;
  qualityScore: number;
  decisionScore: number;
  blocks: string[];
  warnings: string[];
}

const finite = (value: number | undefined, fallback = 0) =>
  Number.isFinite(value) ? Number(value) : fallback;
const nonNegative = (value: number | undefined, fallback = 0) =>
  Math.max(0, finite(value, fallback));
const positive = (value: number | undefined, fallback = 1) =>
  Math.max(0.0001, finite(value, fallback));
const pct = (value: number | undefined) => nonNegative(value) / 100;
const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};
const roundCommercial = (value: number) => Math.ceil(value / 100) * 100;

function taxRates(profile: PerfilTributarioEntrada) {
  const effective = pct(profile.effectiveRate);
  const iss = pct(profile.issRate);
  const issAdditional = profile.issIncludedInEffectiveRate === false ? iss : 0;
  const inss = pct(profile.inssRetentionRate);
  const irrf = pct(profile.irrfRetentionRate);
  const federal = pct(profile.csllPisCofinsRetentionRate);
  const other = pct(profile.otherRate);

  // Retenção é fluxo de caixa, não automaticamente custo. Só a parcela
  // declarada não recuperável entra no preço como carga definitiva.
  const retainedCash = (profile.issRetained ? iss : 0) + inss + irrf + federal;
  const definitiveRetention = profile.inssRecoverable === false ? inss : 0;
  const recoverableRetention = Math.max(0, retainedCash - definitiveRetention);
  return {
    burden: effective + issAdditional + other + definitiveRetention,
    retainedCash,
    definitiveRetention,
    recoverableRetention,
  };
}

function calculateComposition(
  input: ComposicaoEntrada,
  deadlineDays: number | null | undefined,
  productivityFactor = 1,
  costFactor = 1,
): ComposicaoCalculada {
  const quantity = nonNegative(input.quantity);
  const teamSize = Math.max(1, Math.ceil(nonNegative(input.teamSize, 1)));
  const hoursPerDay = positive(input.hoursPerDay, 8);
  const efficiency = Math.min(1, positive(input.efficiencyFactor, 1));
  const effectiveProductivity = positive(input.productivityPerHour) * efficiency * positive(productivityFactor);
  const setupLaborHours = nonNegative(input.setupHours) * teamSize;
  const plannedLaborHours = quantity / effectiveProductivity + setupLaborHours;

  const calendarDays = deadlineDays && deadlineDays > 0 ? deadlineDays : null;
  const workDaysPerWeek = Math.min(7, Math.max(1, Math.ceil(nonNegative(input.workDaysPerWeek, 5))));
  const availableWorkDays = calendarDays ? Math.max(1, calendarDays * workDaysPerWeek / 7) : null;
  const workersForDeadline = availableWorkDays
    ? Math.ceil(plannedLaborHours / (availableWorkDays * hoursPerDay))
    : teamSize;
  const plannedWorkers = Math.max(teamSize, workersForDeadline, 1);
  const plannedDays = plannedLaborHours / (plannedWorkers * hoursPerDay);

  const laborCost = plannedLaborHours * nonNegative(input.laborHourlyCost) * costFactor;
  const inputCost = quantity * nonNegative(input.inputUnitCost) * costFactor;
  const equipmentCost = plannedDays * nonNegative(input.equipmentDailyCost) * costFactor;
  const transportCost = nonNegative(input.transportCost) * costFactor;
  const additionalCost = nonNegative(input.additionalCost) * costFactor;
  const directCost = laborCost + inputCost + equipmentCost + transportCost + additionalCost;

  return {
    ...input,
    quantity: round(quantity, 3),
    teamSize,
    hoursPerDay,
    effectiveProductivity: round(effectiveProductivity, 4),
    plannedLaborHours: round(plannedLaborHours),
    plannedWorkers,
    plannedDays: round(plannedDays),
    laborCost: round(laborCost),
    inputCost: round(inputCost),
    equipmentCost: round(equipmentCost),
    transportCost: round(transportCost),
    additionalCost: round(additionalCost),
    directCost: round(directCost),
  };
}

function riskLevel(score: number): "baixo" | "medio" | "alto" | "critico" {
  if (score >= 20) return "critico";
  if (score >= 12) return "alto";
  if (score >= 6) return "medio";
  return "baixo";
}

function calculateScenario(
  name: CenarioCalculado["name"],
  input: DossieCalculoEntrada,
  productivityFactor: number,
  costFactor: number,
): CenarioCalculado {
  const compositions = input.compositions.map((c) =>
    calculateComposition(c, input.deadlineDays, productivityFactor, costFactor),
  );
  const direct = compositions.reduce((sum, c) => sum + c.directCost, 0);
  const mobilization = (nonNegative(input.mobilizationCost) + nonNegative(input.demobilizationCost)) * costFactor;
  const operationalBase = direct + mobilization;
  const overhead = operationalBase * pct(input.overheadRate);
  const risk = operationalBase * pct(input.riskRate);
  const paymentCycles = Math.max(1, nonNegative(input.paymentTermDays, 30) / 30);
  const capitalNeed = (operationalBase + overhead + risk) * paymentCycles;
  const capital = capitalNeed * pct(input.workingCapitalRate);
  const pricedCost = operationalBase + overhead + risk + capital;
  const taxes = taxRates(input.taxProfile).burden;
  const minDivisor = Math.max(0.01, 1 - taxes);
  const recommendedDivisor = Math.max(0.01, 1 - taxes - pct(input.marginRate));
  const minimumPrice = pricedCost / minDivisor;
  const recommendedPrice = pricedCost / recommendedDivisor;
  const commercialPrice = roundCommercial(recommendedPrice);

  return {
    name,
    productivityFactor,
    costFactor,
    laborHours: round(compositions.reduce((sum, c) => sum + c.plannedLaborHours, 0)),
    workers: compositions.reduce((max, c) => Math.max(max, c.plannedWorkers), 0),
    durationDays: round(compositions.reduce((sum, c) => sum + c.plannedDays, 0)),
    directCost: round(direct),
    minimumPrice: round(minimumPrice),
    recommendedPrice: round(recommendedPrice),
    commercialPrice: round(commercialPrice),
    marginValue: round(recommendedPrice - minimumPrice),
  };
}

export function calcularDossieOperacional(input: DossieCalculoEntrada): ResultadoDossie {
  const blocks: string[] = [];
  const warnings: string[] = [];
  if (!input.validated) blocks.push("Os dados extraídos ainda precisam de validação humana.");
  if (!input.compositions.length) blocks.push("Inclua ao menos uma composição de serviço.");

  const invalidCompositions = input.compositions.filter(
    (c) => !c.activity?.trim()
      || !Number.isFinite(c.quantity) || c.quantity <= 0
      || !Number.isFinite(c.productivityPerHour) || c.productivityPerHour <= 0
      || !Number.isFinite(c.laborHourlyCost) || c.laborHourlyCost < 0
      || (c.efficiencyFactor != null && (!Number.isFinite(c.efficiencyFactor) || c.efficiencyFactor <= 0 || c.efficiencyFactor > 1)),
  );
  if (invalidCompositions.length) blocks.push(`${invalidCompositions.length} composição(ões) têm quantidade, produtividade ou custo inválido.`);
  if (input.marginRate < 0 || input.marginRate >= 80) blocks.push("A margem deve estar entre 0% e 80%.");

  const rates = taxRates(input.taxProfile);
  const totalPriceRates = rates.burden + pct(input.marginRate);
  if (totalPriceRates >= 0.99) blocks.push("Impostos e margem deixam o divisor do preço igual ou inferior a 1%.");
  if (input.taxProfile.issRetained && !input.taxProfile.issRate) warnings.push("ISS marcado como retido, mas sem alíquota informada.");
  if (rates.recoverableRetention > 0) warnings.push("Retenções recuperáveis afetam caixa, mas não foram somadas novamente ao preço.");
  if (!input.deadlineDays) warnings.push("Sem prazo definido, a equipe mínima foi usada para dimensionar a duração.");

  const base = calculateScenario("base", input, 1, 1);
  const compositions = input.compositions.map((c) => calculateComposition(c, input.deadlineDays));
  const laborCost = compositions.reduce((sum, c) => sum + c.laborCost, 0);
  const inputCost = compositions.reduce((sum, c) => sum + c.inputCost, 0);
  const equipmentCost = compositions.reduce((sum, c) => sum + c.equipmentCost, 0);
  const transportAndAdditionalCost = compositions.reduce(
    (sum, c) => sum + nonNegative(c.transportCost) + nonNegative(c.additionalCost),
    0,
  );
  const mobilizationCost = nonNegative(input.mobilizationCost);
  const demobilizationCost = nonNegative(input.demobilizationCost);
  const operationalBase = base.directCost + mobilizationCost + demobilizationCost;
  const overheadCost = operationalBase * pct(input.overheadRate);
  const riskCost = operationalBase * pct(input.riskRate);
  const workingCapitalNeed = (operationalBase + overheadCost + riskCost) * Math.max(1, nonNegative(input.paymentTermDays, 30) / 30);
  const workingCapitalCost = workingCapitalNeed * pct(input.workingCapitalRate);

  const risks = (input.risks ?? []).map((item) => {
    const probabilidade = Math.max(1, Math.min(5, Math.round(finite(Number(item.probabilidade), 1)))) as NivelRisco;
    const impacto = Math.max(1, Math.min(5, Math.round(finite(Number(item.impacto), 1)))) as NivelRisco;
    const score = probabilidade * impacto;
    return { ...item, probabilidade, impacto, score, level: riskLevel(score) };
  });
  const riskScore = risks.length
    ? round((risks.reduce((sum, item) => sum + item.score, 0) / (risks.length * 25)) * 100)
    : 0;

  const evidenceCoverage = Math.max(0, Math.min(100, finite(input.evidenceCoverage, 0)));
  const completeness = input.compositions.length > 0 && !invalidCompositions.length ? 100 : input.compositions.length ? 50 : 0;
  const qualityScore = Math.round(evidenceCoverage * 0.45 + completeness * 0.35 + (input.validated ? 20 : 0));
  const decisionScore = Math.max(0, Math.min(100, Math.round(qualityScore * 0.7 + (100 - riskScore) * 0.3)));

  if (riskScore >= 60) warnings.push("A matriz de riscos está em nível elevado; valide contingências e margem.");
  if (qualityScore < 70) warnings.push("A qualidade do dossiê está abaixo de 70%; complemente evidências antes da aprovação.");
  if (base.directCost <= 0) blocks.push("O custo direto precisa ser maior que zero.");

  return {
    compositions,
    totals: {
      laborHours: base.laborHours,
      workers: base.workers,
      durationDays: base.durationDays,
      laborCost: round(laborCost),
      inputCost: round(inputCost),
      equipmentCost: round(equipmentCost),
      transportAndAdditionalCost: round(transportAndAdditionalCost),
      directCost: base.directCost,
      mobilizationCost: round(mobilizationCost),
      demobilizationCost: round(demobilizationCost),
      overheadCost: round(overheadCost),
      riskCost: round(riskCost),
      workingCapitalNeed: round(workingCapitalNeed),
      workingCapitalCost: round(workingCapitalCost),
      taxBurdenRate: round(rates.burden * 100, 4),
      retainedCashRate: round(rates.retainedCash * 100, 4),
      recoverableRetentionRate: round(rates.recoverableRetention * 100, 4),
      definitiveRetentionRate: round(rates.definitiveRetention * 100, 4),
      minimumPrice: base.minimumPrice,
      recommendedPrice: base.recommendedPrice,
      commercialPrice: base.commercialPrice,
      discountLimit: round(Math.max(0, base.commercialPrice - base.minimumPrice)),
    },
    scenarios: [
      calculateScenario("otimista", input, 1.1, 0.95),
      base,
      calculateScenario("adverso", input, 0.8, 1.15),
    ],
    risks,
    riskScore,
    qualityScore,
    decisionScore,
    blocks,
    warnings,
  };
}
