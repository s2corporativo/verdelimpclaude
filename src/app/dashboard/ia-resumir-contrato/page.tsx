"use client";
import { useState } from "react";

export default function ResumirContratoPage() {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const analisar = async () => {
    if (!texto.trim()) { setErro("Cole o texto do contrato"); return; }
    setCarregando(true); setErro(""); setResultado(null);
    try {
      const r = await fetch("/api/ia/resumir-contrato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textoContrato: texto }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao analisar");
      setResultado(d.dados);
    } catch (e: any) { setErro(e.message); }
    finally { setCarregando(false); }
  };

  const fmt = (v: any) => v != null ? String(v) : "—";
  const fmtMoeda = (v: any) => v != null ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  const corRisco = (r: string) => {
    if (!r) return "#6b7280";
    const l = r.toLowerCase();
    if (l.includes("alto") || l.includes("high")) return "#dc2626";
    if (l.includes("médio") || l.includes("medio") || l.includes("medium")) return "#d97706";
    return "#15803d";
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>📋 Resumir Contrato com IA</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>Cole o texto de um contrato para análise automática: partes, valor, vigência, obrigações, penalidades e pontos de atenção.</p>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Texto do Contrato</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui o texto completo do contrato..."
          style={{ width: "100%", minHeight: 200, border: "1px solid #d1d5db", borderRadius: 8, padding: 10, fontSize: 12, fontFamily: "monospace", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={analisar}
            disabled={carregando}
            style={{ background: carregando ? "#9ca3af" : "#334532", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 8, cursor: carregando ? "wait" : "pointer", fontWeight: 700, fontSize: 13 }}
          >
            {carregando ? "⏳ Analisando..." : "🤖 Analisar com IA"}
          </button>
          <button onClick={() => { setTexto(""); setResultado(null); setErro(""); }} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>Limpar</button>
        </div>
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", color: "#991b1b", marginBottom: 16, fontSize: 12 }}>❌ {erro}</div>}

      {resultado && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Resumo */}
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16 }}>
            <h2 style={{ color: "#15803d", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>📝 Resumo Executivo</h2>
            <p style={{ fontSize: 13, color: "#1f2937", lineHeight: 1.6 }}>{fmt(resultado.resumo)}</p>
          </div>

          {/* Classificação */}
          {resultado.classificacao && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[
                ["Tipo", resultado.classificacao.tipo],
                ["Área", resultado.classificacao.area],
                ["Risco", resultado.classificacao.risco],
                ["Complexidade", resultado.classificacao.complexidade],
              ].map(([label, valor]) => (
                <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13, color: label === "Risco" ? corRisco(valor) : "#1f2937", fontWeight: 700, marginTop: 4 }}>{fmt(valor)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Partes e Valor */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <h3 style={{ color: "#334532", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>👥 Partes</h3>
              {resultado.partes && Object.entries(resultado.partes).map(([k, v]) => (
                <div key={k} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                  <span style={{ color: "#6b7280", fontWeight: 600 }}>{k.replace(/([A-Z])/g, " $1")}: </span>
                  <span style={{ color: "#1f2937" }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <h3 style={{ color: "#334532", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>💰 Valor</h3>
              {resultado.valor && Object.entries(resultado.valor).map(([k, v]) => (
                <div key={k} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                  <span style={{ color: "#6b7280", fontWeight: 600 }}>{k.replace(/([A-Z])/g, " $1")}: </span>
                  <span style={{ color: "#1f2937", fontWeight: k === "total" ? 700 : 400 }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vigência e Reajuste */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <h3 style={{ color: "#334532", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📅 Vigência</h3>
              {resultado.vigencia && Object.entries(resultado.vigencia).map(([k, v]) => (
                <div key={k} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                  <span style={{ color: "#6b7280", fontWeight: 600 }}>{k.replace(/([A-Z])/g, " $1")}: </span>
                  <span style={{ color: "#1f2937" }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <h3 style={{ color: "#334532", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📈 Reajuste</h3>
              {resultado.reajuste && Object.entries(resultado.reajuste).map(([k, v]) => (
                <div key={k} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                  <span style={{ color: "#6b7280", fontWeight: 600 }}>{k.replace(/([A-Z])/g, " $1")}: </span>
                  <span style={{ color: "#1f2937" }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Listas */}
          {["obrigacoes", "penalidades", "garantias", "documentosAnexos"].map(chave => (
            resultado[chave]?.length > 0 && (
              <div key={chave} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
                <h3 style={{ color: "#334532", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{chave === "obrigacoes" ? "📋 Obrigações" : chave === "penalidades" ? "⚠️ Penalidades" : chave === "garantias" ? "🛡️ Garantias" : "📎 Documentos Anexos"}</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {resultado[chave].map((item: string, i: number) => (
                    <li key={i} style={{ fontSize: 12, color: "#374151", padding: "2px 0" }}>{item}</li>
                  ))}
                </ul>
              </div>
            )
          ))}

          {/* Rescisão */}
          {resultado.rescisao && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <h3 style={{ color: "#334532", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>🚪 Rescisão</h3>
              {Object.entries(resultado.rescisao).map(([k, v]) => (
                <div key={k} style={{ padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                  <span style={{ color: "#6b7280", fontWeight: 600 }}>{k.replace(/([A-Z])/g, " $1")}: </span>
                  <span style={{ color: "#1f2937" }}>{fmt(v)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Pontos de atenção */}
          {resultado.pontosAtencao?.length > 0 && (
            <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 12, padding: 16 }}>
              <h3 style={{ color: "#92400e", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⚠️ Pontos de Atenção</h3>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {resultado.pontosAtencao.map((item: string, i: number) => (
                  <li key={i} style={{ fontSize: 12, color: "#78350f", padding: "2px 0" }}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Prazos importantes */}
          {resultado.prazosImportantes?.length > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
              <h3 style={{ color: "#334532", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⏰ Prazos Importantes</h3>
              {resultado.prazosImportantes.map((p: any, i: number) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                  <span style={{ color: "#dc2626", fontWeight: 700, minWidth: 90 }}>{p.data}</span>
                  <span style={{ color: "#374151" }}>{p.evento}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
