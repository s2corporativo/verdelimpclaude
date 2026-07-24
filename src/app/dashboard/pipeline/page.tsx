"use client";
import { useEffect, useState } from "react";
import { estiloLabel } from "@/lib/estilos";

const STAGES = [
  { id: "monitorando", label: "👁️ Monitorando", cor: "#6b7280", bg: "#f3f4f6" },
  { id: "analisando", label: "🔍 Analisando", cor: "#1d4ed8", bg: "#dbeafe" },
  { id: "proposta_enviada", label: "📨 Proposta Enviada", cor: "#7c3aed", bg: "#f3e8ff" },
  { id: "em_julgamento", label: "⚖️ Em Julgamento", cor: "#d97706", bg: "#fef9c3" },
  { id: "ganho", label: "🏆 Ganho", cor: "#15803d", bg: "#dcfce7" },
  { id: "perdido", label: "❌ Perdido", cor: "#dc2626", bg: "#fee2e2" },
];
const PRIO = { alta: ["#fee2e2", "#dc2626", "🔴"], media: ["#fef9c3", "#d97706", "🟡"], baixa: ["#f3f4f6", "#6b7280", "⚪"] } as any;

export default function PipelinePage() {
  const [bids, setBids] = useState<any[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<any>(null);
  const [novo, setNovo] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro("");
    try {
      const resposta = await fetch("/api/bid-pipeline");
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível carregar o pipeline.");
      setBids(json.bids || []);
    } catch (e: any) { setErro(e.message || "Falha ao carregar o pipeline."); }
    finally { setCarregando(false); }
  };
  useEffect(() => { carregar(); }, []);

  const fmt = (valor: number) => Number(valor || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  const IS: any = { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12 };
  const LS = estiloLabel;

  const moverStage = async (id: string, stage: string) => {
    let perdaMotivo: string | null = null;
    if (stage === "perdido") {
      perdaMotivo = window.prompt("Informe o motivo da perda da licitação:")?.trim() || null;
      if (!perdaMotivo) return;
    }
    setErro("");
    try {
      const resposta = await fetch("/api/bid-pipeline", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move_stage", id, stage, perdaMotivo }),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível mover a licitação.");
      setBids((atual) => atual.map((bid) => bid.id === id ? json.bid : bid));
    } catch (e: any) { setErro(e.message || "Falha ao mover a licitação."); }
  };

  const salvarNovo = async () => {
    if (!novo?.titulo || !novo?.orgao) return;
    setSalvando(true); setErro("");
    try {
      const resposta = await fetch("/api/bid-pipeline", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novo),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível incluir a licitação.");
      setBids((atual) => [...atual, json.bid]); setNovo(null);
    } catch (e: any) { setErro(e.message || "Falha ao incluir a licitação."); }
    finally { setSalvando(false); }
  };

  const totalGanho = bids.filter((bid) => bid.stage === "ganho").reduce((soma, bid) => soma + Number(bid.valorEstimado || 0), 0);
  const totalPipeline = bids.filter((bid) => !["ganho", "perdido"].includes(bid.stage)).reduce((soma, bid) => soma + Number(bid.valorEstimado || 0) * Number(bid.probabilidade || 0) / 100, 0);

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <div><h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, margin: 0 }}>🏆 Pipeline de Licitações — CRM</h1><p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0 0" }}>Registros persistidos do monitoramento ao resultado da contratação.</p></div>
      <button onClick={() => setNovo({ stage: "monitorando", prioridade: "media", probabilidade: 30, uf: "MG" })} style={{ background: "#334532", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>+ Nova Licitação</button>
    </div>
    {erro && <div style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5", borderRadius: 8, padding: "9px 13px", marginBottom: 12, fontSize: 12 }}>⛔ {erro}</div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 16 }}>
      {[["Total no radar", bids.length, "📋", "#4a9410"], ["Pipeline ativo", bids.filter((b) => !["ganho", "perdido"].includes(b.stage)).length, "⚡", "#7c3aed"], ["Valor ganho", "R$" + fmt(totalGanho), "🏆", "#15803d"], ["Pipeline ponderado", "R$" + fmt(totalPipeline), "📊", "#1d4ed8"]].map(([l, v, i, c]) => <div key={l as string} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", borderTop: `3px solid ${c}` }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{l}</span><span>{i}</span></div><div style={{ fontSize: 17, fontWeight: 700, color: c as string, marginTop: 4 }}>{v}</div></div>)}
    </div>

    {novo && <div style={{ background: "#fff", border: "2px solid #334532", borderRadius: 12, padding: 18, marginBottom: 14 }}>
      <h3 style={{ color: "#334532", fontSize: 14, fontWeight: 700, marginBottom: 12 }}>+ Nova Licitação no Pipeline</h3>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}><div><label style={LS}>Título *</label><input style={IS} value={novo.titulo || ""} onChange={(e) => setNovo((p: any) => ({ ...p, titulo: e.target.value }))}/></div><div><label style={LS}>Órgão *</label><input style={IS} value={novo.orgao || ""} onChange={(e) => setNovo((p: any) => ({ ...p, orgao: e.target.value }))}/></div><div><label style={LS}>Nº Edital</label><input style={IS} value={novo.editalNumero || ""} onChange={(e) => setNovo((p: any) => ({ ...p, editalNumero: e.target.value }))}/></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}><div><label style={LS}>Objeto</label><input style={IS} value={novo.objeto || ""} onChange={(e) => setNovo((p: any) => ({ ...p, objeto: e.target.value }))}/></div><div><label style={LS}>Valor estimado</label><input type="number" min="0" style={IS} value={novo.valorEstimado || ""} onChange={(e) => setNovo((p: any) => ({ ...p, valorEstimado: Number(e.target.value) }))}/></div><div><label style={LS}>Abertura</label><input type="date" style={IS} value={novo.dataAbertura || ""} onChange={(e) => setNovo((p: any) => ({ ...p, dataAbertura: e.target.value }))}/></div><div><label style={LS}>Prioridade</label><select style={IS} value={novo.prioridade || "media"} onChange={(e) => setNovo((p: any) => ({ ...p, prioridade: e.target.value }))}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></div><div><label style={LS}>Probabilidade %</label><input type="number" min="0" max="100" style={IS} value={novo.probabilidade ?? 30} onChange={(e) => setNovo((p: any) => ({ ...p, probabilidade: Number(e.target.value) }))}/></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}><div><label style={LS}>Município/UF</label><div style={{ display: "flex", gap: 6 }}><input style={{ ...IS, width: "75%" }} value={novo.municipio || ""} onChange={(e) => setNovo((p: any) => ({ ...p, municipio: e.target.value }))}/><input maxLength={2} style={{ ...IS, width: "25%" }} value={novo.uf || ""} onChange={(e) => setNovo((p: any) => ({ ...p, uf: e.target.value.toUpperCase() }))}/></div></div><div><label style={LS}>URL do edital</label><input style={IS} value={novo.url || ""} onChange={(e) => setNovo((p: any) => ({ ...p, url: e.target.value }))}/></div></div>
      <div style={{ display: "flex", gap: 8 }}><button onClick={salvarNovo} disabled={salvando || !novo.titulo || !novo.orgao} style={{ background: "#334532", color: "#fff", border: "none", padding: "9px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>{salvando ? "Salvando…" : "Adicionar ao Pipeline"}</button><button onClick={() => setNovo(null)} style={{ background: "#f3f4f6", border: "none", padding: "9px 18px", borderRadius: 8, cursor: "pointer" }}>Cancelar</button></div>
    </div>}

    {carregando ? <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>⟳ Carregando pipeline...</div> : bids.length === 0 ? <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 28, textAlign: "center", color: "#6b7280" }}>Nenhuma licitação cadastrada no pipeline.</div> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, overflowX: "auto" }}>
      {STAGES.map((stage) => { const stageBids = bids.filter((bid) => bid.stage === stage.id); const stageValue = stageBids.reduce((soma, bid) => soma + Number(bid.valorEstimado || 0), 0); return <div key={stage.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (dragId) moverStage(dragId, stage.id); setDragId(null); }}><div style={{ background: stage.bg, borderRadius: "10px 10px 0 0", padding: "8px 12px", borderBottom: `2px solid ${stage.cor}`, marginBottom: 8 }}><div style={{ fontWeight: 700, fontSize: 12, color: stage.cor }}>{stage.label}</div><div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{stageBids.length} licit. · R$ {fmt(stageValue)}</div></div><div style={{ display: "flex", flexDirection: "column", gap: 7, minHeight: 80 }}>{stageBids.map((bid) => { const [pbg, pco, pic] = PRIO[bid.prioridade] || PRIO.media; return <div key={bid.id} draggable onDragStart={() => setDragId(bid.id)} onClick={() => setSelecionado(selecionado?.id === bid.id ? null : bid)} style={{ background: "#fff", border: `1px solid ${selecionado?.id === bid.id ? "#334532" : "#e5e7eb"}`, borderRadius: 10, padding: "10px 12px", cursor: "grab" }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 9, background: pbg, color: pco, padding: "1px 6px", borderRadius: 6, fontWeight: 700 }}>{pic} {bid.prioridade}</span><span style={{ fontSize: 9, color: "#9ca3af" }}>{bid.probabilidade}%</span></div><div style={{ fontWeight: 700, fontSize: 12, color: "#334532" }}>{bid.titulo}</div><div style={{ fontSize: 10, color: "#6b7280" }}>{bid.orgao}</div>{bid.valorEstimado && <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4 }}>R$ {fmt(bid.valorEstimado)}</div>}{bid.perdaMotivo && <div style={{ fontSize: 9, color: "#dc2626", marginTop: 3 }}>{bid.perdaMotivo}</div>}{selecionado?.id === bid.id && <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 3 }}>{STAGES.filter((s) => s.id !== bid.stage).map((s) => <button key={s.id} onClick={(e) => { e.stopPropagation(); moverStage(bid.id, s.id); setSelecionado(null); }} style={{ background: s.bg, color: s.cor, border: "none", padding: "2px 7px", borderRadius: 6, cursor: "pointer", fontSize: 9, fontWeight: 700 }}>→ {s.label}</button>)}{bid.url && <a href={bid.url} target="_blank" rel="noreferrer" style={{ background: "#f3f4f6", color: "#374151", padding: "2px 7px", borderRadius: 6, fontSize: 9, textDecoration: "none" }}>🔗 Edital</a>}</div>}</div>; })}{stageBids.length === 0 && <div style={{ fontSize: 11, color: "#d1d5db", textAlign: "center", padding: "12px 8px", border: "1px dashed #e5e7eb", borderRadius: 8 }}>Arraste aqui</div>}</div></div>; })}
    </div>}
  </div>;
}
