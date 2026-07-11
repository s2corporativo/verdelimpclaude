"use client";
// Central de Alertas — tudo que vence ou exige ação, num painel único.
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const NIVEL: Record<string, { label: string; fundo: string; cor: string; icone: string }> = {
  critico: { label: "CRÍTICO", fundo: "#fee2e2", cor: "#991b1b", icone: "🔴" },
  atencao: { label: "Atenção", fundo: "#fef3c7", cor: "#92400e", icone: "🟡" },
  info:    { label: "Info",    fundo: "#e0e7ff", cor: "#3730a3", icone: "🔵" },
};

export default function AlertasPage() {
  const router = useRouter();
  const [dados, setDados] = useState<any>(null);
  const [filtro, setFiltro] = useState("");

  const carregar = useCallback(async () => {
    const r = await fetch("/api/alertas-central");
    setDados(await r.json());
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  if (!dados) return <p style={{ color: "#6b7280" }}>Carregando…</p>;

  const lista = filtro ? dados.alertas.filter((a: any) => a.categoria === filtro) : dados.alertas;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🚨 Central de Alertas</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Tudo que está vencido ou vence em breve: contratos (90 dias), ASO, treinamentos, CNH, EPI, licenças ambientais, documentos e férias.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, borderLeft: "4px solid #991b1b", minWidth: 140 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>CRÍTICOS (vencidos)</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: "#991b1b" }}>{dados.resumo.criticos}</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, borderLeft: "4px solid #b45309", minWidth: 140 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>ATENÇÃO (a vencer)</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: "#b45309" }}>{dados.resumo.atencao}</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, borderLeft: "4px solid #4a9410", minWidth: 140 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>TOTAL</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, color: "#334532" }}>{dados.resumo.total}</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => setFiltro("")}
          style={{ background: !filtro ? "#334532" : "#fff", color: !filtro ? "#fff" : "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Todos ({dados.resumo.total})
        </button>
        {Object.entries(dados.resumo.porCategoria).map(([cat, n]: any) => (
          <button key={cat} onClick={() => setFiltro(filtro === cat ? "" : cat)}
            style={{ background: filtro === cat ? "#334532" : "#fff", color: filtro === cat ? "#fff" : "#374151", border: "1px solid #d1d5db", padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {cat} ({n})
          </button>
        ))}
      </div>

      {lista.length === 0 && (
        <div style={{ background: "#dcfce7", borderRadius: 12, padding: 24, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#15803d" }}>✅ Nenhum alerta {filtro ? `em ${filtro}` : ""} — tudo em dia!</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lista.map((a: any, i: number) => {
          const n = NIVEL[a.nivel];
          return (
            <button key={i} onClick={() => router.push(a.link)}
              style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "none", borderLeft: `4px solid ${n.cor}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>{n.icone}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#111827" }}>{a.titulo}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{a.detalhe}</p>
              </div>
              <span style={{ background: "#f3f4f6", color: "#374151", padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{a.categoria}</span>
              <span style={{ background: n.fundo, color: n.cor, padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
