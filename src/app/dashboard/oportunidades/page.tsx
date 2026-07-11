"use client";
// CRM de Oportunidades — funil comercial para clientes privados.
import { useEffect, useState, useCallback } from "react";

const ESTAGIOS: { key: string; label: string; cor: string }[] = [
  { key: "lead", label: "Lead", cor: "#6b7280" },
  { key: "qualificado", label: "Qualificado", cor: "#1d4ed8" },
  { key: "proposta", label: "Proposta enviada", cor: "#b45309" },
  { key: "negociacao", label: "Negociação", cor: "#7c3aed" },
  { key: "ganho", label: "✅ Ganho", cor: "#15803d" },
  { key: "perdido", label: "❌ Perdido", cor: "#991b1b" },
];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function OportunidadesPage() {
  const [dados, setDados] = useState<any>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ prospectName: "", contactName: "", phone: "", serviceType: "", estimatedValue: "", origin: "indicação", nextAction: "", nextActionDate: "" });
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => { const r = await fetch("/api/oportunidades"); setDados(await r.json()); }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setMsg("");
    const r = await fetch("/api/oportunidades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return; }
    setForm({ prospectName: "", contactName: "", phone: "", serviceType: "", estimatedValue: "", origin: "indicação", nextAction: "", nextActionDate: "" });
    setMostrarForm(false);
    carregar();
  };

  const mover = async (o: any, stage: string) => {
    await fetch("/api/oportunidades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: o.id, stage }) });
    carregar();
  };

  const excluir = async (id: string) => { await fetch(`/api/oportunidades?id=${id}`, { method: "DELETE" }); carregar(); };

  if (!dados) return <p style={{ color: "#6b7280" }}>Carregando…</p>;

  const input = (k: string, label: string, extra: any = {}) => (
    <div><label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>{label}</label>
      <input type={extra.type || "text"} value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={extra.ph}
        style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: extra.width || 170 }} /></div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#0f5233", marginBottom: 4 }}>🎯 Oportunidades (CRM)</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
            Funil comercial de clientes privados · Em aberto: <strong style={{ color: "#0f5233" }}>{brl(dados.valorEmAberto || 0)}</strong>
          </p>
        </div>
        <button onClick={() => setMostrarForm(!mostrarForm)}
          style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          + Nova oportunidade
        </button>
      </div>

      {mostrarForm && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 16, margin: "14px 0", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          {input("prospectName", "Cliente / Empresa", { width: 220, ph: "Ex.: Condomínio Jardins" })}
          {input("contactName", "Contato", { ph: "Nome do responsável" })}
          {input("phone", "Telefone", { width: 140 })}
          {input("serviceType", "Serviço", { ph: "Roçada, jardinagem…" })}
          {input("estimatedValue", "Valor estimado (R$)", { type: "number", width: 140 })}
          {input("nextAction", "Próxima ação", { ph: "Ligar, visitar, enviar proposta…", width: 200 })}
          {input("nextActionDate", "Quando", { type: "date", width: 140 })}
          <button onClick={salvar} disabled={!form.prospectName}
            style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.prospectName ? 0.5 : 1 }}>Salvar</button>
          {msg && <span style={{ color: "#991b1b", fontSize: 12 }}>{msg}</span>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginTop: 14 }}>
        {ESTAGIOS.map((e) => {
          const doEstagio = dados.oportunidades.filter((o: any) => o.stage === e.key);
          const soma = doEstagio.reduce((s: number, o: any) => s + Number(o.estimatedValue || 0), 0);
          return (
            <div key={e.key} style={{ background: "#f9fafb", borderRadius: 10, padding: 10, borderTop: `3px solid ${e.cor}` }}>
              <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 800, color: e.cor }}>{e.label} ({doEstagio.length})</p>
              <p style={{ margin: "0 0 8px", fontSize: 10, color: "#6b7280" }}>{soma > 0 ? brl(soma) : "—"}</p>
              {doEstagio.map((o: any) => (
                <div key={o.id} style={{ background: "#fff", borderRadius: 8, padding: 10, marginBottom: 8, boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#111827" }}>{o.prospectName}</p>
                  {o.serviceType && <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "#6b7280" }}>{o.serviceType}</p>}
                  {o.estimatedValue && <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: "#0f5233" }}>{brl(Number(o.estimatedValue))}</p>}
                  {(o.contactName || o.phone) && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#6b7280" }}>{[o.contactName, o.phone].filter(Boolean).join(" · ")}</p>}
                  {o.nextAction && (
                    <p style={{ margin: "4px 0 0", fontSize: 10, color: "#b45309", fontWeight: 700 }}>
                      ⏰ {o.nextAction}{o.nextActionDate ? ` — ${new Date(o.nextActionDate).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    <select value={o.stage} onChange={(ev) => mover(o, ev.target.value)}
                      style={{ fontSize: 10, padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#fff", flex: 1 }}>
                      {ESTAGIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <button onClick={() => excluir(o.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 11 }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
