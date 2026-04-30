
"use client";
import { useEffect, useState } from "react";
export default function EpiPage() {
  const [epis, setEpis] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [aba, setAba] = useState("estoque");
  useEffect(() => {
    fetch("/api/epi").then(r => r.json()).then(d => { setEpis(d.epis || []); setEntregas(d.entregas || []); setDemo(!!d._demo); });
  }, []);
  const SC: any = { ativo: ["#dcfce7", "#15803d", "✅ Ativo"], a_vencer: ["#fef9c3", "#92400e", "⚠️ A vencer"], vencido: ["#fee2e2", "#991b1b", "⛔ Vencido"] };
  return (
    <div>
      <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Controle de EPI {demo && <span style={{ fontSize: 11, background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 8 }}>Demo</span>}</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Adaptado de verdelimp-erp-prime-final → epiInventory table · Controle de estoque, entregas e número CA.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["estoque", "Estoque de EPIs"], ["entregas", "Histórico de Entregas"]].map(([id, l]) => (
          <button key={id} onClick={() => setAba(id)} style={{ background: aba === id ? "#0f5233" : "transparent", color: aba === id ? "#fff" : "#374151", border: `1px solid ${aba === id ? "#0f5233" : "#d1d5db"}`, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: aba === id ? 700 : 400 }}>{l}</button>
        ))}
      </div>
      {aba === "estoque" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr style={{ background: "#e8f5ee" }}>{["Código", "EPI", "Qtd. Atual", "Mínimo", "Status"].map(h => <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#0f5233" }}>{h}</th>)}</tr></thead>
            <tbody>{epis.map((e: any) => {
              const critico = Number(e.currentQuantity) <= Number(e.minimumStock);
              return (<tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#0f5233" }}>{e.internalCode}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{e.description}</td>
                <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 15, color: critico ? "#dc2626" : "#1a7a4a" }}>{Number(e.currentQuantity).toFixed(0)}</td>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>{Number(e.minimumStock).toFixed(0)}</td>
                <td style={{ padding: "8px 12px" }}><span style={{ background: critico ? "#fee2e2" : "#dcfce7", color: critico ? "#991b1b" : "#15803d", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{critico ? "⛔ Crítico" : "✅ OK"}</span></td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
      {aba === "entregas" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr style={{ background: "#e8f5ee" }}>{["Funcionário", "Função", "EPI", "Data", "Qtd", "Nº CA", "Status"].map(h => <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#0f5233" }}>{h}</th>)}</tr></thead>
            <tbody>{entregas.map((e: any, i: number) => {
              const [bg, co, txt] = SC[e.status] || ["#f3f4f6", "#374151", e.status];
              return (<tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{e.employee?.name?.split(" ")[0]} {e.employee?.name?.split(" ").pop()}</td>
                <td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280" }}>{e.employee?.role}</td>
                <td style={{ padding: "8px 12px" }}>{e.item?.description || e.item?.internalCode}</td>
                <td style={{ padding: "8px 12px", fontSize: 11 }}>{e.deliveryDate ? new Date(e.deliveryDate).toLocaleDateString("pt-BR") : "—"}</td>
                <td style={{ padding: "8px 12px", fontWeight: 700 }}>{e.quantity}</td>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11 }}>{e.caNumber || "—"}</td>
                <td style={{ padding: "8px 12px" }}><span style={{ background: bg, color: co, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{txt}</span></td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
