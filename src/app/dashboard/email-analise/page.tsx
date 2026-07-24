"use client";

import { useState } from "react";
import { useRecurso } from "@/lib/useRecurso";

interface EmailResumo { uid: number; assunto: string; de: string; data: string; anexos: string[] }
interface Analise {
  tipo?: string;
  resumo?: string;
  partes?: string[];
  valores?: string[];
  prazos?: string[];
  condicoesPagamento?: string;
  riscos?: string[];
  recomendacao?: string;
}

const TIPO_LABEL: Record<string, [string, string, string]> = {
  cotacao: ["Cotação", "#dcfce7", "#15803d"],
  orcamento: ["Orçamento", "#dcfce7", "#15803d"],
  contrato: ["Contrato", "#e0e7ff", "#3730a3"],
  outro: ["Documento", "#f3f4f6", "#374151"],
};

export default function EmailAnalisePage() {
  const [dias, setDias] = useState(30);
  const { data, loading, erro, reload } = useRecurso<{ configurado: boolean; data: EmailResumo[]; aviso?: string }>(`/api/email-analise?dias=${dias}`);
  const emails = data?.data ?? [];
  const [analisando, setAnalisando] = useState<number | null>(null);
  const [resultado, setResultado] = useState<{ email: EmailResumo; analise: Analise } | null>(null);
  const [erroAnalise, setErroAnalise] = useState("");

  async function analisar(email: EmailResumo) {
    setAnalisando(email.uid);
    setErroAnalise("");
    try {
      const response = await fetch("/api/email-analise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: email.uid }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Falha na análise (${response.status}).`);
      setResultado({ email, analise: payload.analise || {} });
    } catch (error: any) {
      setErroAnalise(error?.message || "Não foi possível analisar o e-mail.");
    } finally {
      setAnalisando(null);
    }
  }

  const Lista = ({ titulo, itens }: { titulo: string; itens?: string[] }) => itens?.length ? (
    <div style={{ marginBottom: 10 }}>
      <h4 style={{ fontSize: 12, fontWeight: 700, color: "#334532", marginBottom: 4 }}>{titulo}</h4>
      <ul style={{ margin: 0, paddingLeft: 18 }}>{itens.map((item, index) => <li key={`${titulo}-${index}`} style={{ fontSize: 12, color: "#374151", padding: "1px 0" }}>{item}</li>)}</ul>
    </div>
  ) : null;

  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Cotações e contratos por e-mail</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Leitura IMAP em modo somente leitura e análise estruturada de corpo e anexos pela IA.</p>

      {data && !data.configurado && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <strong style={{ color: "#92400e", fontSize: 13 }}>Integração IMAP não configurada</strong>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{data.aviso || "Cadastre as credenciais IMAP no cofre de credenciais para habilitar a análise."}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <label htmlFor="dias" style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Período:</label>
        <select id="dias" value={dias} onChange={(event) => setDias(Number(event.target.value))} style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}>
          <option value={7}>Últimos 7 dias</option><option value={30}>Últimos 30 dias</option><option value={60}>Últimos 60 dias</option><option value={90}>Últimos 90 dias</option>
        </select>
        <button onClick={reload} disabled={loading || !data?.configurado} style={{ background: loading || !data?.configurado ? "#9ca3af" : "#4a9410", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: loading || !data?.configurado ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13 }}>{loading ? "Buscando…" : "Buscar e-mails"}</button>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{emails.length} mensagem(ns)</span>
      </div>

      {erro && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>{erro}</div>}
      {erroAnalise && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>{erroAnalise}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 16, alignItems: "start" }}>
        <div>
          {loading && <p style={{ fontSize: 13, color: "#9ca3af" }}>Consultando a caixa de entrada…</p>}
          {!loading && data?.configurado && !emails.length && !erro && <p style={{ fontSize: 13, color: "#9ca3af" }}>Nenhuma mensagem foi identificada no período.</p>}
          {emails.map((email) => (
            <div key={email.uid} style={{ background: "#fff", border: `1px solid ${resultado?.email.uid === email.uid ? "#4a9410" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><strong style={{ fontSize: 13, color: "#334532" }}>{email.assunto}</strong><span style={{ fontSize: 10, color: "#9ca3af" }}>{new Date(email.data).toLocaleDateString("pt-BR")}</span></div>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{email.de}</p>
              {email.anexos.length > 0 && <p style={{ fontSize: 11, color: "#374151", marginTop: 3 }}>{email.anexos.join(" · ")}</p>}
              <button onClick={() => analisar(email)} disabled={analisando !== null || !data?.configurado} style={{ marginTop: 8, background: analisando === email.uid ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, cursor: analisando !== null ? "default" : "pointer", fontWeight: 700, fontSize: 12, opacity: analisando !== null && analisando !== email.uid ? 0.5 : 1 }}>{analisando === email.uid ? "Analisando…" : "Analisar com IA"}</button>
            </div>
          ))}
        </div>

        <div>
          {!resultado && <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 10, padding: 24, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>Selecione uma mensagem real para gerar a análise.</div>}
          {resultado && (() => {
            const analysis = resultado.analise;
            const [label, background, color] = TIPO_LABEL[analysis.tipo || "outro"] || TIPO_LABEL.outro;
            return <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
              <span style={{ background, color, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{label}</span>
              <h3 style={{ fontSize: 14, color: "#334532", margin: "10px 0 8px" }}>{resultado.email.assunto}</h3>
              {analysis.resumo && <p style={{ fontSize: 12, color: "#374151", background: "#f9fafb", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{analysis.resumo}</p>}
              <Lista titulo="Partes" itens={analysis.partes} /><Lista titulo="Valores" itens={analysis.valores} /><Lista titulo="Prazos" itens={analysis.prazos} />
              {analysis.condicoesPagamento && <div style={{ marginBottom: 10 }}><h4 style={{ fontSize: 12, fontWeight: 700, color: "#334532", marginBottom: 4 }}>Condições de pagamento</h4><p style={{ fontSize: 12, color: "#374151" }}>{analysis.condicoesPagamento}</p></div>}
              <Lista titulo="Riscos e pontos de atenção" itens={analysis.riscos} />
              {analysis.recomendacao && <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginTop: 4 }}><h4 style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>Recomendação</h4><p style={{ fontSize: 12, color: "#166534" }}>{analysis.recomendacao}</p></div>}
              <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 12 }}>Análise por IA para apoio à decisão. Confira sempre o documento original.</p>
            </div>;
          })()}
        </div>
      </div>
    </div>
  );
}
