"use client";
// Registros ambientais — licenças, DOF, autorização de poda, descarte de resíduos.
import { useEffect, useState, useCallback } from "react";

const TIPOS: Record<string, string> = {
  licenca: "Licença ambiental", dof: "DOF — Documento de Origem Florestal", autorizacao_poda: "Autorização de poda/supressão",
  descarte: "Comprovante de descarte de resíduos", condicionante: "Condicionante ambiental", outros: "Outros",
};
const UI: Record<string, [string, string, string]> = { valido: ["Vigente", "#dcfce7", "#15803d"], a_vencer: ["A vencer", "#fef3c7", "#92400e"], vencido: ["Vencido", "#fee2e2", "#991b1b"], faltante: ["—", "#f3f4f6", "#374151"] };
const fdata = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export default function AmbientalPage() {
  const [dados, setDados] = useState<any>(null);
  const [form, setForm] = useState({ type: "licenca", number: "", agency: "", contractId: "", issuedAt: "", expiresAt: "", notes: "" });
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => { const r = await fetch("/api/ambiental"); setDados(await r.json()); }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setMsg("");
    const r = await fetch("/api/ambiental", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return; }
    setForm({ type: "licenca", number: "", agency: "", contractId: "", issuedAt: "", expiresAt: "", notes: "" });
    carregar();
  };

  const excluir = async (id: string) => { await fetch(`/api/ambiental?id=${id}`, { method: "DELETE" }); carregar(); };

  const card = (t: string, v: any, cor: string) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, borderLeft: `4px solid ${cor}` }}>
      <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t}</p>
      <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, color: cor }}>{v}</p>
    </div>
  );

  if (!dados) return <p style={{ color: "#6b7280" }}>Carregando…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🌱 Registros Ambientais</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Licenças, DOF, autorizações de poda/supressão e comprovantes de descarte — com alerta de vencimento.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {card("Registros", dados.resumo.total, "#4a9410")}
        {card("Vencidos", dados.resumo.vencidos, "#991b1b")}
        {card("A vencer (30 dias)", dados.resumo.aVencer, "#b45309")}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Tipo</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 220 }}>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Número</label>
          <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 130 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Órgão emissor</label>
          <input value={form.agency} onChange={(e) => setForm({ ...form, agency: e.target.value })} placeholder="Prefeitura, IEF, IBAMA…" style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 170 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Contrato (opcional)</label>
          <select value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 180 }}>
            <option value="">Geral da empresa</option>
            {dados.contratos.map((c: any) => <option key={c.id} value={c.id}>{c.number} — {c.client?.name || c.object}</option>)}
          </select></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Emissão</label>
          <input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Válido até</label>
          <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} /></div>
        <button onClick={salvar}
          style={{ background: "#4a9410", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Registrar</button>
        {msg && <span style={{ color: "#991b1b", fontSize: 12 }}>{msg}</span>}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Tipo</th><th style={{ padding: 8 }}>Número</th><th style={{ padding: 8 }}>Órgão</th><th style={{ padding: 8 }}>Contrato</th><th style={{ padding: 8 }}>Emissão</th><th style={{ padding: 8 }}>Validade</th><th style={{ padding: 8 }}>Situação</th><th></th>
            </tr></thead>
            <tbody>
              {dados.linhas.map((l: any) => (
                <tr key={l.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: 8, fontWeight: 700 }}>{TIPOS[l.type] || l.type}</td>
                  <td style={{ padding: 8 }}>{l.number || "—"}</td>
                  <td style={{ padding: 8 }}>{l.agency || "—"}</td>
                  <td style={{ padding: 8 }}>{l.contract ? `${l.contract.number} — ${l.contract.client?.name || ""}` : "Geral"}</td>
                  <td style={{ padding: 8 }}>{fdata(l.issuedAt)}</td>
                  <td style={{ padding: 8 }}>{fdata(l.expiresAt)}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{ background: UI[l.situacao][1], color: UI[l.situacao][2], padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{UI[l.situacao][0]}</span>
                  </td>
                  <td style={{ padding: 8 }}><button onClick={() => excluir(l.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }}>🗑</button></td>
                </tr>
              ))}
              {dados.linhas.length === 0 && <tr><td colSpan={8} style={{ padding: 16, color: "#6b7280", textAlign: "center" }}>Nenhum registro ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
