"use client";
// RH — Férias (períodos aquisitivos e limite de gozo) e ocorrências disciplinares.
import { useEffect, useState, useCallback } from "react";

const SIT: Record<string, [string, string, string]> = {
  em_dia:     ["Em dia", "#dcfce7", "#15803d"],
  agendada:   ["Agendada", "#e0e7ff", "#3730a3"],
  pendente:   ["Pendente", "#f3f4f6", "#374151"],
  a_vencer:   ["Gozar em até 90d", "#fef3c7", "#92400e"],
  estourada:  ["⚠ ESTOURADA (dobro)", "#fee2e2", "#991b1b"],
  sem_periodo:["< 1 ano de casa", "#f3f4f6", "#9ca3af"],
};
const TIPO_OC: Record<string, string> = { advertencia_verbal: "Advertência verbal", advertencia_escrita: "Advertência escrita", suspensao: "Suspensão" };
const fdata = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export default function RhOcorrenciasPage() {
  const [dados, setDados] = useState<any>(null);
  const [aberto, setAberto] = useState("");
  const [formFerias, setFormFerias] = useState<any>({ startDate: "", endDate: "", days: "30" });
  const [formOc, setFormOc] = useState<any>({ type: "advertencia_escrita", date: "", reason: "", suspensionDays: "" });
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => { const r = await fetch("/api/rh-ocorrencias"); setDados(await r.json()); }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const post = async (body: any) => {
    setMsg("");
    const r = await fetch("/api/rh-ocorrencias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) { setMsg(`Erro: ${j.error}`); return false; }
    carregar(); return true;
  };

  const card = (t: string, v: any, cor: string) => (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", flex: 1, borderLeft: `4px solid ${cor}`, minWidth: 150 }}>
      <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{t}</p>
      <p style={{ margin: "4px 0 0", fontSize: 26, fontWeight: 900, color: cor }}>{v}</p>
    </div>
  );

  if (!dados) return <p style={{ color: "#6b7280" }}>Carregando…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🏖️ Férias & Ocorrências</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Controle de períodos aquisitivos (CLT: gozo em até 11 meses após completar o período, senão paga em dobro), advertências e suspensões.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {card("Férias ESTOURADAS", dados.resumo.estouradas, "#991b1b")}
        {card("Gozar em até 90 dias", dados.resumo.aVencer, "#b45309")}
        {card("Pendentes de programação", dados.resumo.pendentes, "#374151")}
        {card("Ocorrências (30 dias)", dados.resumo.ocorrencias30d, "#7c3aed")}
      </div>

      {msg && <p style={{ color: "#991b1b", fontSize: 13, marginBottom: 10 }}>{msg}</p>}

      {dados.linhas.map((l: any) => {
        const s = SIT[l.situacaoFerias];
        return (
          <div key={l.id} style={{ background: "#fff", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
            <button onClick={() => setAberto(aberto === l.id ? "" : l.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 13.5, color: "#111827" }}>{l.name}</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{l.role} · admissão {fdata(l.admissionDate)}</p>
              </div>
              <div style={{ flex: 2, minWidth: 200, fontSize: 11.5, color: "#4b5563" }}>
                {l.periodoAquisitivo
                  ? <>Período: {fdata(l.periodoAquisitivo.inicio)} → {fdata(l.periodoAquisitivo.fim)}<br />Gozar até <strong>{fdata(l.periodoAquisitivo.limiteGozo)}</strong></>
                  : "Ainda não completou o 1º período"}
              </div>
              <span style={{ background: s[1], color: s[2], padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{s[0]}</span>
              {l.ocorrencias.length > 0 && <span style={{ background: "#f5f3ff", color: "#7c3aed", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{l.ocorrencias.length} ocorrência(s)</span>}
              <span style={{ color: "#9ca3af" }}>{aberto === l.id ? "▲" : "▼"}</span>
            </button>

            {aberto === l.id && (
              <div style={{ borderTop: "1px solid #f3f4f6", padding: 16 }}>
                {/* Agendar férias */}
                {l.periodoAquisitivo && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#334532" }}>🏖️ Agendar férias:</span>
                    <div><label style={{ fontSize: 10.5, fontWeight: 700, color: "#374151", display: "block" }}>Início do gozo</label>
                      <input type="date" value={formFerias.startDate} onChange={(e) => setFormFerias({ ...formFerias, startDate: e.target.value })}
                        style={{ padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12 }} /></div>
                    <div><label style={{ fontSize: 10.5, fontWeight: 700, color: "#374151", display: "block" }}>Dias</label>
                      <input type="number" value={formFerias.days} onChange={(e) => setFormFerias({ ...formFerias, days: e.target.value })}
                        style={{ padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, width: 70 }} /></div>
                    <button onClick={async () => {
                      const ini = formFerias.startDate ? new Date(formFerias.startDate) : null;
                      const fim = ini ? new Date(new Date(ini).setDate(ini.getDate() + Number(formFerias.days || 30) - 1)) : null;
                      await post({ tipo: "ferias", employeeId: l.id, acqStart: l.periodoAquisitivo.inicio, acqEnd: l.periodoAquisitivo.fim, startDate: formFerias.startDate || null, endDate: fim ? fim.toISOString().slice(0, 10) : null, days: formFerias.days });
                    }}
                      style={{ background: "#4a9410", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Salvar</button>
                  </div>
                )}

                {/* Férias registradas */}
                {l.ferias.length > 0 && (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5, marginBottom: 14 }}>
                    <thead><tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#6b7280" }}>
                      <th style={{ padding: 6 }}>Período aquisitivo</th><th style={{ padding: 6 }}>Gozo</th><th style={{ padding: 6 }}>Dias</th><th style={{ padding: 6 }}>Status</th><th></th>
                    </tr></thead>
                    <tbody>{l.ferias.map((v: any) => (
                      <tr key={v.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                        <td style={{ padding: 6 }}>{fdata(v.acqStart)} → {fdata(v.acqEnd)}</td>
                        <td style={{ padding: 6 }}>{v.startDate ? `${fdata(v.startDate)} a ${fdata(v.endDate)}` : "não agendado"}</td>
                        <td style={{ padding: 6 }}>{v.days}{v.soldDays ? ` (+${v.soldDays} abono)` : ""}</td>
                        <td style={{ padding: 6 }}>
                          <select value={v.status} onChange={async (e) => { await fetch("/api/rh-ocorrencias", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "ferias", id: v.id, status: e.target.value }) }); carregar(); }}
                            style={{ fontSize: 11, padding: "3px 6px", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                            {["prevista", "agendada", "em_gozo", "concluida", "vencida"].map((s2) => <option key={s2} value={s2}>{s2.replace("_", " ")}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 6 }}><button onClick={async () => { await fetch(`/api/rh-ocorrencias?tipo=ferias&id=${v.id}`, { method: "DELETE" }); carregar(); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }}>🗑</button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}

                {/* Registrar ocorrência */}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed" }}>⚠️ Registrar ocorrência:</span>
                  <select value={formOc.type} onChange={(e) => setFormOc({ ...formOc, type: e.target.value })}
                    style={{ padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, background: "#fff" }}>
                    {Object.entries(TIPO_OC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input type="date" value={formOc.date} onChange={(e) => setFormOc({ ...formOc, date: e.target.value })}
                    style={{ padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12 }} />
                  <input placeholder="Motivo" value={formOc.reason} onChange={(e) => setFormOc({ ...formOc, reason: e.target.value })}
                    style={{ padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, width: 240 }} />
                  {formOc.type === "suspensao" && (
                    <input type="number" placeholder="Dias" value={formOc.suspensionDays} onChange={(e) => setFormOc({ ...formOc, suspensionDays: e.target.value })}
                      style={{ padding: "7px 9px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 12, width: 70 }} />
                  )}
                  <button onClick={async () => { if (await post({ tipo: "ocorrencia", employeeId: l.id, ...formOc })) setFormOc({ type: "advertencia_escrita", date: "", reason: "", suspensionDays: "" }); }}
                    disabled={!formOc.date || !formOc.reason}
                    style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !formOc.date || !formOc.reason ? 0.5 : 1 }}>Registrar</button>
                </div>

                {/* Ocorrências */}
                {l.ocorrencias.map((o: any) => (
                  <div key={o.id} style={{ display: "flex", gap: 10, alignItems: "center", background: "#faf5ff", borderRadius: 8, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ fontWeight: 800, color: "#7c3aed" }}>{TIPO_OC[o.type] || o.type}{o.suspensionDays ? ` (${o.suspensionDays} dias)` : ""}</span>
                    <span style={{ color: "#6b7280" }}>{fdata(o.date)}</span>
                    <span style={{ flex: 1, color: "#374151" }}>{o.reason}</span>
                    <button onClick={async () => { await fetch(`/api/rh-ocorrencias?tipo=ocorrencia&id=${o.id}`, { method: "DELETE" }); carregar(); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af" }}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
