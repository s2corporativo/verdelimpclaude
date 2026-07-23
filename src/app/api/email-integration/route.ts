import { NextRequest, NextResponse } from "next/server";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { imapConfigurado, listarEmails, type EmailResumo } from "@/lib/email-inbox";

export const dynamic = "force-dynamic";

const PAPEIS = ["ADMIN", "FINANCEIRO", "FISCAL", "COMERCIAL"];

export type CategoriaEmail = "cotacao" | "contabil" | "contrato" | "geral";

interface EmailComCategoria extends EmailResumo {
  categoria: CategoriaEmail;
  categoriaLabel: string;
  categoriaCor: string;
  categoriaFundo: string;
}

const CATEGORIA_KEYWORDS: Record<CategoriaEmail, string[]> = {
  cotacao: ["cotacao", "cotação", "orcamento", "orçamento", "proposta", "preco", "preço"],
  contabil: ["nf", "nota fiscal", "darf", "das", "fgts", "imposto", "tributo", "iss", "icms", "pis", "cofins", "irpj", "csll"],
  contrato: ["contrato", "aditivo", "termo", "distrato", "extensao"],
  geral: [],
};

const CATEGORIA_ESTILO: Record<CategoriaEmail, { label: string; cor: string; fundo: string }> = {
  cotacao: { label: "💰 Cotação", cor: "#15803d", fundo: "#dcfce7" },
  contabil: { label: "🧾 Documento Contábil", cor: "#b45309", fundo: "#fef3c7" },
  contrato: { label: "📋 Contrato", cor: "#3730a3", fundo: "#e0e7ff" },
  geral: { label: "📄 Documento Geral", cor: "#374151", fundo: "#f3f4f6" },
};

function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function categorizar(assunto: string): CategoriaEmail {
  const norm = normalizar(assunto);
  if (CATEGORIA_KEYWORDS.cotacao.some((k) => norm.includes(k))) return "cotacao";
  if (CATEGORIA_KEYWORDS.contabil.some((k) => norm.includes(k))) return "contabil";
  if (CATEGORIA_KEYWORDS.contrato.some((k) => norm.includes(k))) return "contrato";
  return "geral";
}

const ANEXO_EXTENSOES_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".xlsx", ".xls", ".csv", ".ods"];

function temAnexoRelevante(anexos: string[]): boolean {
  if (anexos.length === 0) return false;
  return anexos.some((a) => ANEXO_EXTENSOES_PERMITIDAS.some((ext) => a.toLowerCase().endsWith(ext)));
}

function enriquecerEmails(emails: EmailResumo[]): EmailComCategoria[] {
  return emails
    .filter((e) => temAnexoRelevante(e.anexos))
    .map((e) => {
      const categoria = categorizar(e.assunto);
      const estilo = CATEGORIA_ESTILO[categoria];
      return { ...e, categoria, categoriaLabel: estilo.label, categoriaCor: estilo.cor, categoriaFundo: estilo.fundo };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

const DEMO_EMAILS_INT: EmailComCategoria[] = [
  { uid: -101, assunto: "Cotação — fornecimento de produtos de limpeza", de: "Distribuidora Sanea <vendas@sanea.com.br>", data: "2026-07-22T10:30:00.000Z", anexos: ["cotacao_limpeza.pdf", "tabela_precos.xlsx"], categoria: "cotacao", categoriaLabel: "💰 Cotação", categoriaCor: "#15803d", categoriaFundo: "#dcfce7" },
  { uid: -102, assunto: "NF-e 000123 — nota fiscal de serviço", de: "SEFAZ-MG <noreply@fazenda.mg.gov.br>", data: "2026-07-21T14:15:00.000Z", anexos: ["nfe_000123.pdf"], categoria: "contabil", categoriaLabel: "🧾 Documento Contábil", categoriaCor: "#b45309", categoriaFundo: "#fef3c7" },
  { uid: -103, assunto: "Minuta de contrato — limpeza predial 12 meses", de: "Condomínio Horizonte <adm@horizonte.com.br>", data: "2026-07-20T09:40:00.000Z", anexos: ["minuta_contrato.pdf"], categoria: "contrato", categoriaLabel: "📋 Contrato", categoriaCor: "#3730a3", categoriaFundo: "#e0e7ff" },
  { uid: -104, assunto: "DAS referente Julho/2026", de: "Escritório Contábil Betim <contabilidade@betim.com.br>", data: "2026-07-18T16:00:00.000Z", anexos: ["das_julho.pdf"], categoria: "contabil", categoriaLabel: "🧾 Documento Contábil", categoriaCor: "#b45309", categoriaFundo: "#fef3c7" },
  { uid: -105, assunto: "Proposta de fornecimento de EPIs", de: "EPIs Brasil <comercial@epibrasil.com.br>", data: "2026-07-15T11:20:00.000Z", anexos: ["proposta_epis.pdf", "laudo_certificacao.pdf"], categoria: "cotacao", categoriaLabel: "💰 Cotação", categoriaCor: "#15803d", categoriaFundo: "#dcfce7" },
  { uid: -106, assunto: "Relatório mensal de atividades", de: "Coordenação de Obras <obras@condominio.com>", data: "2026-07-14T08:50:00.000Z", anexos: ["relatorio_julho.pdf", "fotos_atividade.jpg"], categoria: "geral", categoriaLabel: "📄 Documento Geral", categoriaCor: "#374151", categoriaFundo: "#f3f4f6" },
];

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;
  try {
    if (!(await imapConfigurado())) {
      return NextResponse.json({
        configurado: false,
        data: DEMO_EMAILS_INT,
        total: DEMO_EMAILS_INT.length,
        _demo: true,
        aviso: "IMAP não configurado — exibindo exemplos. Configure EMAIL_IMAP_HOST, EMAIL_IMAP_PORT, EMAIL_IMAP_USER e EMAIL_IMAP_PASS.",
      });
    }
    const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("dias") || 30), 1), 90);
    const emails = await listarEmails(dias);
    const enriquecidos = enriquecerEmails(emails);
    return NextResponse.json({ configurado: true, data: enriquecidos, total: enriquecidos.length, dias });
  } catch (e) {
    return erroInterno(e, "api/email-integration GET");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;
  try {
    if (!(await imapConfigurado())) {
      return NextResponse.json({
        configurado: false,
        data: DEMO_EMAILS_INT,
        total: DEMO_EMAILS_INT.length,
        _demo: true,
        aviso: "IMAP não configurado — modo demonstrativo.",
      });
    }
    const body = await req.json().catch(() => ({}));
    const dias = Math.min(Math.max(Number(body?.dias || 30), 1), 90);
    const emails = await listarEmails(dias);
    const enriquecidos = enriquecerEmails(emails);
    return NextResponse.json({ configurado: true, data: enriquecidos, total: enriquecidos.length, dias, scannedAt: new Date().toISOString() });
  } catch (e) {
    return erroInterno(e, "api/email-integration POST");
  }
}
