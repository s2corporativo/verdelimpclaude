"use client";
import { useEffect, useState } from "react";
import { TabelaHead } from "@/components/ui";

const competenciaAtual = () => new Date().toISOString().slice(0, 7);

export default function FiscalPage() {
  const [despesas, setDespesas] = useState<any[]>([]);
  const [nfses, setNfses] = useState<any[]>([]);
  const [aba, setAba] = useState("despesas");
  const [fat, setFat] = useState(0);
  const [comp, setComp] = useState(competenciaAtual());
  const [apurando, setApurando] = useState(false);
  const [resultApuracao, setResultApuracao] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const load = async () => {
    setCarregando(true); setErro("");
    try {
      const [resDespesas, resNfse] = await Promise.all([fetch("/api/fiscal/despesas"), fetch("/api/fiscal/nfse")]);
      const [jsonDespesas, jsonNfse] = await Promise.all([resDespesas.json(), resNfse.json()]);
      if (!resDespesas.ok) throw new Error(jsonDespesas.error || "Não foi possível carregar as despesas tributárias.");
      if (!resNfse.ok) throw new Error(jsonNfse.error || "Não foi possível carregar as NFS-e.");
      setDespesas(jsonDespesas.data || []); setNfses(jsonNfse.data || []);
    } catch (e: any) { setErro(e.message || "Falha ao carregar a central fiscal."); }
    finally { setCarregando(false); }
  };
  useEffect(() => { load(); }, []);

  const apurar = async () => {
    if (!/^\d{4}-\d{2}$/.test(comp) || fat < 0) { setErro("Informe uma competência válida e faturamento não negativo."); return; }
    setApurando(true); setErro(""); setResultApuracao(null);
    try {
      const resposta = await fetch("/api/fiscal/apuracao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ competencia: comp, faturamento: fat }) });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível gerar a apuração.");
      setResultApuracao(json); if (json.success) await load();
    } catch (e: any) { setErro(e.message || "Falha ao gerar a apuração."); }
    finally { setApurando(false); }
  };

  const marcarPago = async (id: string) => {
    setErro("");
    try {
      const resposta = await fetch(`/api/fiscal/despesas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "pago", paymentDate: new Date().toISOString() }) });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(json.error || "Não foi possível registrar o pagamento.");
      await load();
    } catch (e: any) { setErro(e.message || "Falha ao registrar o pagamento."); }
  };

  const fmt = (valor: number) => Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const tabs = [{ id: "despesas", l: "Despesas Tributárias" }, { id: "nfse", l: "NFS-e Emitidas" }, { id: "apuracao", l: "Apuração Gerencial" }];

  return <div>
    <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Central Fiscal</h1>
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>{tabs.map((tab) => <button key={tab.id} onClick={() => setAba(tab.id)} style={{ background: aba === tab.id ? "#334532" : "transparent", color: aba === tab.id ? "#fff" : "#374151", border: `1px solid ${aba === tab.id ? "#334532" : "#d1d5db"}`, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: aba === tab.id ? 700 : 400 }}>{tab.l}</button>)}</div>
    <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 13px", marginBottom: 14, fontSize: 11, color: "#92400e" }}>⚠️ Apoio gerencial. DAS, retenções e demais tributos devem ser confirmados nos sistemas oficiais e com a contabilidade.</div>
    {erro && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "9px 13px", marginBottom: 12, fontSize: 12 }}>⛔ {erro}</div>}
    {carregando && <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>⟳ Carregando dados fiscais...</div>}

    {!carregando && aba === "despesas" && <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 14 }}>{[["Em Aberto", "R$" + fmt(despesas.filter((d) => d.status !== "pago").reduce((s, d) => s + Number(d.totalAmount || 0), 0)), "💸", "#d97706"], ["Pagos", "R$" + fmt(despesas.filter((d) => d.status === "pago").reduce((s, d) => s + Number(d.totalAmount || 0), 0)), "✅", "#4a9410"], ["Total cadastrado", "R$" + fmt(despesas.reduce((s, d) => s + Number(d.totalAmount || 0), 0)), "📋", "#4a9410"]].map(([l, v, i, c]) => <div key={l as string} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${c}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{l}</span><span>{i}</span></div><div style={{ fontSize: 20, fontWeight: 700, color: c as string, marginTop: 5 }}>{v}</div></div>)}</div>
      {despesas.length === 0 ? <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 28, textAlign: "center", color: "#6b7280" }}>Nenhuma despesa tributária cadastrada.</div> : <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", border: "1px solid #e5e7eb" }}><TabelaHead colunas={["Tipo", "Descrição", "Competência", "Vencimento", "Valor", "Origem", "Status", ""]}/><tbody>{despesas.map((d) => <tr key={d.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 12px", fontWeight: 700 }}>{d.taxType}</td><td style={{ padding: "8px 12px", fontSize: 12 }}>{d.description}</td><td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{d.competence}</td><td style={{ padding: "8px 12px" }}>{d.dueDate ? new Date(d.dueDate).toLocaleDateString("pt-BR") : "—"}</td><td style={{ padding: "8px 12px", fontWeight: 700 }}>R${fmt(Number(d.totalAmount || d.principalAmount))}</td><td style={{ padding: "8px 12px", fontSize: 10 }}>{d.generatedAuto ? "Gerencial automática" : "Manual"}</td><td style={{ padding: "8px 12px" }}>{d.status}</td><td style={{ padding: "8px 12px" }}>{d.status !== "pago" && <button onClick={() => marcarPago(d.id)} style={{ background: "#4a9410", color: "#fff", border: "none", padding: "4px 10px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Registrar pagamento</button>}</td></tr>)}</tbody></table>}
    </div>}

    {!carregando && aba === "nfse" && (nfses.length === 0 ? <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 28, textAlign: "center", color: "#6b7280" }}>Nenhuma NFS-e cadastrada.</div> : <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", border: "1px solid #e5e7eb" }}><TabelaHead colunas={["Número", "Tomador", "Valor", "ISS", "Alíquota", "Retido", "Líquido", "Competência"]}/><tbody>{nfses.map((n) => <tr key={n.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 12px", fontWeight: 700 }}>{n.number}</td><td style={{ padding: "8px 12px" }}>{n.receiverName || n.client?.name || "—"}</td><td style={{ padding: "8px 12px" }}>R${fmt(Number(n.serviceValue))}</td><td style={{ padding: "8px 12px" }}>R${fmt(Number(n.issAmount))}</td><td style={{ padding: "8px 12px" }}>{n.issRate}%</td><td style={{ padding: "8px 12px" }}>{n.issRetained ? "Sim" : "Não"}</td><td style={{ padding: "8px 12px" }}>R${fmt(Number(n.netAmount))}</td><td style={{ padding: "8px 12px" }}>{n.competence}</td></tr>)}</tbody></table>)}

    {aba === "apuracao" && <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}><h3 style={{ color: "#334532", fontSize: 14, marginBottom: 8 }}>Gerar lançamentos tributários gerenciais</h3><p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>O sistema usa os dados cadastrados, mas não substitui PGDAS-D, eSocial, DCTFWeb nem escrituração contábil.</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "flex-end" }}><div><label style={{ fontSize: 11, fontWeight: 600 }}>Competência</label><input style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8 }} value={comp} onChange={(e) => setComp(e.target.value)}/></div><div><label style={{ fontSize: 11, fontWeight: 600 }}>Faturamento informado (R$)</label><input type="number" min="0" style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8 }} value={fat} onChange={(e) => setFat(Number(e.target.value))}/></div><button onClick={apurar} disabled={apurando} style={{ background: "#3C3489", color: "#fff", border: "none", padding: "9px 24px", borderRadius: 8, fontWeight: 700 }}>{apurando ? "Apurando..." : "Gerar lançamentos"}</button></div>{resultApuracao && <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 12, fontSize: 12 }}>{resultApuracao.success ? `${resultApuracao.lancamentos?.length || 0} lançamento(s) gerado(s) para ${resultApuracao.competencia}.` : resultApuracao.error}</div>}</div>}
  </div>;
}
