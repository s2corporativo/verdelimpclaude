"use client";
// NFS-e Nacional — pré-visualização da DPS e emissão (gov.br / Padrão Nacional).
// Betim aderiu ao Emissor Nacional: desde 01/01/2026 a nota sai só pelo portal
// nacional. Esta tela monta a DPS a partir dos contratos/medições e prepara a
// emissão via API do Contribuinte quando o certificado estiver configurado.
import { useEffect, useState, useCallback } from "react";

const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function NfseNacionalPage() {
  const [cfg, setCfg] = useState<any>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [medicoes, setMedicoes] = useState<any[]>([]);
  const [origem, setOrigem] = useState<"medicao" | "contrato">("medicao");
  const [selId, setSelId] = useState("");
  const [cTribNac, setCTribNac] = useState("");
  const [aliqISS, setAliqISS] = useState("");
  const [serie, setSerie] = useState("1");
  const [numero, setNumero] = useState("1");
  const [issRetido, setIssRetido] = useState(false);
  const [prev, setPrev] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    try {
      const [c, ct, md] = await Promise.all([
        fetch("/api/nfse/config").then((r) => r.json()),
        fetch("/api/contratos").then((r) => r.json()),
        fetch("/api/medicao").then((r) => r.json()),
      ]);
      setCfg(c);
      setContratos(ct.data || []);
      const meds = (md.data || []).filter((m: any) => ["aprovada", "faturada", "enviada"].includes(m.status));
      setMedicoes(meds.length ? meds : (md.data || []));
    } catch {}
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const corpo = () => {
    const base: any = { cTribNac: cTribNac || undefined, aliqISS: aliqISS || undefined, serie, numero, issRetido };
    if (selId) base[origem === "medicao" ? "measurementId" : "contractId"] = selId;
    return base;
  };

  const gerarPrevia = async () => {
    setBusy(true); setErro(""); setResultado(null); setPrev(null);
    try {
      const r = await fetch("/api/nfse/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo()) });
      const j = await r.json();
      if (!r.ok) setErro(j.error || "Erro ao gerar a prévia."); else setPrev(j);
    } catch (e: any) { setErro(e.message); }
    setBusy(false);
  };

  const emitir = async () => {
    setBusy(true); setErro(""); setResultado(null);
    try {
      const r = await fetch("/api/nfse/emitir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo()) });
      const j = await r.json();
      setResultado({ ...j, http: r.status });
    } catch (e: any) { setErro(e.message); }
    setBusy(false);
  };

  const label = { fontSize: 11, fontWeight: 700 as const, color: "#374151", display: "block" as const, marginBottom: 3 };
  const input = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: "100%" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🧾 NFS-e Nacional (gov.br)</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12, maxWidth: 760 }}>
        Monta a DPS (Declaração de Prestação de Serviço) no padrão nacional a partir dos seus contratos e medições. Betim aderiu ao Emissor Nacional — desde 01/01/2026 a nota é emitida exclusivamente pelo portal nacional.
      </p>

      {/* Prontidão */}
      {cfg && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: 0 }}>Prontidão para emissão</h2>
            <span style={{ fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 20, background: cfg.ambiente === "producao" ? "#fee2e2" : "#e0f2fe", color: cfg.ambiente === "producao" ? "#991b1b" : "#075985" }}>
              Ambiente: {cfg.ambienteLabel}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6 }}>
            {(cfg.checks || []).map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
                <span>{c.ok ? "✅" : "⛔"}</span>
                <span><strong>{c.item}:</strong> {c.valor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#92400e" }}>
        ⚠️ A emissão com validade jurídica exige <strong>certificado e-CNPJ A1</strong> configurado no servidor, testes em <strong>Produção Restrita</strong> e validação dos códigos de serviço pelo <strong>contador</strong>. Sem isso, a tela gera apenas a <strong>prévia da DPS</strong> para conferência.
      </div>

      {/* Origem dos dados */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {(["medicao", "contrato"] as const).map((o) => (
            <button key={o} onClick={() => { setOrigem(o); setSelId(""); }}
              style={{ background: origem === o ? "#334532" : "#fff", color: origem === o ? "#fff" : "#374151", border: "1px solid #d1d5db", padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {o === "medicao" ? "A partir de uma medição" : "A partir de um contrato"}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={label}>{origem === "medicao" ? "Medição" : "Contrato"}</label>
            <select value={selId} onChange={(e) => setSelId(e.target.value)} style={input as any}>
              <option value="">— selecione —</option>
              {origem === "medicao"
                ? medicoes.map((m) => <option key={m.id} value={m.id}>{m.contract?.number} · {m.period} · {brl(m.value)} · {m.status}</option>)
                : contratos.map((c) => <option key={c.id} value={c.id}>{c.number} · {c.object?.slice(0, 40)} · {brl(c.monthlyValue || c.value)}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Código de tributação nacional (contador)</label>
            <input value={cTribNac} onChange={(e) => setCTribNac(e.target.value)} placeholder="ex.: confirmar com contador" style={input as any} />
          </div>
          <div>
            <label style={label}>Alíquota ISS (%)</label>
            <input value={aliqISS} onChange={(e) => setAliqISS(e.target.value)} placeholder="padrão da empresa" style={input as any} />
          </div>
          <div>
            <label style={label}>Série</label>
            <input value={serie} onChange={(e) => setSerie(e.target.value)} style={input as any} />
          </div>
          <div>
            <label style={label}>Número da DPS</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} style={input as any} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={issRetido} onChange={(e) => setIssRetido(e.target.checked)} /> ISS retido pelo tomador
            </label>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={gerarPrevia} disabled={busy}
            style={{ background: "#4a9410", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Gerando…" : "👁️ Gerar prévia da DPS"}
          </button>
          <button onClick={emitir} disabled={busy || !prev}
            style={{ background: prev ? "#e05008" : "#e5e7eb", color: prev ? "#fff" : "#9ca3af", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: prev && !busy ? "pointer" : "default" }}>
            📤 Emitir
          </button>
        </div>
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>⛔ {erro}</div>}

      {/* Resultado da emissão */}
      {resultado && (
        <div style={{ background: resultado.emitida ? "#dcfce7" : "#fef3c7", border: `1px solid ${resultado.emitida ? "#86efac" : "#fde68a"}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: resultado.emitida ? "#15803d" : "#92400e" }}>
            {resultado.emitida ? "✅ NFS-e emitida" : "⚠️ Emissão não concluída"}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#374151" }}>{resultado.mensagem || resultado.error}</p>
          {resultado.idDPS && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6b7280" }}>ID da DPS: <code>{resultado.idDPS}</code> · Endpoint: {resultado.endpoint}</p>}
          {Array.isArray(resultado.comoResolver) && (
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#374151" }}>
              {resultado.comoResolver.map((l: string, i: number) => <li key={i} style={{ whiteSpace: "pre-wrap" }}>{l}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Prévia da DPS */}
      {prev && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: "0 0 8px" }}>Prévia da DPS · {prev.resumo?.competencia}</h2>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 10, fontSize: 12, color: "#374151" }}>
            <span><strong>Prestador:</strong> {prev.resumo?.prestador}</span>
            <span><strong>Tomador:</strong> {prev.resumo?.tomador}</span>
            <span><strong>Valor:</strong> {brl(prev.resumo?.valor)}</span>
            <span><strong>ISS:</strong> {prev.resumo?.aliqISS}%</span>
            <span><strong>Item LC116 sugerido:</strong> {prev.itemLC116Sugerido}</span>
          </div>
          {Array.isArray(prev.avisos) && prev.avisos.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
              {prev.avisos.map((a: string, i: number) => <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#92400e" }}>⚠️ {a}</p>)}
            </div>
          )}
          <pre style={{ background: "#0f172a", color: "#e2e8f0", padding: 14, borderRadius: 8, fontSize: 11, overflowX: "auto", margin: 0, maxHeight: 380 }}>{prev.xml}</pre>
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9ca3af" }}>Este XML é a DPS <strong>não assinada</strong>, para conferência. A assinatura digital é aplicada na transmissão com o certificado.</p>
        </div>
      )}
    </div>
  );
}
