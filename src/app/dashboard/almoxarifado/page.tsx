"use client";
import { useEffect, useState } from "react";
import { KpiGrid, KpiCard, TabelaHead } from "@/components/ui";

export default function AlmoxarifadoPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, criticos: 0, valorEstoque: 0 });
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [showMov, setShowMov] = useState(false);
  const [movItem, setMovItem] = useState<any>(null);
  const [movForm, setMovForm] = useState({ tipo: "entrada", quantidade: "", motivo: "", unitCost: "" });
  const [movErro, setMovErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    setCarregando(true); setErro("");
    try {
      const resposta = await fetch("/api/almoxarifado");
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível carregar o estoque.");
      setData(json.data || []);
      setStats({ total: json.total || 0, criticos: json.criticos || 0, valorEstoque: json.valorEstoque || 0 });
    } catch (e: any) { setErro(e.message || "Falha ao carregar o estoque."); }
    finally { setCarregando(false); }
  };
  useEffect(() => { carregar(); }, []);

  const registrarMov = async () => {
    if (!movItem || Number(movForm.quantidade) <= 0 || movForm.motivo.trim().length < 3) return;
    setSalvando(true); setMovErro("");
    try {
      const resposta = await fetch("/api/almoxarifado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "movimentar", itemId: movItem.id, tipo: movForm.tipo,
          quantidade: Number(movForm.quantidade), motivo: movForm.motivo,
          ...(movForm.tipo === "entrada" && movForm.unitCost !== "" ? { unitCost: Number(movForm.unitCost) } : {}),
        }),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível registrar a movimentação.");
      setShowMov(false); setMovItem(null); setMovForm({ tipo: "entrada", quantidade: "", motivo: "", unitCost: "" });
      await carregar();
    } catch (e: any) { setMovErro(e.message || "Falha ao registrar a movimentação."); }
    finally { setSalvando(false); }
  };

  const fmt = (valor: number) => Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const filtrados = data.filter((item: any) => !busca || item.description.toLowerCase().includes(busca.toLowerCase()) || item.internalCode.toLowerCase().includes(busca.toLowerCase()));
  const STATUS_COLORS: any = { regular: ["#dcfce7", "#15803d"], atencao: ["#fef9c3", "#92400e"], critico: ["#fee2e2", "#991b1b"], em_uso: ["#dbeafe", "#1e40af"], manutencao: ["#f3e8ff", "#7e22ce"] };

  return <div>
    <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Almoxarifado</h1>
    {erro && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "9px 13px", marginBottom: 12, fontSize: 12 }}>⛔ {erro} <button onClick={carregar} style={{ marginLeft: 8 }}>Tentar novamente</button></div>}
    <KpiGrid colunas={3}>{[["Total de Itens", stats.total, "📦", "#4a9410"], ["Estoque Crítico", stats.criticos, "🚨", "#dc2626"], ["Valor em Estoque", "R$" + fmt(stats.valorEstoque), "💰", "#4a9410"]].map(([l, v, i, c]) => <KpiCard key={l as string} label={l as string} valor={v as any} cor={c as string} icone={i as string}/>)}</KpiGrid>
    <div style={{ marginBottom: 12 }}><input placeholder="Buscar por código ou descrição..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ width: "100%", maxWidth: 360, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}/></div>

    {carregando ? <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>⟳ Carregando estoque...</div> : filtrados.length === 0 ? <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 28, textAlign: "center", color: "#6b7280" }}>{data.length === 0 ? "Nenhum item cadastrado no almoxarifado." : "Nenhum item corresponde à busca."}</div> : <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", border: "1px solid #e5e7eb" }}>
      <TabelaHead colunas={["Código", "Descrição", "Categoria", "Qtd.", "Mín.", "Custo Unit.", "Status", "Ação"]}/>
      <tbody>{filtrados.map((item: any) => { const isAbaixo = Number(item.currentQuantity) <= Number(item.minimumStock); const status = isAbaixo ? "critico" : item.status; const cores = STATUS_COLORS[status] || STATUS_COLORS.regular; return <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#334532" }}>{item.internalCode}</td><td style={{ padding: "8px 12px" }}><div style={{ fontWeight: 600, fontSize: 12 }}>{item.description}</div><div style={{ fontSize: 10, color: "#9ca3af" }}>{item.category?.icon} {item.category?.name}</div></td><td style={{ padding: "8px 12px", fontSize: 11 }}>{item.category?.name || "—"}</td><td style={{ padding: "8px 12px", fontWeight: 700, color: isAbaixo ? "#dc2626" : "#4a9410", fontSize: 14 }}>{Number(item.currentQuantity).toLocaleString("pt-BR")}</td><td style={{ padding: "8px 12px", color: "#6b7280" }}>{Number(item.minimumStock).toLocaleString("pt-BR")}</td><td style={{ padding: "8px 12px" }}>R${fmt(Number(item.averageCost))}</td><td style={{ padding: "8px 12px" }}><span style={{ background: cores[0], color: cores[1], padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{isAbaixo ? "Crítico" : item.status}</span></td><td style={{ padding: "8px 12px" }}><button onClick={() => { setMovItem(item); setMovForm({ tipo: "entrada", quantidade: "", motivo: "", unitCost: String(item.averageCost || "") }); setShowMov(true); }} style={{ background: "#e8f5ee", color: "#334532", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>Movimentar</button></td></tr>; })}</tbody>
    </table>}

    {showMov && movItem && <div onClick={() => { setShowMov(false); setMovErro(""); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}><div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 22, width: "100%", maxWidth: 400 }}><h3 style={{ margin: "0 0 4px", color: "#334532", fontSize: 16 }}>Movimentar estoque</h3><p style={{ margin: "0 0 14px", fontSize: 12, color: "#6b7280" }}>{movItem.internalCode} · {movItem.description} · saldo {Number(movItem.currentQuantity).toLocaleString("pt-BR")}</p><div style={{ display: "flex", gap: 8, marginBottom: 10 }}>{[["entrada", "Entrada", "#4a9410"], ["saida", "Saída", "#dc2626"]].map(([v, l, c]) => <button key={v} onClick={() => setMovForm((p) => ({ ...p, tipo: v }))} style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #d1d5db", background: movForm.tipo === v ? c as string : "#fff", color: movForm.tipo === v ? "#fff" : "#374151", fontWeight: 700, cursor: "pointer" }}>{l}</button>)}</div><label style={{ fontSize: 11, fontWeight: 600 }}>Quantidade *</label><input type="number" min="0.001" step="0.001" value={movForm.quantidade} onChange={(e) => setMovForm((p) => ({ ...p, quantidade: e.target.value }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 10 }}/>{movForm.tipo === "entrada" && <><label style={{ fontSize: 11, fontWeight: 600 }}>Custo unitário da entrada</label><input type="number" min="0" step="0.01" value={movForm.unitCost} onChange={(e) => setMovForm((p) => ({ ...p, unitCost: e.target.value }))} style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 10 }}/></>}<label style={{ fontSize: 11, fontWeight: 600 }}>Motivo *</label><input value={movForm.motivo} onChange={(e) => setMovForm((p) => ({ ...p, motivo: e.target.value }))} placeholder="Compra, consumo em contrato, devolução..." style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 12 }}/>{movErro && <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>⛔ {movErro}</div>}<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => setShowMov(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff" }}>Cancelar</button><button onClick={registrarMov} disabled={salvando || Number(movForm.quantidade) <= 0 || movForm.motivo.trim().length < 3} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#4a9410", color: "#fff", fontWeight: 700, opacity: salvando ? .7 : 1 }}>{salvando ? "Registrando..." : "Registrar"}</button></div></div></div>}
  </div>;
}
