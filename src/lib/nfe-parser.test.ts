import { describe, it, expect } from "vitest";
import { parseNFe } from "./nfe-parser";

// Smoke test do parser após a atualização do fast-xml-parser v4 → v5
// (correção de vulnerabilidade crítica). Garante que a estrutura NF-e
// continua sendo lida: chave, emitente, itens (isArray) e totais.
const XML_MINIMO = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe31260730198776000129550010000012341000012349" versao="4.00">
      <ide><nNF>1234</nNF><serie>1</serie><dhEmi>2026-07-01T10:00:00-03:00</dhEmi><natOp>VENDA</natOp><tpNF>1</tpNF></ide>
      <emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Teste LTDA</xNome></emit>
      <dest><xNome>VERDELIMP SERVICOS</xNome></dest>
      <det nItem="1">
        <prod><cProd>P1</cProd><xProd>Oleo 2T</xProd><NCM>27101932</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>10</qCom><vUnCom>25.50</vUnCom><vProd>255.00</vProd></prod>
      </det>
      <total><ICMSTot><vProd>255.00</vProd><vNF>255.00</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>`;

describe("parseNFe — compatibilidade com fast-xml-parser v5", () => {
  it("lê chave de acesso, emitente, itens e totais", () => {
    const r = parseNFe(XML_MINIMO);
    expect(r.valido).toBe(true);
    expect(r.chaveAcesso).toHaveLength(44);
    expect(r.emitente.razaoSocial).toBe("Fornecedor Teste LTDA");
    expect(r.itens).toHaveLength(1); // <det> vira array mesmo com 1 item
    expect(r.itens[0].descricao ?? (r.itens[0] as any).xProd ?? "").toBeTruthy();
    expect(r.totais.vNF).toBeCloseTo(255.0, 2);
  });

  it("XML inválido não lança — retorna valido:false com erros", () => {
    const r = parseNFe("<html>não é NF-e</html>");
    expect(r.valido).toBe(false);
    expect(r.erros.length).toBeGreaterThan(0);
  });
});
