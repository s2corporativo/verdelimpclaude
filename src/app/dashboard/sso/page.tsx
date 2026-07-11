"use client";
import { useEffect, useState } from "react";

const IS: any = { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 };
const LS: any = { fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 };
const BTN: any = { border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 };

const BADGE: Record<string, [string, string, string]> = {
  valido: ["Válido", "#dcfce7", "#15803d"],
  a_vencer: ["A vencer", "#fef3c7", "#92400e"],
  vencido: ["Vencido", "#fee2e2", "#991b1b"],
  ausente: ["Ausente", "#f3f4f6", "#6b7280"],
};
const Badge = ({ s }: { s: string }) => {
  const [label, bg, cor] = BADGE[s] || BADGE.ausente;
  return <span style={{ background: bg, color: cor, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{label}</span>;
};

export default function SsoPage() {
  const [data, setData] = useState<any[]>([]);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [form, setForm] = useState({
    competencia: mesAtual,
    atividade: "JARDINAGEM",
    contratante: "",
    contatoEmergencia: "",
    responsavelSesmt: "",
    homensHora: "", desvios: "", incidentes: "", tfsa: "", tfca: "",
  });

  useEffect(() => { fetch("/api/sso").then((r) => r.json()).then((d) => setData(d.data || [])); }, []);

  const gerar = (funcionarioId?: string) => {
    const q = new URLSearchParams();
    if (funcionarioId) q.set("funcionarioId", funcionarioId);
    Object.entries(form).forEach(([k, v]) => { if (v) q.set(k, v); });
    window.open(`/api/sso/documento?${q}`, "_blank", "width=980,height=760");
  };

  return (
    <div>
      <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Documentação SSO</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 14 }}>
        Dossiê de Saúde e Segurança do Trabalho — checklist dos 19 requisitos da contratante, por funcionário ou consolidado do mês.
      </p>

      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "9px 13px", marginBottom: 16, fontSize: 11, color: "#15803d" }}>
        🦺 <strong>Como usar:</strong> preencha a competência e os dados do mês, então gere o <strong>documento consolidado</strong> (relação de trabalhadores + dossiê de cada um) ou o <strong>dossiê individual</strong>. O documento abre formatado — use <strong>Ctrl+P → Salvar como PDF</strong>.
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h3 style={{ color: "#0f5233", fontSize: 13, marginBottom: 12 }}>Parâmetros do documento</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 10 }}>
          <div><label style={LS}>Competência</label><input type="month" style={IS} value={form.competencia} onChange={(e) => setForm((p) => ({ ...p, competencia: e.target.value }))} /></div>
          <div><label style={LS}>Atividade</label><input style={IS} value={form.atividade} onChange={(e) => setForm((p) => ({ ...p, atividade: e.target.value }))} /></div>
          <div><label style={LS}>Contratante / Local (opcional)</label><input style={IS} placeholder="Ex.: Grupo SADA – Matriz, Betim/MG" value={form.contratante} onChange={(e) => setForm((p) => ({ ...p, contratante: e.target.value }))} /></div>
          <div><label style={LS}>Contato de emergência (item 13)</label><input style={IS} placeholder="Nome — (31) 9…" value={form.contatoEmergencia} onChange={(e) => setForm((p) => ({ ...p, contatoEmergencia: e.target.value }))} /></div>
          <div style={{ gridColumn: "span 2" }}><label style={LS}>Responsável SESMT / coordenador operacional (item 14)</label><input style={IS} placeholder="Nome — (31) 9…" value={form.responsavelSesmt} onChange={(e) => setForm((p) => ({ ...p, responsavelSesmt: e.target.value }))} /></div>
        </div>
        <label style={LS}>Indicadores de segurança do mês (item 15)</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 12 }}>
          {([["homensHora", "Homens Hora"], ["desvios", "Desvios"], ["incidentes", "Incidentes"], ["tfsa", "TFSA"], ["tfca", "TFCA"]] as const).map(([k, l]) => (
            <div key={k}><label style={{ ...LS, fontWeight: 400, color: "#6b7280" }}>{l}</label><input style={IS} value={(form as any)[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
        </div>
        <button onClick={() => gerar()} style={{ ...BTN, background: "#1a7a4a", color: "#fff", padding: "10px 24px", fontSize: 13 }}>
          📄 Gerar documento mensal consolidado ({data.length} funcionários)
        </button>
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <thead><tr style={{ background: "#e8f5ee" }}>{["Funcionário", "Função", "ASO", "Treinamentos NR", "Última entrega EPI", "Dossiê"].map((h) => <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#0f5233" }}>{h}</th>)}</tr></thead>
        <tbody>{data.map((f) => (
          <tr key={f.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
            <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12 }}>{f.nome}</td>
            <td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280" }}>{f.funcao}</td>
            <td style={{ padding: "8px 12px" }}><Badge s={f.aso.status} />{f.aso.validade && <span style={{ fontSize: 10, color: "#6b7280", marginLeft: 6 }}>{new Date(f.aso.validade).toLocaleDateString("pt-BR")}</span>}</td>
            <td style={{ padding: "8px 12px" }}><Badge s={f.nrs.status} /><span style={{ fontSize: 10, color: "#6b7280", marginLeft: 6 }}>{f.nrs.total} registro(s)</span></td>
            <td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280" }}>{f.epi.ultimaEntrega ? new Date(f.epi.ultimaEntrega).toLocaleDateString("pt-BR") : "—"}</td>
            <td style={{ padding: "8px 12px" }}>
              <button onClick={() => gerar(f.id)} style={{ ...BTN, background: "#e0e7ff", color: "#3730a3" }}>📄 Gerar dossiê</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
      {data.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>Nenhum funcionário ativo cadastrado. Cadastre em RH &amp; Folha.</p>}
    </div>
  );
}
