
"use client";
import { useState } from "react";

export default function PropostaEditalPage() {
  const [scope, setScope] = useState("");
  const [title, setTitle] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState("");

  const gerar = async () => {
    if (!scope || scope.length < 20) return;
    setLoading(true); setResultado(null);
    setEtapa("🔍 Etapa 1/2 — Extraindo dados técnicos do edital...");
    setTimeout(() => setEtapa("✍️ Etapa 2/2 — Gerando proposta comercial completa..."), 3000);
    try {
      const r = await fetch("/api/proposta-edital", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scopeText: scope, title }) });
      const d = await r.json();
      setResultado(d);
    } catch (e: any) { setResultado({ error: e.message }); }
    setLoading(false); setEtapa("");
  };

  const IS: any = { width: "100%", padding: "8px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 };

  const renderMarkdown = (text: string) => {
    // Simple markdown to HTML
    return text
      .split("\n").map((line, i) => {
        if (line.startsWith("## ")) return <h3 key={i} style={{ color: "#0f5233", fontSize: 14, fontWeight: 700, margin: "14px 0 6px" }}>{line.slice(3)}</h3>;
        if (line.startsWith("# ")) return <h2 key={i} style={{ color: "#0f5233", fontSize: 16, fontWeight: 700, margin: "16px 0 8px" }}>{line.slice(2)}</h2>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} style={{ fontWeight: 700, margin: "4px 0" }}>{line.slice(2, -2)}</p>;
        if (line.startsWith("- ")) return <div key={i} style={{ display: "flex", gap: 8, padding: "2px 0", fontSize: 12 }}><span style={{ color: "#1a7a4a", flexShrink: 0 }}>•</span><span>{line.slice(2)}</span></div>;
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} style={{ fontSize: 12, margin: "3px 0", lineHeight: 1.6 }}>{line}</p>;
      });
  };

  return (
    <div>
      <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🤖 Proposta por Edital — IA</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Cole o texto do edital ou escopo técnico. A IA extrai os requisitos, calcula os custos e gera a proposta completa com memorial de cálculo.</p>

      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "9px 13px", marginBottom: 14, fontSize: 11, color: "#1e40af" }}>
        📋 <strong>Inspirado em:</strong> verdelimp-erp-prime-final · routers.ts → quotesRouter.generateFromScope · Adaptado para Claude (Anthropic) em vez de Gemini
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 14 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Título da proposta</label>
          <input style={IS} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Proposta Roçada Canteiros Norte — PBH" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
            Texto do edital / escopo técnico* <span style={{ color: "#9ca3af", fontWeight: 400 }}>(cole aqui o conteúdo do PDF ou e-mail)</span>
          </label>
          <textarea style={{ ...IS, height: 200, resize: "vertical" }} value={scope} onChange={e => setScope(e.target.value)}
            placeholder="Cole aqui o objeto do edital, especificações técnicas, área estimada, prazo, local de execução, modalidade, valor estimado..." />
          <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{scope.length} caracteres</p>
        </div>
        <button onClick={gerar} disabled={loading || scope.length < 20}
          style={{ background: loading ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "11px 28px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: scope.length < 20 ? 0.5 : 1 }}>
          {loading ? "⟳ Gerando..." : "🤖 Gerar Proposta com IA"}
        </button>
        {etapa && <p style={{ fontSize: 12, color: "#7c3aed", marginTop: 8, fontWeight: 600 }}>{etapa}</p>}
      </div>

      {resultado?.error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: 16, color: "#991b1b" }}>❌ {resultado.error}</div>}

      {resultado?.extracted && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
          {/* Dados extraídos */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, alignSelf: "start" }}>
            <h3 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📊 Dados extraídos pela IA</h3>
            {resultado.propostaNumero && <div style={{ background: "#dcfce7", borderRadius: 7, padding: "6px 10px", marginBottom: 10, fontSize: 12, fontWeight: 700, color: "#15803d" }}>✅ Salvo como: {resultado.propostaNumero}</div>}
            {[
              ["Objeto", resultado.extracted.objeto],
              ["Área", resultado.extracted.area_m2 ? resultado.extracted.area_m2.toLocaleString("pt-BR") + " " + (resultado.extracted.unidade || "m²") : null],
              ["Prazo", resultado.extracted.prazo_dias ? resultado.extracted.prazo_dias + " dias" : null],
              ["Local", resultado.extracted.local],
              ["Modalidade", resultado.extracted.modalidade],
              ["Valor estimado", resultado.extracted.valor_estimado ? "R$ " + Number(resultado.extracted.valor_estimado).toLocaleString("pt-BR") : null],
            ].filter(([, v]) => v).map(([l, v]) => (
              <div key={l as string} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                <span style={{ color: "#9ca3af", minWidth: 80, flexShrink: 0 }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            {resultado.extracted.servicos?.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 5 }}>SERVIÇOS IDENTIFICADOS</p>
                {resultado.extracted.servicos.map((s: string, i: number) => (
                  <div key={i} style={{ background: "#f0fdf4", borderRadius: 5, padding: "4px 8px", marginBottom: 4, fontSize: 11 }}>• {s}</div>
                ))}
              </div>
            )}
            {resultado.aviso && <div style={{ background: "#fef9c3", borderRadius: 7, padding: "7px 10px", marginTop: 10, fontSize: 10, color: "#92400e" }}>⚠️ {resultado.aviso}</div>}
          </div>

          {/* Proposta gerada */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700 }}>📄 Proposta Gerada</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {resultado.propostaId && (
                  <a href={`/api/propostas/${resultado.propostaId}/pdf`} target="_blank"
                    style={{ background: "#0f5233", color: "#fff", padding: "5px 14px", borderRadius: 7, textDecoration: "none", fontSize: 11, fontWeight: 700 }}>
                    🖨️ PDF
                  </a>
                )}
                <button onClick={() => navigator.clipboard?.writeText(resultado.proposta)} style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 11 }}>📋 Copiar</button>
              </div>
            </div>
            <div style={{ fontFamily: "system-ui", lineHeight: 1.6, maxHeight: 600, overflowY: "auto", padding: "0 4px" }}>
              {renderMarkdown(resultado.proposta || "")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
