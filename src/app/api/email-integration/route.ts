import { NextRequest, NextResponse } from "next/server";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { imapConfigurado, listarEmails, type EmailResumo } from "@/lib/email-inbox";

export const dynamic = "force-dynamic";

const PAPEIS = ["ADMIN", "GESTOR", "FINANCEIRO", "FISCAL", "COMERCIAL"];

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
  contrato: ["contrato", "aditivo", "termo", "distrato", "extensao", "extensão"],
  geral: [],
};

const CATEGORIA_ESTILO: Record<CategoriaEmail, { label: string; cor: string; fundo: string }> = {
  cotacao: { label: "Cotação", cor: "#15803d", fundo: "#dcfce7" },
  contabil: { label: "Documento contábil", cor: "#b45309", fundo: "#fef3c7" },
  contrato: { label: "Contrato", cor: "#3730a3", fundo: "#e0e7ff" },
  geral: { label: "Documento geral", cor: "#374151", fundo: "#f3f4f6" },
};

const ANEXO_EXTENSOES_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".xlsx", ".xls", ".csv", ".ods"];

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function categorizar(assunto: string): CategoriaEmail {
  const norm = normalizar(assunto);
  if (CATEGORIA_KEYWORDS.cotacao.some((keyword) => norm.includes(normalizar(keyword)))) return "cotacao";
  if (CATEGORIA_KEYWORDS.contabil.some((keyword) => norm.includes(normalizar(keyword)))) return "contabil";
  if (CATEGORIA_KEYWORDS.contrato.some((keyword) => norm.includes(normalizar(keyword)))) return "contrato";
  return "geral";
}

function temAnexoRelevante(anexos: string[]) {
  return anexos.some((anexo) => ANEXO_EXTENSOES_PERMITIDAS.some((extension) => anexo.toLowerCase().endsWith(extension)));
}

function enriquecerEmails(emails: EmailResumo[]): EmailComCategoria[] {
  return emails
    .filter((email) => temAnexoRelevante(email.anexos))
    .map((email) => {
      const categoria = categorizar(email.assunto);
      const estilo = CATEGORIA_ESTILO[categoria];
      return { ...email, categoria, categoriaLabel: estilo.label, categoriaCor: estilo.cor, categoriaFundo: estilo.fundo };
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

function parseDays(value: unknown) {
  const numeric = Number(value || 30);
  if (!Number.isFinite(numeric)) return 30;
  return Math.min(Math.max(Math.trunc(numeric), 1), 90);
}

async function scan(dias: number) {
  const emails = await listarEmails(dias);
  const data = enriquecerEmails(emails);
  return { configurado: true, data, total: data.length, dias, scannedAt: new Date().toISOString(), source: "imap" };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  try {
    if (!(await imapConfigurado())) {
      return NextResponse.json({
        configurado: false,
        data: [],
        total: 0,
        aviso: "A integração IMAP não está configurada. Cadastre host, porta, usuário e senha no cofre de credenciais.",
      });
    }
    return NextResponse.json(await scan(parseDays(req.nextUrl.searchParams.get("dias"))));
  } catch (error) {
    return erroInterno(error, "api/email-integration GET");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  try {
    if (!(await imapConfigurado())) {
      return NextResponse.json({ error: "A integração IMAP não está configurada.", configurado: false }, { status: 503 });
    }
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await scan(parseDays(body?.dias)));
  } catch (error) {
    return erroInterno(error, "api/email-integration POST");
  }
}
