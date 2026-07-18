import { describe, it, expect } from "vitest";
import {
  calcINSS,
  tabelaIRRF,
  calcIRRF,
  calcAdicionais,
  linhaFolha,
  totaisDe,
  salarioMinimo,
  PROVISOES_TOTAL_PCT,
} from "./folha";
import { TABELAS, tabelaVigente, inssPatronalPct } from "./tabelas-fiscais";

describe("Tabelas fiscais — governança por ano", () => {
  it("o ano corrente tem tabela cadastrada (senão a folha usa ano defasado)", () => {
    const anoCorrente = new Date().getFullYear();
    expect(TABELAS[anoCorrente], `Cadastre a tabela de ${anoCorrente} em src/lib/tabelas-fiscais.ts`).toBeDefined();
    expect(tabelaVigente(anoCorrente).defasada).toBe(false);
  });

  it("a 1ª faixa do INSS é sempre igual ao salário mínimo do ano", () => {
    for (const t of Object.values(TABELAS)) {
      expect(t.faixasINSS[0].ate).toBeCloseTo(t.salarioMinimo, 2);
    }
  });

  it("ano sem tabela cai para o último disponível e sinaliza defasada", () => {
    const t = tabelaVigente(2099);
    expect(t.defasada).toBe(true);
  });
});

describe("INSS — tabela progressiva (por faixas, cumulativa)", () => {
  it("2024: valores históricos conferem (regressão)", () => {
    expect(calcINSS(1412.0, 2024)).toBeCloseTo(105.9, 2);
    expect(calcINSS(2500, 2024)).toBeCloseTo(203.82, 2); // 1412×7,5% + 1088×9%
    expect(calcINSS(7786.02, 2024)).toBeCloseTo(908.85, 1); // teto 2024
  });

  it("2025: 1ª faixa acompanha o mínimo de R$1.518", () => {
    expect(calcINSS(1518.0, 2025)).toBeCloseTo(113.85, 2); // 1518 × 7,5%
    // 1518×7,5% + (2500−1518)×9% = 113,85 + 88,38 = 202,23
    expect(calcINSS(2500, 2025)).toBeCloseTo(202.23, 2);
  });

  it("2025: teto de contribuição ≈ R$951,63", () => {
    expect(calcINSS(8157.41, 2025)).toBeCloseTo(951.62, 1);
  });

  it("NÃO tributa o salário inteiro pela alíquota da faixa (regressão do bug flat)", () => {
    expect(calcINSS(2500, 2025)).not.toBeCloseTo(225.0, 2);
  });

  it("acima do teto trava no desconto máximo (não cresce)", () => {
    expect(calcINSS(20000, 2025)).toBeCloseTo(calcINSS(8157.41, 2025), 2);
    expect(calcINSS(20000, 2026)).toBeCloseTo(calcINSS(8157.41, 2026), 2);
  });
});

describe("IRRF — tabela progressiva por ano", () => {
  it("2024: faixas históricas conferem (regressão)", () => {
    expect(tabelaIRRF(2259.2, 2024)).toBe(0);
    expect(tabelaIRRF(2500, 2024)).toBeCloseTo(18.06, 2);
    expect(tabelaIRRF(5000, 2024)).toBeCloseTo(479.0, 2);
  });

  it("2025: isenção sobe para R$2.428,80", () => {
    expect(tabelaIRRF(2428.8, 2025)).toBe(0);
    expect(tabelaIRRF(2500, 2025)).toBeCloseTo(2500 * 0.075 - 182.16, 2);
  });

  it("nunca retorna imposto negativo", () => {
    expect(tabelaIRRF(0, 2025)).toBe(0);
  });
});

describe("IRRF 2026 — Lei 15.270/2025 (isenção até R$5.000)", () => {
  it("bruto até R$5.000/mês fica isento", () => {
    const inss = calcINSS(5000, 2026);
    expect(calcIRRF(5000, inss, 0, 2026)).toBe(0);
    expect(calcIRRF(3500, calcINSS(3500, 2026), 0, 2026)).toBe(0);
  });

  it("entre R$5.000 e R$7.350 o imposto é reduzido (menor que a tabela cheia)", () => {
    const bruto = 6000;
    const inss = calcINSS(bruto, 2026);
    const de2026 = calcIRRF(bruto, inss, 0, 2026);
    const de2025 = calcIRRF(bruto, calcINSS(bruto, 2025), 0, 2025);
    expect(de2026).toBeGreaterThan(0);
    expect(de2026).toBeLessThan(de2025);
  });

  it("acima de R$7.350 não há redução (tabela cheia)", () => {
    const bruto = 9000;
    const inss = calcINSS(bruto, 2026);
    const t = tabelaVigente(2026);
    const baseSimplificada = bruto - t.irrf.descontoSimplificado;
    const baseLegal = bruto - inss;
    const esperado = Math.min(tabelaIRRF(baseLegal, 2026), tabelaIRRF(baseSimplificada, 2026));
    expect(calcIRRF(bruto, inss, 0, 2026)).toBeCloseTo(esperado, 2);
  });

  it("a transição é contínua (sem degrau no limite da isenção)", () => {
    const antes = calcIRRF(5000, calcINSS(5000, 2026), 0, 2026);
    const depois = calcIRRF(5001, calcINSS(5001, 2026), 0, 2026);
    expect(depois - antes).toBeLessThan(1); // sem salto de imposto por R$1 de salário
  });
});

describe("IRRF — escolha do menor imposto (legal x simplificado)", () => {
  it("com muitos dependentes, o modelo legal vence o simplificado (2024)", () => {
    const inss = calcINSS(5000, 2024);
    expect(calcIRRF(5000, inss, 3, 2024)).toBeCloseTo(217.52, 2);
  });

  it("mais dependentes nunca aumentam o IRRF", () => {
    const inss = calcINSS(9000, 2026);
    const semDep = calcIRRF(9000, inss, 0, 2026);
    const comDep = calcIRRF(9000, inss, 4, 2026);
    expect(comDep).toBeLessThanOrEqual(semDep);
  });
});

describe("INSS patronal — por anexo do Simples", () => {
  it("Anexo IV (limpeza/conservação): CPP 20% + RAT×FAP fora do DAS", () => {
    expect(inssPatronalPct("IV")).toBeCloseTo(23, 2); // 20 + 3×1
    expect(inssPatronalPct("IV", 3, 0.5)).toBeCloseTo(21.5, 2);
  });

  it("Anexos III e V: CPP dentro do DAS — nada à parte", () => {
    expect(inssPatronalPct("III")).toBe(0);
    expect(inssPatronalPct("V")).toBe(0);
  });
});

describe("Adicionais — insalubridade x periculosidade (não cumuláveis)", () => {
  it("insalubridade = grau% sobre o salário mínimo do ano", () => {
    expect(calcAdicionais(2000, 20, false, 2025)).toBeCloseTo(0.2 * salarioMinimo(2025), 2); // 303,60
    expect(calcAdicionais(2000, 20, false, 2026)).toBeCloseTo(0.2 * salarioMinimo(2026), 2);
  });

  it("periculosidade = 30% sobre o salário base", () => {
    expect(calcAdicionais(3000, 0, true)).toBeCloseTo(900.0, 2);
  });

  it("quando ambos incidem, aplica só o mais vantajoso (o maior)", () => {
    expect(calcAdicionais(3000, 40, true, 2025)).toBeCloseTo(900.0, 2); // peric 900 > insal 607,20
  });

  it("sem adicionais retorna zero", () => {
    expect(calcAdicionais(3000, 0, false)).toBe(0);
  });
});

describe("linhaFolha — integração de um funcionário", () => {
  it("salário R$2.500 (tabela 2025, Anexo IV): INSS/patronal/custos coerentes", () => {
    const l = linhaFolha({ salary: 2500 }, undefined, { ano: 2025 });
    expect(l.salarioBruto).toBeCloseTo(2500, 2);
    expect(l.inss).toBeCloseTo(202.23, 2);
    expect(l.fgts).toBeCloseTo(200.0, 2); // 8%
    expect(l.inssPatronal).toBeCloseTo(2500 * 0.23, 2); // Anexo IV: 20% + RAT 3%
    expect(l.custoTotal).toBeCloseTo(2500 + 200 + 575, 2);
    expect(l.provisoes).toBeCloseTo(2500 * PROVISOES_TOTAL_PCT / 100, 2);
    expect(l.custoPleno).toBeCloseTo(l.custoTotal + l.provisoes, 2);
  });

  it("Anexo III zera o patronal destacado (CPP dentro do DAS)", () => {
    const l = linhaFolha({ salary: 2500 }, undefined, { ano: 2025, anexoSimples: "III" });
    expect(l.inssPatronal).toBe(0);
    expect(l.custoTotal).toBeCloseTo(2500 + 200, 2);
  });

  it("horas extras 50% entram no bruto", () => {
    const l = linhaFolha({ salary: 2200 }, { he50: 10 }, { ano: 2025 });
    expect(l.horasExtras).toBeCloseTo(150.0, 2); // valor-hora 10 × 1,5 × 10
    expect(l.salarioBruto).toBeCloseTo(2350.0, 2);
  });

  it("horas extras 100% valem o dobro do valor-hora", () => {
    const l = linhaFolha({ salary: 2200 }, { he100: 10 }, { ano: 2025 });
    expect(l.horasExtras).toBeCloseTo(200.0, 2);
  });

  it("periculosidade eleva o bruto e, portanto, a base de INSS/FGTS", () => {
    const semP = linhaFolha({ salary: 3000 }, undefined, { ano: 2025 });
    const comP = linhaFolha({ salary: 3000, periculosidade: true }, undefined, { ano: 2025 });
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
    expect(t.custoPleno).toBeCloseTo(folha[0].custoPleno + folha[1].custoPleno, 2);
  });

  it("folha vazia zera os totais", () => {
    expect(totaisDe([])).toEqual({
      bruto: 0, inss: 0, irrf: 0, liquido: 0, fgts: 0, inssPatronal: 0,
      custoTotal: 0, provisoes: 0, custoPleno: 0,
    });
  });
});
