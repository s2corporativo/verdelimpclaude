"use client";

import { useMemo, useState } from "react";
import { useRecurso } from "@/lib/useRecurso";

interface EmailItem {
  uid: number;
  assunto: string;
  de: string;
  data: string;
  anexos: string[];
  categoria: string;
  categoriaLabel: string;
  categoriaCor: string;
  categoriaFundo: string;
}

type FiltroTab = "todos" | "cotacao" | "contabil" | "contrato" | "geral";
const TABS: Array<{ key: FiltroTab; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "cotacao", label: "Cotações" },
  { key: "contabil", label: "Documentos contábeis" },
  { key: "contrato", label: "Contratos" },
  { key: "geral", label: "Outros" },
];

export default function EmailIntegrationPage() {
  const [filtro, setFiltro] = useState<FiltroTab>("todos");
  const [scanning, setScanning] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const { data, loading, erro, reload } = useRecurso<{ configurado: boolean; data: EmailItem[]; total: number; aviso?: string }>("/api/email-integration");
  const emails = data?.data ?? [];

  const counts = useMemo(() => emails.reduce<Record<string, number>>((accumulator, email) => {
    accumulator[email.categoria] = (accumulator[email.categoria] || 0) + 1;
    return accumulator;
  }, {}), [emails]);
  const filtered = filtro === "todos" ? emails : emails.filter((email) => email.categoria === filtro);

  async function scan() {
    if (!data?.configurado) return;
    setScanning(true);
    setMensagem("");
    try {
      const response = await fetch("/api/email-integration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dias: 30 }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Falha ao escanear a caixa de entrada (${response.status}).`);
      setMensagem(`${payload.total} e-mail(s) com anexos relevantes encontrados.`);
      reload();
    } catch (error: any) {
      setMensagem(error?.message || "Falha ao escanear a caixa de entrada.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Integração de e-mail</h1>
          <p style={{ color: "#6b7280", fontSize: 13 }}>Varredura da caixa IMAP para localizar anexos comerciais, contábeis e contratuais.</p>
        </div>
        <button onClick={scan} disabled={scanning || !data?.configurado} title={!data?.configurado ? "Configure o IMAP antes de escanear" : "Escanear caixa de entrada"}
          style={{ background: scanning || !data?.configurado ? "#9ca3af" : "#4a9410", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: scanning || !data?.configurado ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13 }}>
          {scanning ? "Escaneando…" : "Escanear agora"}
        </button>
      </div>

      {data && !data.configurado && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <strong style={{ color: "#92400e", fontSize: 13 }}>Integração IMAP não configurada</strong>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{data.aviso || "Cadastre as credenciais IMAP no cofre de credenciais para habilitar a leitura da caixa."}</p>
        </div>
      )}

      {mensagem && <div style={{ background: mensagem.toLowerCase().includes("falha") ? "#fee2e2" : "#dcfce7", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: mensagem.toLowerCase().includes("falha") ? "#991b1b" : "#15803d" }}>{mensagem}</div>}
      {erro && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const count = tab.key === "todos" ? emails.length : counts[tab.key] || 0;
          const active = filtro === tab.key;
          return <button key={tab.key} onClick={() => setFiltro(tab.key)} style={{ background: active ? "#334532" : "#fff", color: active ? "#fff" : "#374151", border: `1px solid ${active ? "#334532" : "#d1d5db"}`, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{tab.label} ({count})</button>;
        })}
      </div>

      {loading && <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>Carregando e-mails…</div>}
      {!loading && !filtered.length && !erro && data?.configurado && (
        <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 12, padding: 32, textAlign: "center", color: "#6b7280" }}>
          {filtro === "todos" ? "Nenhum e-mail com anexo relevante foi localizado." : "Nenhum e-mail foi localizado nesta categoria."}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((email) => (
          <div key={email.uid} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", borderLeft: `4px solid ${email.categoriaCor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ background: email.categoriaFundo, color: email.categoriaCor, padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>{email.categoriaLabel}</span>
                <p style={{ margin: "7px 0 0", fontSize: 13, fontWeight: 700, color: "#111827" }}>{email.assunto}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6b7280" }}>{email.de}</p>
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af" }}>{new Date(email.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {email.anexos.map((attachment, index) => <span key={`${email.uid}-${index}`} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontSize: 10, color: "#374151" }}>{attachment}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
