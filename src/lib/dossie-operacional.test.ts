import { describe, expect, it } from "vitest";
import { calcularDossieOperacional, type DossieCalculoEntrada } from "./dossie-operacional";

const base: DossieCalculoEntrada = {
  validated: true,
  deadlineDays: 10,
  paymentTermDays: 30,
  overheadRate: 10,
  riskRate: 5,
  marginRate: 20,
  workingCapitalRate: 2,
  mobilizationCost: 1000,
  demobilizationCost: 500,
  evidenceCoverage: 100,
  taxProfile: { effectiveRate: 8, issRate: 5, issIncludedInEffectiveRate: true },
  compositions: [{
    code: "1.1", activity: "Roçada", quantity: 8000, unit: "m²",
    productivityPerHour: 100, teamSize: 2, hoursPerDay: 8, workDaysPerWeek: 5,
    efficiencyFactor: 0.8, setupHours: 2, laborHourlyCost: 25,
    inputUnitCost: 0.1, equipmentDailyCost: 120, transportCost: 400,
  }],
};

describe("Dossiê Operacional", () => {
  it("dimensiona HH, trabalhadores e duração a partir da produtividade", () => {
    const result = calcularDossieOperacional(base);
    expect(result.totals.laborHours).toBe(104);
    expect(result.totals.workers).toBe(2);
    expect(result.totals.durationDays).toBe(6.5);
  });

  it("mantém impostos por dentro e preço mínimo abaixo do recomendado", () => {
    const result = calcularDossieOperacional(base);
    expect(result.totals.minimumPrice).toBeGreaterThan(result.totals.directCost);
    expect(result.totals.recommendedPrice).toBeGreaterThan(result.totals.minimumPrice);
    expect(result.totals.commercialPrice).toBeGreaterThanOrEqual(result.totals.recommendedPrice);
  });

  it("não duplica ISS já incluído na alíquota efetiva", () => {
    const included = calcularDossieOperacional(base);
    const additional = calcularDossieOperacional({
      ...base,
      taxProfile: { ...base.taxProfile, issIncludedInEffectiveRate: false },
    });
    expect(included.totals.taxBurdenRate).toBe(8);
    expect(additional.totals.taxBurdenRate).toBe(13);
  });

  it("separa retenção recuperável de carga tributária", () => {
    const result = calcularDossieOperacional({
      ...base,
      taxProfile: { ...base.taxProfile, inssRetentionRate: 11, inssRecoverable: true },
    });
    expect(result.totals.taxBurdenRate).toBe(8);
    expect(result.totals.recoverableRetentionRate).toBe(11);
  });

  it("inclui retenção de INSS não recuperável no preço", () => {
    const result = calcularDossieOperacional({
      ...base,
      taxProfile: { ...base.taxProfile, inssRetentionRate: 11, inssRecoverable: false },
    });
    expect(result.totals.taxBurdenRate).toBe(19);
  });

  it("produz cenários ordenados por pressão de custo", () => {
    const result = calcularDossieOperacional(base);
    const [optimistic, normal, adverse] = result.scenarios;
    expect(optimistic.recommendedPrice).toBeLessThan(normal.recommendedPrice);
    expect(adverse.recommendedPrice).toBeGreaterThan(normal.recommendedPrice);
  });

  it("aumenta o custo de capital quando o prazo de recebimento cresce", () => {
    const thirtyDays = calcularDossieOperacional(base);
    const sixtyDays = calcularDossieOperacional({ ...base, paymentTermDays: 60 });
    expect(sixtyDays.totals.workingCapitalNeed).toBeGreaterThan(thirtyDays.totals.workingCapitalNeed);
    expect(sixtyDays.totals.workingCapitalCost).toBeGreaterThan(thirtyDays.totals.workingCapitalCost);
    expect(sixtyDays.totals.recommendedPrice).toBeGreaterThan(thirtyDays.totals.recommendedPrice);
  });

  it("normaliza riscos malformados sem produzir NaN", () => {
    const result = calcularDossieOperacional({
      ...base,
      risks: [{ categoria: "escopo", descricao: "Incerteza", probabilidade: Number.NaN as any, impacto: 99 as any }],
    });
    expect(result.risks[0]).toMatchObject({ probabilidade: 1, impacto: 5, score: 5 });
    expect(Number.isFinite(result.riskScore)).toBe(true);
    expect(Number.isFinite(result.decisionScore)).toBe(true);
  });

  it("bloqueia aprovação sem validação humana", () => {
    const result = calcularDossieOperacional({ ...base, validated: false });
    expect(result.blocks.some((block) => block.includes("validação humana"))).toBe(true);
  });
});
