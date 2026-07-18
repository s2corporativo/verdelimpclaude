import { describe, it, expect } from "vitest";
import { competenciasAnteriores, dataLocal } from "./fiscal-calc";

describe("competenciasAnteriores — base do RBT12", () => {
  it("retorna as 12 competências anteriores, sem incluir a atual", () => {
    const lista = competenciasAnteriores("2026-07");
    expect(lista).toHaveLength(12);
    expect(lista[0]).toBe("2026-06");
    expect(lista[11]).toBe("2025-07");
    expect(lista).not.toContain("2026-07");
  });

  it("atravessa a virada de ano corretamente", () => {
    const lista = competenciasAnteriores("2026-01", 3);
    expect(lista).toEqual(["2025-12", "2025-11", "2025-10"]);
  });
});

describe("dataLocal — datas sem regressão de fuso", () => {
  it("cria a data no dia certo em qualquer fuso (meio-dia local)", () => {
    const d = dataLocal("2026-08-20");
    expect(d.getDate()).toBe(20);
    expect(d.getMonth()).toBe(7); // agosto
    expect(d.getFullYear()).toBe(2026);
  });

  it("new Date('YYYY-MM-DD') nativo regride um dia em UTC-3 — dataLocal não", () => {
    // O construtor nativo interpreta meia-noite UTC; em Brasília vira o dia anterior.
    const nativa = new Date("2026-08-20");
    const local = dataLocal("2026-08-20");
    expect(local.getDate()).toBe(20);
    // A nativa, exibida no fuso local negativo, mostraria 19 — este teste
    // documenta o porquê de dataLocal existir (não depende do fuso do runner).
    expect(local.getTime()).not.toBe(nativa.getTime());
  });
});
