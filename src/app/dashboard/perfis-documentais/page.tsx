"use client";

import { useEffect, useState } from "react";
import { AvisoBox, Botao, Campo, Card, Input, TituloPagina } from "@/components/ui";
import { estiloInput } from "@/lib/estilos";

const blankRequirement = () => ({ name: "", scope: "FUNCIONARIO", validityDays: 365, leadTimeDays: 0, blocking: true, activity: "", role: "", equipmentType: "" });

export default function PerfisDocumentaisPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ clientId: "", name: "", serviceTypes: "", requirements: [blankRequirement()], notes: "" });
  const [message, setMessage] = useState("");
  const load = async () => {
    const [p, c] = await Promise.all([fetch("/api/perfis-documentais").then((r) => r.json()), fetch("/api/clientes").then((r) => r.json())]);
    setProfiles(p.data || []); setClients(c.data || c || []);
  };
  useEffect(() => { load(); }, []);
  const updateReq = (index: number, key: string, value: any) => setForm((p: any) => ({ ...p, requirements: p.requirements.map((r: any, i: number) => i === index ? { ...r, [key]: value } : r) }));
  const save = async () => {
    const payload = { ...form, serviceTypes: form.serviceTypes.split(",").map((s: string) => s.trim()).filter(Boolean), requirements: form.requirements.filter((r: any) => r.name.trim()) };
    const response = await fetch("/api/perfis-documentais", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json(); setMessage(response.ok ? `Perfil v${result.data.version} salvo.` : result.error);
    if (response.ok) load();
  };
  return <div>
    <TituloPagina>🗂️ Perfis Documentais por Cliente</TituloPagina>
    <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Matriz versionada de documentos da empresa, funcionário e equipamento aplicável a cada serviço.</p>
    <AvisoBox tom="info">Use papel, atividade e tipo de equipamento para evitar exigir documentos irrelevantes. “Bloqueante” impede a mobilização até a aprovação.</AvisoBox>
    {message && <div style={{ background: "#f0fdf4", padding: 9, borderRadius: 8, marginBottom: 10, fontSize: 11 }}>{message}</div>}
    <Card style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Campo label="Cliente"><select style={estiloInput} value={form.clientId} onChange={(e) => setForm((p: any) => ({ ...p, clientId: e.target.value }))}><option value="">Selecione</option>{clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Campo>
        <Campo label="Nome do perfil"><Input value={form.name} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} placeholder="Ex.: Mobilização mineração" /></Campo>
        <Campo label="Tipos de serviço (separados por vírgula)"><Input value={form.serviceTypes} onChange={(e) => setForm((p: any) => ({ ...p, serviceTypes: e.target.value }))} /></Campo>
      </div>
      <h3 style={{ fontSize: 12, color: "#334532", margin: "12px 0 7px" }}>Requisitos</h3>
      {form.requirements.map((r: any, index: number) => <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 120px 85px 85px 1fr 1fr 1fr 80px", gap: 6, marginBottom: 6 }}>
        <Input value={r.name} placeholder="Documento" onChange={(e) => updateReq(index, "name", e.target.value)} />
        <select style={estiloInput} value={r.scope} onChange={(e) => updateReq(index, "scope", e.target.value)}><option>EMPRESA</option><option>FUNCIONARIO</option><option>EQUIPAMENTO</option></select>
        <Input type="number" value={r.validityDays} title="Validade em dias" onChange={(e) => updateReq(index, "validityDays", Number(e.target.value))} />
        <Input type="number" value={r.leadTimeDays} title="Antecedência mínima em dias" onChange={(e) => updateReq(index, "leadTimeDays", Number(e.target.value))} />
        <Input value={r.activity} placeholder="Atividade" onChange={(e) => updateReq(index, "activity", e.target.value)} />
        <Input value={r.role} placeholder="Função" onChange={(e) => updateReq(index, "role", e.target.value)} />
        <Input value={r.equipmentType} placeholder="Tipo equip." onChange={(e) => updateReq(index, "equipmentType", e.target.value)} />
        <label style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 4 }}><input type="checkbox" checked={r.blocking} onChange={(e) => updateReq(index, "blocking", e.target.checked)} /> bloqueia</label>
      </div>)}
      <div style={{ display: "flex", gap: 8, marginTop: 9 }}><Botao variante="neutro" onClick={() => setForm((p: any) => ({ ...p, requirements: [...p.requirements, blankRequirement()] }))}>＋ Requisito</Botao><Botao onClick={save} disabled={!form.clientId || !form.name}>Salvar nova versão</Botao></div>
    </Card>
    <Card>{profiles.map((p) => <div key={p.id} style={{ padding: 11, borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", fontSize: 11 }}><div><strong>{p.client?.name} — {p.name} v{p.version}</strong><div style={{ color: "#6b7280" }}>{(p.serviceTypes || []).join(", ") || "Todos os serviços"}</div></div><div style={{ textAlign: "right" }}><span style={{ color: p.active ? "#15803d" : "#6b7280" }}>{p.active ? "Ativo" : "Histórico"}</span><div>{Array.isArray(p.requirements) ? p.requirements.length : 0} requisitos</div></div></div>)}</Card>
  </div>;
}
