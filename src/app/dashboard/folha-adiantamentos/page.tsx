"use client";
import { useEffect, useState } from "react";

export default function FolhaAdiantamentosPage() {
  const [dados, setDados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoAdiantamento, setNovoAdiantamento] = useState({ employeeId: "", amount: "", competencia: "", notes: "" });
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/folha/adiantamentos");
      const d = await r.json();
      setDados(d.data || []);
    } catch { setDados(DEMO_ADIANT); }
    finally { setCarregando(false); }
  };

  const salvar = async () => {
    if (!novoAdiantamento.employeeId || !novoAdiantamento.amount || !novoAdiantamento.competencia) {
      setMensagem("❌ Preencha funcionário, valor e competência"); return;
    }
    setSalvando(true); setMensagem("");
    try {
      const r = await fetch("/api/folha/adiantamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoAdiantamento),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Erro ao salvar");
      setMensagem("✅ Adiantamento registrado!");
      setNovoAdiantamento({ employeeId: "", amount: "", competencia: "", notes: "" });
      carregar();
    } catch (e: any) { setMensagem(`❌ ${e.message}`); }
    finally { setSalvando(false); }
  };

  const darBaixa = async (id: string, status: string) => {
    try {
      const r = await fetch("/api/folha/adiantamentos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!r.ok) throw new Error("Erro ao atualizar");
      carregar();
    } catch (e: any) { setMensagem(`❌ ${e.message}`); }
  };

  const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const competencias = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>💸 Adiantamentos Salariais</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>Registro, consulta e baixa de adiantamentos (limite CLT: 50% do salário)</p>

      {/* Novo adiantamento */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ color: "#334532", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Novo Adiantamento</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 2fr auto", gap: 10, alignItems: "end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Funcionário</label>
            <input
              type="text"
              value={novoAdiantamento.employeeId}
              onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, employeeId: e.target.value })}
              placeholder="ID do funcionário"
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Valor (R$)</label>
            <input
              type="number"
              value={novoAdiantamento.amount}
              onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, amount: e.target.value })}
              placeholder="0,00"
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Competência</label>
            <select
              value={novoAdiantamento.competencia}
              onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, competencia: e.target.value })}
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
            >
              <option value="">Selecione</option>
              {competencias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>Observação</label>
            <input
              type="text"
              value={novoAdiantamento.notes}
              onChange={(e) => setNovoAdiantamento({ ...novoAdiantamento, notes: e.target.value })}
              placeholder="Opcional"
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}
            />
          </div>
          <button
            onClick={salvar}
            disabled={salvando}
            style={{ background: salvando ? "#9ca3af" : "#334532", color: "#fff", border: "none", padding: "7px 16px", borderRadius: 6, cursor: salvando ? "wait" : "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}
          >
            {salvando ? "..." : "+ Registrar"}
          </button>
        </div>
        {mensagem && <div style={{ marginTop: 8, fontSize: 12, color: mensagem.startsWith("✅") ? "#15803d" : "#dc2626" }}>{mensagem}</div>}
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#334532", color: "#fff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Funcionário</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Função</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Salário</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Valor</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>50% Limite</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Competência</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((a: any) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{a.employee_name || a.employeeId}</td>
                  <td style={{ padding: "8px 12px", color: "#6b7280" }}>{a.employee_role || "—"}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmt(Number(a.employee_salary || 0))}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#334532" }}>R$ {fmt(Number(a.amount))}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: "#6b7280" }}>R$ {fmt(Number(a.employee_salary || 0) * 0.5)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>{a.competencia}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <span style={{ background: a.status === "descontado" ? "#dcfce7" : a.status === "cancelado" ? "#fef2f2" : "#fef3c7", color: a.status === "descontado" ? "#15803d" : a.status === "cancelado" ? "#dc2626" : "#92400e", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                      {a.status === "descontado" ? "Descontado" : a.status === "cancelado" ? "Cancelado" : "Pendente"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    {a.status === "pendente" && (
                      <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button onClick={() => darBaixa(a.id, "descontado")} style={{ background: "#15803d", color: "#fff", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Descontar</button>
                        <button onClick={() => darBaixa(a.id, "cancelado")} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "3px 8px", borderRadius: 4, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Cancelar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!dados.length && !carregando && (
                <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>Nenhum adiantamento registrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const DEMO_ADIANT = [
  { id: "a1", employee_id: "e1", employee_name: "Abrão Felipe", employee_role: "Op. Roçadeira", employee_salary: 2500, amount: 1250, competencia: "2026-07", status: "pendente" },
  { id: "a2", employee_id: "e2", employee_name: "Ana Luiza Ribeiro", employee_role: "Supervisora", employee_salary: 3500, amount: 1750, competencia: "2026-07", status: "pendente" },
  { id: "a3", employee_id: "e5", employee_name: "Leomar Souza", employee_role: "Op. Retroescav.", employee_salary: 3200, amount: 1600, competencia: "2026-06", status: "descontado" },
];
