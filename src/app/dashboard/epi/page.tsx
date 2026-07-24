"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, TabelaHead } from "@/components/ui";
import { estiloInput, estiloLabel } from "@/lib/estilos";

const hoje = () => new Date().toISOString().slice(0, 10);

export default function EpiPage() {
  const [epis, setEpis] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [stats, setStats] = useState({ itens: 0, estoqueCritico: 0, entregasAtivas: 0, aVencer: 0, vencidos: 0 });
  const [aba, setAba] = useState<"estoque" | "entregas" | "nova" | "devolver">("estoque");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({ itemId: "", employeeId: "", deliveryDate: hoje(), quantity: 1, reason: "Dotação periódica" });
  const [retorno, setRetorno] = useState<any>({ deliveryId: "", quantity: 1, condition: "USED", restocked: false, returnDate: hoje() });

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const [epiResponse, employeeResponse] = await Promise.all([
        fetch("/api/epi", { cache: "no-store" }),
        fetch("/api/funcionarios", { cache: "no-store" }),
      ]);
      const epiData = await epiResponse.json();
      const employeeData = await employeeResponse.json();
      if (!epiResponse.ok) throw new Error(epiData.error || "Não foi possível carregar os EPIs");
      if (!employeeResponse.ok) throw new Error(employeeData.error || "Não foi possível carregar os funcionários");
      setEpis(epiData.epis || []);
      setEntregas(epiData.entregas || []);
      setStats(epiData.stats || { itens: 0, estoqueCritico: 0, entregasAtivas: 0, aVencer: 0, vencidos: 0 });
      setFuncionarios(employeeData.data || []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar o módulo de EPI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const entregar = async () => {
    setBusy(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch("/api/epi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar a entrega");
      setMensagem("EPI entregue e estoque atualizado.");
      setForm({ itemId: "", employeeId: "", deliveryDate: hoje(), quantity: 1, reason: "Dotação periódica" });
      await carregar();
      setAba("entregas");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao registrar a entrega");
    } finally {
      setBusy(false);
    }
  };

  const devolver = async () => {
    setBusy(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch("/api/epi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...retorno, action: "return" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar a devolução");
      setMensagem("Devolução registrada com rastreabilidade.");
      setRetorno({ deliveryId: "", quantity: 1, condition: "USED", restocked: false, returnDate: hoje() });
      await carregar();
      setAba("entregas");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao registrar a devolução");
    } finally {
      setBusy(false);
    }
  };

  const statusCor: Record<string, [string, string, string]> = {
    ativo: ["#dcfce7", "#15803d", "Ativo"],
    a_vencer: ["#fef9c3", "#92400e", "A vencer"],
    vencido: ["#fee2e2", "#991b1b", "Vencido"],
    devolvido: ["#e0e7ff", "#3730a3", "Devolvido"],
  };

  return <div>
    <h1 style={{ color: "#334532", fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Controle de EPI</h1>
    <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 13px" }}>Estoque, entrega, validade do CA, reposição e devolução com trilha de auditoria.</p>

    {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 12 }}>{erro}</div>}
    {mensagem && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 12 }}>{mensagem}</div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(125px,1fr))", gap: 8, marginBottom: 12 }}>
      {[["Itens", stats.itens], ["Estoque crítico", stats.estoqueCritico], ["Entregas ativas", stats.entregasAtivas], ["A vencer", stats.aVencer], ["Vencidos", stats.vencidos]].map(([label, value]) => <div key={String(label)} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 9, padding: 11 }}><div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", fontWeight: 700 }}>{label}</div><div style={{ fontSize: 19, color: "#334532", fontWeight: 800, marginTop: 3 }}>{value}</div></div>)}
    </div>

    <div style={{ display: "flex", gap: 7, marginBottom: 12, flexWrap: "wrap" }}>
      {([['estoque', 'Estoque'], ['entregas', 'Entregas'], ['nova', '+ Nova entrega'], ['devolver', 'Devolução']] as const).map(([id, label]) => <button key={id} onClick={() => setAba(id)} style={{ background: aba === id ? "#334532" : "#fff", color: aba === id ? "#fff" : "#374151", border: "1px solid #d1d5db", padding: "7px 13px", borderRadius: 8, fontWeight: 700 }}>{label}</button>)}
    </div>

    {loading ? <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>Carregando dados reais...</div> : null}

    {!loading && aba === "estoque" && <Card>{epis.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>Nenhum EPI cadastrado no almoxarifado.</div> : <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><TabelaHead colunas={["Código", "EPI", "Quantidade", "Mínimo", "Situação"]} /><tbody>{epis.map((item) => { const critico = Number(item.currentQuantity) <= Number(item.minimumStock); return <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700 }}>{item.internalCode}</td><td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.description}</td><td style={{ padding: "8px 12px", fontWeight: 800, color: critico ? "#dc2626" : "#15803d" }}>{Number(item.currentQuantity)}</td><td style={{ padding: "8px 12px" }}>{Number(item.minimumStock)}</td><td style={{ padding: "8px 12px", color: critico ? "#991b1b" : "#15803d", fontWeight: 700 }}>{critico ? "Crítico" : "Regular"}</td></tr>; })}</tbody></table></div>}</Card>}

    {!loading && aba === "entregas" && <Card>{entregas.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>Nenhuma entrega registrada.</div> : <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%" }}><TabelaHead colunas={["Funcionário", "Função", "EPI", "Entrega", "Qtd.", "Devolvido", "CA", "Reposição", "Status"]} /><tbody>{entregas.map((entrega) => { const [bg, color, label] = statusCor[entrega.status] || ["#f3f4f6", "#374151", entrega.status]; return <tr key={entrega.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 12px", fontWeight: 600 }}>{entrega.employee?.name}</td><td style={{ padding: "8px 12px", fontSize: 11 }}>{entrega.employee?.role}</td><td style={{ padding: "8px 12px" }}>{entrega.item?.description}</td><td style={{ padding: "8px 12px" }}>{new Date(entrega.deliveryDate).toLocaleDateString("pt-BR")}</td><td style={{ padding: "8px 12px" }}>{entrega.quantity}</td><td style={{ padding: "8px 12px" }}>{entrega.returnedQuantity || 0}</td><td style={{ padding: "8px 12px" }}>{entrega.caNumber || "—"}</td><td style={{ padding: "8px 12px" }}>{entrega.expectedReplacementDate ? new Date(entrega.expectedReplacementDate).toLocaleDateString("pt-BR") : "—"}</td><td style={{ padding: "8px 12px" }}><span style={{ background: bg, color, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{label}</span></td></tr>; })}</tbody></table></div>}</Card>}

    {!loading && aba === "nova" && <Card><h3 style={{ fontSize: 13, color: "#334532" }}>Registrar entrega</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9 }}><div><label style={estiloLabel}>Funcionário</label><select style={estiloInput} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}><option value="">Selecione</option>{funcionarios.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.role}</option>)}</select></div><div><label style={estiloLabel}>EPI</label><select style={estiloInput} value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}><option value="">Selecione</option>{epis.map((item) => <option key={item.id} value={item.id}>{item.description} · estoque {Number(item.currentQuantity)}</option>)}</select></div>{[["deliveryDate", "Data", "date"], ["quantity", "Quantidade", "number"], ["caNumber", "Nº CA", "text"], ["caExpirationDate", "Validade CA", "date"], ["replacementDate", "Substituição prevista", "date"], ["reason", "Motivo", "text"]].map(([key, label, type]) => <div key={key}><label style={estiloLabel}>{label}</label><input type={type} style={estiloInput} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })} /></div>)}</div><button onClick={entregar} disabled={busy || !form.itemId || !form.employeeId} style={{ marginTop: 11, background: "#4a9410", color: "#fff", border: 0, borderRadius: 8, padding: "9px 18px", fontWeight: 700, opacity: busy ? .6 : 1 }}>Entregar e baixar estoque</button></Card>}

    {!loading && aba === "devolver" && <Card><h3 style={{ fontSize: 13, color: "#334532" }}>Registrar devolução</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9 }}><div style={{ gridColumn: "span 2" }}><label style={estiloLabel}>Entrega</label><select style={estiloInput} value={retorno.deliveryId} onChange={(e) => setRetorno({ ...retorno, deliveryId: e.target.value })}><option value="">Selecione</option>{entregas.filter((item) => (item.returnedQuantity || 0) < item.quantity).map((item) => <option key={item.id} value={item.id}>{item.employee?.name} — {item.item?.description} — saldo {item.quantity - (item.returnedQuantity || 0)}</option>)}</select></div><div><label style={estiloLabel}>Data</label><input type="date" style={estiloInput} value={retorno.returnDate} onChange={(e) => setRetorno({ ...retorno, returnDate: e.target.value })} /></div><div><label style={estiloLabel}>Quantidade</label><input type="number" style={estiloInput} value={retorno.quantity} onChange={(e) => setRetorno({ ...retorno, quantity: Number(e.target.value) })} /></div><div><label style={estiloLabel}>Condição</label><select style={estiloInput} value={retorno.condition} onChange={(e) => setRetorno({ ...retorno, condition: e.target.value })}><option value="NEW">Novo</option><option value="GOOD">Bom</option><option value="USED">Usado</option><option value="DAMAGED">Danificado</option><option value="LOST">Perdido</option></select></div><div><label style={estiloLabel}>Motivo</label><input style={estiloInput} value={retorno.reason || ""} onChange={(e) => setRetorno({ ...retorno, reason: e.target.value })} /></div></div><label style={{ display: "block", fontSize: 11, marginTop: 9 }}><input type="checkbox" checked={Boolean(retorno.restocked)} onChange={(e) => setRetorno({ ...retorno, restocked: e.target.checked })} /> Retornar ao estoque quando estiver novo ou em bom estado</label><button onClick={devolver} disabled={busy || !retorno.deliveryId} style={{ marginTop: 11, background: "#3730a3", color: "#fff", border: 0, borderRadius: 8, padding: "9px 18px", fontWeight: 700, opacity: busy ? .6 : 1 }}>Registrar devolução</button></Card>}
  </div>;
}
