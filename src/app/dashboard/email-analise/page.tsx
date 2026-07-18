"use client";
// Cotações & Contratos por E-mail — lista mensagens da caixa IMAP que parecem
// cotação/orçamento/contrato e analisa o documento (corpo + anexos PDF) com IA.
import { useState } from "react";
import { useRecurso } from "@/lib/useRecurso";

interface EmailResumo { uid: number; assunto: string; de: string; data: string; anexos: string[] }
interface Analise {
  tipo?: string; resumo?: string; partes?: string[]; valores?: string[];
  prazos?: string[]; condicoesPagamento?: string; riscos?: string[]; recomendacao?: string;
}

const TIPO_LABEL: Record<string, [string, string, string]> = {
  cotacao:  ["💰 Cotação",   "#dcfce7", "#15803d"],
  orcamento:["🧾 Orçamento", "#dcfce7", "#15803d"],
  contrato: ["📋 Contrato",  "#e0e7ff", "#3730a3"],
  outro:    ["📄 Documento", "#f3f4f6", "#374151"],
};

export default function EmailAnalisePage() {
  const [dias, setDias] = useState(30);
  const { data, loading, erro, reload } = useRecurso<{ configurado: boolean; data: EmailResumo[]; _demo?: boolean; aviso?: string }>(`/api/email-analise?dias=${dias}`);
  const emails = data?.data ?? [];

  const [analisando, setAnalisando] = useState<number | null>(null);
  const [analise, setAnalise] = useState<{ email: EmailResumo; analise: Analise; _demo?: boolean } | null>(null);
  const [erroAnalise, setErroAnalise] = useState<string | null>(null);

  const analisar = async (em: EmailResumo) => {
    setAnalisando(em.uid); setErroAnalise(null);
    try {
      const r = await fetch("/api/email-analise", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: em.uid }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || `Falha na análise (HTTP ${r.status})`);
      setAnalise({ email: em, analise: d.analise || {}, _demo: d._demo });
    } catch (e: any) {
      setErroAnalise(e?.message || "Falha na análise");
    } finally {
      setAnalisando(null);
    }
  };

  const Lista = ({ titulo, itens }: { titulo: string; itens?: string[] }) =>
    itens && itens.length ? (
      <div style={{ marginBottom: 10 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: "#334532", marginBottom: 4 }}>{titulo}</h4>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{itens.map((v, i) => <li key={i} style={{ fontSize: 12, color: "#374151", padding: "1px 0" }}>{v}</li>)}</ul>
      </div>
    ) : null;

  return (<div>
    <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📧 Cotações & Contratos por E-mail</h1>
    <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>O sistema varre a caixa de entrada (somente leitura), separa cotações, orçamentos e contratos e analisa o documento com IA — valores, prazos, riscos e recomendação.</p>

    {data && !data.configurado && (
      <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
        <strong style={{ color: "#92400e", fontSize: 13 }}>⚙️ IMAP não configurado — modo demonstrativo</strong>
        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
          No <code>.env.production</code> da VPS, defina <code>EMAIL_IMAP_HOST</code> (ex.: imap.gmail.com), <code>EMAIL_IMAP_PORT</code> (993), <code>EMAIL_IMAP_USER</code> e <code>EMAIL_IMAP_PASS</code> (senha de app) e reinicie: <code>docker compose up -d app</code>.
        </p>
      </div>
    )}

    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
      <label htmlFor="dias" style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Período:</label>
      <select id="dias" value={dias} onChange={(e) => setDias(Number(e.target.value))} style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}>
        <option value={7}>Últimos 7 dias</option>
        <option value={30}>Últimos 30 dias</option>
        <option value={60}>Últimos 60 dias</option>
        <option value={90}>Últimos 90 dias</option>
      </select>
      <button onClick={reload} disabled={loading} style={{ background: "#4a9410", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: loading ? 0.7 : 1 }}>
        {loading ? "⟳ Buscando..." : "🔄 Buscar e-mails"}
      </button>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{emails.length} mensagem(ns) encontrada(s)</span>
    </div>

    {erro && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>❌ {erro}</div>}
    {erroAnalise && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>❌ {erroAnalise}</div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      {/* Lista de e-mails */}
      <div>
        {loading && !emails.length && <p style={{ fontSize: 13, color: "#9ca3af" }}>⟳ Consultando a caixa de entrada...</p>}
        {!loading && !emails.length && !erro && <p style={{ fontSize: 13, color: "#9ca3af" }}>Nenhuma cotação ou contrato identificado no período.</p>}
        {emails.map((em) => (
          <div key={em.uid} style={{ background: "#fff", border: "1px solid " + (analise?.email.uid === em.uid ? "#4a9410" : "#e5e7eb"), borderRadius: 10, padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: 13, color: "#334532" }}>{em.assunto}</strong>
              <span style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap" }}>{new Date(em.data).toLocaleDateString("pt-BR")}</span>
            </div>
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{em.de}</p>
            {em.anexos.length > 0 && <p style={{ fontSize: 11, color: "#374151", marginTop: 3 }}>📎 {em.anexos.join(" · ")}</p>}
            <button onClick={() => analisar(em)} disabled={analisando !== null}
              style={{ marginTop: 8, background: analisando === em.uid ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, opacity: analisando !== null && analisando !== em.uid ? 0.5 : 1 }}>
              {analisando === em.uid ? "⟳ Analisando com IA..." : "🤖 Analisar com IA"}
            </button>
          </div>
        ))}
      </div>

      {/* Painel de análise */}
      <div>
        {!analise && <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 10, padding: 24, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>Selecione um e-mail e clique em “Analisar com IA” para ver o parecer aqui.</div>}
        {analise && (() => {
          const a = analise.analise;
          const [rotulo, bg, cor] = TIPO_LABEL[a.tipo || "outro"] || TIPO_LABEL.outro;
          return (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <span style={{ background: bg, color: cor, padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{rotulo}</span>
                {analise._demo && <span style={{ background: "#fef9c3", color: "#92400e", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>⚠️ EXEMPLO — dados fictícios</span>}
              </div>
              <h3 style={{ fontSize: 14, color: "#334532", marginBottom: 8 }}>{analise.email.assunto}</h3>
              {a.resumo && <p style={{ fontSize: 12, color: "#374151", background: "#f9fafb", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{a.resumo}</p>}
              <Lista titulo="🤝 Partes" itens={a.partes} />
              <Lista titulo="💰 Valores" itens={a.valores} />
              <Lista titulo="📅 Prazos" itens={a.prazos} />
              {a.condicoesPagamento && (
                <div style={{ marginBottom: 10 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#334532", marginBottom: 4 }}>💳 Condições de pagamento</h4>
                  <p style={{ fontSize: 12, color: "#374151" }}>{a.condicoesPagamento}</p>
                </div>
              )}
              <Lista titulo="⚠️ Riscos e pontos de atenção" itens={a.riscos} />
              {a.recomendacao && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginTop: 4 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#15803d", marginBottom: 4 }}>✅ Recomendação</h4>
                  <p style={{ fontSize: 12, color: "#166534" }}>{a.recomendacao}</p>
                </div>
              )}
              <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 12 }}>Análise gerada por IA — apoio à decisão; confira sempre o documento original antes de fechar negócio.</p>
            </div>
          );
        })()}
      </div>
    </div>
  </div>);
}
