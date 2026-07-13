import { describe, it, expect } from "vitest";
import {
  calcINSS,
  tabelaIRRF,
  calcIRRF,
  calcAdicionais,
  linhaFolha,
  totaisDe,
  SALARIO_MINIMO,
} from "./folha";

describe("INSS — tabela progressiva 2026 (por faixas, cumulativa)", () => {
  it("aplica só a 1ª faixa (7,5%) abaixo do primeiro teto", () => {
    expect(calcINSS(1000)).toBeCloseTo(75.0, 2); // 1000 × 7,5%
  });

  it("no limite exato da 1ª faixa", () => {
    expect(calcINSS(1412.0)).toBeCloseTo(105.9, 2); // 1412 × 7,5%
  });

  it("soma parcelas de faixas diferentes (ex.: R$2.500)", () => {
    // 1412×7,5% + (2500−1412)×9% = 105,90 + 97,92 = 203,82
    expect(calcINSS(2500)).toBeCloseTo(203.82, 2);
  });

  it("NÃO tributa o salário inteiro pela alíquota da faixa (regressão do bug flat)", () => {
    // O modo errado (flat) daria 2500×9% = 225,00. O correto é 203,82.
    expect(calcINSS(2500)).not.toBeCloseTo(225.0, 2);
  });

  it("no teto de contribuição chega ao desconto máximo (~R$908,86)", () => {
    expect(calcINSS(7786.02)).toBeCloseTo(908.86, 2);
  });

  it("acima do teto trava no desconto máximo (não cresce)", () => {
    expect(calcINSS(10000)).toBeCloseTo(calcINSS(7786.02), 2);
  });
});

describe("IRRF — tabela progressiva 2026", () => {
  it("isento até R$2.259,20", () => {
    expect(tabelaIRRF(2000)).toBe(0);
    expect(tabelaIRRF(2259.2)).toBe(0);
  });

  it("faixa de 7,5%", () => {
    expect(tabelaIRRF(2500)).toBeCloseTo(2500 * 0.075 - 169.44, 2); // 18,06
  });

  it("faixa de 15%", () => {
    expect(tabelaIRRF(3000)).toBeCloseTo(3000 * 0.15 - 381.44, 2); // 68,56
  });

  it("faixa de 22,5%", () => {
    expect(tabelaIRRF(4000)).toBeCloseTo(4000 * 0.225 - 662.77, 2); // 237,23
  });

  it("faixa de 27,5%", () => {
    expect(tabelaIRRF(5000)).toBeCloseTo(5000 * 0.275 - 896.0, 2); // 479,00
  });

  it("nunca retorna imposto negativo", () => {
    expect(tabelaIRRF(0)).toBe(0);
  });
});

describe("IRRF — escolha do menor imposto (legal x simplificado)", () => {
  it("sem dependentes, o desconto simplificado costuma vencer", () => {
    const inss = calcINSS(3000);
    // simplificado: base 3000−564,80 = 2435,20 → 13,20; legal: base 3000−INSS → 36,15
    expect(calcIRRF(3000, inss, 0)).toBeCloseTo(13.2, 2);
  });

  it("com muitos dependentes, o modelo legal passa a vencer", () => {
    const inss = calcINSS(5000);
    // legal com 3 dependentes → 217,52; simplificado → 335,15 → escolhe 217,52
    expect(calcIRRF(5000, inss, 3)).toBeCloseTo(217.52, 2);
  });

  it("mais dependentes nunca aumentam o IRRF", () => {
    const inss = calcINSS(6000);
    const semDep = calcIRRF(6000, inss, 0);
    const comDep = calcIRRF(6000, inss, 4);
    expect(comDep).toBeLessThanOrEqual(semDep);
  });
});

describe("Adicionais — insalubridade x periculosidade (não cumuláveis)", () => {
  it("insalubridade = grau% sobre o salário mínimo", () => {
    expect(calcAdicionais(2000, 20, false)).toBeCloseTo(0.2 * SALARIO_MINIMO, 2); // 303,60
  });

  it("periculosidade = 30% sobre o salário base", () => {
    expect(calcAdicionais(3000, 0, true)).toBeCloseTo(900.0, 2);
  });

  it("quando ambos incidem, aplica só o mais vantajoso (o maior)", () => {
    // insal 40% de 1518 = 607,20 ; peric 30% de 3000 = 900 → escolhe 900
    expect(calcAdicionais(3000, 40, true)).toBeCloseTo(900.0, 2);
  });

  it("sem adicionais retorna zero", () => {
    expect(calcAdicionais(3000, 0, false)).toBe(0);
  });
});

describe("linhaFolha — integração de um funcionário", () => {
  it("salário R$2.500 sem adicionais nem horas extras", () => {
    const l = linhaFolha({ salary: 2500 });
    expect(l.salarioBruto).toBeCloseTo(2500, 2);
    expect(l.inss).toBeCloseTo(203.82, 2);
    expect(l.irrf).toBe(0); // base cai na faixa isenta após deduções
    expect(l.salarioLiquido).toBeCloseTo(2296.18, 2);
    expect(l.fgts).toBeCloseTo(200.0, 2); // 8%
    expect(l.inssPatronal).toBeCloseTo(175.0, 2); // 7%
    expect(l.custoTotal).toBeCloseTo(2875.0, 2); // bruto + FGTS + patronal
  });

  it("horas extras 50% entram no bruto", () => {
    // valor-hora = 2200/220 = 10 ; 10 HE 50% = 10×1,5×10 = 150
    const l = linhaFolha({ salary: 2200 }, { he50: 10 });
    expect(l.horasExtras).toBeCloseTo(150.0, 2);
    expect(l.salarioBruto).toBeCloseTo(2350.0, 2);
  });

  it("horas extras 100% valem o dobro do valor-hora", () => {
    // valor-hora = 10 ; 10 HE 100% = 10×2,0×10 = 200
    const l = linhaFolha({ salary: 2200 }, { he100: 10 });
    expect(l.horasExtras).toBeCloseTo(200.0, 2);
  });

  it("periculosidade eleva o bruto e, portanto, a base de INSS/FGTS", () => {
    const semP = linhaFolha({ salary: 3000 });
    const comP = linhaFolha({ salary: 3000, periculosidade: true });
    expect(comP.salarioBruto).toBeCloseTo(3900.0, 2); // 3000 + 30%
    expect(comP.inss).toBeGreaterThan(semP.inss);
    expect(comP.fgts).toBeCloseTo(3900 * 0.08, 2);
  });
});

describe("totaisDe — agregação da folha", () => {
  it("soma as colunas de todas as linhas", () => {
    const folha = [linhaFolha({ salary: 2500 }), linhaFolha({ salary: 3500 })];
    const t = totaisDe(folha);
    expect(t.bruto).toBeCloseTo(folha[0].salarioBruto + folha[1].salarioBruto, 2);
    expect(t.inss).toBeCloseTo(folha[0].inss + folha[1].inss, 2);
    expect(t.custoTotal).toBeCloseTo(folha[0].custoTotal + folha[1].custoTotal, 2);
  });

  it("folha vazia zera os totais", () => {
    expect(totaisDe([])).toEqual({ bruto: 0, inss: 0, irrf: 0, liquido: 0, fgts: 0, inssPatronal: 0, custoTotal: 0 });
  });
});
