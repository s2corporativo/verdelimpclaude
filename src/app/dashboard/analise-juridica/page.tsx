"use client";
// Análise Jurídica de Documento (IA) — o usuário cola um texto ou envia um PDF;
// a IA reconhece o tipo de documento e faz a leitura como um advogado especialista.
import { useState } from "react";

interface Analise {
  tipoDocumento?: string; confianca?: string; resumo?: string; partes?: string[];
  objeto?: string; valores?: string[]; prazos?: string[]; obrigacoes?: string[];
  clausulasCriticas?: string[]; riscosJuridicos?: string[]; penalidades?: string[];
  baseLegal?: string[]; pontosAtencao?: string[]; recomendacao?: string;
}

const CONF: Record<string, [string, string]> = {
  alta: ["#dcfce7", "#15803d"], media: ["#fef9c3", "#92400e"], baixa: ["#fee2e2", "#991b1b"],
};

export default function AnaliseJuridicaPage() {
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [nome, setNome] = useState<string | null>(null);

  const lerArquivoBase64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] || "");
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const analisar = async () => {
    setBusy(true); setErro(""); setAnalise(null);
    try {
      const body: any = {};
      if (arquivo) { body.pdfBase64 = await lerArquivoBase64(arquivo); body.nomeArquivo = arquivo.name; }
      if (texto.trim()) body.texto = texto.trim();
      const r = await fetch("/api/analise-documento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `Falha na análise (HTTP ${r.status})`);
      setAnalise(j.analise); setNome(j.nomeArquivo);
    } catch (e: any) { setErro(e?.message || "Falha na análise"); }
    setBusy(false);
  };

  const Bloco = ({ titulo, itens, cor = "#334532" }: { titulo: string; itens?: string[]; cor?: string }) =>
    itens && itens.length ? (
      <div style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 12, fontWeight: 800, color: cor, marginBottom: 4 }}>{titulo}</h4>
        <ul style={{ margin: 0, paddingLeft: 18 }}>{itens.map((v, i) => <li key={i} style={{ fontSize: 12, color: "#374151", padding: "1px 0" }}>{v}</li>)}</ul>
      </div>
    ) : null;

  const input = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: "100%" };
  const [cbg, cco] = CONF[analise?.confianca || "baixa"] || CONF.baixa;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>⚖️ Análise Jurídica de Documento (IA)</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16, maxWidth: 780 }}>
        Envie um <strong>PDF</strong> ou cole o <strong>texto</strong> de um documento. A IA reconhece o tipo (contrato, edital, procuração, notificação…) e faz a leitura como um <strong>advogado especialista</strong>: partes, obrigações, cláusulas críticas, riscos, penalidades, base legal e recomendação.
      </p>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label htmlFor="pdf" style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Arquivo PDF (opcional)</label>
            <input id="pdf" type="file" accept="application/pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} style={input as any} />
          </div>
          <div>
            <label htmlFor="txt" style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>Ou cole o texto do documento</label>
            <textarea id="txt" value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} placeholder="Cole aqui o conteúdo do contrato, edital, notificação…" style={{ ...input, resize: "vertical" } as any} />
          </div>
          <div>
            <button onClick={analisar} disabled={busy || (!arquivo && texto.trim().length < 20)}
              style={{ background: busy || (!arquivo && texto.trim().length < 20) ? "#9ca3af" : "#4a9410", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: busy ? "default" : "pointer" }}>
              {busy ? "⚖️ Analisando como advogado…" : "🤖 Analisar documento"}
            </button>
          </div>
        </div>
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>⛔ {erro}</div>}

      {analise && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ background: "#334532", color: "#fff", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 800 }}>📄 {analise.tipoDocumento}</span>
            <span style={{ background: cbg, color: cco, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>confiança: {analise.confianca}</span>
            {nome && <span style={{ fontSize: 11, color: "#9ca3af" }}>{nome}</span>}
          </div>

          {analise.resumo && <p style={{ fontSize: 13, color: "#374151", background: "#f9fafb", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>{analise.resumo}</p>}

          {analise.objeto && (
            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: "#334532", marginBottom: 4 }}>🎯 Objeto</h4>
              <p style={{ fontSize: 12, color: "#374151" }}>{analise.objeto}</p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div>
              <Bloco titulo="🤝 Partes" itens={analise.partes} />
              <Bloco titulo="💰 Valores" itens={analise.valores} />
              <Bloco titulo="📅 Prazos" itens={analise.prazos} />
              <Bloco titulo="📌 Obrigações" itens={analise.obrigacoes} />
            </div>
            <div>
              <Bloco titulo="⚠️ Cláusulas críticas" itens={analise.clausulasCriticas} cor="#b45309" />
              <Bloco titulo="⚖️ Riscos jurídicos" itens={analise.riscosJuridicos} cor="#991b1b" />
              <Bloco titulo="🚫 Penalidades / multas" itens={analise.penalidades} cor="#991b1b" />
              <Bloco titulo="📚 Base legal" itens={analise.baseLegal} cor="#1d4ed8" />
              <Bloco titulo="🔎 Pontos de atenção" itens={analise.pontosAtencao} cor="#b45309" />
            </div>
          </div>

          {analise.recomendacao && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginTop: 8 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: "#15803d", marginBottom: 4 }}>✅ Recomendação</h4>
              <p style={{ fontSize: 12, color: "#166534" }}>{analise.recomendacao}</p>
            </div>
          )}

          <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 14 }}>
            Parecer gerado por IA como apoio à decisão — não substitui a análise de um advogado responsável. Confira sempre o documento original.
          </p>
        </div>
      )}
    </div>
  );
}
