"use client";
// NFS-e Nacional — a emissão é feita DIRETAMENTE no Portal Nacional (gov.br).
// Esta tela: (1) monta a prévia/dados da DPS a partir de contratos/medições para
// copiar no portal, (2) abre o Emissor Nacional e (3) registra e armazena a nota
// emitida (número + chave de acesso + link do PDF).
import { useEffect, useState, useCallback } from "react";

const brl = (v: number) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PORTAL_EMISSOR = "https://www.nfse.gov.br/EmissorNacional";
const PORTAL_CONSULTA = "https://www.nfse.gov.br/consultapublica";

export default function NfseNacionalPage() {
  const [cfg, setCfg] = useState<any>(null);
  const [contratos, setContratos] = useState<any[]>([]);
  const [medicoes, setMedicoes] = useState<any[]>([]);
  const [emitidas, setEmitidas] = useState<any[]>([]);
  const [origem, setOrigem] = useState<"medicao" | "contrato">("medicao");
  const [selId, setSelId] = useState("");
  const [aliqISS, setAliqISS] = useState("");
  const [issRetido, setIssRetido] = useState(false);
  const [prev, setPrev] = useState<any>(null);
  const [dados, setDados] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  // Registro da nota emitida no portal
  const [numero, setNumero] = useState("");
  const [chave, setChave] = useState("");
  const [pdfLink, setPdfLink] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [regMsg, setRegMsg] = useState("");

  const carregar = useCallback(async () => {
    try {
      const [c, ct, md, nf] = await Promise.all([
        fetch("/api/nfse/config").then((r) => r.json()),
        fetch("/api/contratos").then((r) => r.json()),
        fetch("/api/medicao").then((r) => r.json()),
        fetch("/api/fiscal/nfse").then((r) => r.json()),
      ]);
      setCfg(c);
      setContratos(ct.data || []);
      const meds = (md.data || []).filter((m: any) => ["aprovada", "faturada", "enviada"].includes(m.status));
      setMedicoes(meds.length ? meds : (md.data || []));
      setEmitidas(nf._demo ? [] : (nf.data || []));
    } catch {}
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const corpo = () => {
    const base: any = { aliqISS: aliqISS || undefined, issRetido };
    if (selId) base[origem === "medicao" ? "measurementId" : "contractId"] = selId;
    return base;
  };

  const gerarPrevia = async () => {
    setBusy(true); setErro(""); setPrev(null); setDados(null);
    try {
      const [rp, re] = await Promise.all([
        fetch("/api/nfse/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo()) }),
        fetch("/api/nfse/emitir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo()) }),
      ]);
      const jp = await rp.json();
      const je = await re.json();
      if (!rp.ok) { setErro(jp.error || "Erro ao gerar a prévia."); }
      else { setPrev(jp); setDados(je.dados || null); if (je.dados) setNumero(""); }
    } catch (e: any) { setErro(e.message); }
    setBusy(false);
  };

  const registrar = async () => {
    setBusy(true); setErro(""); setRegMsg("");
    try {
      const body: any = { ...corpo(), numero, chaveAcesso: chave || undefined, pdfLink: pdfLink || undefined, dataEmissao: dataEmissao || undefined };
      const r = await fetch("/api/nfse/registrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Erro ao registrar a nota."); }
      else {
        setRegMsg(`✅ NFS-e ${j.nfse?.number} registrada e armazenada.`);
        setNumero(""); setChave(""); setPdfLink(""); setDataEmissao("");
        carregar();
      }
    } catch (e: any) { setErro(e.message); }
    setBusy(false);
  };

  const label = { fontSize: 11, fontWeight: 700 as const, color: "#374151", display: "block" as const, marginBottom: 3 };
  const input = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: "100%" };
  const btn = (bg: string) => ({ background: bg, color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 800, cursor: busy ? "default" as const : "pointer" as const, opacity: busy ? 0.6 : 1 });

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🧾 NFS-e Nacional (gov.br)</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12, maxWidth: 780 }}>
        A emissão é feita <strong>diretamente no Portal Nacional (gov.br)</strong>. Aqui você monta os dados da nota a partir de contratos/medições, abre o Emissor Nacional e registra a nota emitida — que fica armazenada no sistema.
      </p>

      {/* Ações do portal */}
      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <a href={PORTAL_EMISSOR} target="_blank" rel="noopener noreferrer" style={{ ...btn("#1d4ed8"), textDecoration: "none", display: "inline-block" }}>🌐 Emitir no Portal gov.br</a>
        <a href={PORTAL_CONSULTA} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#1d4ed8" }}>🔎 Consulta pública de NFS-e →</a>
        <span style={{ fontSize: 11, color: "#6b7280" }}>Login gov.br (nível prata/ouro) ou certificado e-CNPJ. Betim emite só pelo portal nacional desde 01/01/2026.</span>
      </div>

      {/* Prontidão dos dados do prestador */}
      {cfg && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: "0 0 10px" }}>Dados do prestador</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 6 }}>
            {(cfg.checks || []).filter((c: any) => c.item !== "Certificado digital (servidor)").map((c: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#374151" }}>
                <span>{c.ok ? "✅" : "⛔"}</span>
                <span><strong>{c.item}:</strong> {c.valor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <label style={label}>Alíquota ISS (%)</label>
            <input value={aliqISS} onChange={(e) => setAliqISS(e.target.value)} placeholder="padrão da empresa" style={input as any} />
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <label style={{ fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={issRetido} onChange={(e) => setIssRetido(e.target.checked)} /> ISS retido pelo tomador
            </label>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button onClick={gerarPrevia} disabled={busy} style={btn("#4a9410")}>
            {busy ? "Gerando…" : "👁️ Preparar dados da nota"}
          </button>
        </div>
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>⛔ {erro}</div>}

      {/* Dados prontos para copiar no portal */}
      {dados && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: "0 0 4px" }}>📋 Dados para copiar no Emissor Nacional</h2>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 10px" }}>Preencha o formulário do portal gov.br com estes dados. Depois de emitir, registre a nota abaixo.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, fontSize: 12, color: "#374151" }}>
            <span><strong>Prestador:</strong> {dados.prestador} ({dados.cnpjPrestador})</span>
            <span><strong>Município:</strong> {dados.municipio} · IBGE {dados.codigoIBGE || "—"}</span>
            <span><strong>Tomador:</strong> {dados.tomador} {dados.docTomador ? `(${dados.docTomador})` : ""}</span>
            <span><strong>Competência:</strong> {dados.competencia}</span>
            <span><strong>Valor do serviço:</strong> {brl(dados.valorServico)}</span>
            <span><strong>Alíquota ISS:</strong> {dados.aliqISS}% {dados.issRetido ? "(retido)" : ""}</span>
            <span><strong>Item LC 116 sugerido:</strong> {dados.itemLC116Sugerido}</span>
            <span style={{ gridColumn: "1 / -1" }}><strong>Descrição:</strong> {dados.descricao}</span>
          </div>
          {Array.isArray(prev?.avisos) && prev.avisos.length > 0 && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginTop: 10 }}>
              {prev.avisos.map((a: string, i: number) => <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#92400e" }}>⚠️ {a}</p>)}
            </div>
          )}

          {/* Registro da nota emitida */}
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 14, paddingTop: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#334532", margin: "0 0 10px" }}>💾 Registrar nota emitida</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <label style={label}>Número da NFS-e *</label>
                <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="do portal gov.br" style={input as any} />
              </div>
              <div>
                <label style={label}>Chave de acesso</label>
                <input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="chave / cód. verificação" style={input as any} />
              </div>
              <div>
                <label style={label}>Data de emissão</label>
                <input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} style={input as any} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={label}>Link do PDF / DANFSE</label>
                <input value={pdfLink} onChange={(e) => setPdfLink(e.target.value)} placeholder="https://…" style={input as any} />
              </div>
            </div>
            <button onClick={registrar} disabled={busy || !numero} style={{ ...btn(numero ? "#e05008" : "#e5e7eb"), marginTop: 12, color: numero ? "#fff" : "#9ca3af" }}>
              💾 Registrar e armazenar
            </button>
            {regMsg && <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: "#15803d" }}>{regMsg}</p>}
          </div>
        </div>
      )}

      {/* Notas emitidas armazenadas */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: "0 0 10px" }}>📑 Notas emitidas ({emitidas.length})</h2>
        {emitidas.length === 0
          ? <p style={{ fontSize: 12, color: "#9ca3af" }}>Nenhuma NFS-e registrada ainda. Emita no portal gov.br e registre acima.</p>
          : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <caption style={{ textAlign: "left", fontSize: 11, color: "#9ca3af", marginBottom: 6 }}>NFS-e armazenadas no sistema</caption>
                <thead>
                  <tr style={{ textAlign: "left", color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>
                    <th scope="col" style={{ padding: "6px 8px" }}>Número</th>
                    <th scope="col" style={{ padding: "6px 8px" }}>Tomador</th>
                    <th scope="col" style={{ padding: "6px 8px" }}>Competência</th>
                    <th scope="col" style={{ padding: "6px 8px" }}>Valor</th>
                    <th scope="col" style={{ padding: "6px 8px" }}>ISS</th>
                    <th scope="col" style={{ padding: "6px 8px" }}>Status</th>
                    <th scope="col" style={{ padding: "6px 8px" }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {emitidas.map((n) => (
                    <tr key={n.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "6px 8px", fontWeight: 700 }}>{n.number}{n.accessKey ? <span title={n.accessKey} style={{ color: "#9ca3af", fontWeight: 400 }}> 🔑</span> : null}</td>
                      <td style={{ padding: "6px 8px" }}>{n.receiverName || n.client?.name || "—"}</td>
                      <td style={{ padding: "6px 8px" }}>{n.competence}</td>
                      <td style={{ padding: "6px 8px" }}>{brl(n.serviceValue)}</td>
                      <td style={{ padding: "6px 8px" }}>{brl(n.issAmount)} {n.issRetained ? "(ret.)" : ""}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <span style={{ background: n.status === "emitida" ? "#dcfce7" : "#f3f4f6", color: n.status === "emitida" ? "#15803d" : "#374151", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{n.status}</span>
                      </td>
                      <td style={{ padding: "6px 8px" }}>{n.pdfLink ? <a href={n.pdfLink} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8", fontWeight: 700 }}>abrir</a> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}
