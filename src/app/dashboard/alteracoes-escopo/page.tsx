"use client";

import { useEffect, useState } from "react";
import { AvisoBox, Botao, Campo, Card, Input, TituloPagina } from "@/components/ui";
import { estiloInput } from "@/lib/estilos";

const money = (value: unknown) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AlteracoesEscopoPage() {
  const [changes, setChanges] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ contractId: "", title: "", description: "", reason: "", impactDays: 0, impactValue: 0 });
  const [message, setMessage] = useState("");
  const load = async () => {
    const [a, c] = await Promise.all([fetch("/api/alteracoes-escopo").then((r) => r.json()), fetch("/api/contratos").then((r) => r.json())]);
    setChanges(a.data || []); setContracts(c.data || c || []);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    const response = await fetch("/api/alteracoes-escopo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json(); setMessage(response.ok ? "Solicitação registrada para análise." : result.error); if (response.ok) load();
  };
  const decide = async (id: string, status: string) => { await fetch("/api/alteracoes-escopo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) }); load(); };
  return <div>
    <TituloPagina>🔁 Alterações de Escopo</TituloPagina>
    <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>Controle de serviço extra, impacto financeiro e prazo antes da execução.</p>
    <AvisoBox>O diário de obras deve registrar o desvio e abrir esta solicitação. Não incorpore serviço adicional à medição sem aprovação.</AvisoBox>
    {message && <div style={{ background: "#f0fdf4", padding: 9, borderRadius: 8, marginBottom: 10, fontSize: 11 }}>{message}</div>}
    <Card style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <Campo label="Contrato"><select style={estiloInput} value={form.contractId} onChange={(e) => setForm((p: any) => ({ ...p, contractId: e.target.value }))}><option value="">Selecione</option>{contracts.map((c: any) => <option key={c.id} value={c.id}>{c.number} — {c.object}</option>)}</select></Campo>
        <Campo label="Título"><Input value={form.title} onChange={(e) => setForm((p: any) => ({ ...p, title: e.target.value }))} /></Campo>
        <Campo label="Motivo"><Input value={form.reason} onChange={(e) => setForm((p: any) => ({ ...p, reason: e.target.value }))} /></Campo>
        <Campo label="Descrição" style={{ gridColumn: "1/-1" }}><textarea style={{ ...estiloInput, minHeight: 80 }} value={form.description} onChange={(e) => setForm((p: any) => ({ ...p, description: e.target.value }))} /></Campo>
        <Campo label="Impacto no prazo (dias)"><Input type="number" value={form.impactDays} onChange={(e) => setForm((p: any) => ({ ...p, impactDays: Number(e.target.value) }))} /></Campo>
        <Campo label="Impacto financeiro (R$)"><Input type="number" step="0.01" value={form.impactValue} onChange={(e) => setForm((p: any) => ({ ...p, impactValue: Number(e.target.value) }))} /></Campo>
      </div><Botao style={{ marginTop: 9 }} onClick={save} disabled={!form.contractId || !form.title || !form.description}>Registrar alteração</Botao>
    </Card>
    <Card>{changes.map((item) => <div key={item.id} style={{ padding: 12, borderBottom: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, fontSize: 11 }}><div><strong>{item.contract.number} · AE-{item.number}: {item.title}</strong><div style={{ color: "#6b7280", margin: "3px 0" }}>{item.description}</div><span>{item.impactDays} dias · {money(item.impactValue)} · <b>{item.status}</b></span></div>{item.status === "pendente" && <div style={{ display: "flex", gap: 5, alignItems: "center" }}><Botao onClick={() => decide(item.id, "aprovado")}>Aprovar</Botao><Botao variante="perigo" onClick={() => decide(item.id, "rejeitado")}>Rejeitar</Botao></div>}</div>)}</Card>
  </div>;
}
