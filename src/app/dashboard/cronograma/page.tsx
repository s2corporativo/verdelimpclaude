"use client";
// Cronograma de serviços — programação semanal das equipes por contrato.
import { useEffect, useState, useCallback } from "react";

const STATUS: Record<string, { label: string; fundo: string; cor: string }> = {
  planejado:   { label: "Planejado",    fundo: "#e0e7ff", cor: "#3730a3" },
  em_execucao: { label: "Em execução",  fundo: "#fef3c7", cor: "#92400e" },
  concluido:   { label: "Concluído",    fundo: "#dcfce7", cor: "#15803d" },
  cancelado:   { label: "Cancelado",    fundo: "#fee2e2", cor: "#991b1b" },
};
const PROXIMO: Record<string, string> = { planejado: "em_execucao", em_execucao: "concluido" };

function inicioSemana(base: Date): Date {
  const d = new Date(base); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // segunda-feira
  return d;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function CronogramaPage() {
  const [semana, setSemana] = useState(() => inicioSemana(new Date()));
  const [contratos, setContratos] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]);
  const [filtroContrato, setFiltroContrato] = useState("");
  const [form, setForm] = useState({ contractId: "", date: "", activity: "", location: "", team: "" });
  const [msg, setMsg] = useState("");

  const fim = new Date(semana); fim.setDate(fim.getDate() + 6);

  const carregar = useCallback(async () => {
    const q = new URLSearchParams({ de: iso(semana), ate: iso(fim) });
    if (filtroContrato) q.set("contractId", filtroContrato);
    const r = await fetch(`/api/cronograma?${q}`);
    const j = await r.json();
    setItens(j.itens || []);
    setContratos(j.contratos || []);
  }, [semana, filtroContrato]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setMsg("");
    const r = await fetch("/api/cronograma", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return; }
    setForm({ ...form, activity: "", location: "", team: "" });
    carregar();
  };

  const mudarStatus = async (item: any, status: string) => {
    await fetch("/api/cronograma", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status }) });
    carregar();
  };

  const excluir = async (id: string) => {
    await fetch(`/api/cronograma?id=${id}`, { method: "DELETE" });
    carregar();
  };

  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(semana); d.setDate(d.getDate() + i); return d; });
  const nomesDias = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f5233", marginBottom: 4 }}>📅 Cronograma de Serviços</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Programação das equipes por contrato — planeje a semana e acompanhe a execução.</p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setSemana((s) => { const d = new Date(s); d.setDate(d.getDate() - 7); return d; })}
          style={{ background: "#fff", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>← Semana anterior</button>
        <span style={{ fontWeight: 800, color: "#0f5233", fontSize: 14 }}>
          {semana.toLocaleDateString("pt-BR")} a {fim.toLocaleDateString("pt-BR")}
        </span>
        <button onClick={() => setSemana((s) => { const d = new Date(s); d.setDate(d.getDate() + 7); return d; })}
          style={{ background: "#fff", border: "1px solid #d1d5db", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>Próxima semana →</button>
        <button onClick={() => setSemana(inicioSemana(new Date()))}
          style={{ background: "#f3f4f6", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>Hoje</button>
        <select value={filtroContrato} onChange={(e) => setFiltroContrato(e.target.value)}
          style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 240 }}>
          <option value="">Todos os contratos</option>
          {contratos.map((c) => <option key={c.id} value={c.id}>{c.number} — {c.client?.name || c.object}</option>)}
        </select>
      </div>

      {/* Nova atividade */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 18, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Contrato</label>
          <select value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff", minWidth: 200 }}>
            <option value="">Selecione…</option>
            {contratos.map((c) => <option key={c.id} value={c.id}>{c.number} — {c.client?.name || c.object}</option>)}
          </select></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Data</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Atividade</label>
          <input value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="Ex.: Roçada área norte"
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 220 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Local</label>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex.: Portaria 3"
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 150 }} /></div>
        <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Equipe</label>
          <input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} placeholder="Ex.: João + 2 auxiliares"
            style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 180 }} /></div>
        <button onClick={salvar} disabled={!form.contractId || !form.date || !form.activity}
          style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.contractId || !form.date || !form.activity ? 0.5 : 1 }}>
          + Programar
        </button>
        {msg && <p style={{ color: "#991b1b", fontSize: 13 }}>{msg}</p>}
      </div>

      {/* Grade semanal */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {dias.map((d, i) => {
          const doDia = itens.filter((it) => new Date(it.date).toDateString() === d.toDateString());
          const hoje = new Date().toDateString() === d.toDateString();
          return (
            <div key={i} style={{ background: hoje ? "#f0fdf4" : "#fff", borderRadius: 10, padding: 10, minHeight: 140, border: hoje ? "2px solid #1a7a4a" : "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: hoje ? "#1a7a4a" : "#374151" }}>
                {nomesDias[i]} {d.getDate().toString().padStart(2, "0")}/{(d.getMonth() + 1).toString().padStart(2, "0")}
              </p>
              {doDia.length === 0 && <p style={{ fontSize: 11, color: "#d1d5db", margin: 0 }}>—</p>}
              {doDia.map((it) => (
                <div key={it.id} style={{ background: STATUS[it.status]?.fundo || "#f3f4f6", borderRadius: 8, padding: 8, marginBottom: 6 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: STATUS[it.status]?.cor }}>{it.activity}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 10, color: "#4b5563" }}>
                    {it.contract?.number}{it.location ? ` · ${it.location}` : ""}{it.team ? ` · ${it.team}` : ""}
                  </p>
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    {PROXIMO[it.status] && (
                      <button onClick={() => mudarStatus(it, PROXIMO[it.status])}
                        style={{ background: "#fff", border: "none", padding: "3px 7px", borderRadius: 5, fontSize: 9.5, cursor: "pointer", fontWeight: 700 }}>
                        {it.status === "planejado" ? "▶ Iniciar" : "✔ Concluir"}
                      </button>
                    )}
                    {it.status !== "cancelado" && it.status !== "concluido" && (
                      <button onClick={() => mudarStatus(it, "cancelado")}
                        style={{ background: "#fff", border: "none", padding: "3px 7px", borderRadius: 5, fontSize: 9.5, cursor: "pointer" }}>✖</button>
                    )}
                    <button onClick={() => excluir(it.id)} title="Excluir"
                      style={{ background: "transparent", border: "none", padding: "3px 4px", fontSize: 9.5, cursor: "pointer", color: "#9ca3af" }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "#6b7280", marginTop: 12 }}>
        {Object.entries(STATUS).map(([k, v]) => <span key={k} style={{ marginRight: 14 }}><span style={{ background: v.fundo, color: v.cor, padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>{v.label}</span></span>)}
      </p>
    </div>
  );
}
