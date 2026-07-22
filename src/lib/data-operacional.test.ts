import { describe, expect, it } from "vitest";
import { parseDataOperacional } from "./data-operacional";

describe("data operacional", () => {
  it("preserva o dia civil de uma data de formulário no Brasil", () => {
    const date = parseDataOperacional("2026-07-21");
    expect(date?.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })).toBe("21/07/2026");
  });

  it("rejeita datas inválidas", () => {
    expect(parseDataOperacional("data-inválida")).toBeNull();
  });
});
