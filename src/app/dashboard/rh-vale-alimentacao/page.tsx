"use client";
import { useEffect, useState } from "react";

interface VRItem {
  employeeId: string;
  name: string;
  role: string;
  salary: number;
  diasUteis: number;
  diasTrabalhados: number;
  valorVR: number;
}

interface Totais {
  valorTotal: number;
  funcionarios: number;
  mes: string;
  vrMensal: number;
}

export default function ValeAlimentacaoPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [dados, setDados] = useState<VRItem[]>([]);
  const [totais, setTotais] = useState<Totais | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => { carregar(); }, [month]);

  const carregar = async () => {
    setCarregando(true); setMensagem("");
    try {
      const r = await fetch(`/api/rh/vale-alimentacao?month=${month}`);
      if (!r.ok) throw new Error("Erro ao carregar dados");
      const d = await r.json();
      setDados(d.data || []);
      setTotais(d.totais || null);
    } catch {
      setDados(DEMO_VR);
      setTotais({ valorTotal: DEMO_VR.reduce((s, d) => s + d.valorVR, 0), funcionarios: DEMO_VR.length, mes: month, vrMensal: 600 });
    } finally { setCarregando(false); }
  };

  const meses = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtNum = (v: number) => (v || 0).toLocaleString("pt-BR");

  const handleProcessar = () => {
    setShowConfirm(false);
    setMensagem("✅ VR processado com sucesso! (simulação)");
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>🍽️ Vale Alimentação VR</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>
        Cálculo proporcional: R$ 600,00/mês × (dias trabalhados ÷ dias úteis do mês)
      </p>

      {/* Seletor de mês */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#334532" }}>Competência:</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {new Date(Number(m.split("-")[0]), Number(m.split("-")[1]) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          style={{ background: "#4a9410", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}
        >
          Processar VR
        </button>
        {mensagem && <span style={{ fontSize: 12, color: mensagem.startsWith("✅") ? "#15803d" : "#dc2626" }}>{mensagem}</span>}
      </div>

      {/* Cards de resumo */}
      {totais && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Total VR</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#334532" }}>{fmt(totais.valorTotal)}</div>
          </div>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Funcionários Elegíveis</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1e40af" }}>{fmtNum(totais.funcionarios)}</div>
          </div>
          <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: 10, padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Valor Base Mensal</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#854d0e" }}>{fmt(totais.vrMensal)}</div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#334532", color: "#fff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Funcionário</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Cargo</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Salário</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Dias Úteis</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Dias Trab.</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Valor VR</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((item) => (
                <tr key={item.employeeId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.name}</td>
                  <td style={{ padding: "8px 12px", color: "#6b7280" }}>{item.role}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmtNum(item.salary)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{item.diasUteis}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center", color: item.diasTrabalhados < item.diasUteis ? "#dc2626" : "#15803d", fontWeight: 600 }}>
                    {item.diasTrabalhados}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#334532" }}>
                    {fmt(item.valorVR)}
                  </td>
                </tr>
              ))}
              {!dados.length && !carregando && (
                <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>Nenhum funcionário encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setShowConfirm(false)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: "#334532", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>🍽️ Processar Vale Alimentação</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Confirma o processamento do VR para <strong>{totais?.funcionarios || 0} funcionários</strong> no valor total de <strong>{fmt(totais?.valorTotal || 0)}</strong>?
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowConfirm(false)}
                style={{ background: "#e5e7eb", color: "#334532", border: "none", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
                Cancelar
              </button>
              <button onClick={handleProcessar}
                style={{ background: "#4a9410", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEMO_VR: VRItem[] = [
  { employeeId: "e1", name: "Abrão Felipe", role: "Op. Roçadeira", salary: 2500, diasUteis: 22, diasTrabalhados: 20, valorVR: 545.45 },
  { employeeId: "e2", name: "Ana Luiza Ribeiro", role: "Supervisora", salary: 3500, diasUteis: 22, diasTrabalhados: 22, valorVR: 600.00 },
  { employeeId: "e3", name: "Carlos Eduardo", role: "Op. Limpeza", salary: 1800, diasUteis: 22, diasTrabalhados: 18, valorVR: 490.91 },
  { employeeId: "e4", name: "Fernanda Costa", role: "Enfermeira", salary: 3200, diasUteis: 22, diasTrabalhados: 21, valorVR: 572.73 },
  { employeeId: "e5", name: "Leomar Souza", role: "Op. Retroescav.", salary: 3200, diasUteis: 22, diasTrabalhados: 22, valorVR: 600.00 },
];
