"use client";
// Monitor de Documentação — matriz funcionário × requisito por contrato,
// com semáforo de validade e registro rápido em cada célula.
import { useEffect, useState, useCallback } from "react";

const UI: Record<string, { label: string; cor: string; fundo: string; icone: string }> = {
  valido:   { label: "Válido",   cor: "#15803d", fundo: "#dcfce7", icone: "🟢" },
  a_vencer: { label: "A vencer", cor: "#92400e", fundo: "#fef3c7", icone: "🟡" },
  vencido:  { label: "Vencido",  cor: "#991b1b", fundo: "#fee2e2", icone: "🔴" },
  faltante: { label: "Faltante", cor: "#374151", fundo: "#f3f4f6", icone: "⚪" },
};

const fdata = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export default function MonitorDocsPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [contractId, setContractId] = useState("");
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const [msg, setMsg] = useState("");
  const [celula, setCelula] = useState<any>(null); // célula/registro em edição
  const [form, setForm] = useState({ issuedAt: "", expiresAt: "", notes: "" });
  const [novoReq, setNovoReq] = useState({ name: "", scope: "FUNCIONARIO", validityDays: "" });
  const [mostrarNovoReq, setMostrarNovoReq] = useState(false);

  const carregar = useCallback(async (cid: string) => {
    setCarregando(true);
    const r = await fetch(`/api/monitor-docs${cid ? `?contractId=${cid}` : ""}`);
    const j = await r.json();
    setContratos(j.contratos || []);
    setDados(cid ? j : null);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(contractId); }, [contractId, carregar]);

  const post = async (body: any) => {
    setMsg("");
    const r = await fetch("/api/monitor-docs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return false; }
    await carregar(contractId);
    return true;
  };

  const abrirCelula = (c: any, requisito: any, funcionario: any | null) => {
    setCelula({ ...c, requisitoNome: requisito.name, funcionarioNome: funcionario?.name || "EMPRESA", employeeId: funcionario?.id || null });
    setForm({
      issuedAt: c.issuedAt ? c.issuedAt.slice(0, 10) : "",
      expiresAt: c.expiresAt ? String(c.expiresAt).slice(0, 10) : "",
      notes: c.notes || "",
    });
  };

  const salvarRegistro = async () => {
    const ok = await post({ action: "registro", recordId: celula.recordId, requirementId: celula.requirementId, employeeId: celula.employeeId, ...form });
    if (ok) setCelula(null);
  };

  const card = (t: string, v: number | string, cor: string) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, borderLeft: `4px solid ${cor}` }}>
      <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t}</p>
      <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, color: cor }}>{v}</p>
    </div>
  );

  const badge = (status: string, texto?: string) => {
    const u = UI[status];
    return <span style={{ background: u.fundo, color: u.cor, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{u.icone} {texto ?? u.label}</span>;
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f5233", marginBottom: 4 }}>🚦 Monitor de Documentação</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Situação dos documentos exigidos pela contratante, por funcionário mobilizado. ASO, treinamentos NR e EPI entram automaticamente dos módulos correspondentes.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <select value={contractId} onChange={(e) => setContractId(e.target.value)}
          style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, minWidth: 320, background: "#fff" }}>
          <option value="">Selecione o contrato…</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.number} — {c.client?.name || c.object}</option>)}
        </select>
        {contractId && (
          <>
            <button onClick={() => post({ action: "aplicarModelo", modelo: "SST", contractId })}
              title="Relação de documentos de SST do Grupo SADA (19 itens) — só adiciona o que ainda não existe"
              style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ✨ Modelo SST (19 itens)
            </button>
            <button onClick={() => post({ action: "aplicarModelo", modelo: "CONTRATUAL", contractId })}
              title="Condições Gerais do Grupo SADA, cláusula 6.12 — folha, ponto, FGTS, INSS, GFIP, balanço, seguros… — só adiciona o que ainda não existe"
              style={{ background: "#0f5233", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              📋 Modelo Contratual SADA (cl. 6.12)
            </button>
          </>
        )}
        {contractId && (
          <button onClick={() => setMostrarNovoReq(!mostrarNovoReq)}
            style={{ background: "#fff", color: "#1a7a4a", border: "1px solid #1a7a4a", padding: "9px 14px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + Requisito
          </button>
        )}
      </div>

      {msg && <p style={{ color: "#991b1b", fontSize: 13 }}>{msg}</p>}
      {carregando && <p style={{ color: "#6b7280", fontSize: 13 }}>Carregando…</p>}

      {mostrarNovoReq && contractId && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Nome do documento</label>
            <input value={novoReq.name} onChange={(e) => setNovoReq({ ...novoReq, name: e.target.value })} placeholder="Ex.: Crachá da contratante"
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 260 }} /></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Escopo</label>
            <select value={novoReq.scope} onChange={(e) => setNovoReq({ ...novoReq, scope: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}>
              <option value="FUNCIONARIO">Por funcionário</option><option value="EMPRESA">Da empresa</option>
            </select></div>
          <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Validade (dias)</label>
            <input value={novoReq.validityDays} onChange={(e) => setNovoReq({ ...novoReq, validityDays: e.target.value })} placeholder="vazio = sem"
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 110 }} /></div>
          <button onClick={async () => { if (novoReq.name && await post({ action: "requisito", contractId, ...novoReq })) { setNovoReq({ name: "", scope: "FUNCIONARIO", validityDays: "" }); setMostrarNovoReq(false); } }}
            style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Adicionar</button>
        </div>
      )}

      {dados && contractId && (
        <>
          <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
            {card("Funcionários mobilizados", dados.resumo.funcionarios, "#1a7a4a")}
            {card("Vencidos", dados.resumo.vencidos, "#991b1b")}
            {card("A vencer (30 dias)", dados.resumo.aVencer, "#b45309")}
            {card("Faltantes", dados.resumo.faltantes, "#374151")}
          </div>

          {/* Documentos da empresa */}
          {dados.requisitosEmpresa.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f5233", margin: "0 0 10px" }}>📄 Documentos da empresa</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Documento</th><th style={{ padding: 8 }}>Ref.</th><th style={{ padding: 8 }}>Emissão</th><th style={{ padding: 8 }}>Validade</th><th style={{ padding: 8 }}>Status</th><th style={{ padding: 8 }}></th>
                  </tr></thead>
                  <tbody>
                    {dados.requisitosEmpresa.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: 8, fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: 8, color: "#6b7280" }}>{r.itemRef || "—"}</td>
                        <td style={{ padding: 8 }}>{fdata(r.issuedAt)}</td>
                        <td style={{ padding: 8 }}>{fdata(r.expiresAt)}</td>
                        <td style={{ padding: 8 }}>{badge(r.status)}</td>
                        <td style={{ padding: 8 }}>
                          <button onClick={() => abrirCelula({ requirementId: r.id, recordId: r.recordId, issuedAt: r.issuedAt, expiresAt: r.expiresAt, notes: r.notes }, r, null)}
                            style={{ background: "#f3f4f6", border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", fontWeight: 700 }}>Registrar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Matriz por funcionário */}
          {dados.requisitosFuncionario.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 800, color: "#0f5233", margin: "0 0 10px" }}>👷 Matriz por funcionário {dados.matriz.length === 0 && <span style={{ color: "#b45309", fontWeight: 600 }}>— nenhum funcionário mobilizado neste contrato (mobilize em RH → Mobilizações)</span>}</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: 8, textAlign: "left", position: "sticky", left: 0, background: "#fff", minWidth: 160 }}>Funcionário</th>
                      {dados.requisitosFuncionario.map((r: any) => (
                        <th key={r.id} style={{ padding: "8px 6px", textAlign: "center", minWidth: 108, fontWeight: 700, color: "#374151" }}>
                          {r.name.length > 34 ? r.name.slice(0, 32) + "…" : r.name}
                          {r.autoSource && <span title="Preenchido automaticamente" style={{ display: "block", color: "#1a7a4a", fontWeight: 600 }}>⚙ auto</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.matriz.map((linha: any) => (
                      <tr key={linha.funcionario.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: 8, fontWeight: 700, position: "sticky", left: 0, background: "#fff" }}>
                          {linha.funcionario.name}
                          <span style={{ display: "block", fontWeight: 400, color: "#6b7280" }}>{linha.funcionario.role}</span>
                        </td>
                        {linha.celulas.map((c: any, i: number) => {
                          const r = dados.requisitosFuncionario[i];
                          return (
                            <td key={r.id} style={{ padding: 4, textAlign: "center" }}>
                              <button onClick={() => abrirCelula(c, r, linha.funcionario)} title={c.origem ? `Origem: ${c.origem}` : "Clique para registrar"}
                                style={{ background: UI[c.status].fundo, color: UI[c.status].cor, border: "none", padding: "6px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, cursor: "pointer", width: "100%" }}>
                                {UI[c.status].icone} {c.expiresAt ? fdata(c.expiresAt) : UI[c.status].label}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 10 }}>
                🟢 válido · 🟡 vence em até 30 dias · 🔴 vencido · ⚪ faltante — clique numa célula para registrar/atualizar o documento. Células "⚙ auto" leem ASO, Treinamentos e EPI automaticamente; um registro manual tem prioridade.
              </p>
            </div>
          )}
        </>
      )}

      {/* Editor de registro */}
      {celula && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setCelula(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 420, maxWidth: "92vw" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#0f5233" }}>{celula.requisitoNome}</h3>
            <p style={{ margin: "0 0 14px", fontSize: 12, color: "#6b7280" }}>{celula.funcionarioNome}{celula.origem && celula.origem !== "manual" ? ` · hoje preenchido por: ${celula.origem}` : ""}</p>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>Data de emissão</label>
            <input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, marginBottom: 10 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>Válido até</label>
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, marginBottom: 10 }} />
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151" }}>Observações</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex.: nº do certificado, onde está arquivado…"
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setCelula(null)} style={{ background: "#f3f4f6", border: "none", padding: "9px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Cancelar</button>
              <button onClick={salvarRegistro} style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 700 }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
