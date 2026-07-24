"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KpiGrid, KpiCard } from "@/components/ui";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function DrePage() {
  const currentYear = new Date().getFullYear();
  const [dados, setDados] = useState<any>(null);
  const [ano, setAno] = useState(String(currentYear));
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const anos = useMemo(() => Array.from({ length: 5 }, (_, index) => String(currentYear - 3 + index)), [currentYear]);
  const fmt = (value: number) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const load = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch(`/api/dre?ano=${ano}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar a DRE.");
      setDados(payload);
    } catch (error: any) {
      setDados(null);
      setErro(error?.message || "Falha ao carregar a DRE.");
    } finally {
      setLoading(false);
    }
  }, [ano]);

  useEffect(() => { load(); }, [load]);

  const margem = dados?.totais?.receitaBruta > 0
    ? (Number(dados.totais.resultadoOperacional || 0) / Number(dados.totais.receitaBruta) * 100).toFixed(1)
    : "0,0";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, margin: 0 }}>DRE — Demonstrativo de Resultado</h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "3px 0 0" }}>Regime de competência para faturamento, tributos e despesas; recebimentos exibidos separadamente.</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} value={ano} onChange={(event) => setAno(event.target.value)}>
            {anos.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button onClick={load} disabled={loading} style={{ background: "#4a9410", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: loading ? "default" : "pointer", fontWeight: 700 }}>
            {loading ? "Atualizando…" : "Atualizar"}
          </button>
        </div>
      </div>

      {erro && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>{erro}</div>}
      {loading && !dados && <div style={{ color: "#4a9410", padding: 20 }}>Calculando demonstrativo…</div>}

      {dados && (
        <div>
          <KpiGrid colunas={5}>
            {[
              ["Receita faturada", dados.totais.receitaBruta, "#4a9410"],
              ["Receita recebida", dados.totais.receitaRecebida, "#1d4ed8"],
              ["Tributos", dados.totais.deducoesTributos, "#d97706"],
              ["Despesas operacionais", dados.totais.despesasOp, "#dc2626"],
              ["Resultado operacional", dados.totais.resultadoOperacional, Number(dados.totais.resultadoOperacional) >= 0 ? "#4a9410" : "#dc2626"],
            ].map(([label, value, color]) => (
              <KpiCard key={label as string} label={label as string} valor={`R$${fmt(Number(value))}`} cor={color as string} />
            ))}
          </KpiGrid>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ background: "#e8f5ee", padding: "9px 16px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: "#334532", fontSize: 13 }}>DRE mensal {ano}</span>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Margem operacional anual: <strong style={{ color: Number(margem.replace(",", ".")) >= 0 ? "#4a9410" : "#dc2626" }}>{margem}%</strong></span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 850 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Mês", "Receita faturada", "Receita recebida", "(-) Tributos", "(-) Despesas", "= Resultado operacional", "Margem"].map((header) => (
                      <th key={header} style={{ padding: "8px 12px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#6b7280" }}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(dados.meses || []).map((item: any, index: number) => {
                    const itemMargin = Number(item.receitaBruta) > 0 ? Number(item.resultadoOperacional) / Number(item.receitaBruta) * 100 : null;
                    const values = [item.receitaBruta, item.receitaRecebida, item.deducoesTributos, item.despesasOp, item.resultadoOperacional];
                    return (
                      <tr key={item.competencia || index} style={{ borderBottom: "1px solid #f3f4f6", background: values.some((value) => Number(value) !== 0) ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "7px 12px", fontWeight: 600, color: "#334532" }}>{MESES[item.mes - 1]}/{ano.slice(2)}</td>
                        {values.map((value, valueIndex) => (
                          <td key={valueIndex} style={{ padding: "7px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 12, color: Number(value) === 0 ? "#d1d5db" : valueIndex === 4 ? (Number(value) >= 0 ? "#15803d" : "#dc2626") : "#374151", fontWeight: valueIndex === 4 ? 700 : 400 }}>
                            {Number(value) === 0 ? "—" : `R$${fmt(Number(value))}`}
                          </td>
                        ))}
                        <td style={{ padding: "7px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: itemMargin === null ? "#9ca3af" : itemMargin >= 0 ? "#15803d" : "#dc2626" }}>
                          {itemMargin === null ? "—" : `${itemMargin.toFixed(1)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#e8f5ee" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 700, color: "#334532" }}>TOTAL</td>
                    {[dados.totais.receitaBruta, dados.totais.receitaRecebida, dados.totais.deducoesTributos, dados.totais.despesasOp, dados.totais.resultadoOperacional].map((value, index) => (
                      <td key={index} style={{ padding: "9px 12px", textAlign: "right", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: index === 4 ? (Number(value) >= 0 ? "#15803d" : "#dc2626") : "#334532" }}>R${fmt(Number(value))}</td>
                    ))}
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#4a9410" }}>{margem}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 13px", fontSize: 11, color: "#92400e" }}>
            A folha histórica fechada ainda não está disponível por competência. Referência cadastral atual: salários-base de R${fmt(dados.folhaReferenciaAtual?.salarioBase)} e custo pleno estimado de R${fmt(dados.folhaReferenciaAtual?.custoPleno)} por mês. Esses valores não foram subtraídos automaticamente do resultado histórico.
          </div>
        </div>
      )}
    </div>
  );
}
