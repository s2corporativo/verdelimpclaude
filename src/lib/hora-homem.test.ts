import { describe, it, expect } from "vitest";
import {
  custoHoraHomem,
  calcularServico,
  PARAMETROS_PADRAO,
  type CalculoServicoInput,
} from "./hora-homem";

describe("custoHoraHomem — custo real da hora produtiva", () => {
  it("soma encargos (41,44%) + benefícios e divide pelas horas produtivas", () => {
    const c = custoHoraHomem(2000, PARAMETROS_PADRAO);
    expect(c.encargosPct).toBeCloseTo(41.44, 2);            // 8+7+8,33+11,11+3+4
    expect(c.encargosValor).toBeCloseTo(828.8, 2);          // 2000×41,44%
    expect(c.beneficios).toBeCloseTo(750, 2);               // 660 + 90
    expect(c.custoMensalTotal).toBeCloseTo(3578.8, 2);
    expect(c.horasProdutivas).toBeCloseTo(165, 2);          // 220×75%
    expect(c.custoHoraPaga).toBeCloseTo(3578.8 / 220, 2);   // ~16,27
    expect(c.custoHoraProdutiva).toBeCloseTo(3578.8 / 165, 2); // ~21,69
  });

  it("a hora PRODUTIVA custa mais que a hora paga (eficiência < 100%)", () => {
    const c = custoHoraHomem(3000);
    expect(c.custoHoraProdutiva).toBeGreaterThan(c.custoHoraPaga);
  });
});

describe("calcularServico — precificação por produtividade", () => {
  const base: CalculoServicoInput = {
    quantidade: 900,          // m²
    produtividadePorHH: 90,   // roçada manual
    equipe: [{ funcao: "Op. Roçadeira", quantidade: 2, custoHoraProdutiva: 20 }],
    horasDia: 8,
    custosExtrasDia: 100,
    materiaisTotal: 50,
    bdiPct: 20,
    impostosPct: 8,
    margemPct: 20,
  };

  it("dimensiona HH, equipe, dias e custos diretos", () => {
    const r = calcularServico(base);
    expect(r.horasHomemNecessarias).toBeCloseTo(10, 5); // 900 / 90
    expect(r.pessoas).toBe(2);
    expect(r.custoHHMedio).toBeCloseTo(20, 5);
    expect(r.diasEstimados).toBe(1);                    // ceil(10 / (2×8))
    expect(r.custoMaoDeObra).toBeCloseTo(200, 2);       // 10 HH × 20
    expect(r.custoExtras).toBeCloseTo(100, 2);          // 1 dia × 100
    expect(r.custoDireto).toBeCloseTo(350, 2);          // 200 + 100 + 50
    expect(r.custoTotal).toBeCloseTo(420, 2);           // + BDI 20%
  });

  it("preço embute impostos e margem sobre o preço (não sobre o custo)", () => {
    const r = calcularServico(base);
    expect(r.precoMinimo).toBeCloseTo(420 / 0.92, 2);   // custo / (1 − 8%)
    expect(r.precoSugerido).toBeCloseTo(420 / 0.72, 2); // custo / (1 − 8% − 20%)
    expect(r.precoSugerido).toBeGreaterThan(r.precoMinimo);
  });

  it("preço/custo unitário protegidos contra quantidade zero", () => {
    const r = calcularServico({ ...base, quantidade: 0 });
    expect(r.precoUnitarioSugerido).toBe(0);
    expect(r.custoUnitario).toBe(0);
  });
});
