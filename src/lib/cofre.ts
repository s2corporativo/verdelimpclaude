/**
 * Cofre de credenciais — fonte ÚNICA de chaves/senhas de integração.
 *
 * O administrador cadastra as credenciais na tela Admin → Credenciais & APIs;
 * elas são criptografadas (AES-256-GCM, chave derivada do NEXTAUTH_SECRET) e
 * gravadas no banco. TODO o sistema lê via getCredencial()/getCredenciais():
 *   1º o banco (cofre) → 2º a variável de ambiente (fallback).
 * Assim, salvar uma chave na tela sincroniza todos os módulos NA HORA,
 * sem editar .env.production nem reiniciar o container.
 *
 * Segurança:
 *  - Só nomes do CATALOGO_COFRE são aceitos (nunca DATABASE_URL/NEXTAUTH_*).
 *  - O valor nunca volta em claro para o navegador — só um preview mascarado.
 *  - Auditoria registra quem salvou/removeu, sem registrar o valor.
 */
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// ── Catálogo (whitelist) ────────────────────────────────────────────
export interface ItemCatalogo {
  nome: string;
  rotulo: string;
  grupo: string;
  secreta: boolean; // true = tratar como senha (mascarar tudo)
  placeholder: string;
  ajuda: string;
}

export const CATALOGO_COFRE: ItemCatalogo[] = [
  // IA
  { nome: "GROQ_API_KEY", rotulo: "Chave GROQ (IA)", grupo: "🤖 Inteligência Artificial", secreta: true, placeholder: "gsk_...", ajuda: "console.groq.com → API Keys. Liga TODOS os recursos de IA: análise jurídica, cotações por e-mail, editais, precificação, chat e voz." },
  // E-mail — envio (SMTP)
  { nome: "SMTP_HOST", rotulo: "Servidor SMTP", grupo: "📤 E-mail — envio (SMTP)", secreta: false, placeholder: "smtp.gmail.com", ajuda: "Servidor de saída para enviar relatórios (ex.: relatório ao contador)." },
  { nome: "SMTP_PORT", rotulo: "Porta SMTP", grupo: "📤 E-mail — envio (SMTP)", secreta: false, placeholder: "587", ajuda: "587 (TLS) ou 465 (SSL)." },
  { nome: "SMTP_USER", rotulo: "Usuário SMTP", grupo: "📤 E-mail — envio (SMTP)", secreta: false, placeholder: "contato@verdelimp.com.br", ajuda: "Conta que envia os e-mails." },
  { nome: "SMTP_PASS", rotulo: "Senha SMTP", grupo: "📤 E-mail — envio (SMTP)", secreta: true, placeholder: "senha de app", ajuda: "Gmail/Outlook exigem senha de aplicativo (não a senha normal)." },
  { nome: "EMAIL_FROM", rotulo: "Remetente (De:)", grupo: "📤 E-mail — envio (SMTP)", secreta: false, placeholder: "Verde Limp <contato@verdelimp.com.br>", ajuda: "Opcional — nome/endereço exibido no e-mail enviado." },
  // E-mail — leitura (IMAP)
  { nome: "EMAIL_IMAP_HOST", rotulo: "Servidor IMAP", grupo: "📥 E-mail — leitura (IMAP)", secreta: false, placeholder: "imap.gmail.com", ajuda: "Caixa de entrada varrida pelo módulo Cotações & Contratos por E-mail (somente leitura)." },
  { nome: "EMAIL_IMAP_PORT", rotulo: "Porta IMAP", grupo: "📥 E-mail — leitura (IMAP)", secreta: false, placeholder: "993", ajuda: "993 (TLS, padrão)." },
  { nome: "EMAIL_IMAP_USER", rotulo: "Usuário IMAP", grupo: "📥 E-mail — leitura (IMAP)", secreta: false, placeholder: "comercial@verdelimp.com.br", ajuda: "Conta que recebe cotações e contratos." },
  { nome: "EMAIL_IMAP_PASS", rotulo: "Senha IMAP", grupo: "📥 E-mail — leitura (IMAP)", secreta: true, placeholder: "senha de app", ajuda: "Gmail/Outlook exigem senha de aplicativo." },
];

export const NOMES_PERMITIDOS = new Set(CATALOGO_COFRE.map((c) => c.nome));

// ── Criptografia (AES-256-GCM) ──────────────────────────────────────
// Chave derivada do NEXTAUTH_SECRET (já obrigatório em produção). Se o
// segredo mudar, os valores gravados deixam de abrir — recadastrar na tela.
function chaveAes(): Buffer {
  const segredo = process.env.NEXTAUTH_SECRET;
  if (!segredo) throw new Error("NEXTAUTH_SECRET ausente — o cofre exige o segredo de sessão configurado.");
  return crypto.createHash("sha256").update(`verdelimp-cofre::${segredo}`).digest();
}

export function criptografar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chaveAes(), iv);
  const enc = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

export function descriptografar(blob: string): string {
  const [ver, ivB64, tagB64, encB64] = blob.split(":");
  if (ver !== "v1" || !ivB64 || !tagB64 || !encB64) throw new Error("Formato de credencial inválido.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", chaveAes(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB64, "base64")), decipher.final()]).toString("utf8");
}

// ── Leitura com cache (o resto do sistema usa SÓ isto) ──────────────
const CACHE_TTL_MS = 60_000;
let cache: { ts: number; valores: Map<string, string> } | null = null;

export function invalidarCacheCofre() {
  cache = null;
}

async function valoresDoBanco(): Promise<Map<string, string>> {
  const agora = Date.now();
  if (cache && agora - cache.ts < CACHE_TTL_MS) return cache.valores;
  const valores = new Map<string, string>();
  try {
    const linhas = await prisma.systemCredential.findMany();
    for (const l of linhas) {
      if (!NOMES_PERMITIDOS.has(l.name)) continue;
      try { valores.set(l.name, descriptografar(l.value)); } catch { /* segredo mudou — ignora e cai no env */ }
    }
  } catch { /* banco fora — cai no fallback de ambiente */ }
  cache = { ts: agora, valores };
  return valores;
}

/** Valor efetivo de uma credencial: cofre (banco) → variável de ambiente → null. */
export async function getCredencial(nome: string): Promise<string | null> {
  const doBanco = (await valoresDoBanco()).get(nome);
  if (doBanco) return doBanco;
  return process.env[nome] || null;
}

/** Várias credenciais de uma vez (mesma regra de precedência). */
export async function getCredenciais(...nomes: string[]): Promise<Record<string, string | null>> {
  const banco = await valoresDoBanco();
  const saida: Record<string, string | null> = {};
  for (const n of nomes) saida[n] = banco.get(n) || process.env[n] || null;
  return saida;
}

// ── Status para a tela Admin (nunca expõe o valor em claro) ─────────
export interface StatusCredencial extends ItemCatalogo {
  configurada: boolean;
  origem: "cofre" | "ambiente" | null;
  preview: string; // mascarado — ex.: "gsk_•••• 9f2a" ou "smtp.gmail.com"
  atualizadaEm: string | null;
  atualizadaPor: string | null;
}

function mascarar(item: ItemCatalogo, valor: string): string {
  if (!item.secreta) return valor.length > 60 ? valor.slice(0, 57) + "…" : valor;
  if (valor.length <= 8) return "••••••••";
  return `${valor.slice(0, 4)}••••${valor.slice(-4)}`;
}

export async function statusCofre(): Promise<StatusCredencial[]> {
  let linhas: { name: string; value: string; updatedAt: Date; updatedBy: string | null }[] = [];
  try { linhas = await prisma.systemCredential.findMany(); } catch { /* banco fora */ }
  const porNome = new Map(linhas.map((l) => [l.name, l]));

  return CATALOGO_COFRE.map((item) => {
    const linha = porNome.get(item.nome);
    let doCofre: string | null = null;
    if (linha) { try { doCofre = descriptografar(linha.value); } catch { doCofre = null; } }
    const doEnv = process.env[item.nome] || null;
    const efetivo = doCofre ?? doEnv;
    return {
      ...item,
      configurada: !!efetivo,
      origem: doCofre ? "cofre" : doEnv ? "ambiente" : null,
      preview: efetivo ? mascarar(item, efetivo) : "",
      atualizadaEm: linha ? linha.updatedAt.toISOString() : null,
      atualizadaPor: linha?.updatedBy ?? null,
    };
  });
}

// ── Escrita (usada só pela rota /api/admin/credenciais) ─────────────
export async function salvarCredencial(nome: string, valor: string, quem?: string | null): Promise<void> {
  if (!NOMES_PERMITIDOS.has(nome)) throw new Error(`Credencial não permitida: ${nome}`);
  const value = criptografar(valor.trim());
  await prisma.systemCredential.upsert({
    where: { name: nome },
    create: { name: nome, value, updatedBy: quem || null },
    update: { value, updatedBy: quem || null },
  });
  invalidarCacheCofre();
}

export async function removerCredencial(nome: string): Promise<void> {
  if (!NOMES_PERMITIDOS.has(nome)) throw new Error(`Credencial não permitida: ${nome}`);
  await prisma.systemCredential.deleteMany({ where: { name: nome } });
  invalidarCacheCofre();
}
