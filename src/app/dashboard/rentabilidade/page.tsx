"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const CATEGORIES: Record<string, string> = {
  mao_obra: "Mão de obra",
  material: "Material",
  equipamento: "Equipamento",
  combustivel: "Combustível",
  combustivel_auto: "Combustível vinculado",
  mao_de_obra_auto: "Equipe mobilizada",
  custos_diretos_diario: "Custos diretos dos diários",
  terceiros: "Terceiros",
  administrativo: "Administrativo",
  outros: "Outros",
};

const money = (value: unknown) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fieldStyle: React.CSSProperties = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff" };

function marginColor(value: number | null) {
  if (value === null) return "#6b7280";
  if (value < 0) return "#991b1b";
  if (value < 15) return "#b45309";
  return "#15803d";
}

export default function RentabilidadePage() {
  const [lines, setLines] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [openId, setOpenId] = useState("");
  const [detail, setDetail] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ contractId: "", date: "", category: "outros", description: "", amount: "" });

  const load = useCallback(async (contractId?: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rentabilidade${contractId ? `?contractId=${encodeURIComponent(contractId)}` : ""}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar a rentabilidade");
      if (contractId) setDetail((body.linhas || [])[0] || null);
      else {
        setLines(body.linhas || []);
        setSummary(body.resumo || {});
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar rentabilidade");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    const next = openId === id ? "" : id;
    setOpenId(next);
    setDetail(null);
    if (next) {
      setForm((current) => ({ ...current, contractId: next }));
      load(next);
    }
  };

  const saveCost = async () => {
    setMessage("");
    const response = await fetch("/api/rentabilidade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error || "Não foi possível lançar o custo");
    setForm((current) => ({ ...current, description: "", amount: "" }));
    await load(openId);
    await load();
  };

  const deleteCost = async (id: string) => {
    if (!window.confirm("Excluir este custo manual? A operação ficará registrada na auditoria.")) return;
    const response = await fetch(`/api/rentabilidade?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error || "Não foi possível excluir o custo");
    await load(openId);
    await load();
  };

  const summaryCards = [
    ["Medido aprovado", summary.medidoAprovado, "#334532"],
    ["Faturado bruto", summary.faturadoBruto, "#6d28d9"],
    ["Recebido", summary.recebido, "#15803d"],
    ["Saldo a receber", summary.saldoReceber, "#b45309"],
    ["Custos", summary.custoTotal, "#991b1b"],
    ["Margem econômica", summary.margemEconomica, marginColor(summary.medidoAprovado ? summary.margemEconomica / summary.medidoAprovado * 100 : null)],
    ["Margem de caixa", summary.margemCaixa, marginColor(summary.recebido ? summary.margemCaixa / summary.recebido * 100 : null)],
  ];

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <p style={{ margin: "0 0 4px", color: "#e05008", fontSize: 10, fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase" }}>Resultado por contrato</p>
          <h1 style={{ fontSize: 23, fontWeight: 900, color: "#334532", margin: 0 }}>Rentabilidade</h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "5px 0 0" }}>Distingue valor medido, faturado, recebido, custos e margem de caixa.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/medicao" style={{ textDecoration: "none", color: "#334532", background: "#fff", border: "1px solid #dfe5df", borderRadius: 9, padding: "9px 13px", fontSize: 11, fontWeight: 800 }}>Medições</Link>
          <Link href="/dashboard/contas-receber" style={{ textDecoration: "none", color: "#334532", background: "#fff", border: "1px solid #dfe5df", borderRadius: 9, padding: "9px 13px", fontSize: 11, fontWeight: 800 }}>Contas a receber</Link>
        </div>
      </header>

      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: 9, padding: "9px 12px", fontSize: 11, marginBottom: 13 }}>
        <strong>Margem econômica</strong> considera medições aprovadas. <strong>Margem de caixa</strong> considera somente valores efetivamente recebidos. Custos automáticos e lançamentos manuais aparecem separados para facilitar conferência.
      </div>

      {message && <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: 9, padding: "9px 12px", fontSize: 11, marginBottom: 12 }}>{message}</div>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8, marginBottom: 14 }}>
        {summaryCards.map(([label, value, color]) => <div key={String(label)} style={{ background: "#fff", border: "1px solid #e5e7eb", borderTop: `3px solid ${color}`, borderRadius: 10, padding: 11 }}><span style={{ display: "block", color: "#6b7280", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{label}</span><strong style={{ display: "block", color: String(color), fontSize: 17, marginTop: 3 }}>{money(value)}</strong></div>)}
      </section>

      {loading && !lines.length ? <p style={{ color: "#6b7280", fontSize: 12 }}>Carregando...</p> : lines.map((line) => (
        <article key={line.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
          <button type="button" onClick={() => toggle(line.id)} style={{ width: "100%", display: "grid", gridTemplateColumns: "minmax(230px,2fr) repeat(5,minmax(100px,1fr)) 26px", alignItems: "center", gap: 10, padding: "13px 15px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left" }}>
            <div><strong style={{ display: "block", color: "#111827", fontSize: 13 }}>{line.number} — {line.cliente}</strong><span style={{ display: "block", color: "#6b7280", fontSize: 10, marginTop: 2 }}>{line.object} · {line.status}</span></div>
            <Metric label="Medido" value={money(line.medidoAprovado)} color="#334532" />
            <Metric label="Faturado" value={money(line.faturadoBruto)} color="#6d28d9" />
            <Metric label="Recebido" value={money(line.recebido)} color="#15803d" />
            <Metric label="Custos" value={money(line.custoTotal)} color="#991b1b" />
            <Metric label="Margem econômica" value={`${money(line.margemEconomica)}${line.margemPct !== null ? ` (${Number(line.margemPct).toFixed(1)}%)` : ""}`} color={marginColor(line.margemPct)} />
            <span style={{ color: "#9ca3af" }}>{openId === line.id ? "▲" : "▼"}</span>
          </button>

          {openId === line.id && (
            <div style={{ borderTop: "1px solid #f3f4f6", padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 14 }}>
                <Info label="Faturado líquido" value={money(line.faturadoLiquido)} />
                <Info label="Saldo a receber" value={money(line.saldoReceber)} highlight={line.saldoReceber > 0 ? "warning" : "success"} />
                <Info label="Margem de caixa" value={`${money(line.margemCaixa)}${line.margemCaixaPct !== null ? ` (${Number(line.margemCaixaPct).toFixed(1)}%)` : ""}`} highlight={line.margemCaixa < 0 ? "danger" : "success"} />
                <Info label="HH registradas" value={Number(line.actualLaborHours || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} />
                <Info label="Diários aceitos" value={line.acceptedDiaries} />
                <Info label="Diários pendentes" value={line.pendingDiaries} highlight={line.pendingDiaries > 0 ? "warning" : undefined} />
              </div>

              <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14, background: "#f9fafb", borderRadius: 10, padding: 11 }}>
                <label><SmallLabel>Data</SmallLabel><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} style={fieldStyle} /></label>
                <label><SmallLabel>Categoria</SmallLabel><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} style={fieldStyle}>{Object.entries(CATEGORIES).filter(([key]) => !key.endsWith("_auto") && key !== "custos_diretos_diario").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
                <label style={{ flex: "1 1 230px" }}><SmallLabel>Descrição</SmallLabel><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ex.: locação extraordinária de equipamento" style={{ ...fieldStyle, width: "100%" }} /></label>
                <label><SmallLabel>Valor</SmallLabel><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} style={{ ...fieldStyle, width: 125 }} /></label>
                <button type="button" onClick={saveCost} disabled={!form.description || !form.amount} style={{ background: "#4a9410", color: "#fff", border: 0, padding: "9px 15px", borderRadius: 8, fontWeight: 800, fontSize: 11, cursor: "pointer", opacity: !form.description || !form.amount ? .5 : 1 }}>+ Lançar custo</button>
              </div>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 13 }}>
                {Object.entries(line.porCategoria || {}).map(([key, value]) => <span key={key} style={{ background: "#f3f4f6", padding: "5px 9px", borderRadius: 8, fontSize: 10, fontWeight: 700, color: "#374151" }}>{CATEGORIES[key] || key}: {money(value)}</span>)}
                {line.custoMensalEquipe > 0 && <span style={{ background: "#eff6ff", padding: "5px 9px", borderRadius: 8, fontSize: 10, fontWeight: 700, color: "#1d4ed8" }}>Equipe ativa: {money(line.custoMensalEquipe)}/mês</span>}
              </div>

              {detail?.custos?.length > 0 && <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}><thead><tr style={{ background: "#f4f7f4" }}><th style={{ padding: 6, textAlign: "left" }}>Data</th><th style={{ padding: 6, textAlign: "left" }}>Categoria</th><th style={{ padding: 6, textAlign: "left" }}>Descrição</th><th style={{ padding: 6, textAlign: "right" }}>Valor</th><th style={{ width: 40 }} /></tr></thead><tbody>{detail.custos.map((cost: any) => <tr key={cost.id} style={{ borderTop: "1px solid #edf1ed" }}><td style={{ padding: 6 }}>{new Date(cost.date).toLocaleDateString("pt-BR")}</td><td style={{ padding: 6 }}>{CATEGORIES[cost.category] || cost.category}</td><td style={{ padding: 6 }}>{cost.description}</td><td style={{ padding: 6, textAlign: "right", fontWeight: 800 }}>{money(cost.amount)}</td><td style={{ padding: 6 }}><button type="button" onClick={() => deleteCost(cost.id)} title="Excluir custo manual" style={{ background: "transparent", border: 0, color: "#991b1b", cursor: "pointer" }}>×</button></td></tr>)}</tbody></table></div>}
            </div>
          )}
        </article>
      ))}

      {!loading && lines.length === 0 && <p style={{ color: "#6b7280", fontSize: 12 }}>Nenhum contrato cadastrado.</p>}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return <div><span style={{ display: "block", color: "#6b7280", fontSize: 8, fontWeight: 800, textTransform: "uppercase" }}>{label}</span><strong style={{ display: "block", color, fontSize: 12, marginTop: 2 }}>{value}</strong></div>;
}

function SmallLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "block", color: "#374151", fontSize: 9, fontWeight: 800, marginBottom: 4 }}>{children}</span>;
}

function Info({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: "warning" | "danger" | "success" }) {
  const color = highlight === "danger" ? "#991b1b" : highlight === "warning" ? "#b45309" : highlight === "success" ? "#15803d" : "#334532";
  return <div style={{ background: "#f9fafb", borderRadius: 8, padding: 9 }}><span style={{ display: "block", color: "#6b7280", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{label}</span><strong style={{ display: "block", color, fontSize: 14, marginTop: 2 }}>{value}</strong></div>;
}
