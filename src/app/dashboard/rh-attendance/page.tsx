"use client";
// Controle de Ponto e Attendance — faltas, atestados, horas extras, bonificações e descontos.
import { useEffect, useState, useCallback } from "react";

const TIPO_COR: Record<string, [string, string, string]> = {
  falta:       ["#fee2e2", "#991b1b", "Falta"],
  atestado:    ["#fef9c3", "#92400e", "Atestado"],
  hora_extra:  ["#dcfce7", "#15803d", "Hora Extra"],
  bonificacao: ["#dbeafe", "#1d4ed8", "Bonificação"],
  desconto:    ["#f3f4f6", "#374151", "Desconto"],
};

const fdata = (d?: string | Date | null) => { if (!d) return "—"; const s = typeof d === "string" ? d + (d.includes("T") ? "" : "T12:00:00") : d.toISOString(); return new Date(s).toLocaleDateString("pt-BR"); };

export default function RhAttendancePage() {
  const [data, setData] = useState<any>(null);
  const [funcs, setFuncs] = useState<any[]>([]);
  const [filtro, setFiltro] = useState({ employeeId: "", month: new Date().toISOString().slice(0, 7), type: "" });
  const [form, setForm] = useState<any>({ employeeId: "", date: "", type: "falta", hours: "", description: "", amount: "" });
  const [aberto, setAberto] = useState(false);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    const p = new URLSearchParams();
    if (filtro.employeeId) p.set("employeeId", filtro.employeeId);
    if (filtro.month) p.set("month", filtro.month);
    if (filtro.type) p.set("type", filtro.type);
    const r = await fetch(`/api/rh/attendance?${p}`);
    setData(await r.json());
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { fetch("/api/funcionarios").then(r => r.json()).then(d => setFuncs(d.data || [])); }, []);

  const criar = async () => {
    setMsg("");
    const body = { ...form, hours: form.hours ? Number(form.hours) : undefined, amount: form.amount ? Number(form.amount) : undefined };
    const r = await fetch("/api/rh/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return; }
    setMsg("✅ Registro criado com sucesso.");
    setForm({ employeeId: "", date: "", type: "falta", hours: "", description: "", amount: "" });
    setAberto(false);
    carregar();
  };

  const card = (titulo: string, valor: string | number, cor: string) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, minWidth: 140, borderLeft: `4px solid ${cor}` }}>
      <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{titulo}</p>
      <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, color: cor }}>{valor}</p>
    </div>
  );

  if (!data) return <p style={{ color: "#6b7280" }}>Carregando…</p>;

  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 900, marginBottom: 4 }}>📋 Controle de Ponto e Attendance</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Registro de faltas, atestados, horas extras, bonificações e descontos por funcionário.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {card("Total Faltas", data.totals.faltas, "#991b1b")}
        {card("Total Atestados", data.totals.atestados, "#92400e")}
        {card("Total HE (h)", data.totals.horasExtras, "#15803d")}
        {card("Bonificações (R$)", `R$ ${data.totals.bonificacoes.toFixed(2)}`, "#1d4ed8")}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Mês</label>
          <input type="month" value={filtro.month} onChange={(e) => setFiltro({ ...filtro, month: e.target.value })}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Funcionário</label>
          <select value={filtro.employeeId} onChange={(e) => setFiltro({ ...filtro, employeeId: e.target.value })}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, minWidth: 180 }}>
            <option value="">Todos</option>
            {funcs.map((f: any) => <option key={f.id} value={f.id}>{f.name} — {f.role}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Tipo</label>
          <select value={filtro.type} onChange={(e) => setFiltro({ ...filtro, type: e.target.value })}
            style={{ padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}>
            <option value="">Todos</option>
            {Object.entries(TIPO_COR).map(([k, v]) => <option key={k} value={k}>{v[2]}</option>)}
          </select>
        </div>
        <button onClick={() => setAberto(!aberto)}
          style={{ background: aberto ? "#6b7280" : "#4a9410", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          {aberto ? "Cancelar" : "+ Novo Registro"}
        </button>
      </div>

      {msg && <p style={{ color: msg.startsWith("✅") ? "#15803d" : "#991b1b", fontSize: 13, marginBottom: 10 }}>{msg}</p>}

      {aberto && (
        <div style={{ background: "#fff", borderRadius: 12, padding: 18, marginBottom: 16, border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#334532", marginBottom: 12 }}>Novo Registro de Attendance</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Funcionário *</label>
              <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}>
                <option value="">Selecione</option>
                {funcs.map((f: any) => <option key={f.id} value={f.id}>{f.name} — {f.role}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Data *</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Tipo *</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}>
                {Object.entries(TIPO_COR).map(([k, v]) => <option key={k} value={k}>{v[2]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Horas (hora_extra)</label>
              <input type="number" step="0.5" min="0" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })}
                placeholder="ex: 2.5"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Valor (R$)</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="ex: 150.00"
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 }}>Descrição</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2} placeholder="Observações..."
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, resize: "vertical" }} />
            </div>
          </div>
          <button onClick={criar} disabled={!form.employeeId || !form.date}
            style={{ marginTop: 12, background: form.employeeId && form.date ? "#4a9410" : "#9ca3af", color: "#fff", border: "none", padding: "9px 20px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Salvar Registro
          </button>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left", color: "#6b7280", fontSize: 11, fontWeight: 700 }}>
              <th style={{ padding: "10px 14px" }}>Data</th>
              <th style={{ padding: "10px 14px" }}>Funcionário</th>
              <th style={{ padding: "10px 14px" }}>Tipo</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Horas</th>
              <th style={{ padding: "10px 14px" }}>Descrição</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {data.data.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>Nenhum registro encontrado para este período.</td></tr>
            )}
            {data.data.map((r: any) => {
              const tc = TIPO_COR[r.type] || ["#f3f4f6", "#374151", r.type];
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 14px", fontWeight: 600 }}>{fdata(r.date)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontWeight: 700 }}>{r.employeeName}</span>
                    <br /><span style={{ fontSize: 11, color: "#6b7280" }}>{r.employeeRole}</span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ background: tc[0], color: tc[1], padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                      {tc[2]}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: r.type === "hora_extra" ? "#15803d" : "#374151" }}>
                    {r.hours != null ? `${r.hours}h` : "—"}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#4b5563", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.description || "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: r.type === "bonificacao" ? "#1d4ed8" : r.type === "desconto" ? "#991b1b" : "#374151" }}>
                    {r.amount != null ? `R$ ${Number(r.amount).toFixed(2)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
