
"use client";
import { useEffect, useState } from "react";

function Grafico({ meses, tendencia }: { meses: any[], tendencia?: number }) {
  const [ativo, setAtivo] = useState<"barras"|"margem">("barras");
  if (!meses?.length) return null;
  const fmt = (v: number) => v >= 1000000 ? "R$"+(v/1000000).toFixed(1)+"M" : v >= 1000 ? "R$"+(v/1000).toFixed(0)+"k" : "R$"+v;
  const fmtPct = (v: number) => (v >= 0 ? "+" : "")+v+"%";

  // Gráfico de barras empilhadas
  const maxFat = Math.max(...meses.map((m:any) => m.faturamento), 1);
  const maxMarg = Math.max(...meses.map((m:any) => Math.abs(m.margem||0)), 1);
  const ultMes = meses[meses.length-1];
  const penMes = meses[meses.length-2];
  const varFat = penMes?.faturamento > 0 ? Math.round(((ultMes.faturamento - penMes.faturamento)/penMes.faturamento)*100) : 0;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
        <div>
          <h3 style={{ color:"#0f5233", fontSize:13, fontWeight:700, margin:0 }}>📈 Desempenho Financeiro — 12 meses</h3>
          {tendencia !== undefined && (
            <span style={{ fontSize:11, color: tendencia >= 0 ? "#15803d" : "#dc2626", fontWeight:600 }}>
              {tendencia >= 0 ? "▲" : "▼"} {Math.abs(tendencia)}% vs trimestre anterior
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {(["barras","margem"] as const).map(t => (
            <button key={t} onClick={()=>setAtivo(t)}
              style={{ background: ativo===t?"#0f5233":"#f3f4f6", color: ativo===t?"#fff":"#374151", border:"none", padding:"4px 10px", borderRadius:6, cursor:"pointer", fontSize:10, fontWeight:600 }}>
              {t === "barras" ? "📊 Faturamento" : "📉 Margem %"}
            </button>
          ))}
        </div>
      </div>

      {ativo === "barras" && (
        <div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:130, paddingBottom:4 }}>
            {meses.map((m:any, i:number) => (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div style={{ width:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end", height:110, gap:1 }}>
                  <div style={{ background:"#f87171", height: maxFat > 0 ? `${(m.tributos/maxFat)*105}px` : "1px", minHeight:1, borderRadius:"1px 1px 0 0" }} title={`Tributos: ${fmt(m.tributos)}`}/>
                  <div style={{ background:"#fb923c", height: maxFat > 0 ? `${(m.despesas/maxFat)*105}px` : "1px", minHeight:1 }} title={`Despesas: ${fmt(m.despesas)}`}/>
                  <div style={{ background:"#1a7a4a", height: maxFat > 0 ? `${(m.margem>0?m.margem/maxFat:0)*105}px` : "1px", minHeight:1 }} title={`Margem: ${fmt(m.margem)}`}/>
                </div>
                <span style={{ fontSize:8, color:"#9ca3af", marginTop:2, textAlign:"center", lineHeight:1 }}>{m.label||m.mes?.slice(5)}</span>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:12, marginTop:6, fontSize:9, flexWrap:"wrap" }}>
            {[["#f87171","Tributos"],["#fb923c","Despesas op."],["#1a7a4a","Margem líquida"]].map(([c,l])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:3 }}>
                <div style={{ width:8, height:8, background:c, borderRadius:1 }}/><span style={{ color:"#6b7280" }}>{l}</span>
              </div>
            ))}
          </div>
          {/* Linha de valores no rodapé */}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, padding:"8px 10px", background:"#f9fafb", borderRadius:8, fontSize:11, flexWrap:"wrap", gap:6 }}>
            <span>Faturado (mês): <strong style={{ color:"#0f5233" }}>{fmt(ultMes.faturamento)}</strong></span>
            <span>Tributos: <strong style={{ color:"#dc2626" }}>{fmt(ultMes.tributos)}</strong></span>
            <span>Despesas: <strong style={{ color:"#d97706" }}>{fmt(ultMes.despesas)}</strong></span>
            <span>Margem: <strong style={{ color: ultMes.margemPct >= 20 ? "#15803d" : ultMes.margemPct >= 10 ? "#d97706" : "#dc2626" }}>{fmt(ultMes.margem)} ({ultMes.margemPct}%)</strong></span>
            <span style={{ color: varFat >= 0 ? "#15803d" : "#dc2626", fontWeight:600 }}>MoM: {fmtPct(varFat)}</span>
          </div>
        </div>
      )}

      {ativo === "margem" && (
        <div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:3, height:130, paddingBottom:4 }}>
            {meses.map((m:any, i:number) => {
              const pct = m.margemPct || 0;
              const cor = pct >= 30 ? "#15803d" : pct >= 20 ? "#65a30d" : pct >= 10 ? "#d97706" : "#dc2626";
              return (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                  <div style={{ fontSize:7, color:cor, fontWeight:700, marginBottom:1 }}>{pct}%</div>
                  <div style={{ width:"100%", background:cor, height:`${Math.max(pct/50*100, 3)}px`, minHeight:3, borderRadius:"2px 2px 0 0" }} title={`Margem ${pct}%: ${fmt(m.margem)}`}/>
                  <span style={{ fontSize:8, color:"#9ca3af", marginTop:2, textAlign:"center", lineHeight:1 }}>{m.label||m.mes?.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:10, marginTop:8, fontSize:9 }}>
            {[["#15803d","≥30%"],["#65a30d","20-29%"],["#d97706","10-19%"],["#dc2626","<10%"]].map(([c,l])=>(
              <div key={l} style={{ display:"flex", alignItems:"center", gap:3 }}>
                <div style={{ width:8, height:8, background:c, borderRadius:2 }}/><span style={{ color:"#6b7280" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ l, v, i, c = "#1a7a4a", alert = false }: any) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${alert ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${alert ? "#dc2626" : c}` }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{l}</span>
        <span style={{ fontSize: 14 }}>{i}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: alert ? "#dc2626" : c, marginTop: 5 }}>{v}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [dados, setDados] = useState<any>({});
  const [fiscal, setFiscal] = useState<any>({});
  const [graficos, setGraficos] = useState<any[]>([]);
  const [tendencia, setTendencia] = useState<number>(0);
  const [demo, setDemo] = useState(false);
  const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then(r => r.json()).catch(() => ({})),
      fetch("/api/fiscal/dashboard").then(r => r.json()).catch(() => ({})),
      fetch("/api/dashboard/graficos").then(r => r.json()).catch(() => ({ meses: [] })),
    ]).then(([d, f, g]) => {
      setDados(d); setFiscal(f); setGraficos(g.meses || []); setTendencia(g.tendencia || 0); setDemo(!!d._demo || !!f._demo);
    });
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: "#0f5233", fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "3px 0 0" }}>
            VERDELIMP · CNPJ 30.198.776/0001-29 · Simples Nacional · Betim/MG
            {demo && <span style={{ marginLeft: 8, background: "#e0e7ff", color: "#3730a3", fontSize: 10, padding: "2px 8px", borderRadius: 8, fontWeight: 700 }}>Demo</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ background: "#dcfce7", color: "#15803d", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>● Sistema ativo</span>
          <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>🌐 6 APIs ativas</span>
        </div>
      </div>

      {fiscal.tributosVencidos > 0 && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#991b1b", fontWeight: 600, fontSize: 13 }}>
          🚨 {fiscal.tributosVencidos} tributo(s) VENCIDO(S) — acesse Central Fiscal para regularizar
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 9, marginBottom: 18 }}>
        <Kpi label="Clientes" value={dados.totalClientes || 5} icon="🤝" />
        <Kpi label="Funcionários" value={dados.totalFuncionarios || 8} icon="👷" color="#1d4ed8" />
        <Kpi label="NFS-e emitidas" value={dados.totalNfse || 3} icon="🧾" color="#7c3aed" />
        <Kpi label="Propostas" value={dados.totalPropostas || 2} icon="📄" color="#0891b2" />
        <Kpi label="Tributos em aberto" value={`R$${fmt(fiscal.tributosAberto || 8450)}`} icon="💸" color="#d97706" alert={fiscal.tributosAberto > 0} />
        <Kpi label="Tributos pagos" value={`R$${fmt(fiscal.tributosPago || 5770)}`} icon="✅" />
        <Kpi label="Docs alerta" value={fiscal.docsVencer || 2} icon="📋" color={fiscal.docsVencer > 0 ? "#dc2626" : "#1a7a4a"} alert={fiscal.docsVencer > 0} />
        <Kpi label="Contratos ativos" value={dados.totalContratos || "—"} icon="📋" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <Grafico meses={graficos} tendencia={tendencia} />
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ color: "#0f5233", fontSize: 13, marginBottom: 12 }}>📅 Próximos vencimentos</h3>
          {(fiscal.proximosVencimentos || [
            { taxType: "ISS", competence: "2026-04", dueDate: "2026-05-10", totalAmount: 950 },
            { taxType: "DAS", competence: "2026-04", dueDate: "2026-05-20", totalAmount: 3840 },
            { taxType: "INSS", competence: "2026-04", dueDate: "2026-05-20", totalAmount: 1442 },
          ]).map((v: any, i: number) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 12 }}>{v.taxType} — {v.competence}</p>
                <p style={{ margin: 0, fontSize: 10, color: "#9ca3af" }}>{new Date(v.dueDate).toLocaleDateString("pt-BR")}</p>
              </div>
              <span style={{ fontWeight: 700, color: "#d97706" }}>R${fmt(Number(v.totalAmount))}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ color: "#0f5233", fontSize: 13, marginBottom: 10 }}>🔗 APIs conectadas</h3>
          {[["ViaCEP", "Endereços automáticos", "✅"], ["BrasilAPI CNPJ", "Dados Receita Federal", "✅"], ["IBGE", "Municípios e UFs", "✅"], ["Feriados 2026", "Calendário fiscal", "✅"], ["ISS Betim LC33/2003", "Alíquotas automáticas", "✅"], ["PNCP", "Radar licitações", "✅"]].map(([n, d, s]) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f3f4f6", fontSize: 11 }}>
              <span><strong>{n}</strong> <span style={{ color: "#9ca3af" }}>— {d}</span></span><span>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg, #0f5233 0%, #1a7a4a 100%)", borderRadius: 12, padding: 16, color: "#fff" }}>
          <h3 style={{ fontSize: 13, marginBottom: 12 }}>🚀 Acesso rápido</h3>
          {[["⚡ Novo Contrato (impacto auto)", "/dashboard/novo-contrato", "#fff", "#fbbf24"], ["💼 Apurar tributos", "/dashboard/fiscal", "#dcfce7", "#0f5233"], ["📄 Nova proposta + PDF", "/dashboard/propostas", "#dcfce7", "#0f5233"], ["🔍 Buscar licitações", "/dashboard/radar-licitacoes", "#dcfce7", "#0f5233"], ["🚛 Logística semana", "/dashboard/logistica", "#dcfce7", "#0f5233"], ["🤖 Ajuda com IA", "/dashboard/ajuda", "#dcfce7", "#0f5233"]].map(([l, h, bg, co]) => (
            <a key={h} href={h} style={{ display: "block", background: "rgba(255,255,255,.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 6, textDecoration: "none", color: "#fff", fontSize: 12, fontWeight: 600 }}>{l}</a>
          ))}
        </div>
      </div>
    </div>
  );
}
