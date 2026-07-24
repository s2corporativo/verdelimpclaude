"use client";
import { useEffect, useState } from "react";
import { TabelaHead, KpiGrid, KpiCard } from "@/components/ui";
import { estiloInput, estiloLabel } from "@/lib/estilos";

const formularioVazio = { clientId: "", object: "", value: "", monthlyValue: "", startDate: "", endDate: "", notes: "" };

export default function ContratosPage() {
  const [data, setData] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [form, setForm] = useState(formularioVazio);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setCarregando(true); setErro("");
    try {
      const [resContratos, resClientes] = await Promise.all([fetch("/api/contratos"), fetch("/api/clientes")]);
      const [jsonContratos, jsonClientes] = await Promise.all([resContratos.json(), resClientes.json()]);
      if (!resContratos.ok) throw new Error(jsonContratos.error || "Não foi possível carregar os contratos.");
      if (!resClientes.ok) throw new Error(jsonClientes.error || "Não foi possível carregar os clientes.");
      setData(jsonContratos.data || []); setClientes(jsonClientes.data || []);
    } catch (e: any) { setErro(e.message || "Falha ao carregar contratos."); }
    finally { setCarregando(false); }
  };
  useEffect(() => { load(); }, []);

  const limpar = () => { setForm(formularioVazio); setEditId(null); };
  const salvar = async () => {
    setErro(""); setSalvando(true);
    try {
      const payload: any = { ...form, value: Number(form.value), monthlyValue: Number(form.monthlyValue || 0) };
      if (editId) payload.id = editId;
      const resposta = await fetch("/api/contratos", { method: editId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível salvar o contrato.");
      limpar(); await load();
    } catch (e: any) { setErro(e.message || "Falha ao salvar o contrato."); }
    finally { setSalvando(false); }
  };
  const iso = (data: string) => data ? new Date(data).toISOString().slice(0, 10) : "";
  const editar = (contrato: any) => { setEditId(contrato.id); setForm({ clientId: contrato.clientId || "", object: contrato.object || "", value: String(contrato.value || ""), monthlyValue: String(contrato.monthlyValue || ""), startDate: iso(contrato.startDate), endDate: iso(contrato.endDate), notes: contrato.notes || "" }); setErro(""); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const cancelar = async (contrato: any) => {
    if (!window.confirm(`Cancelar o contrato ${contrato.number}? O histórico será preservado.`)) return;
    setErro("");
    try {
      const resposta = await fetch(`/api/contratos?id=${contrato.id}`, { method: "DELETE" });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível cancelar o contrato.");
      await load();
    } catch (e: any) { setErro(e.message || "Falha ao cancelar o contrato."); }
  };

  const podeSalvar = Boolean(form.object.trim() && Number(form.value) > 0 && form.startDate && form.endDate);
  const fmt = (valor: number) => Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const vencendo = data.filter((contrato) => contrato.alerta === "renovar").length;
  const vencidos = data.filter((contrato) => contrato.alerta === "vencido").length;
  const statusCor: Record<string, [string, string]> = { Ativo: ["#dcfce7", "#15803d"], Renovando: ["#fef9c3", "#92400e"], Suspenso: ["#f3e8ff", "#7c3aed"], Encerrado: ["#f3f4f6", "#6b7280"], Cancelado: ["#fee2e2", "#991b1b"] };

  return <div>
    <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Gestão de Contratos</h1>
    {erro && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "9px 13px", margin: "10px 0", fontSize: 12 }}>⛔ {erro}</div>}
    <KpiGrid colunas={4}>{[["Contratos Ativos", data.filter((c) => c.status === "Ativo").length, "📋", "#4a9410"], ["Valor Mensal Ativo", "R$" + fmt(data.filter((c) => c.status === "Ativo").reduce((s, c) => s + Number(c.monthlyValue), 0)), "💰", "#4a9410"], ["Renovar em breve", vencendo, "⚠️", "#d97706"], ["Vencidos", vencidos, "🚨", "#dc2626"]].map(([l, v, i, c]) => <KpiCard key={l as string} label={l as string} valor={v as any} cor={c as string} icone={i as string}/>)}</KpiGrid>

    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 12 }}>{editId ? "Editar contrato" : "Novo contrato"}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", gap: 9, marginBottom: 9 }}><div><label style={estiloLabel}>Cliente</label><select style={estiloInput} value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}><option value="">— sem vínculo —</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div><label style={estiloLabel}>Objeto *</label><input style={estiloInput} value={form.object} onChange={(e) => setForm((p) => ({ ...p, object: e.target.value }))}/></div><div><label style={estiloLabel}>Valor total *</label><input type="number" min="0.01" step="0.01" style={estiloInput} value={form.value} onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}/></div><div><label style={estiloLabel}>Valor mensal</label><input type="number" min="0" step="0.01" style={estiloInput} value={form.monthlyValue} onChange={(e) => setForm((p) => ({ ...p, monthlyValue: e.target.value }))}/></div><div><label style={estiloLabel}>Início *</label><input type="date" style={estiloInput} value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}/></div><div><label style={estiloLabel}>Término *</label><input type="date" style={estiloInput} value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}/></div></div>
      <div style={{ display: "flex", gap: 10 }}><div style={{ flex: 1 }}><label style={estiloLabel}>Observações</label><input style={estiloInput} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}/></div><button onClick={salvar} disabled={!podeSalvar || salvando} style={{ background: podeSalvar ? "#4a9410" : "#e5e7eb", color: podeSalvar ? "#fff" : "#9ca3af", border: "none", padding: "8px 24px", borderRadius: 8, fontWeight: 700, alignSelf: "flex-end" }}>{salvando ? "Salvando…" : editId ? "Salvar alterações" : "Salvar contrato"}</button>{editId && <button onClick={limpar} style={{ background: "#fff", border: "1px solid #d1d5db", padding: "8px 18px", borderRadius: 8, alignSelf: "flex-end" }}>Cancelar edição</button>}</div>
    </div>

    {carregando ? <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>⟳ Carregando contratos...</div> : data.length === 0 ? <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 28, textAlign: "center", color: "#6b7280" }}>Nenhum contrato cadastrado.</div> : <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}><TabelaHead colunas={["Número", "Cliente / Objeto", "Valor Mensal", "Início", "Término", "Status", "Alerta", "Ações"]}/><tbody>{data.map((contrato) => { const cores = statusCor[contrato.status] || statusCor.Encerrado; return <tr key={contrato.id} style={{ borderBottom: "1px solid #f3f4f6", background: editId === contrato.id ? "#f0fdf4" : undefined }}><td style={{ padding: "8px 12px", fontWeight: 700, fontFamily: "monospace", color: "#334532" }}>{contrato.number}</td><td style={{ padding: "8px 12px", fontSize: 12 }}><div style={{ fontWeight: 600 }}>{contrato.client?.name || "Sem cliente vinculado"}</div><div style={{ color: "#6b7280", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{contrato.object}</div></td><td style={{ padding: "8px 12px", fontWeight: 700, color: "#4a9410" }}>R${fmt(Number(contrato.monthlyValue))}</td><td style={{ padding: "8px 12px", fontSize: 11 }}>{new Date(contrato.startDate).toLocaleDateString("pt-BR")}</td><td style={{ padding: "8px 12px", fontSize: 11 }}>{new Date(contrato.endDate).toLocaleDateString("pt-BR")}</td><td style={{ padding: "8px 12px" }}><span style={{ background: cores[0], color: cores[1], padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{contrato.status}</span></td><td style={{ padding: "8px 12px" }}>{contrato.alerta === "renovar" ? `⚠️ ${contrato.diasFim} dias` : contrato.alerta === "vencido" ? "⛔ Vencido" : contrato.alerta === "ok" ? `✓ ${contrato.diasFim} dias` : "—"}</td><td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}><button onClick={() => editar(contrato)} disabled={contrato.status === "Cancelado"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>✏️</button>{contrato.status !== "Cancelado" && <button onClick={() => cancelar(contrato)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, marginLeft: 6 }}>🚫</button>}</td></tr>; })}</tbody></table></div>}
  </div>;
}
