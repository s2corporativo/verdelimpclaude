
"use client";
import { useEffect, useState } from "react";
import { DemoBadge, KpiGrid, KpiCard } from "@/components/ui";
export default function DrePage() {
  const [dados, setDados] = useState<any>(null);
  const [ano, setAno] = useState("2026");
  const [demo, setDemo] = useState(false);
  const load = () => fetch(`/api/dre?ano=${ano}`).then(r => r.json()).then(d => { setDados(d); setDemo(!!d._demo); });
  useEffect(() => { load(); }, [ano]);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const margem = dados?.totais?.receitaBruta > 0 ? (dados.totais.lucroLiquido / dados.totais.receitaBruta * 100).toFixed(1) : "0";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, margin: 0 }}>DRE — Demonstrativo de Resultado <DemoBadge mostrar={demo} /></h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "3px 0 0" }}>Receitas, tributos, despesas e folha agregados por competência · Apoio gerencial — validar com o contador</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} value={ano} onChange={e => setAno(e.target.value)}>
            {["2024", "2025", "2026"].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={load} style={{ background: "#4a9410", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>🔄 Atualizar</button>
        </div>
      </div>
      {dados && (
        <div>
          <KpiGrid colunas={4}>
            {[["Receita Bruta", dados.totais.receitaBruta, "#4a9410"],["Tributos", dados.totais.deducoesTributos, "#d97706"],["Despesas Op.", dados.totais.despesasOp, "#dc2626"],["Lucro Líquido", dados.totais.lucroLiquido, dados.totais.lucroLiquido >= 0 ? "#4a9410" : "#dc2626"]].map(([l, v, c]) => (
              <KpiCard key={l as string} label={l as string} valor={`R$${fmt(Number(v))}`} cor={c as string} />
            ))}
          </KpiGrid>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ background: "#e8f5ee", padding: "9px 16px", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, color: "#334532", fontSize: 13 }}>DRE Mensal {ano}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Margem anual: <strong style={{ color: "#4a9410" }}>{margem}%</strong></span>
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr style={{ background: "#f9fafb" }}>
                {["Mês", "Receita Bruta", "(-) Tributos", "(-) Despesas Op.", "(-) Folha", "= Lucro Líq.", "Margem"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#6b7280" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {dados.meses.map((m: any, i: number) => {
                  const folha = m.receitaBruta > 0 ? dados.folhaMensal : 0;
                  const llFolha = m.lucroLiquido - folha;
                  const mg = m.receitaBruta > 0 ? (llFolha / m.receitaBruta * 100).toFixed(1) : "—";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: m.receitaBruta > 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "7px 12px", fontWeight: 600, color: "#334532" }}>{MESES[m.mes - 1]}/{ano.slice(2)}</td>
                      {[m.receitaBruta, m.deducoesTributos, m.despesasOp, folha, llFolha].map((v, j) => (
                        <td key={j} style={{ padding: "7px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: v === 0 ? "#d1d5db" : j === 4 ? (v >= 0 ? "#15803d" : "#dc2626") : "#374151", fontWeight: j === 4 ? 700 : 400 }}>
                          {v === 0 && m.receitaBruta === 0 ? "—" : `R$${fmt(v)}`}
                        </td>
                      ))}
                      <td style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: Number(mg) > 20 ? "#15803d" : Number(mg) > 0 ? "#d97706" : "#6b7280" }}>{mg !== "—" ? mg + "%" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "#e8f5ee" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 700, color: "#334532" }}>TOTAL</td>
                  {[dados.totais.receitaBruta, dados.totais.deducoesTributos, dados.totais.despesasOp, dados.folhaAnual, dados.totais.lucroLiquido - dados.folhaAnual].map((v, j) => (
                    <td key={j} style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: j === 4 ? (v >= 0 ? "#15803d" : "#dc2626") : "#334532" }}>R${fmt(v)}</td>
                  ))}
                  <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#4a9410" }}>{margem}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 13px", fontSize: 11, color: "#92400e" }}>
            ⚠️ Apoio gerencial — validar com contador. Folha: R${fmt(dados.folhaMensal)}/mês. Dados DRE baseados em NFS-e emitidas, tributos apurados e despesas lançadas no sistema.
          </div>
        </div>
      )}
    </div>
  );
}
