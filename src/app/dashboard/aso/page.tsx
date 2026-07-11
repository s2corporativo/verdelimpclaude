"use client";
// ASO — controle de exames ocupacionais por funcionário, com vencimento.
import { useEffect, useState, useCallback } from "react";

const TIPOS: Record<string, string> = { admissional: "Admissional", periodico: "Periódico", retorno_trabalho: "Retorno ao trabalho", mudanca_risco: "Mudança de risco", demissional: "Demissional" };
const UI: Record<string, [string, string, string]> = { valido: ["Válido", "#dcfce7", "#15803d"], a_vencer: ["A vencer", "#fef3c7", "#92400e"], vencido: ["Vencido", "#fee2e2", "#991b1b"] };
const fdata = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export default function AsoPage() {
  const [dados, setDados] = useState<any>(null);
  const [form, setForm] = useState({ employeeId: "", examType: "periodico", examDate: "", expiresAt: "", result: "apto", doctor: "", crm: "", notes: "" });
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    const r = await fetch("/api/aso");
    setDados(await r.json());
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  // Sugere validade de 1 ano ao preencher a data do exame
  const setExamDate = (v: string) => {
    const sugestao = v ? new Date(new Date(v).setFullYear(new Date(v).getFullYear() + 1)).toISOString().slice(0, 10) : "";
    setForm((f) => ({ ...f, examDate: v, expiresAt: f.expiresAt || sugestao }));
  };

  const salvar = async () => {
    setMsg("");
    const r = await fetch("/api/aso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return; }
    setForm({ employeeId: "", examType: "periodico", examDate: "", expiresAt: "", result: "apto", doctor: "", crm: "", notes: "" });
    carregar();
  };

  const card = (t: string, v: any, cor: string) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, borderLeft: `4px solid ${cor}` }}>
      <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t}</p>
      <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, color: cor }}>{v}</p>
    </div>
  );

  const input = (k: string, label: string, type = "text", extra: any = {}) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>{label}</label>
      <input type={type} value={(form as any)[k]} onChange={(e) => (k === "examDate" ? setExamDate(e.target.value) : setForm({ ...form, [k]: e.target.value }))}
        style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: extra.width || 150 }} />
    </div>
  );

  if (!dados) return <p style={{ color: "#6b7280" }}>Carregando…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🩺 ASO — Saúde Ocupacional</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>Exame mais recente de cada funcionário. Alimenta automaticamente o Monitor de Documentação e o dossiê SSO.</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {card("Funcionários ativos", dados.resumo.total, "#4a9410")}
        {card("Sem ASO registrado", dados.resumo.semAso, "#374151")}
        {card("Vencidos", dados.resumo.vencidos, "#991b1b")}
        {card("A vencer (30 dias)", dados.resumo.aVencer, "#b45309")}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>➕ Registrar exame</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Funcionário</label>
            <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, minWidth: 220, background: "#fff" }}>
              <option value="">Selecione…</option>
              {dados.linhas.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Tipo</label>
            <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff" }}>
              {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          {input("examDate", "Data do exame", "date")}
          {input("expiresAt", "Válido até", "date")}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>Resultado</label>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}
              style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff" }}>
              <option value="apto">Apto</option><option value="apto_restricoes">Apto c/ restrições</option><option value="inapto">Inapto</option>
            </select>
          </div>
          {input("doctor", "Médico", "text", { width: 180 })}
          {input("crm", "CRM", "text", { width: 100 })}
          <button onClick={salvar} disabled={!form.employeeId || !form.examDate}
            style={{ background: "#4a9410", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: !form.employeeId || !form.examDate ? 0.5 : 1 }}>
            Salvar
          </button>
        </div>
        {msg && <p style={{ color: "#991b1b", fontSize: 13, marginTop: 8 }}>{msg}</p>}
      </div>

      <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: 8 }}>Funcionário</th><th style={{ padding: 8 }}>Função</th><th style={{ padding: 8 }}>Último exame</th><th style={{ padding: 8 }}>Tipo</th><th style={{ padding: 8 }}>Válido até</th><th style={{ padding: 8 }}>Resultado</th><th style={{ padding: 8 }}>Status</th>
            </tr></thead>
            <tbody>
              {dados.linhas.map((l: any) => {
                const st = l.atual?.status as string | undefined;
                return (
                  <tr key={l.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: 8, fontWeight: 700 }}>{l.name}</td>
                    <td style={{ padding: 8, color: "#6b7280" }}>{l.role}</td>
                    <td style={{ padding: 8 }}>{fdata(l.atual?.examDate)}</td>
                    <td style={{ padding: 8 }}>{l.atual ? TIPOS[l.atual.examType] || l.atual.examType : "—"}</td>
                    <td style={{ padding: 8 }}>{fdata(l.atual?.expiresAt)}</td>
                    <td style={{ padding: 8 }}>{l.atual ? (l.atual.result === "apto" ? "Apto" : l.atual.result === "inapto" ? "Inapto" : "Apto c/ restrições") : "—"}</td>
                    <td style={{ padding: 8 }}>
                      {st && UI[st]
                        ? <span style={{ background: UI[st][1], color: UI[st][2], padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{UI[st][0]}</span>
                        : <span style={{ background: "#f3f4f6", color: "#374151", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>⚪ Sem ASO</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
