// Busca em e-mails recebidos (IMAP) — usada para localizar mensagens de
// contratos e propostas na caixa da empresa.
// Config por ambiente: IMAP_HOST, IMAP_PORT (993), IMAP_USER, IMAP_PASS.
// Se não houver IMAP_*, herda de SMTP_USER/SMTP_PASS (mesma conta, normalmente).
import { ImapFlow } from "imapflow";

function cred() {
  return {
    host: process.env.IMAP_HOST || process.env.SMTP_HOST || "",
    port: Number(process.env.IMAP_PORT || 993),
    user: process.env.IMAP_USER || process.env.SMTP_USER || "",
    pass: process.env.IMAP_PASS || process.env.SMTP_PASS || "",
  };
}

export function imapConfigurado(): boolean {
  const c = cred();
  return Boolean(c.host && c.user && c.pass);
}

export interface EmailResultado {
  uid: number;
  assunto: string;
  de: string;
  data: string;      // ISO
  temAnexo: boolean;
}

function temAnexo(node: any): boolean {
  if (!node) return false;
  const disp = (node.disposition || "").toLowerCase();
  if (disp === "attachment") return true;
  if (Array.isArray(node.childNodes)) return node.childNodes.some(temAnexo);
  return false;
}

/** Busca no INBOX por termo (assunto OU remetente OU corpo), dentro do período. */
export async function buscarEmails(opts: { termo: string; dias?: number; limite?: number }): Promise<{ ok: boolean; mensagens: EmailResultado[]; erro?: string }> {
  const c = cred();
  const dias = Math.min(Math.max(Number(opts.dias) || 180, 1), 730);
  const limite = Math.min(Math.max(Number(opts.limite) || 40, 1), 100);
  const desde = new Date(Date.now() - dias * 86400000);
  const termo = (opts.termo || "").trim();
  if (!termo) return { ok: true, mensagens: [] };

  const client = new ImapFlow({
    host: c.host, port: c.port, secure: c.port === 993,
    auth: { user: c.user, pass: c.pass }, logger: false,
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = (await client.search(
        { since: desde, or: [{ subject: termo }, { from: termo }, { body: termo }] },
        { uid: true },
      )) || [];
      const escolhidos = (uids as number[]).slice(-limite).reverse(); // mais recentes primeiro
      const mensagens: EmailResultado[] = [];
      if (escolhidos.length) {
        for await (const msg of client.fetch(escolhidos, { uid: true, envelope: true, bodyStructure: true }, { uid: true })) {
          const env: any = msg.envelope;
          mensagens.push({
            uid: Number(msg.uid),
            assunto: env?.subject || "(sem assunto)",
            de: (env?.from || []).map((f: any) => f.address || f.name).filter(Boolean).join(", "),
            data: env?.date ? new Date(env.date).toISOString() : "",
            temAnexo: temAnexo(msg.bodyStructure),
          });
        }
      }
      return { ok: true, mensagens };
    } finally {
      lock.release();
    }
  } catch (e: any) {
    return { ok: false, mensagens: [], erro: e?.message || "erro IMAP" };
  } finally {
    try { await client.logout(); } catch { /* ignora */ }
  }
}
