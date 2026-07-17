import { NextRequest, NextResponse } from "next/server";
import { buscarEmails, imapConfigurado } from "@/lib/email-busca";

export const dynamic = "force-dynamic";

// Exemplos exibidos quando o IMAP ainda não foi configurado (mesmo padrão
// demo do resto do sistema) — deixa a tela utilizável antes de plugar a caixa.
const DEMO = [
  { uid: 3, assunto: "Contrato 2026/018 — SADA Betim (aditivo de reajuste INPC)", de: "juridico@gruposada.com.br", data: "2026-07-10T13:20:00Z", temAnexo: true },
  { uid: 2, assunto: "Proposta comercial roçada — Condomínio Alphaville", de: "sindico@alphavillebetim.com.br", data: "2026-07-08T18:05:00Z", temAnexo: true },
  { uid: 1, assunto: "RE: Edital PE 041/2026 — esclarecimento de proposta", de: "licitacao@pmbetim.mg.gov.br", data: "2026-07-05T11:42:00Z", temAnexo: false },
];

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") || "").trim();
  const dias = Number(sp.get("dias") || 180);
  if (!q) return NextResponse.json({ mensagens: [], aviso: "Digite um termo para buscar (nº do contrato, cliente, objeto…)." });

  if (!imapConfigurado()) {
    return NextResponse.json({
      _demo: true,
      mensagens: DEMO.filter(m => m.assunto.toLowerCase().includes(q.toLowerCase()) || q.length < 3),
      aviso: "Modo demonstração — configure IMAP_HOST, IMAP_USER e IMAP_PASS (ou reaproveite SMTP_*) no ambiente para buscar e-mails reais.",
    });
  }

  const r = await buscarEmails({ termo: q, dias });
  if (!r.ok) {
    // Não vaza a mensagem de erro do servidor IMAP ao cliente (log fica no servidor).
    console.error("[email/buscar] falha IMAP:", r.erro);
    return NextResponse.json({ mensagens: [], erro: "Não foi possível buscar no e-mail agora. Verifique as credenciais IMAP no ambiente." }, { status: 502 });
  }
  return NextResponse.json({ mensagens: r.mensagens });
}
