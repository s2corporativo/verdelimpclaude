"use client";
// Rentabilidade por contrato — quanto cada contrato está dando de margem.
import { useEffect, useState, useCallback } from "react";

const CATS: Record<string, string> = {
  mao_obra: "Mão de obra", material: "Material", equipamento: "Equipamento",
  combustivel: "Combustível", combustivel_auto: "Combustível (módulo)", terceiros: "Terceiros",
  administrativo: "Administrativo", outros: "Outros",
};
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RentabilidadePage() {
  const [linhas, setLinhas] = useState<any[]>([]);
  const [aberto, setAberto] = useState<string>("");
  const [detalhe, setDetalhe] = useState<any>(null);
  const [form, setForm] = useState({ contractId: "", date: "", category: "mao_obra", description: "", amount: "" });
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async (cid?: string) => {
    const r = await fetch(`/api/rentabilidade${cid ? `?contractId=${cid}` : ""}`);
    const j = await r.json();
    setLinhas(j.linhas || []);
    if (cid) setDetalhe((j.linhas || []).find((l: any) => l.id === cid) || null);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const abrir = (id: string) => {
    const novo = aberto === id ? "" : id;
    setAberto(novo);
    setDetalhe(null);
    if (novo) { setForm((f) => ({ ...f, contractId: novo })); carregar(novo); }
  };

  const salvarCusto = async () => {
    setMsg("");
    const r = await fetch("/api/rentabilidade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return; }
    setForm((f) => ({ ...f, description: "", amount: "" }));
    carregar(aberto);
  };

  const excluirCusto = async (id: string) => {
    await fetch(`/api/rentabilidade?id=${id}`, { method: "DELETE" });
    carregar(aberto);
  };

  const corMargem = (pct: number | null) => (pct === null ? "#6b7280" : pct < 0 ? "#991b1b" : pct < 15 ? "#b45309" : "#15803d");

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>💹 Rentabilidade por Contrato</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Receita = medições aprovadas/faturadas. Custos = lançamentos manuais + combustível vinculado ao contrato. Clique num contrato para lançar custos.
      </p>

      {linhas.map((l) => (
        <div key={l.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
          <button onClick={() => abrir(l.id)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: 200 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#111827" }}>{l.number} — {l.cliente}</p>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{l.object} · {l.status}</p>
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <p style={{ margin: 0, fontSize: 10, color: "#6b7280", fontWeight: 700 }}>RECEITA MEDIDA</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#334532" }}>{brl(l.receita)}</p>
            </div>
            <div style={{ flex: 1, minWidth: 110 }}>
              <p style={{ margin: 0, fontSize: 10, color: "#6b7280", fontWeight: 700 }}>CUSTOS</p>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#991b1b" }}>{brl(l.custoTotal)}</p>
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <p style={{ margin: 0, fontSize: 10, color: "#6b7280", fontWeight: 700 }}>MARGEM</p>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 15, color: corMargem(l.margemPct) }}>
                {brl(l.margem)}{l.margemPct !== null ? ` (${l.margemPct.toFixed(1)}%)` : ""}
              </p>
            </div>
            <span style={{ fontSize: 16, color: "#9ca3af" }}>{aberto === l.id ? "▲" : "▼"}</span>
          </button>

          {aberto === l.id && (
            <div style={{ borderTop: "1px solid #f3f4f6", padding: 18 }}>
              {/* Lançar custo */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Data</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Categoria</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff" }}>
                    {Object.entries(CATS).filter(([k]) => k !== "combustivel_auto").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Descrição</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Folha equipe julho"
                    style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 240 }} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Valor (R$)</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 120 }} /></div>
                <button onClick={salvarCusto} disabled={!form.description || !form.amount}
                  style={{ background: "#4a9410", color: "#fff", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.description || !form.amount ? 0.5 : 1 }}>
                  + Lançar custo
                </button>
                {msg && <span style={{ color: "#991b1b", fontSize: 12 }}>{msg}</span>}
              </div>

              {/* Custos por categoria */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {Object.entries(l.porCategoria).map(([k, v]: any) => (
                  <span key={k} style={{ background: "#f3f4f6", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#374151" }}>
                    {CATS[k] || k}: {brl(v)}
                  </span>
                ))}
                {l.custoMensalEquipe > 0 && (
                  <span style={{ background: "#eff6ff", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>
                    ℹ Equipe mobilizada custa {brl(l.custoMensalEquipe)}/mês (referência)
                  </span>
                )}
              </div>

              {/* Lista de custos */}
              {detalhe?.custos?.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 6 }}>Data</th><th style={{ padding: 6 }}>Categoria</th><th style={{ padding: 6 }}>Descrição</th><th style={{ padding: 6, textAlign: "right" }}>Valor</th><th></th>
                  </tr></thead>
                  <tbody>
                    {detalhe.custos.map((c: any) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: 6 }}>{new Date(c.date).toLocaleDateString("pt-BR")}</td>
                        <td style={{ padding: 6 }}>{CATS[c.category] || c.category}</td>
                        <td style={{ padding: 6 }}>{c.description}</td>
                        <td style={{ padding: 6, textAlign: "right", fontWeight: 700 }}>{brl(Number(c.amount))}</td>
                        <td style={{ padding: 6 }}><button onClick={() => excluirCusto(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
      {linhas.length === 0 && <p style={{ color: "#6b7280", fontSize: 13 }}>Nenhum contrato cadastrado ainda.</p>}
    </div>
  );
}
