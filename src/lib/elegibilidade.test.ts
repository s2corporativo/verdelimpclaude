import { describe, expect, it } from "vitest";
import { avaliarElegibilidadeDocumental } from "./elegibilidade";

describe("elegibilidade documental", () => {
  it("bloqueia documento faltante, vencido e sem revisão", () => {
    const result = avaliarElegibilidadeDocumental([
      { id: "1", name: "ASO", scope: "FUNCIONARIO", evidence: null },
      { id: "2", name: "NR-12", scope: "FUNCIONARIO", evidence: { exists: true, expiresAt: "2025-01-01", source: "automatico" } },
      { id: "3", name: "Ficha", scope: "FUNCIONARIO", evidence: { exists: true, status: "pendente", source: "manual" } },
    ], "Operador", new Date("2026-07-21"));
    expect(result.eligible).toBe(false);
    expect(result.missing).toEqual(["ASO"]);
    expect(result.expired).toEqual(["NR-12"]);
    expect(result.pendingReview).toEqual(["Ficha"]);
  });

  it("ignora requisito de outro papel e requisito não bloqueante", () => {
    const result = avaliarElegibilidadeDocumental([
      { id: "1", name: "CNH", scope: "FUNCIONARIO", role: "Motorista", evidence: null },
      { id: "2", name: "Opcional", scope: "FUNCIONARIO", blocking: false, evidence: null },
    ], "Jardineiro");
    expect(result.eligible).toBe(true);
  });

  it("bloqueia documento que vence antes da antecedência exigida", () => {
    const result = avaliarElegibilidadeDocumental([{
      id: "r1",
      name: "Certificado",
      scope: "FUNCIONARIO",
      blocking: true,
      requiredUntil: "2026-08-15",
      evidence: { exists: true, status: "aprovado", source: "manual", expiresAt: "2026-08-10" },
    }], "Operador", new Date("2026-07-21"));
    expect(result.expired).toEqual(["Certificado"]);
    expect(result.eligible).toBe(false);
  });
});
