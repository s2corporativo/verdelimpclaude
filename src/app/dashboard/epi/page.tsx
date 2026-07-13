
"use client";
import { useEffect, useState } from "react";
import { DemoBadge, Card, TabelaHead } from "@/components/ui";
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
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Controle de EPI <DemoBadge mostrar={demo} /></h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Controle de estoque, entregas e validade do CA dos equipamentos de proteção individual.</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["estoque", "Estoque de EPIs"], ["entregas", "Histórico de Entregas"]].map(([id, l]) => (
          <button key={id} onClick={() => setAba(id)} style={{ background: aba === id ? "#334532" : "transparent", color: aba === id ? "#fff" : "#374151", border: `1px solid ${aba === id ? "#334532" : "#d1d5db"}`, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: aba === id ? 700 : 400 }}>{l}</button>
        ))}
      </div>
      {aba === "estoque" && (
        <Card>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <TabelaHead colunas={["Código", "EPI", "Qtd. Atual", "Mínimo", "Status"]} />
            <tbody>{epis.map((e: any) => {
              const critico = Number(e.currentQuantity) <= Number(e.minimumStock);
              return (<tr key={e.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#334532" }}>{e.internalCode}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{e.description}</td>
                <td style={{ padding: "8px 12px", fontWeight: 700, fontSize: 15, color: critico ? "#dc2626" : "#4a9410" }}>{Number(e.currentQuantity).toFixed(0)}</td>
                <td style={{ padding: "8px 12px", color: "#6b7280" }}>{Number(e.minimumStock).toFixed(0)}</td>
                <td style={{ padding: "8px 12px" }}><span style={{ background: critico ? "#fee2e2" : "#dcfce7", color: critico ? "#991b1b" : "#15803d", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{critico ? "⛔ Crítico" : "✅ OK"}</span></td>
              </tr>);
            })}</tbody>
          </table>
        </Card>
      )}
      {aba === "entregas" && (
        <Card>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <TabelaHead colunas={["Funcionário", "Função", "EPI", "Data", "Qtd", "Nº CA", "Status"]} />
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
        </Card>
      )}
    </div>
  );
}
