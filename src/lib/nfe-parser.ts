/**
 * Verdelimp ERP — Parser de XML NF-e
 * Padrão NF-e versão 4.00 (SEFAZ)
 * Extrai dados de fornecedor, produtos, impostos e totais
 */
import { XMLParser } from "fast-xml-parser";

export interface NFeItemParsed {
  nItem: number;
  cProd: string;
  xProd: string;
  NCM: string;
  CFOP: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  vProd: number;
  cEAN?: string;
  vIPI?: number;
  vICMS?: number;
  vPIS?: number;
  vCOFINS?: number;
}

export interface NFeParsed {
  chaveAcesso: string;
  numero: string;
  serie: string;
  dataEmissao: string;
  dataEntrada?: string;
  naturezaOperacao: string;
  tipoOperacao: string; // "0" = Entrada, "1" = Saída
  // Emitente
  emitente: {
    cnpj: string;
    razaoSocial: string;
    nomeFantasia?: string;
    ie?: string;
    municipio?: string;
    uf?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
  };
  // Destinatário
  destinatario: {
    cnpj?: string;
    cpf?: string;
    razaoSocial: string;
    municipio?: string;
    uf?: string;
  };
  // Itens
  itens: NFeItemParsed[];
  // Totais
  totais: {
    vProd: number;
    vFrete?: number;
    vDesc?: number;
    vIPI?: number;
    vICMS?: number;
    vPIS?: number;
    vCOFINS?: number;
    vNF: number;
  };
  // Transporte
  transportadora?: string;
  // Informações adicionais
  infAdic?: string;
  valido: boolean;
  erros: string[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "_",
  parseAttributeValue: true,
  parseTagValue: true,
  isArray: (tagName) => ["det", "dup"].includes(tagName),
});

function str(v: unknown): string {
  return String(v ?? "");
}
function num(v: unknown): number {
  return parseFloat(String(v ?? 0)) || 0;
}

export function parseNFe(xmlContent: string): NFeParsed {
  const erros: string[] = [];

  try {
    const parsed = parser.parse(xmlContent);

    // Navegar na estrutura NF-e (com ou sem nfeProc)
    const nfeProc = parsed?.nfeProc;
    const nfeRoot = nfeProc?.NFe || parsed?.NFe;
    const infNFe = nfeRoot?.infNFe;

    if (!infNFe) {
      return { valido: false, erros: ["XML inválido — estrutura infNFe não encontrada"], chaveAcesso: "", numero: "", serie: "", dataEmissao: "", naturezaOperacao: "", tipoOperacao: "", emitente: { cnpj: "", razaoSocial: "" }, destinatario: { razaoSocial: "" }, itens: [], totais: { vProd: 0, vNF: 0 } };
    }

    // Chave de acesso
    const chaveAcesso = str(infNFe?._Id || infNFe?.Id || "").replace(/^NFe/, "");
    if (!chaveAcesso || chaveAcesso.length !== 44) {
      erros.push("Chave de acesso inválida ou não encontrada");
    }

    // Ide
    const ide = infNFe?.ide || {};
    const numero = str(ide?.nNF || "");
    const serie = str(ide?.serie || "1");
    const dhEmi = str(ide?.dhEmi || ide?.dEmi || "");
    const dhEntSai = str(ide?.dhSaiEnt || ide?.dSaiEnt || "");
    const natOp = str(ide?.natOp || "");
    const tpNF = str(ide?.tpNF ?? "0");

    if (!numero) erros.push("Número da NF-e não encontrado");

    // Emitente
    const emit = infNFe?.emit || {};
    const emiEnd = emit?.enderEmit || {};
    const emitente = {
      cnpj: str(emit?.CNPJ || "").replace(/\D/g, ""),
      razaoSocial: str(emit?.xNome || ""),
      nomeFantasia: emit?.xFant ? str(emit.xFant) : undefined,
      ie: emit?.IE ? str(emit.IE) : undefined,
      municipio: emiEnd?.xMun ? str(emiEnd.xMun) : undefined,
      uf: emiEnd?.UF ? str(emiEnd.UF) : undefined,
      endereco: emiEnd?.xLgr ? `${emiEnd.xLgr}, ${emiEnd.nro || "s/n"}` : undefined,
      telefone: emit?.fone ? str(emit.fone) : undefined,
      email: emit?.email ? str(emit.email) : undefined,
    };

    if (!emitente.cnpj) erros.push("CNPJ do emitente não encontrado");
    if (!emitente.razaoSocial) erros.push("Razão social do emitente não encontrada");

    // Destinatário
    const dest = infNFe?.dest || {};
    const destEnd = dest?.enderDest || {};
    const destinatario = {
      cnpj: dest?.CNPJ ? str(dest.CNPJ).replace(/\D/g, "") : undefined,
      cpf: dest?.CPF ? str(dest.CPF).replace(/\D/g, "") : undefined,
      razaoSocial: str(dest?.xNome || ""),
      municipio: destEnd?.xMun ? str(destEnd.xMun) : undefined,
      uf: destEnd?.UF ? str(destEnd.UF) : undefined,
    };

    // Itens
    const detArray = Array.isArray(infNFe?.det) ? infNFe.det : infNFe?.det ? [infNFe.det] : [];
    const itens: NFeItemParsed[] = detArray.map((det: any, idx: number) => {
      const prod = det?.prod || {};
      const imp = det?.imposto || {};
      return {
        nItem: num(det?._nItem || det?.nItem || idx + 1),
        cProd: str(prod?.cProd || ""),
        xProd: str(prod?.xProd || ""),
        NCM: str(prod?.NCM || ""),
        CFOP: str(prod?.CFOP || ""),
        uCom: str(prod?.uCom || ""),
        qCom: num(prod?.qCom),
        vUnCom: num(prod?.vUnCom),
        vProd: num(prod?.vProd),
        cEAN: prod?.cEAN && str(prod.cEAN) !== "SEM GTIN" ? str(prod.cEAN) : undefined,
        vIPI: imp?.IPI?.IPITrib?.vIPI ? num(imp.IPI.IPITrib.vIPI) : undefined,
        vICMS: imp?.ICMS ? num(Object.values(imp.ICMS as Record<string, any>)[0]?.vICMS) : undefined,
        vPIS: imp?.PIS?.PISAliq?.vPIS ? num(imp.PIS.PISAliq.vPIS) : imp?.PIS?.PISNT ? 0 : undefined,
        vCOFINS: imp?.COFINS?.COFINSAliq?.vCOFINS ? num(imp.COFINS.COFINSAliq.vCOFINS) : imp?.COFINS?.COFINSNT ? 0 : undefined,
      };
    });

    // Totais
    const totICMS = infNFe?.total?.ICMSTot || {};
    const totais = {
      vProd: num(totICMS?.vProd),
      vFrete: totICMS?.vFrete ? num(totICMS.vFrete) : undefined,
      vDesc: totICMS?.vDesc ? num(totICMS.vDesc) : undefined,
      vIPI: totICMS?.vIPI ? num(totICMS.vIPI) : undefined,
      vICMS: totICMS?.vICMS ? num(totICMS.vICMS) : undefined,
      vPIS: totICMS?.vPIS ? num(totICMS.vPIS) : undefined,
      vCOFINS: totICMS?.vCOFINS ? num(totICMS.vCOFINS) : undefined,
      vNF: num(totICMS?.vNF || totICMS?.vTotTrib),
    };

    if (totais.vNF === 0 && totais.vProd > 0) totais.vNF = totais.vProd;

    // Informações adicionais
    const infAdic = infNFe?.infAdic?.infCpl ? str(infNFe.infAdic.infCpl) : undefined;

    // Transportadora
    const transp = infNFe?.transp?.transporta?.xNome ? str(infNFe.transp.transporta.xNome) : undefined;

    return {
      chaveAcesso,
      numero,
      serie,
      dataEmissao: dhEmi.split("T")[0] || dhEmi,
      dataEntrada: dhEntSai ? dhEntSai.split("T")[0] : undefined,
      naturezaOperacao: natOp,
      tipoOperacao: tpNF,
      emitente,
      destinatario,
      itens,
      totais,
      transportadora: transp,
      infAdic,
      valido: erros.length === 0,
      erros,
    };
  } catch (e: any) {
    return {
      valido: false,
      erros: [`Erro ao processar XML: ${e.message}`],
      chaveAcesso: "", numero: "", serie: "", dataEmissao: "", naturezaOperacao: "", tipoOperacao: "",
      emitente: { cnpj: "", razaoSocial: "" },
      destinatario: { razaoSocial: "" },
      itens: [], totais: { vProd: 0, vNF: 0 },
    };
  }
}
