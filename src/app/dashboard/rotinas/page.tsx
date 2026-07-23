"use client";
import { useEffect, useState } from "react";

interface Rotina {
  id: string;
  titulo: string;
  descricao: string;
  frequencia: "diaria" | "semanal" | "mensal";
  categoria: string;
  horario?: string;
  responsavel?: string;
  concluida?: boolean;
}

const CAT_CORES: Record<string, string> = {
  "Comunicação": "#2563eb",
  "Organização": "#7c3aed",
  "Financeiro": "#059669",
  "Documentos": "#d97706",
  "Fiscal": "#dc2626",
  "Contratos": "#0891b2",
  "Comercial": "#4f46e5",
  "Operacional": "#ca8a04",
  "Estoque": "#65a30d",
  "RH": "#e11d48",
  "SST": "#0d9488",
  "SADA": "#b91c1c",
};

const PERIODOS = [
  { key: "diaria", label: "📋 Diária", icon: "☀️" },
  { key: "semanal", label: "📅 Semanal", icon: "📆" },
  { key: "mensal", label: "🗓️ Mensal", icon: "📊" },
];

export default function RotinasPage() {
  const [periodo, setPeriodo] = useState("diaria");
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [resumo, setResumo] = useState({ total: 0, concluidas: 0, pendentes: 0, porCategoria: {} as Record<string, number> });
  const [contatos, setContatos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [dataAtual, setDataAtual] = useState("");

  useEffect(() => { carregar(); }, [periodo]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/rotinas?periodo=${periodo}`);
      const d = await r.json();
      setRotinas(d.rotinas || []);
      setResumo(d.resumo || { total: 0, concluidas: 0, pendentes: 0, porCategoria: {} });
      setContatos(d.contatos || []);
      setDataAtual(d.data || "");
    } catch { }
    finally { setCarregando(false); }
  };

  const toggleConcluida = async (id: string) => {
    setRotinas((prev) => prev.map((r) => r.id === id ? { ...r, concluida: !r.concluida } : r));
    setResumo((prev) => {
      const rotina = rotinas.find((r) => r.id === id);
      const seraConcluida = rotina && !rotina.concluida;
      return {
        ...prev,
        concluidas: prev.concluidas + (seraConcluida ? 1 : -1),
        pendentes: prev.pendentes + (seraConcluida ? -1 : 1),
      };
    });
    try {
      await fetch("/api/rotinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, concluida: !rotinas.find((r) => r.id === id)?.concluida }),
      });
    } catch { }
  };

  const rotinasFiltradas = filtro ? rotinas.filter((r) => r.categoria === filtro) : rotinas;
  const categorias = [...new Set(rotinas.map((r) => r.categoria))];
  const progresso = resumo.total > 0 ? Math.round((resumo.concluidas / resumo.total) * 100) : 0;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, margin: 0 }}>📋 Rotinas de Trabalho</h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "3px 0 0" }}>{dataAtual} — Checklist diário, semanal e mensal da Assistente Administrativa</p>
        </div>
      </div>

      {/* Periodo tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {PERIODOS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setPeriodo(p.key); setFiltro(null); }}
            style={{
              background: periodo === p.key ? "#334532" : "#f3f4f6",
              color: periodo === p.key ? "#fff" : "#374151",
              border: "none", padding: "8px 16px", borderRadius: 8,
              cursor: "pointer", fontWeight: 700, fontSize: 13,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Resumo cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #334532" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>TOTAL</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#334532" }}>{resumo.total}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #15803d" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>CONCLUÍDAS</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#15803d" }}>{resumo.concluidas}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #dc2626" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>PENDENTES</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#dc2626" }}>{resumo.pendentes}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #2563eb" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>PROGRESSO</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>{progresso}%</div>
          <div style={{ background: "#e5e7eb", borderRadius: 4, height: 6, marginTop: 4 }}>
            <div style={{ background: progresso === 100 ? "#15803d" : "#2563eb", height: 6, borderRadius: 4, width: `${progresso}%`, transition: "width 0.3s" }} />
          </div>
        </div>
      </div>

      {/* Filtros de categoria */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          onClick={() => setFiltro(null)}
          style={{
            background: !filtro ? "#334532" : "#f3f4f6",
            color: !filtro ? "#fff" : "#374151",
            border: "none", padding: "4px 10px", borderRadius: 6,
            cursor: "pointer", fontSize: 11, fontWeight: 600,
          }}
        >
          Todas ({resumo.total})
        </button>
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setFiltro(filtro === cat ? null : cat)}
            style={{
              background: filtro === cat ? (CAT_CORES[cat] || "#374151") : "#f3f4f6",
              color: filtro === cat ? "#fff" : "#374151",
              border: "none", padding: "4px 10px", borderRadius: 6,
              cursor: "pointer", fontSize: 11, fontWeight: 600,
            }}
          >
            {cat} ({resumo.porCategoria[cat] || 0})
          </button>
        ))}
      </div>

      {/* Lista de rotinas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rotinasFiltradas.map((r) => (
          <div
            key={r.id}
            onClick={() => toggleConcluida(r.id)}
            style={{
              background: r.concluida ? "#f0fdf4" : "#fff",
              border: `1px solid ${r.concluida ? "#bbf7d0" : "#e5e7eb"}`,
              borderLeft: `4px solid ${r.concluida ? "#15803d" : (CAT_CORES[r.categoria] || "#9ca3af")}`,
              borderRadius: 8, padding: "10px 14px",
              cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
              border: `2px solid ${r.concluida ? "#15803d" : "#d1d5db"}`,
              background: r.concluida ? "#15803d" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "#fff", fontWeight: 700,
            }}>
              {r.concluida ? "✓" : ""}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: r.concluida ? "#6b7280" : "#1f2937",
                  textDecoration: r.concluida ? "line-through" : "none",
                }}>
                  {r.titulo}
                </span>
                {r.horario && (
                  <span style={{ fontSize: 10, color: "#6b7280", background: "#f3f4f6", padding: "1px 6px", borderRadius: 4 }}>
                    ⏰ {r.horario}
                  </span>
                )}
                <span style={{
                  fontSize: 10, fontWeight: 600, color: "#fff",
                  background: CAT_CORES[r.categoria] || "#6b7280",
                  padding: "1px 6px", borderRadius: 4,
                }}>
                  {r.categoria}
                </span>
                <span style={{
                  fontSize: 10, color: "#6b7280", background: "#f3f4f6",
                  padding: "1px 6px", borderRadius: 4,
                }}>
                  {r.frequencia === "diaria" ? "Diária" : r.frequencia === "semanal" ? "Semanal" : "Mensal"}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "3px 0 0", lineHeight: 1.4 }}>{r.descricao}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contatos de terceiros */}
      {contatos.length > 0 && (
        <div style={{ marginTop: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ color: "#334532", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📞 Contatos de Terceiros</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            {contatos.map((c, i) => (
              <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <div style={{ fontWeight: 700, color: "#1f2937", fontSize: 13 }}>{c.nome}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{c.empresa}</div>
                <div style={{ fontSize: 11, color: "#059669", fontWeight: 600 }}>{c.funcao}</div>
                <div style={{ fontSize: 12, color: "#1d4ed8", marginTop: 4 }}>{c.telefone}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
