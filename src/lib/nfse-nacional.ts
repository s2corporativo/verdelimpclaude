/**
 * Verdelimp ERP — Integração NFS-e Nacional (Padrão Nacional / gov.br)
 *
 * Betim/MG aderiu ao Emissor Nacional (Decreto municipal 51.670/2025) e, desde
 * 01/01/2026, a NFS-e é emitida exclusivamente pelo Portal Nacional. Este módulo
 * monta a DPS (Declaração de Prestação de Serviço) no leiaute nacional para
 * envio à API do Contribuinte (Sefin Nacional).
 *
 * ⚠️ IMPORTANTE — o que este arquivo FAZ e o que NÃO faz:
 *   - FAZ: monta o XML da DPS a partir dos dados reais (contrato/medição,
 *     prestador, tomador, serviço, valores) e oferece pré-visualização.
 *   - NÃO faz sozinho: a ASSINATURA DIGITAL (XML-DSig com o certificado
 *     e-CNPJ ICP-Brasil) e o ENVIO mTLS só ocorrem quando o certificado
 *     estiver provisionado como SEGREDO no servidor (nunca no repositório).
 *
 * A emissão oficial exige: certificado e-CNPJ A1, testes em Produção Restrita
 * (homologação) e validação dos códigos de serviço/tributação pelo contador.
 * Referências: leiaute NT 004 v2.0; Manual do Contribuinte – Emissor Público
 * API (gov.br/nfse); grupo IBS/CBS da LC 214/2025.
 */

export type Ambiente = "restrita" | "producao";

/** Endpoints oficiais da API do Contribuinte (Sefin Nacional). */
export const ENDPOINTS: Record<Ambiente, { sefin: string; adn: string; label: string }> = {
  restrita: {
    sefin: "https://sefin.producaorestrita.nfse.gov.br",
    adn: "https://adn.producaorestrita.nfse.gov.br",
    label: "Produção Restrita (homologação/testes)",
  },
  producao: {
    sefin: "https://sefin.nfse.gov.br",
    adn: "https://adn.nfse.gov.br",
    label: "Produção (validade jurídica)",
  },
};

/**
 * Portal Nacional NFS-e (gov.br). A Verdelimp emite a nota diretamente no
 * Emissor Nacional (login gov.br ou certificado) e depois registra no ERP a
 * nota emitida (número + chave de acesso + link do PDF). Não transmitimos por
 * API — evita a complexidade de assinatura/mTLS e o risco de nota inválida.
 */
export const PORTAL_NACIONAL = {
  /** Emissor Nacional: onde a nota é efetivamente emitida. */
  emissor: "https://www.nfse.gov.br/EmissorNacional",
  /** Consulta pública de NFS-e (validar a nota pela chave de acesso). */
  consulta: "https://www.nfse.gov.br/consultapublica",
  /** Painel de gestão / primeiro acesso. */
  primeiroAcesso: "https://www.nfse.gov.br/EmissorNacional/Acesso/PrimeiroAcesso",
} as const;

/** tpAmb da DPS: 1 = produção, 2 = homologação/produção restrita. */
export const tpAmbDe = (a: Ambiente): 1 | 2 => (a === "producao" ? 1 : 2);

/**
 * Códigos IBGE dos municípios (7 dígitos) usados no cLocEmi/cLocPrestacao.
 * Betim já incluído; acrescente os municípios onde a Verdelimp presta serviço.
 * Onde o código faltar, a tela de prontidão avisa para completar.
 */
export const MUNICIPIOS_IBGE: Record<string, string> = {
  BETIM: "3106705",
  "BELO HORIZONTE": "3106200",
  CONTAGEM: "3118601",
  IBIRITE: "3129806",
  "SAO JOAQUIM DE BICAS": "3162252",
  IGARAPE: "3129905",
  ESMERALDAS: "3124302",
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

export function ibgeDoMunicipio(municipio?: string | null): string | null {
  if (!municipio) return null;
  return MUNICIPIOS_IBGE[semAcento(municipio)] || null;
}

/**
 * Sugere o enquadramento do serviço (item da LC 116/2003) a partir do objeto
 * do contrato. É apenas um ponto de partida — o código de tributação nacional
 * (cTribNac) DEFINITIVO deve ser confirmado pelo contador.
 */
export function sugerirServico(objeto: string): { itemLC116: string; descricao: string } {
  const o = semAcento(objeto || "");
  if (/(ROCAD|ROCAG|CAPINA|JARDIN|PODA|PAISAG|AREA VERDE|GRAMA)/.test(o))
    return { itemLC116: "7.11", descricao: "Decoração e jardinagem, inclusive corte e poda de árvores (roçada/capina/jardinagem)." };
  if (/(LIMPEZA|CONSERVAC|HIGIENIZ|ASSEIO)/.test(o))
    return { itemLC116: "7.10", descricao: "Limpeza, manutenção e conservação de vias, logradouros, imóveis e afins." };
  if (/(VIGIL|SEGURANC|PORTAR)/.test(o))
    return { itemLC116: "11.02", descricao: "Vigilância, segurança ou monitoramento de bens e pessoas." };
  return { itemLC116: "7.10", descricao: "Serviços de conservação e manutenção (confirmar item com o contador)." };
}

export interface DadosPrestador {
  cnpj: string;
  inscMunicipal?: string | null;
  municipio?: string | null;      // nome; converte-se para IBGE
  cLocEmi?: string | null;        // código IBGE (7); tem prioridade sobre municipio
  optanteSimples?: boolean;
}

export interface DadosTomador {
  cnpjCpf?: string | null;
  nome: string;
  municipio?: string | null;
  uf?: string | null;
  logradouro?: string | null;
  cep?: string | null;
}

export interface DadosServico {
  cLocPrestacao?: string | null;  // IBGE onde o serviço é prestado
  cTribNac?: string | null;       // código de tributação nacional (contador)
  itemLC116?: string | null;      // fallback informativo
  descricao: string;
  valorServico: number;
  aliqISS: number;                // %
  issRetido?: boolean;
}

export interface EntradaDPS {
  ambiente: Ambiente;
  serie: string;
  numero: number;
  competencia: string;            // "YYYY-MM"
  dhEmissao: string;              // ISO 8601 com fuso
  prestador: DadosPrestador;
  tomador: DadosTomador;
  servico: DadosServico;
  verAplic?: string;
}

const xml = (s: string | number | null | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const soDigitos = (s: string | null | undefined) => String(s ?? "").replace(/\D/g, "");
const money = (v: number) => (Math.round(v * 100) / 100).toFixed(2);

/** Id da DPS: "DPS" + cLocEmi(7) + tpInsc(1) + inscr(14) + serie(5) + nDPS(15). */
export function montarIdDPS(cLocEmi: string, cnpj: string, serie: string, numero: number): string {
  const insc = soDigitos(cnpj).padStart(14, "0");
  const s = (serie || "").replace(/\D/g, "").padStart(5, "0").slice(-5);
  const n = String(numero).padStart(15, "0");
  return `DPS${cLocEmi}2${insc}${s}${n}`;
}

export interface DPSMontada { id: string; xml: string; avisos: string[] }

/**
 * Monta o XML da DPS (não assinado) no leiaute nacional. Campos essenciais do
 * grupo infDPS/prest/toma/serv/valores. A assinatura e o envelope IBS/CBS são
 * aplicados na etapa de assinatura/envio (com o certificado).
 */
export function montarDPS(e: EntradaDPS): DPSMontada {
  const avisos: string[] = [];
  const cLocEmi = e.prestador.cLocEmi || ibgeDoMunicipio(e.prestador.municipio) || "";
  if (!cLocEmi) avisos.push("Código IBGE do município do prestador não encontrado — configure em MUNICIPIOS_IBGE ou informe o cLocEmi.");
  const cLocPrest = e.servico.cLocPrestacao || cLocEmi;
  if (!e.servico.cTribNac) avisos.push("Código de tributação nacional (cTribNac) não informado — confirme com o contador antes de emitir.");
  if (!e.prestador.inscMunicipal) avisos.push("Inscrição municipal do prestador não configurada.");

  const cnpjPrest = soDigitos(e.prestador.cnpj);
  const id = montarIdDPS(cLocEmi || "0000000", cnpjPrest, e.serie, e.numero);
  const dComp = `${e.competencia}-01`;
  const regTrib = e.prestador.optanteSimples ? 1 : 3; // 1 = Simples Nacional
  const tomaDoc = soDigitos(e.tomador.cnpjCpf);
  const tomaTag = tomaDoc.length === 14 ? `<CNPJ>${tomaDoc}</CNPJ>` : tomaDoc.length === 11 ? `<CPF>${tomaDoc}</CPF>` : "";

  const body =
`<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infDPS Id="${id}">
    <tpAmb>${tpAmbDe(e.ambiente)}</tpAmb>
    <dhEmi>${xml(e.dhEmissao)}</dhEmi>
    <verAplic>${xml(e.verAplic || "VerdelimpERP-1.0")}</verAplic>
    <serie>${xml(e.serie)}</serie>
    <nDPS>${e.numero}</nDPS>
    <dCompet>${dComp}</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>${xml(cLocEmi)}</cLocEmi>
    <prest>
      <CNPJ>${cnpjPrest}</CNPJ>
      ${e.prestador.inscMunicipal ? `<IM>${xml(soDigitos(e.prestador.inscMunicipal))}</IM>` : ""}
      <regTrib><opSimpNac>${regTrib === 1 ? 1 : 3}</opSimpNac></regTrib>
    </prest>
    <toma>
      ${tomaTag}
      <xNome>${xml(e.tomador.nome)}</xNome>
      <end>
        ${e.tomador.logradouro ? `<xLgr>${xml(e.tomador.logradouro)}</xLgr>` : ""}
        ${e.tomador.cep ? `<CEP>${xml(soDigitos(e.tomador.cep))}</CEP>` : ""}
        ${e.tomador.uf ? `<UF>${xml(e.tomador.uf)}</UF>` : ""}
      </end>
    </toma>
    <serv>
      <locPrest><cLocPrestacao>${xml(cLocPrest)}</cLocPrestacao></locPrest>
      <cServ>
        ${e.servico.cTribNac ? `<cTribNac>${xml(e.servico.cTribNac)}</cTribNac>` : ""}
        <xDescServ>${xml(e.servico.descricao)}</xDescServ>
      </cServ>
    </serv>
    <valores>
      <vServPrest><vServ>${money(e.servico.valorServico)}</vServ></vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>
          <pAliq>${money(e.servico.aliqISS)}</pAliq>
          ${e.servico.issRetido ? `<tpRetISSQN>1</tpRetISSQN>` : ""}
        </tribMun>
      </trib>
    </valores>
  </infDPS>
</DPS>`;

  return { id, xml: body, avisos };
}

/** Situação do certificado/ambiente lida de variáveis de ambiente (segredos). */
export function statusCertificado(): { configurado: boolean; ambiente: Ambiente; detalhe: string } {
  const temCert = !!(process.env.NFSE_CERT_BASE64 || process.env.NFSE_CERT_PATH);
  const temSenha = !!process.env.NFSE_CERT_SENHA;
  const ambiente = (process.env.NFSE_AMBIENTE as Ambiente) === "producao" ? "producao" : "restrita";
  const configurado = temCert && temSenha;
  const detalhe = configurado
    ? "Certificado e senha presentes no servidor."
    : `Faltam segredos no servidor: ${!temCert ? "NFSE_CERT_BASE64/NFSE_CERT_PATH " : ""}${!temSenha ? "NFSE_CERT_SENHA" : ""}`.trim();
  return { configurado, ambiente, detalhe };
}
