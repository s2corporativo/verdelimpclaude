"use client";
import { useState } from "react";

export default function LerBoletoPage() {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const analisar = async () => {
    if (!texto.trim()) { setErro("Cole o texto do boleto"); return; }
    setCarregando(true); setErro(""); setResultado(null);
    try {
      const r = await fetch("/api/ia/ler-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textoBoleto: texto }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao analisar");
      setResultado(d.dados);
    } catch (e: any) { setErro(e.message); }
    finally { setCarregando(false); }
  };

  const fmt = (v: any) => v != null ? String(v) : "—";
  const fmtMoeda = (v: any) => v != null ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>📄 Ler Boleto com IA</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>Cole o código de barras, linha digitável ou texto do boleto para extração automática dos dados.</p>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Texto do Boleto</label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui o texto do boleto (código de barras, linha digitável, ou texto copiado)..."
          style={{ width: "100%", minHeight: 120, border: "1px solid #d1d5db", borderRadius: 8, padding: 10, fontSize: 12, fontFamily: "monospace", resize: "vertical" }}
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
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ color: "#334532", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>✅ Dados Extraídos</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              ["Cedente", resultado.cedente],
              ["CNPJ Cedente", resultado.cedenteCnpj],
              ["Sacado", resultado.sacado],
              ["CNPJ Sacado", resultado.sacadoCnpj],
              ["Valor", fmtMoeda(resultado.valor)],
              ["Data Vencimento", fmt(resultado.dataVencimento)],
              ["Data Emissão", fmt(resultado.dataEmissao)],
              ["Nosso Número", fmt(resultado.nossoNumero)],
              ["Banco", fmt(resultado.banco)],
              ["Agência", fmt(resultado.agencia)],
              ["Conta Corrente", fmt(resultado.contaCorrente)],
              ["Código de Barras", fmt(resultado.codigoBarras)],
              ["Linha Digitável", fmt(resultado.linhaDigitavel)],
              ["Cidade/UF", [resultado.cidade, resultado.uf].filter(Boolean).join("/") || "—"],
              ["CEP", fmt(resultado.cep)],
            ].map(([label, valor]) => (
              <div key={label} style={{ padding: "6px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#1f2937", fontWeight: 500, wordBreak: "break-all" }}>{valor}</div>
              </div>
            ))}
          </div>
          {resultado.instrucoes && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "#fef3c7", borderRadius: 8, fontSize: 11 }}>
              <strong>Instruções:</strong> {resultado.instrucoes}
            </div>
          )}
          {resultado.categorias?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {resultado.categorias.map((cat: string) => (
                <span key={cat} style={{ background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{cat}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
