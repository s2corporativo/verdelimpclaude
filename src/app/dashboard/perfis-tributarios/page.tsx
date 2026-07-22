"use client";

import { useEffect, useState } from "react";
import { AvisoBox, Botao, Campo, Card, Input, TituloPagina } from "@/components/ui";

const initial = { name: "", regime: "Simples Nacional", effectiveRate: 0, issRate: 0, issRetained: false, issIncludedInEffectiveRate: true, inssRetentionRate: 0, inssRecoverable: true, irrfRetentionRate: 0, csllPisCofinsRetentionRate: 0, otherRate: 0, notes: "" };
const fmt = (value: unknown) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

export default function PerfisTributariosPage() {
  const [data, setData] = useState<any[]>([]);
  const [form, setForm] = useState<any>(initial);
  const [message, setMessage] = useState("");
  const load = () => fetch("/api/perfis-tributarios").then((r) => r.json()).then((d) => setData(d.data || []));
  useEffect(() => { load(); }, []);
  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  const save = async () => {
    const response = await fetch("/api/perfis-tributarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json();
    setMessage(response.ok ? `Perfil ${result.data.name} v${result.data.version} criado.` : result.error);
    if (response.ok) { setForm(initial); load(); }
  };
  return <div>
    <TituloPagina>🧾 Perfis Tributários</TituloPagina>
    <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Alíquotas e retenções versionadas para reproduzir cada orçamento no futuro.</p>
    <AvisoBox>Retenção não é automaticamente custo. Marque se o ISS já está dentro da alíquota efetiva e se o INSS retido é recuperável; o motor separa preço de fluxo de caixa.</AvisoBox>
    {message && <div style={{ background: "#f0fdf4", padding: 9, borderRadius: 8, marginBottom: 10, fontSize: 11 }}>{message}</div>}
    <Card style={{ padding: 16, marginBottom: 12 }}>
      <strong style={{ color: "#334532", fontSize: 13 }}>Nova versão</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 9 }}>
        <Campo label="Nome do perfil"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Simples — serviços MG" /></Campo>
        <Campo label="Regime"><Input value={form.regime} onChange={(e) => set("regime", e.target.value)} /></Campo>
        {[["effectiveRate","Alíquota efetiva (%)"],["issRate","ISS (%)"],["inssRetentionRate","INSS retido (%)"],["irrfRetentionRate","IRRF retido (%)"],["csllPisCofinsRetentionRate","CSLL/PIS/COFINS (%)"],["otherRate","Outros definitivos (%)"]].map(([key,label]) => <Campo key={key} label={label}><Input type="number" step="0.0001" value={form[key]} onChange={(e) => set(key, Number(e.target.value))} /></Campo>)}
        <label style={{ fontSize: 11, display: "flex", gap: 7, alignItems: "center" }}><input type="checkbox" checked={form.issRetained} onChange={(e) => set("issRetained", e.target.checked)} /> ISS é retido</label>
        <label style={{ fontSize: 11, display: "flex", gap: 7, alignItems: "center" }}><input type="checkbox" checked={form.issIncludedInEffectiveRate} onChange={(e) => set("issIncludedInEffectiveRate", e.target.checked)} /> ISS já incluído na efetiva</label>
        <label style={{ fontSize: 11, display: "flex", gap: 7, alignItems: "center" }}><input type="checkbox" checked={form.inssRecoverable} onChange={(e) => set("inssRecoverable", e.target.checked)} /> INSS retido é recuperável</label>
      </div>
      <Campo label="Observações" style={{ marginTop: 8 }}><Input value={form.notes} onChange={(e) => set("notes", e.target.value)} /></Campo>
      <Botao style={{ marginTop: 9 }} onClick={save} disabled={!form.name}>Salvar nova versão</Botao>
    </Card>
    <Card>
      <div style={{ overflowX: "auto" }}><table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
        <thead><tr style={{ background: "#e8f5ee" }}>{["Perfil","Regime","Efetiva","ISS","INSS ret.","Retenções fed.","Estado"].map((h) => <th key={h} style={{ textAlign: "left", padding: 9 }}>{h}</th>)}</tr></thead>
        <tbody>{data.map((p) => <tr key={p.id} style={{ borderTop: "1px solid #e5e7eb" }}><td style={{ padding: 9, fontWeight: 700 }}>{p.name} · v{p.version}</td><td style={{ padding: 9 }}>{p.regime}</td><td style={{ padding: 9 }}>{fmt(p.effectiveRate)}%</td><td style={{ padding: 9 }}>{fmt(p.issRate)}% {p.issIncludedInEffectiveRate ? "incl." : "adicional"}</td><td style={{ padding: 9 }}>{fmt(p.inssRetentionRate)}% {p.inssRecoverable ? "recup." : "definitivo"}</td><td style={{ padding: 9 }}>{fmt(Number(p.irrfRetentionRate) + Number(p.csllPisCofinsRetentionRate))}%</td><td style={{ padding: 9, color: p.active ? "#15803d" : "#6b7280" }}>{p.active ? "Ativo" : "Histórico"}</td></tr>)}</tbody>
      </table></div>
    </Card>
  </div>;
}
