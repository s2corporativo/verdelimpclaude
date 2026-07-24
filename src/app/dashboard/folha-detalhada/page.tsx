"use client";
import { useEffect, useState } from "react";

export default function FolhaDetalhadaPage() {
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [extras, setExtras] = useState<Record<string, { he50?: number; he100?: number }>>({});
  const [mostraHE, setMostraHE] = useState(false);
  const [recalc, setRecalc] = useState(false);

  const carregar = async () => {
    setErro("");
    try {
      const resposta = await fetch("/api/folha-detalhada");
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível calcular a folha.");
      setDados(json);
    } catch (e: any) {
      setErro(e.message || "Falha ao carregar a folha.");
      setDados(null);
    }
  };

  useEffect(() => { carregar(); }, []);

  const fmt = (valor: number) => Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const setHE = (id: string, campo: "he50" | "he100", valor: string) =>
    setExtras((anterior) => ({ ...anterior, [id]: { ...anterior[id], [campo]: Number(valor) || 0 } }));

  const recalcular = async () => {
    setRecalc(true);
    setErro("");
    try {
      const resposta = await fetch("/api/folha-detalhada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extras }),
      });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível recalcular a folha.");
      setDados(json);
    } catch (e: any) {
      setErro(e.message || "Falha ao recalcular a folha.");
    } finally {
      setRecalc(false);
    }
  };

  if (!dados && !erro) return <div style={{ color: "#4a9410", padding: 20 }}>⟳ Calculando folha...</div>;

  const folha = dados?.folha || [];
  const totais = dados?.totais || { bruto: 0, inss: 0, irrf: 0, liquido: 0, fgts: 0, inssPatronal: 0, custoTotal: 0 };
  const acrescimoEmpresa = totais.bruto > 0 ? ((totais.custoTotal / totais.bruto - 1) * 100) : 0;

  return (<div>
    <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Folha Detalhada — INSS + IRRF</h1>
    <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Projeção gerencial com adicionais e horas extras. A folha oficial deve ser validada pela contabilidade.</p>
    {erro && <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "9px 13px", marginBottom: 14, fontSize: 12, color: "#991b1b" }}>⛔ {erro} <button onClick={carregar} style={{ marginLeft: 8 }}>Tentar novamente</button></div>}
    {dados?.aviso && <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 13px", marginBottom: 14, fontSize: 11, color: "#92400e" }}>⚠️ {dados.aviso}</div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 16 }}>
      {[["Salário Bruto Total", "R$" + fmt(totais.bruto), "💰", "#4a9410"], ["INSS Descontado", "R$" + fmt(totais.inss), "🏛️", "#d97706"], ["Salário Líquido Total", "R$" + fmt(totais.liquido), "💵", "#4a9410"], ["Custo Total Empresa", "R$" + fmt(totais.custoTotal), "🏦", "#dc2626"]].map(([l, v, i, c]) => (
        <div key={l as string} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${c}` }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{l}</span><span>{i}</span></div>
          <div style={{ fontSize: 17, fontWeight: 700, color: c as string, marginTop: 4 }}>{v}</div>
        </div>
      ))}
    </div>

    {folha.length === 0 ? (
      <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 28, textAlign: "center", color: "#6b7280" }}>Nenhum colaborador ativo cadastrado. A folha permanece zerada.</div>
    ) : (<>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setMostraHE((valor) => !valor)} style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#334532", cursor: "pointer" }}>⏱️ Horas extras do mês {mostraHE ? "▲" : "▼"}</button>
      </div>
      {mostraHE && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6b7280" }}>As horas informadas servem apenas para esta simulação e não são gravadas como evento de folha.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "6px 12px", alignItems: "center", maxWidth: 520 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280" }}>FUNCIONÁRIO</span><span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textAlign: "center" }}>HORAS 50%</span><span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280", textAlign: "center" }}>HORAS 100%</span>
            {folha.map((f: any) => <div key={f.id} style={{ display: "contents" }}>
              <span style={{ fontSize: 12 }}>{f.nome}</span>
              <input type="number" min="0" max="744" step="0.5" value={extras[f.id]?.he50 ?? ""} onChange={(e) => setHE(f.id, "he50", e.target.value)} style={{ width: 80, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, textAlign: "right" }}/>
              <input type="number" min="0" max="744" step="0.5" value={extras[f.id]?.he100 ?? ""} onChange={(e) => setHE(f.id, "he100", e.target.value)} style={{ width: 80, padding: "5px 8px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, textAlign: "right" }}/>
            </div>)}
          </div>
          <button onClick={recalcular} disabled={recalc} style={{ marginTop: 12, background: "#4a9410", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: recalc ? "default" : "pointer" }}>{recalc ? "Recalculando…" : "↻ Recalcular folha com HE"}</button>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#e8f5ee" }}>{["Funcionário", "Cargo", "Salário Bruto", "(-) INSS", "(-) IRRF", "= Líquido", "FGTS (emp)", "INSS Pat.", "Custo Total"].map((h) => <th key={h} style={{ padding: "8px 11px", textAlign: "right", fontSize: 10, fontWeight: 700, color: "#334532" }}>{h}</th>)}</tr>
            <tr style={{ background: "#f0fdf4" }}><td colSpan={9} style={{ padding: "4px 12px", fontSize: 10, color: "#6b7280", fontStyle: "italic" }}>Cálculos baseados nas tabelas configuradas no motor de folha para o ano corrente. Validar faixas, convenção coletiva e incidências antes do fechamento.</td></tr>
          </thead>
          <tbody>{folha.map((f: any) => <tr key={f.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
            <td style={{ padding: "8px 11px", fontWeight: 600, fontSize: 12 }}>{f.nome}</td><td style={{ padding: "8px 11px", fontSize: 11, color: "#6b7280" }}>{f.cargo}</td>
            <td style={{ padding: "8px 11px", textAlign: "right", fontWeight: 600 }}>R${fmt(f.salarioBruto)}</td><td style={{ padding: "8px 11px", textAlign: "right", color: "#d97706" }}>-R${fmt(f.inss)}</td><td style={{ padding: "8px 11px", textAlign: "right", color: f.irrf > 0 ? "#dc2626" : "#9ca3af" }}>{f.irrf > 0 ? "-R$" + fmt(f.irrf) : "—"}</td><td style={{ padding: "8px 11px", textAlign: "right", fontWeight: 700, color: "#4a9410" }}>R${fmt(f.salarioLiquido)}</td><td style={{ padding: "8px 11px", textAlign: "right", color: "#7c3aed" }}>R${fmt(f.fgts)}</td><td style={{ padding: "8px 11px", textAlign: "right", color: "#7c3aed" }}>R${fmt(f.inssPatronal)}</td><td style={{ padding: "8px 11px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R${fmt(f.custoTotal)}</td>
          </tr>)}</tbody>
          <tfoot><tr style={{ background: "#e8f5ee" }}><td colSpan={2} style={{ padding: "9px 11px", fontWeight: 700, color: "#334532" }}>TOTAIS</td><td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700 }}>R${fmt(totais.bruto)}</td><td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700, color: "#d97706" }}>-R${fmt(totais.inss)}</td><td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>-R${fmt(totais.irrf)}</td><td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700, color: "#4a9410" }}>R${fmt(totais.liquido)}</td><td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>R${fmt(totais.fgts)}</td><td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700, color: "#7c3aed" }}>R${fmt(totais.inssPatronal)}</td><td style={{ padding: "9px 11px", textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R${fmt(totais.custoTotal)}</td></tr><tr style={{ background: "#f0fdf4" }}><td colSpan={9} style={{ padding: "7px 12px", fontSize: 11, color: "#15803d" }}>FGTS e encargos patronais não reduzem o líquido do empregado. Acréscimo gerencial estimado da empresa: {acrescimoEmpresa.toFixed(1)}% sobre a folha bruta.</td></tr></tfoot>
        </table>
      </div>
    </>)}
  </div>);
}
