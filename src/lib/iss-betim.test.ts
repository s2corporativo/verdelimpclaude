import { describe, it, expect } from "vitest";
import { getAliqISS, ISS_BETIM } from "./iss-betim";

describe("ISS Betim — alíquota por item da lista de serviços", () => {
  it("jardinagem/poda (7.11) = 5%", () => {
    expect(getAliqISS("7.11")).toBe(5);
  });

  it("coleta/varrição de lixo (7.09) = 2%", () => {
    expect(getAliqISS("7.09")).toBe(2);
  });

  it("análise de sistemas (1.01) = 2%", () => {
    expect(getAliqISS("1.01")).toBe(2);
  });

  it("item desconhecido usa o padrão de 5%", () => {
    expect(getAliqISS("99.99")).toBe(5);
  });

  it("todas as alíquotas da tabela são 2% ou 5%", () => {
    for (const aliq of Object.values(ISS_BETIM)) {
      expect([2, 5]).toContain(aliq);
    }
  });
});
