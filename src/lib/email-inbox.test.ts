import { describe, it, expect } from "vitest";
import { pareceCotacaoOuContrato } from "./email-inbox";

describe("pareceCotacaoOuContrato — filtro de assunto", () => {
  it("reconhece cotação/orçamento/contrato com e sem acento, em qualquer caixa", () => {
    expect(pareceCotacaoOuContrato("Cotação de EPIs — luvas e botas")).toBe(true);
    expect(pareceCotacaoOuContrato("COTACAO 2026/07")).toBe(true);
    expect(pareceCotacaoOuContrato("Orçamento de insumos")).toBe(true);
    expect(pareceCotacaoOuContrato("Minuta de CONTRATO — limpeza predial")).toBe(true);
    expect(pareceCotacaoOuContrato("Proposta comercial Verde Limp")).toBe(true);
    expect(pareceCotacaoOuContrato("Re: pedido de compra nº 118")).toBe(true);
  });

  it("descarta assuntos sem relação com cotação/contrato", () => {
    expect(pareceCotacaoOuContrato("Feliz aniversário!")).toBe(false);
    expect(pareceCotacaoOuContrato("Newsletter semanal")).toBe(false);
    expect(pareceCotacaoOuContrato("")).toBe(false);
    expect(pareceCotacaoOuContrato(null)).toBe(false);
    expect(pareceCotacaoOuContrato(undefined)).toBe(false);
  });
});
