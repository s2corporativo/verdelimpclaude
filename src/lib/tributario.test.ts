import { describe, it, expect } from "vitest";
import {
  aliquotaEfetivaSimples,
  fatorR,
  simularSimples,
  simularPresumido,
  folhaParaFatorR,
  TETO_SIMPLES,
} from "./tributario";

describe("Simples Nacional — alíquota efetiva por anexo/faixa", () => {
  it("1ª faixa = alíquota nominal (parcela a deduzir zero)", () => {
    expect(aliquotaEfetivaSimples(100000, "III").efetiva).toBeCloseTo(6.0, 2);
    expect(aliquotaEfetivaSimples(100000, "IV").efetiva).toBeCloseTo(4.5, 2);
    expect(aliquotaEfetivaSimples(100000, "V").efetiva).toBeCloseTo(15.5, 2);
  });

  it("2ª faixa do Anexo III desconta a parcela a deduzir", () => {
    // (300000×11,2% − 9.360) / 300000 = 8,08%
    const r = aliquotaEfetivaSimples(300000, "III");
    expect(r.efetiva).toBeCloseTo(8.08, 2);
    expect(r.faixa).toBe(2);
  });

  it("acima do teto usa a última faixa (não estoura índice)", () => {
    const r = aliquotaEfetivaSimples(5_000_000, "III");
    expect(r.faixa).toBe(6);
    // (5.000.000×33% − 648.000) / 5.000.000 = 20,04%
    expect(r.efetiva).toBeCloseTo(20.04, 2);
  });

  it("Anexo IV começa mais barato que o V na 1ª faixa", () => {
    expect(aliquotaEfetivaSimples(100000, "IV").efetiva)
      .toBeLessThan(aliquotaEfetivaSimples(100000, "V").efetiva);
  });
});

describe("Fator R", () => {
  it("folha 280k sobre receita 1M = 28%", () => {
    expect(fatorR(280000, 1_000_000)).toBeCloseTo(28, 5);
  });
  it("receita zero não divide por zero", () => {
    expect(fatorR(100000, 0)).toBe(0);
  });
});

describe("simularSimples — carga mensal", () => {
  it("Anexo III: DAS = receita × efetiva, sem INSS fora do DAS", () => {
    const s = simularSimples(50000, 100000, "III", 0);
    expect(s.dasMensal).toBeCloseTo(3000, 2); // 50.000 × 6%
    expect(s.inssForaDas).toBe(0);
    expect(s.cargaTotalPct).toBeCloseTo(6, 2);
  });

  it("Anexo IV: soma a CPP (26,8% da folha) recolhida FORA do DAS", () => {
    const s = simularSimples(50000, 100000, "IV", 20000, 26.8);
    expect(s.dasMensal).toBeCloseTo(2250, 2);      // 50.000 × 4,5%
    expect(s.inssForaDas).toBeCloseTo(5360, 2);     // 20.000 × 26,8%
    expect(s.cargaTotalMensal).toBeCloseTo(7610, 2);
    expect(s.cargaTotalPct).toBeCloseTo(15.22, 2);
  });
});

describe("simularPresumido — Lucro Presumido (serviços 32%)", () => {
  it("compõe IRPJ+CSLL+PIS+COFINS+ISS+INSS corretamente", () => {
    const p = simularPresumido(50000, 20000, 5, 26.8);
    expect(p.irpj).toBeCloseTo(2400, 2);   // 32%×50k=16k → 15%
    expect(p.adicionalIr).toBe(0);          // base 16k < 20k
    expect(p.csll).toBeCloseTo(1440, 2);    // 9% de 16k
    expect(p.pis).toBeCloseTo(325, 2);      // 0,65%
    expect(p.cofins).toBeCloseTo(1500, 2);  // 3%
    expect(p.iss).toBeCloseTo(2500, 2);     // 5%
    expect(p.inssPatronal).toBeCloseTo(5360, 2);
    expect(p.cargaTotalMensal).toBeCloseTo(13525, 2);
  });

  it("adicional de IRPJ incide só sobre a base que excede R$20k/mês", () => {
    const p = simularPresumido(100000, 0, 5, 26.8); // base 32k → excede 12k
    expect(p.adicionalIr).toBeCloseTo(1200, 2);     // 10% de 12.000
  });
});

describe("folhaParaFatorR e teto", () => {
  it("folha alvo p/ 28% sobre receita 12m", () => {
    expect(folhaParaFatorR(1_000_000)).toBeCloseTo(280000, 2);
  });
  it("teto do Simples documentado", () => {
    expect(TETO_SIMPLES).toBe(4_800_000);
  });
});
