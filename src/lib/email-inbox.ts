// Leitura da caixa de e-mail via IMAP — busca cotações e contratos recebidos
// para análise com IA (módulo Cotações & Contratos por E-mail).
//
// Credenciais: COFRE (Admin → Credenciais & APIs) com fallback para as
// variáveis EMAIL_IMAP_HOST / EMAIL_IMAP_PORT / EMAIL_IMAP_USER / EMAIL_IMAP_PASS.
// Gmail/Outlook exigem senha de aplicativo.
//
// Somente LEITURA: nenhuma mensagem é movida, marcada ou apagada.
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { getCredenciais } from "@/lib/cofre";

export async function imapConfigurado(): Promise<boolean> {
  const c = await getCredenciais("EMAIL_IMAP_HOST", "EMAIL_IMAP_USER", "EMAIL_IMAP_PASS");
  return Boolean(c.EMAIL_IMAP_HOST && c.EMAIL_IMAP_USER && c.EMAIL_IMAP_PASS);
}

// Palavras que indicam cotação/orçamento/contrato no assunto do e-mail.
const PALAVRAS_CHAVE = [
  "cotacao", "orcamento", "proposta", "contrato", "aditivo",
  "pedido de compra", "ordem de compra", "preco", "licitacao", "edital",
];

/** Normaliza (minúsculas, sem acentos) e testa as palavras-chave. */
export function pareceCotacaoOuContrato(assunto: string | null | undefined): boolean {
  if (!assunto) return false;
  const norm = assunto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return PALAVRAS_CHAVE.some((p) => norm.includes(p));
}

export interface EmailResumo {
  uid: number;
  assunto: string;
  de: string;
  data: string; // ISO
  anexos: string[];
}

export interface AnexoLido {
  nome: string;
  tipo: string;
  /** Texto extraído (PDF/texto). null = formato não suportado para extração. */
  texto: string | null;
}

export interface EmailConteudo extends EmailResumo {
  corpo: string;
  anexosLidos: AnexoLido[];
}

const MAX_MENSAGENS = 100;          // limite de mensagens varridas por listagem
const MAX_ANEXO_BYTES = 10 * 1024 * 1024; // anexo acima disso não é extraído
const MAX_TEXTO_ANEXO = 20000;      // caracteres extraídos por anexo

async function conectar(): Promise<ImapFlow> {
  const c = await getCredenciais("EMAIL_IMAP_HOST", "EMAIL_IMAP_PORT", "EMAIL_IMAP_USER", "EMAIL_IMAP_PASS");
  const client = new ImapFlow({
    host: c.EMAIL_IMAP_HOST!,
    port: Number(c.EMAIL_IMAP_PORT || 993),
    secure: true,
    auth: { user: c.EMAIL_IMAP_USER!, pass: c.EMAIL_IMAP_PASS! },
    logger: false,
  });
  await client.connect();
  return client;
}

function nomesDeAnexos(node: any, acc: string[] = []): string[] {
  if (!node) return acc;
  if (node.disposition === "attachment" && node.dispositionParameters?.filename) {
    acc.push(String(node.dispositionParameters.filename));
  } else if (node.disposition === "attachment" && node.parameters?.name) {
    acc.push(String(node.parameters.name));
  }
  for (const filho of node.childNodes || []) nomesDeAnexos(filho, acc);
  return acc;
}

/**
 * Lista mensagens dos últimos `dias` cujo assunto parece cotação/contrato.
 * Retorna só metadados (a leitura completa é feita sob demanda em lerEmail).
 */
export async function listarEmails(dias = 30): Promise<EmailResumo[]> {
  const client = await conectar();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const desde = new Date(Date.now() - dias * 86400000);
    const uids = (await client.search({ since: desde }, { uid: true })) || [];
    if (!uids.length) return [];

    const recentes = uids.slice(-MAX_MENSAGENS);
    const resultado: EmailResumo[] = [];
    for await (const msg of client.fetch(recentes, { envelope: true, bodyStructure: true }, { uid: true })) {
      const assunto = msg.envelope?.subject || "";
      if (!pareceCotacaoOuContrato(assunto)) continue;
      const remetente = msg.envelope?.from?.[0];
      resultado.push({
        uid: msg.uid,
        assunto,
        de: remetente ? `${remetente.name || ""} <${remetente.address || ""}>`.trim() : "(desconhecido)",
        data: (msg.envelope?.date || new Date()).toISOString(),
        anexos: nomesDeAnexos(msg.bodyStructure),
      });
    }
    return resultado.sort((a, b) => b.data.localeCompare(a.data));
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
}

/** Baixa a mensagem completa e extrai texto do corpo e dos anexos PDF/texto. */
export async function lerEmail(uid: number): Promise<EmailConteudo | null> {
  const client = await conectar();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const msg = await client.fetchOne(String(uid), { source: true, envelope: true }, { uid: true });
    if (!msg || !msg.source) return null;

    const parsed = await simpleParser(msg.source);
    const anexosLidos: AnexoLido[] = [];
    for (const at of parsed.attachments || []) {
      const nome = at.filename || "anexo";
      const tipo = at.contentType || "application/octet-stream";
      let texto: string | null = null;
      if (at.content && at.content.length <= MAX_ANEXO_BYTES) {
        try {
          if (tipo.includes("pdf") || nome.toLowerCase().endsWith(".pdf")) {
            texto = (await pdfParse(at.content)).text.slice(0, MAX_TEXTO_ANEXO);
          } else if (tipo.startsWith("text/")) {
            texto = at.content.toString("utf-8").slice(0, MAX_TEXTO_ANEXO);
          }
        } catch {
          texto = null; // anexo corrompido/protegido — segue sem extração
        }
      }
      anexosLidos.push({ nome, tipo, texto });
    }

    const remetente = parsed.from?.value?.[0];
    return {
      uid,
      assunto: parsed.subject || msg.envelope?.subject || "",
      de: remetente ? `${remetente.name || ""} <${remetente.address || ""}>`.trim() : "(desconhecido)",
      data: (parsed.date || msg.envelope?.date || new Date()).toISOString(),
      anexos: anexosLidos.map((a) => a.nome),
      corpo: (parsed.text || "").slice(0, MAX_TEXTO_ANEXO),
      anexosLidos,
    };
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
}
