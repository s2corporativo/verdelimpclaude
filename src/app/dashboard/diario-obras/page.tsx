"use client";

import { useCallback, useEffect, useState } from "react";
import { AvisoBox, Botao, Campo, Card, Input, KpiCard, KpiGrid, TituloPagina } from "@/components/ui";
import { estiloInput } from "@/lib/estilos";

const initial = { contractId: "", compositionId: "", date: new Date().toISOString().slice(0, 10), location: "", supervisor: "", teamSize: 1, weather: "Bom", startTime: "07:00", endTime: "16:00", laborHours: "", quantityDone: "", quantityUnit: "m²", activitiesDone: "", areasWorked: "", equipmentUsed: "", occurrences: "", inputCost: 0, equipmentCost: 0, transportCost: 0, clientAccepted: false, acceptedBy: "", hasScopeChange: false, scopeChangeTitle: "", scopeChangeDescription: "", impactDays: 0, impactValue: 0 };
const n = (value: unknown, digits = 2) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: digits });
const money = (value: unknown) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function DiarioObrasPage() {
  const [data, setData] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState<any>(initial);
  const [message, setMessage] = useState("");
  const selected = contracts.find((contract) => contract.id === form.contractId);
  const compositions = selected?.dossier?.compositions || [];

  const load = useCallback(async (contractId = "") => {
    const response = await fetch(`/api/diario${contractId ? `?contractId=${contractId}` : ""}`);
    const result = await response.json();
    setData(result.data || []); setContracts(result.contracts || []); setPerformance(result.performance || null);
  }, []);
  useEffect(() => { load(); }, [load]);
  const set = (key: string, value: any) => setForm((current: any) => ({ ...current, [key]: value }));
  const save = async () => {
    const payload = { ...form, scopeChange: form.hasScopeChange ? { title: form.scopeChangeTitle, description: form.scopeChangeDescription, impactDays: form.impactDays, impactValue: form.impactValue } : undefined };
    const response = await fetch("/api/diario", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json(); setMessage(response.ok ? "Diário registrado e indicadores atualizados." : result.error);
    if (response.ok) { setForm({ ...initial, contractId: form.contractId }); load(form.contractId); }
  };
  return <div>
    <TituloPagina>📝 Diário de Obras e Produtividade</TituloPagina>
    <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Produção, HH, custos, aceite do cliente e desvios do escopo em uma única evidência operacional.</p>
    <AvisoBox tom="info">Vincule a atividade à composição do dossiê para comparar produtividade e custo planejados × realizados.</AvisoBox>
    {message && <div style={{ background: "#f0fdf4", padding: 9, borderRadius: 8, marginBottom: 10, fontSize: 11 }}>{message}</div>}

    <Card style={{ padding: 16, marginBottom: 12 }}>
      <strong style={{ color: "#334532", fontSize: 13 }}>Novo apontamento</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 9 }}>
        <Campo label="Contrato"><select style={estiloInput} value={form.contractId} onChange={(e) => { set("contractId", e.target.value); set("compositionId", ""); }}><option value="">Selecione</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.number} — {c.object}</option>)}</select></Campo>
        <Campo label="Composição planejada"><select style={estiloInput} value={form.compositionId} onChange={(e) => { const comp = compositions.find((c: any) => c.id === e.target.value); setForm((p: any) => ({ ...p, compositionId: e.target.value, quantityUnit: comp?.unit || p.quantityUnit })); }}><option value="">Sem vínculo</option>{compositions.map((c: any) => <option key={c.id} value={c.id}>{c.code} — {c.activity}</option>)}</select></Campo>
        <Campo label="Data"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Campo>
        <Campo label="Local"><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></Campo>
        <Campo label="Supervisor"><Input value={form.supervisor} onChange={(e) => set("supervisor", e.target.value)} /></Campo>
        <Campo label="Equipe"><Input type="number" value={form.teamSize} onChange={(e) => set("teamSize", Number(e.target.value))} /></Campo>
        <Campo label="Início"><Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></Campo>
        <Campo label="Fim"><Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></Campo>
        <Campo label="HH (vazio = horário × equipe)"><Input type="number" step="0.01" value={form.laborHours} onChange={(e) => set("laborHours", e.target.value)} /></Campo>
        <Campo label="Quantidade produzida"><Input type="number" step="0.001" value={form.quantityDone} onChange={(e) => set("quantityDone", e.target.value)} /></Campo>
        <Campo label="Unidade"><Input value={form.quantityUnit} onChange={(e) => set("quantityUnit", e.target.value)} /></Campo>
        <Campo label="Clima"><select style={estiloInput} value={form.weather} onChange={(e) => set("weather", e.target.value)}><option>Bom</option><option>Nublado</option><option>Chuva</option><option>Suspensão</option></select></Campo>
        <Campo label="Atividades realizadas" style={{ gridColumn: "1/-1" }}><textarea style={{ ...estiloInput, minHeight: 70 }} value={form.activitiesDone} onChange={(e) => set("activitiesDone", e.target.value)} /></Campo>
        <Campo label="Áreas trabalhadas"><Input value={form.areasWorked} onChange={(e) => set("areasWorked", e.target.value)} /></Campo>
        <Campo label="Equipamentos usados"><Input value={form.equipmentUsed} onChange={(e) => set("equipmentUsed", e.target.value)} /></Campo>
        <Campo label="Ocorrências"><Input value={form.occurrences} onChange={(e) => set("occurrences", e.target.value)} /></Campo>
        {[['inputCost','Insumos (R$)'],['equipmentCost','Equipamentos (R$)'],['transportCost','Transporte (R$)']].map(([key,label]) => <Campo key={key} label={label}><Input type="number" step="0.01" value={form[key]} onChange={(e) => set(key, Number(e.target.value))} /></Campo>)}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
        <label style={{ fontSize: 11 }}><input type="checkbox" checked={form.clientAccepted} onChange={(e) => set("clientAccepted", e.target.checked)} /> Cliente aceitou o apontamento</label>
        <label style={{ fontSize: 11 }}><input type="checkbox" checked={form.hasScopeChange} onChange={(e) => set("hasScopeChange", e.target.checked)} /> Houve alteração de escopo</label>
      </div>
      {form.clientAccepted && <Campo label="Aceite por" style={{ marginTop: 8 }}><Input value={form.acceptedBy} onChange={(e) => set("acceptedBy", e.target.value)} /></Campo>}
      {form.hasScopeChange && <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 130px 150px", gap: 8, marginTop: 8 }}><Campo label="Título"><Input value={form.scopeChangeTitle} onChange={(e) => set("scopeChangeTitle", e.target.value)} /></Campo><Campo label="Descrição"><Input value={form.scopeChangeDescription} onChange={(e) => set("scopeChangeDescription", e.target.value)} /></Campo><Campo label="Impacto (dias)"><Input type="number" value={form.impactDays} onChange={(e) => set("impactDays", Number(e.target.value))} /></Campo><Campo label="Impacto (R$)"><Input type="number" value={form.impactValue} onChange={(e) => set("impactValue", Number(e.target.value))} /></Campo></div>}
      <Botao style={{ marginTop: 10 }} onClick={save} disabled={!form.contractId || !form.location || !form.activitiesDone}>Registrar diário</Botao>
    </Card>

    <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}><select style={{ ...estiloInput, width: 420 }} value={filter} onChange={(e) => { setFilter(e.target.value); load(e.target.value); }}><option value="">Todos os contratos</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.number} — {c.object}</option>)}</select></div>
    {performance && <KpiGrid colunas={4}><KpiCard label="HH planejadas × reais" valor={`${n(performance.plannedHours)} × ${n(performance.actualHours)}`} /><KpiCard label="Produtividade plan. × real" valor={`${n(performance.plannedProductivity,3)} × ${n(performance.actualProductivity,3)}`} /><KpiCard label="Custo real estimado" valor={money(performance.estimatedLaborCost + performance.actualOtherCost)} /><KpiCard label="Aceites pendentes" valor={performance.pendingAcceptance} cor={performance.pendingAcceptance ? "#d97706" : "#15803d"} /></KpiGrid>}
    <Card>{data.map((item) => <div key={item.id} style={{ padding: 11, borderBottom: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, fontSize: 11 }}><div><strong>{new Date(item.date).toLocaleDateString("pt-BR")} · {item.contract?.number || "Sem contrato"} · {item.location}</strong><div style={{ color: "#6b7280", margin: "3px 0" }}>{item.activitiesDone}</div><span>{n(item.laborHours)} HH · {n(item.quantityDone,3)} {item.quantityUnit || ""} · {money(Number(item.inputCost)+Number(item.equipmentCost)+Number(item.transportCost))}</span>{item.scopeChanges?.length > 0 && <span style={{ color: "#b45309", marginLeft: 8 }}>Alteração de escopo aberta</span>}</div><span style={{ color: item.clientAccepted ? "#15803d" : "#92400e", fontWeight: 700 }}>{item.clientAccepted ? `Aceito por ${item.acceptedBy || "cliente"}` : "Aceite pendente"}</span></div>)}</Card>
  </div>;
}
