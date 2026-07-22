"use client";

import { useCallback, useEffect, useState } from "react";
import { AvisoBox, Botao, Campo, Card, Input, KpiCard, KpiGrid, TituloPagina } from "@/components/ui";
import { estiloInput } from "@/lib/estilos";

const STEPS = ["Importar", "Validar", "Dimensionar", "Precificar", "Proposta"];
const money = (value: unknown) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const number = (value: unknown, digits = 2) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: digits });

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function DossieOperacionalPage() {
  const [step, setStep] = useState(0);
  const [dossiers, setDossiers] = useState<any[]>([]);
  const [dossier, setDossier] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<any[]>([]);
  const [requirementProfiles, setRequirementProfiles] = useState<any[]>([]);
  const [laborRoles, setLaborRoles] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<any>(null);

  const loadLists = async () => {
    const [d, c, t, rp, hh] = await Promise.all([
      fetch("/api/dossies").then((r) => r.json()),
      fetch("/api/clientes").then((r) => r.json()),
      fetch("/api/perfis-tributarios").then((r) => r.json()),
      fetch("/api/perfis-documentais").then((r) => r.json()),
      fetch("/api/hora-homem").then((r) => r.json()),
    ]);
    setDossiers(d.data || []);
    setClients(c.data || c || []);
    setTaxProfiles(t.data || []);
    setRequirementProfiles(rp.data || []);
    setLaborRoles(hh.funcoes || []);
  };

  const loadDossier = async (id: string, targetStep?: number) => {
    setBusy("Carregando dossiê...");
    const response = await fetch(`/api/dossies?id=${id}`);
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage({ type: "error", text: data.error });
    setDossier(data.data);
    setStep(targetStep ?? (data.data.proposal ? 4 : data.data.validationStatus === "validado" ? 2 : 1));
  };

  useEffect(() => { loadLists(); }, []);

  const createDossier = async () => {
    if (!title.trim() && !sourceText.trim() && !file) return setMessage({ type: "error", text: "Informe um título, texto ou arquivo." });
    setBusy("Lendo o arquivo e extraindo fatos com evidências...");
    setMessage(null);
    const payload: any = { title, sourceText, sourceName: file?.name, sourceType: file ? (file.type.includes("pdf") ? "PDF" : "TXT") : "MANUAL" };
    if (file) {
      const encoded = await fileToBase64(file);
      if (file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf")) payload.pdfBase64 = encoded;
      else payload.txtBase64 = encoded;
    }
    const response = await fetch("/api/dossies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage({ type: "error", text: data.error });
    setDossier(data.data);
    setStep(1);
    setMessage({ type: data.warning ? "warning" : "success", text: data.warning || `${data.data.code} criado. Confira cada campo antes de validar.` });
    loadLists();
  };

  const patchDossier = async (action: string, extra: any = {}) => {
    if (!dossier) return null;
    setBusy("Salvando...");
    const response = await fetch("/api/dossies", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: dossier.id, action, ...extra }),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) {
      setMessage({ type: "error", text: data.blocks?.join(" ") || data.error });
      return null;
    }
    await loadDossier(dossier.id, step);
    return data.data;
  };

  const saveComposition = async (item: any) => {
    setBusy("Salvando composição...");
    const response = await fetch("/api/composicoes", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item),
    });
    const data = await response.json();
    setBusy("");
    if (!response.ok) return setMessage({ type: "error", text: data.error });
    await loadDossier(dossier.id, 2);
    setMessage({ type: "success", text: "Composição salva." });
  };

  const addComposition = async () => {
    const response = await fetch("/api/composicoes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dossierId: dossier.id, activity: "Nova atividade", quantity: 1, unit: "m²", productivityPerHour: 1, teamSize: 1, hoursPerDay: 8 }),
    });
    if (response.ok) await loadDossier(dossier.id, 2);
  };

  const result = dossier?.calculation;
  const extraction = dossier?.extraction || {};
  const evidence = Array.isArray(dossier?.evidence) ? dossier.evidence : [];
  const selectedProfile = taxProfiles.find((p) => p.id === dossier?.taxProfileId);

  return (
    <div>
      <TituloPagina>🧭 Dossiê Operacional</TituloPagina>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 14 }}>
        Do edital à proposta: extração assistida, validação humana, dimensionamento auditável, preço e documentação.
      </p>
      <AvisoBox tom="info">
        A IA localiza fatos e evidências. Trabalhadores, HH, custos, impostos e preço são calculados por regras determinísticas e só avançam após sua validação.
      </AvisoBox>

      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(0,1fr)", gap: 14 }}>
        <Card style={{ padding: 12, alignSelf: "start" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 9 }}>
            <strong style={{ fontSize: 12, color: "#334532" }}>Dossiês recentes</strong>
            <button onClick={() => { setDossier(null); setStep(0); }} style={{ border: 0, borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>＋</button>
          </div>
          {dossiers.length === 0 && <p style={{ color: "#9ca3af", fontSize: 11 }}>Nenhum dossiê criado.</p>}
          {dossiers.map((item) => (
            <button key={item.id} onClick={() => loadDossier(item.id)} style={{ width: "100%", textAlign: "left", background: dossier?.id === item.id ? "#e8f5ee" : "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 9, marginBottom: 6, cursor: "pointer" }}>
              <div style={{ fontSize: 10, color: "#4a9410", fontWeight: 700 }}>{item.code}</div>
              <div style={{ fontSize: 11, fontWeight: 650, margin: "2px 0" }}>{item.title}</div>
              <div style={{ fontSize: 9, color: "#6b7280" }}>{item.status} · qualidade {item.qualityScore || 0}</div>
            </button>
          ))}
        </Card>

        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6, marginBottom: 12 }}>
            {STEPS.map((label, index) => (
              <button key={label} onClick={() => dossier && setStep(index)} disabled={!dossier && index > 0} style={{ border: 0, borderBottom: `3px solid ${step === index ? "#4a9410" : "#d1d5db"}`, background: step === index ? "#f0fdf4" : "#fff", padding: "9px 4px", borderRadius: "7px 7px 0 0", fontSize: 11, fontWeight: 700, color: step === index ? "#334532" : "#6b7280", cursor: !dossier && index > 0 ? "not-allowed" : "pointer" }}>
                {index + 1}. {label}
              </button>
            ))}
          </div>

          {busy && <div style={{ background: "#eff6ff", color: "#1d4ed8", padding: "9px 12px", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>⟳ {busy}</div>}
          {message && <div style={{ background: message.type === "error" ? "#fef2f2" : message.type === "warning" ? "#fffbeb" : "#f0fdf4", color: message.type === "error" ? "#991b1b" : message.type === "warning" ? "#92400e" : "#166534", padding: "9px 12px", borderRadius: 8, fontSize: 12, marginBottom: 10 }}>{message.text}</div>}

          {step === 0 && (
            <Card style={{ padding: 18 }}>
              <h2 style={{ fontSize: 15, color: "#334532", marginBottom: 12 }}>Importar escopo ou edital</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Campo label="Título interno"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Manutenção de áreas verdes — unidade Betim" /></Campo>
                <Campo label="Arquivo PDF ou TXT (até 10 MB)"><Input type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Campo>
                <Campo label="Texto complementar ou entrada manual" style={{ gridColumn: "1/-1" }}>
                  <textarea style={{ ...estiloInput, minHeight: 190, resize: "vertical" }} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder="Cole objeto, quantidades, prazo, local, requisitos, jornadas e condições de pagamento..." />
                </Campo>
              </div>
              <Botao onClick={createDossier} disabled={!!busy}>Ler e criar dossiê</Botao>
            </Card>
          )}

          {step === 1 && dossier && (
            <Card style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
                <div><strong style={{ color: "#334532" }}>{dossier.code} — {dossier.title}</strong><div style={{ fontSize: 10, color: "#6b7280" }}>Fonte: {dossier.sourceType} · Extração: {dossier.extractionStatus}</div></div>
                <span style={{ background: dossier.validationStatus === "validado" ? "#dcfce7" : "#fef3c7", color: dossier.validationStatus === "validado" ? "#166534" : "#92400e", borderRadius: 12, padding: "4px 10px", fontSize: 10, fontWeight: 700 }}>{dossier.validationStatus}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[["Objeto", extraction.object], ["Cliente", extraction.clientName], ["Início", dossier.startDate ? new Date(dossier.startDate).toLocaleDateString("pt-BR") : "Não definido"], ["Serviços", (extraction.services || []).length]].map(([label, value]) => (
                  <div key={String(label)} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 9 }}><div style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 12, fontWeight: 600 }}>{String(value || "Não identificado")}</div></div>
                ))}
              </div>
              <h3 style={{ fontSize: 12, color: "#334532", marginBottom: 6 }}>Correções humanas antes da validação</h3>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 130px 130px 130px", gap: 8, marginBottom: 12 }}>
                <Campo label="Título/objeto"><Input value={dossier.title || ""} onChange={(e) => setDossier((p: any) => ({ ...p, title: e.target.value }))} /></Campo>
                <Campo label="Local"><Input value={dossier.location || ""} onChange={(e) => setDossier((p: any) => ({ ...p, location: e.target.value }))} /></Campo>
                <Campo label="Início"><Input type="date" value={dossier.startDate ? String(dossier.startDate).slice(0, 10) : ""} onChange={(e) => setDossier((p: any) => ({ ...p, startDate: e.target.value }))} /></Campo>
                <Campo label="Prazo (dias)"><Input type="number" value={dossier.deadlineDays || ""} onChange={(e) => setDossier((p: any) => ({ ...p, deadlineDays: Number(e.target.value) }))} /></Campo>
                <Campo label="Pagamento (dias)"><Input type="number" value={dossier.paymentTermDays || 0} onChange={(e) => setDossier((p: any) => ({ ...p, paymentTermDays: Number(e.target.value) }))} /></Campo>
              </div>
              <Botao variante="neutro" onClick={() => patchDossier("update", { title: dossier.title, location: dossier.location, startDate: dossier.startDate, deadlineDays: dossier.deadlineDays, paymentTermDays: dossier.paymentTermDays })}>Salvar correções</Botao>
              <h3 style={{ fontSize: 12, color: "#334532", marginBottom: 6 }}>Evidências encontradas ({evidence.length})</h3>
              <div style={{ maxHeight: 220, overflow: "auto", marginBottom: 12 }}>
                {evidence.length === 0 && <AvisoBox>Nenhuma evidência vinculada. Revise o texto e preencha os dados manualmente.</AvisoBox>}
                {evidence.map((item: any, index: number) => <div key={index} style={{ padding: "7px 9px", borderBottom: "1px solid #f3f4f6", fontSize: 11 }}><strong>{item.field}</strong>: {String(item.value || "—")}<div style={{ color: "#6b7280", fontStyle: "italic" }}>“{item.quote}” {item.page ? `(${item.page})` : ""}</div></div>)}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Botao onClick={async () => { const ok = await patchDossier("validate", { approved: true }); if (ok) setStep(2); }}>Confirmo os dados e evidências</Botao>
                <Botao variante="perigo" onClick={() => patchDossier("validate", { approved: false, notes: "Extração rejeitada para correção." })}>Rejeitar extração</Botao>
              </div>
            </Card>
          )}

          {step === 2 && dossier && (
            <div>
              <Card style={{ padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><strong style={{ color: "#334532", fontSize: 13 }}>Composições e produtividade</strong><Botao variante="neutro" onClick={addComposition}>＋ Atividade</Botao></div>
                {dossier.compositions.length === 0 && <AvisoBox>Inclua ao menos uma atividade para dimensionar a operação.</AvisoBox>}
                {dossier.compositions.map((item: any) => <CompositionEditor key={item.id} item={item} laborRoles={laborRoles} onSave={saveComposition} />)}
              </Card>
              <ResourceReservationPanel dossier={dossier} />
              <div style={{ display: "flex", justifyContent: "flex-end" }}><Botao onClick={() => setStep(3)}>Continuar para custos</Botao></div>
            </div>
          )}

          {step === 3 && dossier && (
            <PricingStep dossier={dossier} clients={clients} taxProfiles={taxProfiles} requirementProfiles={requirementProfiles} selectedProfile={selectedProfile} result={result}
              onSave={async (settings: any) => { await patchDossier("update", settings); }}
              onCalculate={async (settings: any) => { await patchDossier("update", settings); const calculated = await patchDossier("calculate"); if (calculated) setMessage({ type: calculated.blocks?.length ? "warning" : "success", text: calculated.blocks?.length ? calculated.blocks.join(" ") : "Cálculo concluído e auditável." }); }}
              onNext={() => setStep(4)} />
          )}

          {step === 4 && dossier && (
            <ProposalStep dossier={dossier} result={result} onCreate={async () => { const proposal = await patchDossier("createProposal"); if (proposal) setMessage({ type: "success", text: `Proposta ${proposal.number} criada e enviada para as três alçadas de aprovação.` }); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceReservationPanel({ dossier }: { dossier: any }) {
  const today = new Date().toISOString().slice(0, 10);
  const [data, setData] = useState<any[]>([]);
  const [resources, setResources] = useState<any>({ employees: [], equipment: [] });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ resourceType: "EMPLOYEE", resourceId: "", startDate: dossier.startDate ? String(dossier.startDate).slice(0, 10) : today, endDate: dossier.startDate ? String(dossier.startDate).slice(0, 10) : today, notes: "" });

  const load = useCallback(async () => {
    const response = await fetch(`/api/reservas-recursos?dossierId=${dossier.id}&includeResources=1`);
    const body = await response.json();
    if (!response.ok) return setMessage(body.error || "Não foi possível carregar as reservas.");
    setData(body.data || []);
    setResources(body.resources || { employees: [], equipment: [] });
  }, [dossier.id]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.resourceId) return setMessage("Selecione um funcionário ou equipamento.");
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/reservas-recursos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dossierId: dossier.id,
        resourceType: form.resourceType,
        employeeId: form.resourceType === "EMPLOYEE" ? form.resourceId : null,
        equipmentId: form.resourceType === "EQUIPMENT" ? form.resourceId : null,
        startDate: form.startDate,
        endDate: form.endDate,
        notes: form.notes,
      }),
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "Não foi possível reservar o recurso.");
    setForm((current) => ({ ...current, resourceId: "", notes: "" }));
    setMessage("Reserva provisória criada. Ela será confirmada na conversão do contrato.");
    await load();
  };

  const cancel = async (id: string) => {
    const response = await fetch("/api/reservas-recursos", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "cancelada" }) });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error || "Não foi possível cancelar a reserva.");
    setMessage("Reserva cancelada.");
    await load();
  };

  const options = form.resourceType === "EMPLOYEE" ? resources.employees : resources.equipment;
  return <Card style={{ padding: 16, marginBottom: 10 }}>
    <strong style={{ color: "#334532", fontSize: 13 }}>Disponibilidade e reserva de recursos</strong>
    <p style={{ color: "#6b7280", fontSize: 10, margin: "4px 0 10px" }}>A reserva provisória evita dupla alocação. Recursos em manutenção, inativos ou com choque de período são bloqueados.</p>
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 145px 145px 1fr auto", gap: 7, alignItems: "end" }}>
      <Campo label="Tipo"><select style={estiloInput} value={form.resourceType} onChange={(e) => setForm((p) => ({ ...p, resourceType: e.target.value, resourceId: "" }))}><option value="EMPLOYEE">Funcionário</option><option value="EQUIPMENT">Equipamento</option></select></Campo>
      <Campo label="Recurso"><select style={estiloInput} value={form.resourceId} onChange={(e) => setForm((p) => ({ ...p, resourceId: e.target.value }))}><option value="">Selecione</option>{options.map((item: any) => <option key={item.id} value={item.id}>{form.resourceType === "EMPLOYEE" ? `${item.name} · ${item.role}` : `${item.codigo} · ${item.descricao} · ${item.status}`}</option>)}</select></Campo>
      <Campo label="Início"><Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} /></Campo>
      <Campo label="Fim"><Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} /></Campo>
      <Campo label="Observação"><Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} /></Campo>
      <Botao onClick={create} disabled={busy}>{busy ? "Reservando..." : "Reservar"}</Botao>
    </div>
    {message && <div style={{ marginTop: 8, color: message.includes("não") || message.includes("Selecione") ? "#991b1b" : "#166534", fontSize: 10 }}>{message}</div>}
    <div style={{ marginTop: 10 }}>
      {data.length === 0 && <div style={{ color: "#9ca3af", fontSize: 10 }}>Nenhum recurso reservado para este dossiê.</div>}
      {data.map((item) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 190px auto", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid #f3f4f6", fontSize: 10 }}>
        <span><strong>{item.employee?.name || item.equipment?.descricao || "Recurso"}</strong><br /><span style={{ color: "#6b7280" }}>{item.employee?.role || item.equipment?.codigo}</span></span>
        <span style={{ color: item.status === "confirmada" ? "#166534" : item.status === "cancelada" ? "#991b1b" : "#92400e" }}>{item.status}</span>
        <span>{new Date(item.startDate).toLocaleDateString("pt-BR")} — {new Date(item.endDate).toLocaleDateString("pt-BR")}</span>
        {item.status === "provisoria" && <button onClick={() => cancel(item.id)} style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: 10 }}>Cancelar</button>}
      </div>)}
    </div>
  </Card>;
}

function CompositionEditor({ item, laborRoles, onSave }: { item: any; laborRoles: any[]; onSave: (item: any) => void }) {
  const [form, setForm] = useState({ ...item });
  const fields = [
    ["quantity", "Quantidade"], ["unit", "Unidade"], ["productivityPerHour", "Produtividade/un por HH"],
    ["teamSize", "Equipe mínima"], ["hoursPerDay", "Horas/dia"], ["efficiencyFactor", "Eficiência (0–1)"],
    ["laborHourlyCost", "Custo completo/HH"], ["inputUnitCost", "Insumo/un"], ["equipmentDailyCost", "Equipamento/dia"],
    ["transportCost", "Transporte total"], ["additionalCost", "Outros custos"],
  ];
  return <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, marginBottom: 9 }}>
    <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 7, marginBottom: 7 }}>
      <Input value={form.code} onChange={(e) => setForm((p: any) => ({ ...p, code: e.target.value }))} />
      <Input value={form.activity} onChange={(e) => setForm((p: any) => ({ ...p, activity: e.target.value }))} />
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 7, marginBottom: 7 }}>
      <Campo label="Função-base da folha"><select style={estiloInput} value={form.laborRole || ""} onChange={(e) => { const role = laborRoles.find((candidate) => candidate.funcao === e.target.value); setForm((p: any) => ({ ...p, laborRole: e.target.value || null, laborHourlyCost: role ? Number(role.custo.custoHoraPaga.toFixed(4)) : p.laborHourlyCost })); }}><option value="">Custo informado manualmente</option>{laborRoles.map((role) => <option key={role.funcao} value={role.funcao}>{role.funcao} · {money(role.custo.custoHoraPaga)}/h paga</option>)}</select></Campo>
      <div style={{ background: "#f8fafc", borderRadius: 8, padding: 8, fontSize: 9, color: "#64748b", alignSelf: "end" }}>A folha fornece salário + encargos + benefícios por hora paga. O fator de eficiência trata as horas improdutivas sem duplicar esse custo.</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(100px,1fr))", gap: 7 }}>
      {fields.map(([key, label]) => <Campo key={key} label={label}><Input type={key === "unit" ? "text" : "number"} step="0.01" value={form[key] ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, [key]: key === "unit" ? e.target.value : Number(e.target.value) }))} /></Campo>)}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
      <span style={{ fontSize: 10, color: "#6b7280" }}>Planejado: {number(item.plannedLaborHours)} HH · {item.plannedWorkers} trab. · {number(item.plannedDays)} dias · {money(item.directCost)}</span>
      <Botao variante="neutro" onClick={() => onSave(form)}>Salvar composição</Botao>
    </div>
  </div>;
}

function PricingStep({ dossier, clients, taxProfiles, requirementProfiles, selectedProfile, result, onSave, onCalculate, onNext }: any) {
  const [form, setForm] = useState({
    clientId: dossier.clientId || "", taxProfileId: dossier.taxProfileId || "", location: dossier.location || "",
    requirementProfileId: dossier.requirementProfileId || "",
    startDate: dossier.startDate ? String(dossier.startDate).slice(0, 10) : "",
    deadlineDays: dossier.deadlineDays || "", paymentTermDays: dossier.paymentTermDays || 30,
    mobilizationCost: Number(dossier.mobilizationCost || 0), demobilizationCost: Number(dossier.demobilizationCost || 0),
    overheadRate: Number(dossier.overheadRate || 0), riskRate: Number(dossier.riskRate || 0), marginRate: Number(dossier.marginRate || 0), workingCapitalRate: Number(dossier.workingCapitalRate || 0),
  });
  useEffect(() => setForm((p) => ({ ...p, taxProfileId: dossier.taxProfileId || p.taxProfileId })), [dossier.taxProfileId]);
  const set = (key: string, value: any) => setForm((p: any) => ({ ...p, [key]: value }));
  return <div>
    <Card style={{ padding: 16, marginBottom: 10 }}>
      <strong style={{ color: "#334532", fontSize: 13 }}>Custos indiretos, impostos e margem</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 10 }}>
        <Campo label="Cliente"><select style={estiloInput} value={form.clientId} onChange={(e) => setForm((current: any) => ({ ...current, clientId: e.target.value || null, requirementProfileId: "" }))}><option value="">Não vinculado</option>{clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Campo>
        <Campo label="Perfil tributário versionado"><select style={estiloInput} value={form.taxProfileId} onChange={(e) => set("taxProfileId", e.target.value || null)}><option value="">Selecione</option>{taxProfiles.filter((p: any) => p.active).map((p: any) => <option key={p.id} value={p.id}>{p.name} · v{p.version}</option>)}</select></Campo>
        <Campo label="Perfil documental deste serviço"><select style={estiloInput} value={form.requirementProfileId} onChange={(e) => set("requirementProfileId", e.target.value || null)}><option value="">Somente matriz SST padrão</option>{requirementProfiles.filter((p: any) => p.active && (!form.clientId || p.clientId === form.clientId)).map((p: any) => <option key={p.id} value={p.id}>{p.name} · v{p.version}</option>)}</select></Campo>
        <Campo label="Local"><Input value={form.location} onChange={(e) => set("location", e.target.value)} /></Campo>
        <Campo label="Data prevista de início"><Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Campo>
        {[['deadlineDays','Prazo (dias)'],['paymentTermDays','Pagamento (dias)'],['mobilizationCost','Mobilização (R$)'],['demobilizationCost','Desmobilização (R$)'],['overheadRate','Administração (%)'],['riskRate','Risco (%)'],['marginRate','Margem alvo (%)'],['workingCapitalRate','Custo capital (%)']].map(([key,label]) => <Campo key={key} label={label}><Input type="number" step="0.01" value={(form as any)[key]} onChange={(e) => set(key, Number(e.target.value))} /></Campo>)}
      </div>
      {selectedProfile && <div style={{ background: "#f8fafc", borderRadius: 8, padding: 9, marginTop: 9, fontSize: 10, color: "#475569" }}>Alíquota efetiva {number(selectedProfile.effectiveRate)}% · ISS {number(selectedProfile.issRate)}% ({selectedProfile.issIncludedInEffectiveRate ? "incluído" : "adicional"}) · INSS retido {number(selectedProfile.inssRetentionRate)}% ({selectedProfile.inssRecoverable ? "recuperável" : "custo definitivo"})</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}><Botao variante="neutro" onClick={() => onSave(form)}>Salvar parâmetros</Botao><Botao onClick={() => onCalculate(form)} disabled={!form.taxProfileId}>Calcular cenários</Botao></div>
    </Card>
    {result && <>
      <KpiGrid colunas={4}><KpiCard label="Trabalhadores" valor={result.totals.workers} /><KpiCard label="Horas-homem" valor={number(result.totals.laborHours)} /><KpiCard label="Preço recomendado" valor={money(result.totals.recommendedPrice)} /><KpiCard label="Preço comercial" valor={money(result.totals.commercialPrice)} /></KpiGrid>
      <Card style={{ padding: 14, marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {result.scenarios.map((scenario: any) => <div key={scenario.name} style={{ border: `1px solid ${scenario.name === "adverso" ? "#fecaca" : scenario.name === "otimista" ? "#bbf7d0" : "#bfdbfe"}`, borderRadius: 9, padding: 10 }}><strong style={{ textTransform: "capitalize", fontSize: 12 }}>{scenario.name}</strong><div style={{ fontSize: 17, fontWeight: 700, color: "#334532", margin: "5px 0" }}>{money(scenario.commercialPrice)}</div><div style={{ fontSize: 10, color: "#6b7280" }}>{number(scenario.laborHours)} HH · {scenario.workers} trab. · {number(scenario.durationDays)} dias</div></div>)}
        </div>
        <div style={{ marginTop: 10, fontSize: 11 }}>Capital de giro estimado: <strong>{money(result.totals.workingCapitalNeed)}</strong> · Retenções no caixa: <strong>{number(result.totals.retainedCashRate)}%</strong> · Limite de desconto: <strong>{money(result.totals.discountLimit)}</strong></div>
        {result.blocks?.length > 0 && <AvisoBox tom="erro">{result.blocks.join(" ")}</AvisoBox>}
        {result.warnings?.length > 0 && <AvisoBox>{result.warnings.join(" ")}</AvisoBox>}
      </Card>
      <div style={{ display: "flex", justifyContent: "flex-end" }}><Botao onClick={onNext} disabled={result.blocks?.length > 0}>Preparar proposta</Botao></div>
    </>}
  </div>;
}

function ProposalStep({ dossier, result, onCreate }: any) {
  const approvals = dossier.proposal?.versions?.[0];
  return <Card style={{ padding: 18 }}>
    <h2 style={{ color: "#334532", fontSize: 15, marginBottom: 10 }}>Proposta e governança</h2>
    {!result && <AvisoBox tom="erro">Calcule o dossiê antes de criar a proposta.</AvisoBox>}
    {result && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      <KpiCard label="Preço mínimo" valor={money(result.totals.minimumPrice)} cor="#dc2626" />
      <KpiCard label="Preço comercial" valor={money(result.totals.commercialPrice)} />
    </div>}
    {dossier.proposal ? <>
      <AvisoBox tom="info">Proposta <strong>{dossier.proposal.number}</strong> criada. A conversão em contrato só será liberada depois das aprovações técnica, financeira e da diretoria.</AvisoBox>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[['Técnica', approvals?.technicalStatus], ['Financeira', approvals?.financialStatus], ['Diretoria', approvals?.directorStatus]].map(([label,status]) => <div key={label} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, fontSize: 11 }}><strong>{label}</strong><div style={{ color: status === "aprovado" ? "#15803d" : "#92400e", marginTop: 4 }}>{status || "pendente"}</div></div>)}
      </div>
    </> : <Botao onClick={onCreate} disabled={!result || result.blocks?.length > 0}>Criar proposta versionada</Botao>}
  </Card>;
}
