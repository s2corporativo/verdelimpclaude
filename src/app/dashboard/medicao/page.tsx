"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const today = () => new Date().toISOString().slice(0, 10);
const currentPeriod = () => new Date().toISOString().slice(0, 7);

function monthBounds(period: string) {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return { startDate: today(), endDate: today() };
  const start = new Date(year, month - 1, 1, 12);
  const end = new Date(year, month, 0, 12);
  return { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
}

const money = (value: unknown) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const number = (value: unknown, digits = 2) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: digits });

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  border: "1px solid #d7dfd8",
  borderRadius: 9,
  background: "#fff",
  color: "#263827",
  fontSize: 12,
};

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8e3",
  borderRadius: 13,
};

const STATUS: Record<string, { label: string; background: string; color: string }> = {
  em_elaboracao: { label: "Em elaboração", background: "#f3f4f6", color: "#374151" },
  enviada: { label: "Aguardando aprovação", background: "#dbeafe", color: "#1e40af" },
  aprovada: { label: "Aprovada", background: "#dcfce7", color: "#166534" },
  glosada: { label: "Glosada", background: "#fee2e2", color: "#991b1b" },
  faturada: { label: "Faturada", background: "#f3e8ff", color: "#6d28d9" },
};

type ClosureForm = {
  contractId: string;
  period: string;
  startDate: string;
  endDate: string;
  billingMode: "fixed" | "production";
  fixedValue: string;
  allowPending: boolean;
  notes: string;
};

function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "block", color: "#536057", fontSize: 10, fontWeight: 800, marginBottom: 5 }}>{children}</span>;
}

export default function MedicaoPage() {
  const bounds = monthBounds(currentPeriod());
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const [showClosure, setShowClosure] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [unitValues, setUnitValues] = useState<Record<string, string>>({});
  const [approveModal, setApproveModal] = useState<any>(null);
  const [approvedBy, setApprovedBy] = useState("");
  const [billingModal, setBillingModal] = useState<any>(null);
  const [billing, setBilling] = useState({ dueDate: today(), retentionAmount: "0", issRetained: false, serviceCode: "" });
  const [form, setForm] = useState<ClosureForm>({
    contractId: "",
    period: currentPeriod(),
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    billingMode: "fixed",
    fixedValue: "",
    allowPending: false,
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/medicao");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar as medições");
      setMeasurements(body.data || []);
      setContracts(body.contracts || []);
      setSummary(body.summary || {});
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao carregar medições" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedContract = contracts.find((contract) => contract.id === form.contractId);

  const updatePeriod = (period: string) => {
    const nextBounds = monthBounds(period);
    setForm((current) => ({ ...current, period, ...nextBounds }));
    setPreview(null);
  };

  const selectContract = (contractId: string) => {
    const contract = contracts.find((item) => item.id === contractId);
    setForm((current) => ({ ...current, contractId, fixedValue: contract ? String(Number(contract.monthlyValue || 0)) : "" }));
    setPreview(null);
  };

  const openClosure = () => {
    setShowClosure(true);
    setPreview(null);
    setUnitValues({});
    setMessage(null);
  };

  const previewClosure = async () => {
    if (!form.contractId) return setMessage({ type: "error", text: "Selecione o contrato." });
    setBusy("Conferindo diários aceitos e produção do período...");
    setMessage(null);
    try {
      const response = await fetch("/api/medicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview_from_diaries", contractId: form.contractId, period: form.period, startDate: form.startDate, endDate: form.endDate }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível preparar o fechamento");
      setPreview(body);
      const initialValues: Record<string, string> = {};
      for (const group of body.groups || []) initialValues[group.key] = "";
      setUnitValues(initialValues);
      if (body.existing) setMessage({ type: "warning", text: "Já existe medição para este contrato e período." });
      else if (!body.acceptedCount) setMessage({ type: "warning", text: "Nenhum diário aceito pelo cliente foi localizado no período." });
      else if (body.pendingCount) setMessage({ type: "warning", text: `${body.pendingCount} diário(s) aguardam aceite e ficarão fora da medição.` });
      else setMessage({ type: "success", text: `${body.acceptedCount} diário(s) aceito(s) estão prontos para o fechamento.` });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao preparar fechamento" });
    } finally {
      setBusy("");
    }
  };

  const productionTotal = useMemo(() => {
    if (!preview) return 0;
    return (preview.groups || []).reduce((sum: number, group: any) => sum + Number(group.quantity || 0) * Number(unitValues[group.key] || 0), 0);
  }, [preview, unitValues]);

  const createMeasurement = async () => {
    if (!preview || preview.existing) return;
    setBusy("Criando medição auditável...");
    setMessage(null);
    try {
      const response = await fetch("/api/medicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_from_diaries",
          contractId: form.contractId,
          period: form.period,
          startDate: form.startDate,
          endDate: form.endDate,
          billingMode: form.billingMode,
          fixedValue: form.fixedValue ? Number(form.fixedValue) : null,
          unitValues: Object.fromEntries(Object.entries(unitValues).map(([key, value]) => [key, Number(value || 0)])),
          allowPending: form.allowPending,
          notes: form.notes,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível criar a medição");
      setMessage({ type: "success", text: `Medição ${form.period} criada. Revise e envie para aprovação.` });
      setShowClosure(false);
      setPreview(null);
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao criar medição" });
    } finally {
      setBusy("");
    }
  };

  const changeStatus = async (measurement: any, status: string, options: any = {}) => {
    setBusy(`Atualizando medição ${measurement.period}...`);
    setMessage(null);
    try {
      const response = await fetch("/api/medicao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: measurement.id, status, ...options }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível atualizar a medição");
      setApproveModal(null);
      setApprovedBy("");
      setMessage({ type: "success", text: status === "aprovada" ? "Medição aprovada e registrada no GED." : "Situação atualizada." });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha ao atualizar medição" });
    } finally {
      setBusy("");
    }
  };

  const glosa = async (measurement: any) => {
    const reason = window.prompt("Informe o motivo da glosa:");
    if (!reason?.trim()) return;
    await changeStatus(measurement, "glosada", { notes: reason.trim() });
  };

  const openBilling = (measurement: any) => {
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setBilling({ dueDate: due.toISOString().slice(0, 10), retentionAmount: "0", issRetained: false, serviceCode: "" });
    setBillingModal(measurement);
    setMessage(null);
  };

  const billMeasurement = async () => {
    if (!billingModal) return;
    setBusy("Criando faturamento gerencial e título a receber...");
    setMessage(null);
    try {
      const response = await fetch("/api/medicao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "faturar",
          id: billingModal.id,
          dueDate: billing.dueDate,
          retentionAmount: Number(billing.retentionAmount || 0),
          issRetained: billing.issRetained,
          serviceCode: billing.serviceCode || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível faturar a medição");
      setBillingModal(null);
      setMessage({ type: "success", text: `${body.mensagem} ${body.aviso || ""}`.trim() });
      await load();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Falha no faturamento" });
    } finally {
      setBusy("");
    }
  };

  const summaryCards = [
    ["Em elaboração", summary.emElaboracao || 0, "#334532"],
    ["Aguardando aprovação", summary.aguardandoAprovacao || 0, "#1d4ed8"],
    ["Aprovadas", summary.aprovadas || 0, "#15803d"],
    ["Faturadas", summary.faturadas || 0, "#6d28d9"],
    ["Valor aprovado/faturado", money(summary.valorAprovado || 0), "#e05008"],
  ];

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <p style={{ color: "#e05008", fontSize: 10, fontWeight: 850, letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 4px" }}>Fechamento operacional e financeiro</p>
          <h1 style={{ color: "#263827", fontSize: 24, margin: 0 }}>Medições</h1>
          <p style={{ color: "#6f7972", fontSize: 12, margin: "5px 0 0" }}>Diário aceito → medição → aprovação → faturamento → título a receber.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/diario-obras" style={{ textDecoration: "none", color: "#334532", background: "#fff", border: "1px solid #dfe5df", borderRadius: 9, padding: "9px 13px", fontSize: 11, fontWeight: 800 }}>Ver diários de campo</Link>
          <Link href="/dashboard/contas-receber" style={{ textDecoration: "none", color: "#334532", background: "#fff", border: "1px solid #dfe5df", borderRadius: 9, padding: "9px 13px", fontSize: 11, fontWeight: 800 }}>Contas a receber</Link>
          <button type="button" onClick={openClosure} style={{ border: 0, borderRadius: 9, padding: "9px 14px", background: "#334532", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 850 }}>+ Fechar período</button>
        </div>
      </header>

      <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 10, padding: "9px 12px", fontSize: 11, marginBottom: 13 }}>
        O faturamento nesta tela cria um <strong>registro gerencial</strong> e um título a receber. A emissão fiscal oficial continua sujeita ao portal competente, certificado e validação contábil.
      </div>

      {message && <div role="alert" style={{ background: message.type === "error" ? "#fef2f2" : message.type === "warning" ? "#fffbeb" : "#f0fdf4", color: message.type === "error" ? "#991b1b" : message.type === "warning" ? "#92400e" : "#166534", border: `1px solid ${message.type === "error" ? "#fecaca" : message.type === "warning" ? "#fde68a" : "#bbf7d0"}`, borderRadius: 10, padding: "10px 12px", fontSize: 11, marginBottom: 13 }}>{message.text}</div>}
      {busy && <div style={{ background: "#eff6ff", color: "#1d4ed8", borderRadius: 9, padding: "9px 12px", fontSize: 11, marginBottom: 12 }}>⟳ {busy}</div>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9, marginBottom: 14 }}>
        {summaryCards.map(([label, value, color]) => <div key={String(label)} style={{ ...cardStyle, padding: 12, borderTop: `3px solid ${color}` }}><span style={{ display: "block", color: "#7d8780", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{label}</span><strong style={{ display: "block", color: String(color), fontSize: 19, marginTop: 3 }}>{value}</strong></div>)}
      </section>

      {showClosure && (
        <section style={{ ...cardStyle, padding: 16, marginBottom: 15, boxShadow: "0 12px 30px rgba(38,56,39,.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <div><strong style={{ color: "#263827", fontSize: 14 }}>Fechar período a partir dos diários</strong><span style={{ display: "block", color: "#7d8780", fontSize: 10, marginTop: 2 }}>Somente apontamentos aceitos pelo cliente entram automaticamente.</span></div>
            <button type="button" onClick={() => { setShowClosure(false); setPreview(null); }} style={{ border: "1px solid #dfe5df", background: "#fff", borderRadius: 8, width: 31, height: 31, cursor: "pointer" }}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 9, marginBottom: 10 }}>
            <label><Label>Contrato</Label><select style={fieldStyle} value={form.contractId} onChange={(event) => selectContract(event.target.value)}><option value="">Selecione</option>{contracts.map((contract) => <option key={contract.id} value={contract.id}>{contract.number} — {contract.object}</option>)}</select></label>
            <label><Label>Competência</Label><input type="month" style={fieldStyle} value={form.period} onChange={(event) => updatePeriod(event.target.value)} /></label>
            <label><Label>Início</Label><input type="date" style={fieldStyle} value={form.startDate} onChange={(event) => { setForm((current) => ({ ...current, startDate: event.target.value })); setPreview(null); }} /></label>
            <label><Label>Fim</Label><input type="date" style={fieldStyle} value={form.endDate} onChange={(event) => { setForm((current) => ({ ...current, endDate: event.target.value })); setPreview(null); }} /></label>
          </div>
          <button type="button" onClick={previewClosure} disabled={!!busy || !form.contractId} style={{ background: "#27547d", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontWeight: 800, cursor: "pointer", fontSize: 11 }}>Conferir diários e produção</button>

          {preview && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginBottom: 10 }}>
                {[['Diários aceitos', preview.acceptedCount], ['Aguardando aceite', preview.pendingCount], ['HH aceitas', number(preview.acceptedLaborHours)], ['Medição existente', preview.existing ? 'Sim' : 'Não']].map(([label, value]) => <div key={String(label)} style={{ background: "#f7f9f7", borderRadius: 8, padding: 9 }}><span style={{ color: "#7d8780", fontSize: 9, textTransform: "uppercase", fontWeight: 800 }}>{label}</span><strong style={{ display: "block", color: "#334532", fontSize: 16, marginTop: 2 }}>{value}</strong></div>)}
              </div>

              {!preview.existing && preview.acceptedCount > 0 && (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    <button type="button" onClick={() => setForm((current) => ({ ...current, billingMode: "fixed" }))} style={{ background: form.billingMode === "fixed" ? "#334532" : "#f3f4f6", color: form.billingMode === "fixed" ? "#fff" : "#374151", border: 0, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 750, fontSize: 11 }}>Valor mensal/fixo</button>
                    <button type="button" onClick={() => setForm((current) => ({ ...current, billingMode: "production" }))} style={{ background: form.billingMode === "production" ? "#334532" : "#f3f4f6", color: form.billingMode === "production" ? "#fff" : "#374151", border: 0, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontWeight: 750, fontSize: 11 }}>Produção × valor unitário</button>
                  </div>

                  {form.billingMode === "fixed" ? (
                    <div style={{ maxWidth: 320, marginBottom: 10 }}><Label>Valor da medição</Label><input type="number" min="0" step="0.01" style={fieldStyle} value={form.fixedValue} onChange={(event) => setForm((current) => ({ ...current, fixedValue: event.target.value }))} placeholder={selectedContract ? money(selectedContract.monthlyValue) : "0,00"} /></div>
                  ) : (
                    <div style={{ overflowX: "auto", marginBottom: 10 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead><tr style={{ background: "#e8f5ee" }}>{["Atividade", "Diários", "HH", "Quantidade", "Un.", "Valor unitário", "Total"].map((header) => <th key={header} style={{ padding: 7, textAlign: header === "Atividade" ? "left" : "right", color: "#334532" }}>{header}</th>)}</tr></thead>
                        <tbody>{(preview.groups || []).map((group: any) => <tr key={group.key} style={{ borderTop: "1px solid #edf1ed" }}><td style={{ padding: 7 }}>{group.description}</td><td style={{ padding: 7, textAlign: "right" }}>{group.diaryCount}</td><td style={{ padding: 7, textAlign: "right" }}>{number(group.laborHours)}</td><td style={{ padding: 7, textAlign: "right", fontWeight: 700 }}>{number(group.quantity, 3)}</td><td style={{ padding: 7, textAlign: "right" }}>{group.unit}</td><td style={{ padding: 7, textAlign: "right" }}><input type="number" min="0" step="0.01" value={unitValues[group.key] || ""} onChange={(event) => setUnitValues((current) => ({ ...current, [group.key]: event.target.value }))} style={{ ...fieldStyle, width: 120, textAlign: "right" }} /></td><td style={{ padding: 7, textAlign: "right", fontWeight: 800, color: "#2f702e" }}>{money(Number(group.quantity) * Number(unitValues[group.key] || 0))}</td></tr>)}</tbody>
                        <tfoot><tr><td colSpan={6} style={{ padding: 8, textAlign: "right", fontWeight: 800 }}>Total</td><td style={{ padding: 8, textAlign: "right", fontWeight: 900, color: "#2f702e" }}>{money(productionTotal)}</td></tr></tfoot>
                      </table>
                    </div>
                  )}

                  {preview.pendingCount > 0 && <label style={{ display: "flex", alignItems: "center", gap: 7, color: "#92400e", fontSize: 11, marginBottom: 10 }}><input type="checkbox" checked={form.allowPending} onChange={(event) => setForm((current) => ({ ...current, allowPending: event.target.checked }))} />Confirmo o fechamento parcial sem os {preview.pendingCount} diário(s) pendente(s).</label>}
                  <label style={{ display: "block", marginBottom: 10 }}><Label>Observações do fechamento</Label><textarea style={{ ...fieldStyle, minHeight: 70, resize: "vertical" }} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
                  <button type="button" onClick={createMeasurement} disabled={!!busy || (preview.pendingCount > 0 && !form.allowPending)} style={{ background: "#4a9410", color: "#fff", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 850, cursor: "pointer", fontSize: 11 }}>Criar medição de {form.billingMode === "fixed" ? money(form.fixedValue) : money(productionTotal)}</button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      {loading ? <div style={{ color: "#7d8780", padding: 24 }}>Carregando medições...</div> : measurements.length === 0 ? <div style={{ ...cardStyle, padding: 36, textAlign: "center", color: "#8a948d" }}>Nenhuma medição registrada.</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {measurements.map((measurement) => {
            const status = STATUS[measurement.status] || { label: measurement.status, background: "#f3f4f6", color: "#374151" };
            const receivable = measurement.billing;
            const balance = receivable ? Number(receivable.net_amount || 0) - Number(receivable.paid_amount || 0) : 0;
            return <article key={measurement.id} style={{ ...cardStyle, padding: 15, borderLeft: `4px solid ${status.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                <div><strong style={{ color: "#263827", fontSize: 14 }}>{measurement.contract?.object}</strong><span style={{ display: "block", color: "#6f7972", fontSize: 10, marginTop: 3 }}>{measurement.contract?.number} · {measurement.contract?.client?.name || "Cliente não informado"} · {measurement.period} · {new Date(measurement.startDate).toLocaleDateString("pt-BR")} a {new Date(measurement.endDate).toLocaleDateString("pt-BR")}</span>{measurement.approvedBy && <span style={{ display: "block", color: "#166534", fontSize: 10, marginTop: 4 }}>Aprovada por {measurement.approvedBy}</span>}</div>
                <div style={{ textAlign: "right" }}><strong style={{ display: "block", color: "#2f702e", fontSize: 20 }}>{money(measurement.value)}</strong><span style={{ display: "inline-block", background: status.background, color: status.color, borderRadius: 12, padding: "3px 9px", fontSize: 9, fontWeight: 850 }}>{status.label}</span></div>
              </div>

              {measurement.items?.length > 0 && <div style={{ overflowX: "auto", marginBottom: 9 }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}><thead><tr style={{ background: "#f4f7f4" }}>{["Descrição", "Un.", "Quantidade", "Valor unitário", "Total"].map((header) => <th key={header} style={{ padding: 6, textAlign: header === "Descrição" ? "left" : "right" }}>{header}</th>)}</tr></thead><tbody>{measurement.items.map((item: any) => <tr key={item.id} style={{ borderTop: "1px solid #edf1ed" }}><td style={{ padding: 6 }}>{item.description}</td><td style={{ padding: 6, textAlign: "right" }}>{item.unit}</td><td style={{ padding: 6, textAlign: "right" }}>{number(item.quantity, 3)}</td><td style={{ padding: 6, textAlign: "right" }}>{money(item.unitValue)}</td><td style={{ padding: 6, textAlign: "right", fontWeight: 800 }}>{money(item.totalValue)}</td></tr>)}</tbody></table></div>}

              {receivable && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 6, background: "#f7f3ff", borderRadius: 9, padding: 9, marginBottom: 9, fontSize: 10 }}><div><span style={{ color: "#7c6b91" }}>Faturamento</span><strong style={{ display: "block", color: "#5b2a86" }}>{receivable.nfse_number || "Registro gerencial"}</strong></div><div><span style={{ color: "#7c6b91" }}>Vencimento</span><strong style={{ display: "block" }}>{new Date(receivable.due_date).toLocaleDateString("pt-BR")}</strong></div><div><span style={{ color: "#7c6b91" }}>Valor líquido</span><strong style={{ display: "block" }}>{money(receivable.net_amount)}</strong></div><div><span style={{ color: "#7c6b91" }}>Recebido</span><strong style={{ display: "block", color: "#166534" }}>{money(receivable.paid_amount)}</strong></div><div><span style={{ color: "#7c6b91" }}>Saldo</span><strong style={{ display: "block", color: balance > 0 ? "#991b1b" : "#166534" }}>{money(balance)}</strong></div></div>}

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {measurement.status === "em_elaboracao" && <button type="button" onClick={() => changeStatus(measurement, "enviada")} style={{ border: 0, borderRadius: 7, padding: "7px 11px", background: "#1d4ed8", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>Enviar para aprovação</button>}
                {measurement.status === "enviada" && <><button type="button" onClick={() => setApproveModal(measurement)} style={{ border: 0, borderRadius: 7, padding: "7px 11px", background: "#15803d", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>Registrar aprovação</button><button type="button" onClick={() => glosa(measurement)} style={{ border: "1px solid #fecaca", borderRadius: 7, padding: "7px 11px", background: "#fef2f2", color: "#991b1b", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>Registrar glosa</button><button type="button" onClick={() => changeStatus(measurement, "em_elaboracao")} style={{ border: "1px solid #dfe5df", borderRadius: 7, padding: "7px 11px", background: "#fff", color: "#334532", cursor: "pointer", fontSize: 10 }}>Retornar para revisão</button></>}
                {measurement.status === "glosada" && <button type="button" onClick={() => changeStatus(measurement, "em_elaboracao")} style={{ border: 0, borderRadius: 7, padding: "7px 11px", background: "#ad650e", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>Reabrir para correção</button>}
                {measurement.status === "aprovada" && <button type="button" onClick={() => openBilling(measurement)} style={{ border: 0, borderRadius: 7, padding: "7px 11px", background: "#6d28d9", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>Faturar e criar título</button>}
                {measurement.status === "faturada" && <Link href="/dashboard/contas-receber" style={{ textDecoration: "none", borderRadius: 7, padding: "7px 11px", background: "#f3e8ff", color: "#6d28d9", fontSize: 10, fontWeight: 800 }}>Acompanhar recebimento</Link>}
              </div>
            </article>;
          })}
        </div>
      )}

      {approveModal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div style={{ ...cardStyle, width: 430, maxWidth: "100%", padding: 18 }}><h3 style={{ margin: "0 0 5px", color: "#263827", fontSize: 15 }}>Registrar aprovação do cliente</h3><p style={{ color: "#6f7972", fontSize: 11, margin: "0 0 13px" }}>{approveModal.contract?.number} · {approveModal.period} · {money(approveModal.value)}</p><Label>Representante/fiscal que aprovou</Label><input autoFocus style={fieldStyle} value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} placeholder="Nome e identificação do representante" /><div style={{ display: "flex", gap: 8, marginTop: 13 }}><button type="button" disabled={!approvedBy.trim() || !!busy} onClick={() => changeStatus(approveModal, "aprovada", { approvedBy })} style={{ flex: 1, border: 0, borderRadius: 8, padding: 9, background: approvedBy.trim() ? "#15803d" : "#9ca3af", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Confirmar aprovação</button><button type="button" onClick={() => { setApproveModal(null); setApprovedBy(""); }} style={{ border: 0, borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>Cancelar</button></div></div></div>}

      {billingModal && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}><div style={{ ...cardStyle, width: 500, maxWidth: "100%", padding: 18 }}><h3 style={{ margin: "0 0 5px", color: "#263827", fontSize: 15 }}>Faturar medição</h3><p style={{ color: "#6f7972", fontSize: 11, margin: "0 0 13px" }}>{billingModal.contract?.number} · {billingModal.period} · {money(billingModal.value)}</p><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}><label><Label>Vencimento do título</Label><input type="date" style={fieldStyle} value={billing.dueDate} onChange={(event) => setBilling((current) => ({ ...current, dueDate: event.target.value }))} /></label><label><Label>Retenções totais</Label><input type="number" min="0" step="0.01" style={fieldStyle} value={billing.retentionAmount} onChange={(event) => setBilling((current) => ({ ...current, retentionAmount: event.target.value }))} /></label><label><Label>Código do serviço</Label><input style={fieldStyle} value={billing.serviceCode} onChange={(event) => setBilling((current) => ({ ...current, serviceCode: event.target.value }))} placeholder="Ex.: 7.11" /></label><label style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 22, fontSize: 11, color: "#536057" }}><input type="checkbox" checked={billing.issRetained} onChange={(event) => setBilling((current) => ({ ...current, issRetained: event.target.checked }))} />ISS retido pelo tomador</label></div><div style={{ background: "#fff7ed", color: "#9a3412", borderRadius: 8, padding: 8, fontSize: 10, marginTop: 11 }}>O registro gerencial não substitui a emissão oficial da NFS-e.</div><div style={{ display: "flex", gap: 8, marginTop: 13 }}><button type="button" disabled={!!busy || !billing.dueDate} onClick={billMeasurement} style={{ flex: 1, border: 0, borderRadius: 8, padding: 9, background: "#6d28d9", color: "#fff", fontWeight: 800, cursor: "pointer" }}>Criar faturamento e título</button><button type="button" onClick={() => setBillingModal(null)} style={{ border: 0, borderRadius: 8, padding: "9px 14px", cursor: "pointer" }}>Cancelar</button></div></div></div>}
    </div>
  );
}
