"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { estiloInput, estiloLabel } from "@/lib/estilos";

type Prioridade = "urgente" | "normal" | "pode_agendar";
type Status = "pendente" | "agendado" | "em_execucao" | "bloqueado" | "concluido" | "cancelado";

type Ordem = {
  id: string;
  numero?: string;
  titulo: string;
  clienteNome: string;
  clientId?: string;
  contractId?: string;
  contratoNumero?: string;
  endereco: string;
  municipio: string;
  uf: string;
  tipoServico: string;
  prazo?: string;
  prioridade: Prioridade;
  status: Status;
  funcionariosNecessarios?: number;
  equipeAlocada?: string[];
  dataAgendada?: string;
  observacoes?: string;
  pendingChecklist?: number;
};

type Formulario = {
  title: string;
  clientId: string;
  contractId: string;
  serviceType: string;
  location: string;
  city: string;
  state: string;
  scheduledStart: string;
  scheduledEnd: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  notes: string;
};

const FORM_INICIAL: Formulario = {
  title: "",
  clientId: "",
  contractId: "",
  serviceType: "Roçada Manual",
  location: "",
  city: "Betim",
  state: "MG",
  scheduledStart: "",
  scheduledEnd: "",
  priority: "NORMAL",
  notes: "",
};

const PRIO_STYLE: Record<Prioridade, [string, string, string]> = {
  urgente: ["#fee2e2", "#991b1b", "Urgente"],
  normal: ["#dbeafe", "#1e40af", "Normal"],
  pode_agendar: ["#f3f4f6", "#6b7280", "Flexível"],
};

const STATUS_STYLE: Record<Status, [string, string, string]> = {
  pendente: ["#fef9c3", "#92400e", "Pendente"],
  agendado: ["#dbeafe", "#1e40af", "Agendado"],
  em_execucao: ["#f3e8ff", "#6d28d9", "Em execução"],
  bloqueado: ["#fee2e2", "#991b1b", "Bloqueado"],
  concluido: ["#dcfce7", "#15803d", "Concluído"],
  cancelado: ["#f3f4f6", "#6b7280", "Cancelado"],
};

const STATUS_DB: Record<Status, string> = {
  pendente: "OPEN",
  agendado: "SCHEDULED",
  em_execucao: "IN_PROGRESS",
  bloqueado: "BLOCKED",
  concluido: "COMPLETED",
  cancelado: "CANCELLED",
};

const TIPOS_SERVICO = [
  "Roçada Manual",
  "Roçada Mecanizada",
  "Jardinagem",
  "Poda",
  "Limpeza de Terreno",
  "PRADA/PTRF",
  "Controle de Pragas",
  "Plantio",
  "Outro",
];

const dinheiro = (valor: unknown) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function LogisticaPage() {
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [plano, setPlano] = useState<any>(null);
  const [planId, setPlanId] = useState<string>("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [filtro, setFiltro] = useState<"todas" | Status>("todas");
  const [aba, setAba] = useState<"ordens" | "plano" | "recursos">("ordens");
  const [form, setForm] = useState<Formulario>(FORM_INICIAL);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [semana, setSemana] = useState(() => {
    const hoje = new Date();
    const dia = hoje.getDay();
    const deslocamento = dia === 0 ? 1 : 8 - dia;
    hoje.setDate(hoje.getDate() + deslocamento);
    return hoje.toISOString().slice(0, 10);
  });
  const [criterio, setCriterio] = useState("balanceado");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch(`/api/logistica?semana=${semana}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar a logística");
      const recebidas: Ordem[] = data.os || [];
      setOrdens(recebidas);
      setFuncionarios(data.funcionarios || []);
      setVeiculos(data.veiculos || []);
      setClientes(data.clientes || []);
      setContratos(data.contratos || []);
      setPlanos(data.planos || []);
      if (data.latestPlan?.plan) {
        setPlano(data.latestPlan.plan);
        setPlanId(data.latestPlan.id || "");
      }
      setSelecionadas((atuais) => {
        const validas = atuais.filter((id) => recebidas.some((ordem) => ordem.id === id && ["pendente", "agendado"].includes(ordem.status)));
        if (validas.length) return validas;
        return recebidas.filter((ordem) => ["pendente", "agendado"].includes(ordem.status)).map((ordem) => ordem.id);
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar a logística");
    } finally {
      setLoading(false);
    }
  }, [semana]);

  useEffect(() => { carregar(); }, [carregar]);

  const contratosDisponiveis = useMemo(
    () => contratos.filter((contrato) => !form.clientId || contrato.clientId === form.clientId),
    [contratos, form.clientId],
  );

  const ordensFiltradas = useMemo(
    () => filtro === "todas" ? ordens : ordens.filter((ordem) => ordem.status === filtro),
    [ordens, filtro],
  );

  const pendentes = ordens.filter((ordem) => ["pendente", "agendado"].includes(ordem.status)).length;
  const urgentes = ordens.filter((ordem) => ordem.prioridade === "urgente" && !["concluido", "cancelado"].includes(ordem.status)).length;
  const emExecucao = ordens.filter((ordem) => ordem.status === "em_execucao").length;
  const concluidas = ordens.filter((ordem) => ordem.status === "concluido").length;

  const salvarOrdem = async () => {
    if (!form.title.trim() || !form.location.trim()) return;
    setBusy(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch("/api/ordens-servico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          title: form.title,
          clientId: form.clientId || null,
          contractId: form.contractId || null,
          serviceType: form.serviceType,
          location: form.location,
          city: form.city || null,
          state: form.state || null,
          scheduledStart: form.scheduledStart ? `${form.scheduledStart}T07:00:00` : null,
          scheduledEnd: form.scheduledEnd ? `${form.scheduledEnd}T17:00:00` : null,
          priority: form.priority,
          status: form.scheduledStart ? "SCHEDULED" : "OPEN",
          notes: form.notes || null,
          employeeIds: [],
          equipmentIds: [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível criar a OS");
      setMensagem("Ordem de serviço criada e armazenada no sistema.");
      setForm(FORM_INICIAL);
      setMostrarForm(false);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao criar a OS");
    } finally {
      setBusy(false);
    }
  };

  const alterarStatus = async (ordem: Ordem, novoStatus: Status) => {
    setBusy(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch("/api/ordens-servico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", workOrderId: ordem.id, status: STATUS_DB[novoStatus] }),
      });
      const data = await response.json();
      if (!response.ok) {
        const blockers = Array.isArray(data.blockers) ? `: ${data.blockers.join(", ")}` : "";
        throw new Error(`${data.error || "Não foi possível alterar o status"}${blockers}`);
      }
      setMensagem(`OS ${ordem.numero || ordem.titulo} atualizada para ${STATUS_STYLE[novoStatus][2]}.`);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao alterar o status");
    } finally {
      setBusy(false);
    }
  };

  const alternarSelecao = (id: string) => {
    setSelecionadas((atuais) => atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]);
  };

  const gerarPlano = async () => {
    if (!selecionadas.length) return;
    setBusy(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch("/api/logistica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ osIds: selecionadas, semana, criterio }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar o plano");
      setPlano(data.plano);
      setPlanId(data.planId || "");
      setMensagem("Plano semanal gerado e salvo como rascunho.");
      setAba("plano");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao gerar o plano");
    } finally {
      setBusy(false);
    }
  };

  const aprovarPlano = async () => {
    if (!planId) return;
    setBusy(true);
    setErro("");
    try {
      const response = await fetch("/api/logistica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_plan", planId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível aprovar o plano");
      setMensagem("Plano aprovado e preservado na trilha operacional.");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao aprovar o plano");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 800, margin: 0 }}>Logística operacional</h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0 0" }}>Ordens reais, equipe ativa, frota cadastrada e planejamento semanal persistente.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setMostrarForm((valor) => !valor)} style={{ background: "#4a9410", color: "#fff", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 700 }}>+ Nova OS</button>
          <Link href="/dashboard/ordens-servico" style={{ background: "#334532", color: "#fff", borderRadius: 8, padding: "9px 16px", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>Central de OS</Link>
        </div>
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 9, padding: "10px 13px", marginBottom: 12, fontSize: 12 }}>{erro}</div>}
      {mensagem && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 9, padding: "10px 13px", marginBottom: 12, fontSize: 12 }}>{mensagem}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9, marginBottom: 14 }}>
        {[
          ["Total de OS", ordens.length],
          ["Urgentes", urgentes],
          ["Pendentes", pendentes],
          ["Em execução", emExecucao],
          ["Concluídas", concluidas],
          ["Equipe ativa", funcionarios.length],
          ["Veículos ativos", veiculos.length],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 21, color: "#334532", fontWeight: 800, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {mostrarForm && (
        <div style={{ background: "#fff", border: "2px solid #4a9410", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <h2 style={{ color: "#334532", fontSize: 14, margin: "0 0 12px" }}>Nova ordem de serviço</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9 }}>
            <div style={{ gridColumn: "span 2" }}><label style={estiloLabel}>Título *</label><input style={estiloInput} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label style={estiloLabel}>Cliente</label><select style={estiloInput} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value, contractId: "" })}><option value="">Sem vínculo</option>{clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.name}</option>)}</select></div>
            <div><label style={estiloLabel}>Contrato</label><select style={estiloInput} value={form.contractId} onChange={(e) => setForm({ ...form, contractId: e.target.value })}><option value="">Sem contrato</option>{contratosDisponiveis.map((contrato) => <option key={contrato.id} value={contrato.id}>{contrato.number} — {contrato.object}</option>)}</select></div>
            <div><label style={estiloLabel}>Serviço *</label><select style={estiloInput} value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })}>{TIPOS_SERVICO.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></div>
            <div style={{ gridColumn: "span 2" }}><label style={estiloLabel}>Local completo *</label><input style={estiloInput} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><label style={estiloLabel}>Município</label><input style={estiloInput} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label style={estiloLabel}>UF</label><input style={estiloInput} maxLength={2} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} /></div>
            <div><label style={estiloLabel}>Início agendado</label><input type="date" style={estiloInput} value={form.scheduledStart} onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })} /></div>
            <div><label style={estiloLabel}>Prazo</label><input type="date" style={estiloInput} value={form.scheduledEnd} onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })} /></div>
            <div><label style={estiloLabel}>Prioridade</label><select style={estiloInput} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Formulario["priority"] })}><option value="LOW">Flexível</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option></select></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={estiloLabel}>Observações</label><textarea style={{ ...estiloInput, minHeight: 70 }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
            <button onClick={salvarOrdem} disabled={busy || !form.title.trim() || !form.location.trim()} style={{ background: "#4a9410", color: "#fff", border: 0, borderRadius: 8, padding: "9px 18px", fontWeight: 700, opacity: busy ? .6 : 1 }}>Salvar OS</button>
            <button onClick={() => setMostrarForm(false)} style={{ border: 0, borderRadius: 8, padding: "9px 18px" }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 12 }}>
        {(["ordens", "plano", "recursos"] as const).map((item) => <button key={item} onClick={() => setAba(item)} style={{ background: aba === item ? "#334532" : "#fff", color: aba === item ? "#fff" : "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 13px", fontWeight: 700 }}>{item === "ordens" ? "Ordens e seleção" : item === "plano" ? "Plano semanal" : "Equipe e frota"}</button>)}
      </div>

      {aba === "ordens" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "end", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["todas", "pendente", "agendado", "em_execucao", "bloqueado", "concluido", "cancelado"] as const).map((item) => <button key={item} onClick={() => setFiltro(item)} style={{ border: 0, borderRadius: 18, padding: "5px 10px", background: filtro === item ? "#334532" : "#f3f4f6", color: filtro === item ? "#fff" : "#374151", fontSize: 11 }}>{item === "todas" ? "Todas" : STATUS_STYLE[item][2]}</button>)}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
              <div><label style={estiloLabel}>Semana</label><input type="date" style={{ ...estiloInput, width: 150 }} value={semana} onChange={(e) => setSemana(e.target.value)} /></div>
              <div><label style={estiloLabel}>Critério</label><select style={{ ...estiloInput, width: 190 }} value={criterio} onChange={(e) => setCriterio(e.target.value)}><option value="balanceado">Balanceado</option><option value="urgencia">Urgência</option><option value="menor_deslocamento">Menor deslocamento</option><option value="menor_custo">Menor custo</option></select></div>
              <button onClick={gerarPlano} disabled={busy || !selecionadas.length} style={{ background: "#7c3aed", color: "#fff", border: 0, borderRadius: 8, padding: "9px 15px", fontWeight: 700, opacity: !selecionadas.length ? .5 : 1 }}>Gerar plano ({selecionadas.length})</button>
            </div>
          </div>

          {loading ? <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>Carregando ordens reais...</div> : ordensFiltradas.length === 0 ? <div style={{ padding: 35, textAlign: "center", color: "#6b7280", background: "#fff", borderRadius: 12 }}>Nenhuma ordem de serviço encontrada.</div> : ordensFiltradas.map((ordem) => {
            const [pbg, pco, plabel] = PRIO_STYLE[ordem.prioridade];
            const [sbg, sco, slabel] = STATUS_STYLE[ordem.status];
            const selecionavel = ["pendente", "agendado"].includes(ordem.status);
            return <div key={ordem.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderLeft: `4px solid ${pco}`, borderRadius: 11, padding: 14, marginBottom: 9 }}>
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 9, flex: 1, minWidth: 250 }}>
                  <input type="checkbox" checked={selecionadas.includes(ordem.id)} disabled={!selecionavel} onChange={() => alternarSelecao(ordem.id)} style={{ marginTop: 4 }} />
                  <div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}><strong style={{ color: "#334532" }}>{ordem.numero ? `${ordem.numero} — ` : ""}{ordem.titulo}</strong><span style={{ background: pbg, color: pco, borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{plabel}</span><span style={{ background: sbg, color: sco, borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 700 }}>{slabel}</span></div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 5 }}>{ordem.clienteNome} · {ordem.tipoServico} · {ordem.endereco}{ordem.municipio ? `, ${ordem.municipio}/${ordem.uf}` : ""}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{ordem.contratoNumero ? `Contrato ${ordem.contratoNumero} · ` : ""}{ordem.dataAgendada ? `Agendada ${new Date(`${ordem.dataAgendada}T12:00:00`).toLocaleDateString("pt-BR")} · ` : ""}{ordem.prazo ? `Prazo ${new Date(`${ordem.prazo}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem prazo"}</div>
                    {ordem.equipeAlocada?.length ? <div style={{ fontSize: 11, color: "#1d4ed8", marginTop: 3 }}>Equipe: {ordem.equipeAlocada.join(", ")}</div> : null}
                    {ordem.observacoes ? <div style={{ background: "#f9fafb", padding: "5px 8px", borderRadius: 6, fontSize: 11, marginTop: 5 }}>{ordem.observacoes}</div> : null}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {ordem.status === "pendente" && <button disabled={busy} onClick={() => alterarStatus(ordem, "agendado")} style={{ border: 0, borderRadius: 7, padding: "6px 9px" }}>Agendar</button>}
                  {["pendente", "agendado"].includes(ordem.status) && <button disabled={busy} onClick={() => alterarStatus(ordem, "em_execucao")} style={{ border: 0, borderRadius: 7, padding: "6px 9px", background: "#f3e8ff", color: "#6d28d9" }}>Iniciar</button>}
                  {ordem.status === "em_execucao" && <button disabled={busy} onClick={() => alterarStatus(ordem, "concluido")} style={{ border: 0, borderRadius: 7, padding: "6px 9px", background: "#dcfce7", color: "#15803d" }}>Concluir</button>}
                  {!["concluido", "cancelado"].includes(ordem.status) && <button disabled={busy} onClick={() => alterarStatus(ordem, "cancelado")} style={{ border: 0, borderRadius: 7, padding: "6px 9px", background: "#fee2e2", color: "#991b1b" }}>Cancelar</button>}
                  <Link href={`/dashboard/ordens-servico?id=${ordem.id}`} style={{ borderRadius: 7, padding: "6px 9px", background: "#334532", color: "#fff", textDecoration: "none", fontSize: 12 }}>Abrir</Link>
                </div>
              </div>
            </div>;
          })}
        </div>
      )}

      {aba === "plano" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <div><h2 style={{ color: "#334532", fontSize: 16, margin: 0 }}>Plano semanal</h2><div style={{ fontSize: 11, color: "#6b7280" }}>{planos.length} versão(ões) armazenada(s) para consulta.</div></div>
            {planId && <button onClick={aprovarPlano} disabled={busy} style={{ background: "#15803d", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontWeight: 700 }}>Aprovar plano atual</button>}
          </div>
          {!plano ? <div style={{ padding: 40, background: "#fff", borderRadius: 12, textAlign: "center", color: "#6b7280" }}>Selecione ordens pendentes e gere um plano.</div> : <div>
            <div style={{ background: "#334532", color: "#fff", borderRadius: 12, padding: 16, marginBottom: 10 }}><strong>{plano.semana}</strong><p style={{ margin: "5px 0 0", fontSize: 12 }}>{plano.resumo}</p></div>
            {plano.alertas?.length > 0 && <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: 12, marginBottom: 10 }}>{plano.alertas.map((alerta: string, index: number) => <div key={index} style={{ color: "#92400e", fontSize: 12, marginBottom: 3 }}>• {alerta}</div>)}</div>}
            {plano.dias?.map((dia: any) => <div key={`${dia.data}-${dia.diaSemana}`} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, marginBottom: 9, overflow: "hidden" }}><div style={{ background: "#e8f5ee", padding: "9px 13px", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><strong style={{ color: "#334532" }}>{dia.diaSemana} — {dia.data ? new Date(`${dia.data}T12:00:00`).toLocaleDateString("pt-BR") : ""}</strong><span style={{ fontSize: 11, color: "#6b7280" }}>{dia.horasEquipe || 0} h/equipe · {dia.kmTotal || 0} km</span></div><div style={{ padding: 12 }}>{dia.os?.length ? dia.os.map((item: any) => { const ordem = ordens.find((registro) => registro.id === item.osId); return <div key={`${dia.data}-${item.osId}`} style={{ borderBottom: "1px solid #f3f4f6", padding: "8px 0" }}><strong style={{ fontSize: 12, color: "#334532" }}>{item.ordem}. {ordem?.titulo || item.osId}</strong><div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{item.horarioSaida || "—"} → {item.horarioConclusao || "—"} · {item.veiculo || "sem veículo"}</div><div style={{ fontSize: 11, color: "#1d4ed8", marginTop: 2 }}>Equipe: {item.equipe?.join(", ") || "não definida"}</div>{item.observacoes ? <div style={{ fontSize: 11, marginTop: 2 }}>{item.observacoes}</div> : null}</div>; }) : <div style={{ color: "#6b7280", fontSize: 12 }}>Sem ordens neste dia.</div>}</div></div>)}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, padding: 13 }}><strong style={{ color: "#334532", fontSize: 12 }}>Resumo</strong><div style={{ display: "flex", gap: 15, flexWrap: "wrap", marginTop: 7, fontSize: 12 }}><span>OS: {plano.totais?.osAtendidas || 0}</span><span>Horas: {plano.totais?.horasTotais || 0}</span><span>Km: {plano.totais?.kmSemana || 0}</span><span>Custo estimado: {dinheiro(plano.totais?.custoEstimadoTotal)}</span><span>Eficiência: {plano.totais?.eficiencia || "—"}</span></div></div>
          </div>}
        </div>
      )}

      {aba === "recursos" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, padding: 14 }}><h2 style={{ color: "#334532", fontSize: 14, marginTop: 0 }}>Equipe ativa</h2>{funcionarios.length ? funcionarios.map((funcionario) => <div key={funcionario.id} style={{ borderBottom: "1px solid #f3f4f6", padding: "7px 0" }}><strong style={{ fontSize: 12 }}>{funcionario.name}</strong><div style={{ color: "#6b7280", fontSize: 11 }}>{funcionario.role || "Função não informada"}</div></div>) : <div style={{ color: "#6b7280", fontSize: 12 }}>Nenhum funcionário ativo.</div>}</div>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 11, padding: 14 }}><h2 style={{ color: "#334532", fontSize: 14, marginTop: 0 }}>Frota ativa</h2>{veiculos.length ? veiculos.map((veiculo) => <div key={veiculo.id} style={{ borderBottom: "1px solid #f3f4f6", padding: "7px 0" }}><strong style={{ fontSize: 12 }}>{veiculo.plate} — {veiculo.model}</strong><div style={{ color: "#6b7280", fontSize: 11 }}>{veiculo.type}</div></div>) : <div style={{ color: "#6b7280", fontSize: 12 }}>Nenhum veículo ativo.</div>}</div>
        </div>
      )}
    </div>
  );
}
