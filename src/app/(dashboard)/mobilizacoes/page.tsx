
"use client";
import { useEffect, useState } from "react";

export default function MobilizacoesPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [demo, setDemo] = useState(false);
  const [filtro, setFiltro] = useState<"todas"|"ativa"|"encerrada">("ativa");

  useEffect(() => {
    fetch("/api/mobilizacoes").then(r=>r.json()).then(d=>{
      setData(d.data||[]); setStats(d.stats||{}); setDemo(!!d._demo);
    });
  }, []);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const filtradas = filtro === "todas" ? data : data.filter(m => m.status === filtro);

  // Agrupa por contrato
  const porContrato: any = {};
  filtradas.forEach((m: any) => {
    const k = m.contract?.number || m.contractId || "sem-contrato";
    if (!porContrato[k]) porContrato[k] = { contrato: m.contract, mobilizacoes: [], custoTotal: 0 };
    porContrato[k].mobilizacoes.push(m);
    porContrato[k].custoTotal += Number(m.costPerMonth || 0);
  });

  const STATUS_STYLE: any = {
    ativa: ["#dcfce7","#15803d","✅ Ativa"],
    encerrada: ["#f3f4f6","#6b7280","⏸️ Encerrada"],
    suspensa: ["#fef9c3","#92400e","⚠️ Suspensa"],
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, margin: 0 }}>
          🦺 Mobilização de Equipe
          {demo && <span style={{ fontSize: 11, background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 8, marginLeft: 8 }}>Demo</span>}
        </h1>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
          Controle de funcionários alocados por contrato — quem está em qual obra, desde quando e custo mensal por contrato
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          ["Total mobilizações", stats.total || 0, "📋", "#1a7a4a"],
          ["Mobilizações ativas", stats.ativas || 0, "✅", "#15803d"],
          ["Custo mensal total", "R$ " + fmt(stats.custoMensal || 0), "💰", "#dc2626"],
          ["Contratos com equipe", Object.keys(porContrato).length, "🤝", "#1d4ed8"],
        ].map(([l, v, i, c]) => (
          <div key={l as string} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${c}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{l}</span>
              <span>{i}</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c as string, marginTop: 5 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {(["ativa","encerrada","todas"] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ background: filtro === f ? "#0f5233" : "transparent", color: filtro === f ? "#fff" : "#374151", border: `1px solid ${filtro === f ? "#0f5233" : "#d1d5db"}`, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: filtro === f ? 700 : 400 }}>
            {f === "ativa" ? "✅ Ativas" : f === "encerrada" ? "Encerradas" : "Todas"}
          </button>
        ))}
      </div>

      {/* Lista por contrato */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {Object.entries(porContrato).map(([key, info]: any) => (
          <div key={key} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: "#e8f5ee", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#0f5233", fontSize: 13 }}>
                  📋 {info.contrato?.number} <span style={{ color: "#6b7280", fontWeight: 400 }}>— {info.contrato?.object}</span>
                </div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                  {info.mobilizacoes.length} pessoa(s) alocada(s)
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>Custo mensal</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>R$ {fmt(info.custoTotal)}</div>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Funcionário","Função","Início","Fim previsto","Jornada","Custo/mês","Status"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {info.mobilizacoes.map((m: any, i: number) => {
                  const [bg, co, txt] = STATUS_STYLE[m.status] || ["#f3f4f6","#374151",m.status];
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12 }}>{m.employee?.name}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280" }}>{m.role}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11 }}>{m.startDate ? new Date(m.startDate).toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11 }}>{m.endDate ? new Date(m.endDate).toLocaleDateString("pt-BR") : "—"}</td>
                      <td style={{ padding: "8px 12px", fontSize: 11 }}>{m.hoursDay}h × {m.daysWeek}d</td>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#dc2626" }}>R$ {fmt(Number(m.costPerMonth))}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ background: bg, color: co, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{txt}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {filtradas.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>Nenhuma mobilização {filtro !== "todas" ? filtro : ""}</div>}
    </div>
  );
}
