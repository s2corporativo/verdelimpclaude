"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Formulario = {
  prospectName: string;
  contactName: string;
  phone: string;
  email: string;
  serviceType: string;
  estimatedValue: string;
  origin: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
};

type DossieResumo = {
  id: string;
  code: string;
  status: string;
  validationStatus: string;
  proposalId?: string | null;
  contractId?: string | null;
};

type Oportunidade = Omit<Formulario, "estimatedValue" | "nextActionDate"> & {
  id: string;
  stage: string;
  estimatedValue?: number | string | null;
  nextActionDate?: string | null;
  dossier?: DossieResumo | null;
};

type Dados = {
  oportunidades: Oportunidade[];
  valorEmAberto: number;
};

const FORM_INICIAL: Formulario = {
  prospectName: "",
  contactName: "",
  phone: "",
  email: "",
  serviceType: "",
  estimatedValue: "",
  origin: "cliente_existente",
  nextAction: "",
  nextActionDate: "",
  notes: "",
};

const ORIGENS = [
  { key: "cliente_existente", label: "Cliente existente", descricao: "Nova solicitação de cliente já atendido", icon: "🤝" },
  { key: "novo_cliente", label: "Novo cliente", descricao: "Contato, indicação ou prospecção", icon: "＋" },
  { key: "edital_arquivo", label: "Edital ou arquivo", descricao: "PDF, planilha ou termo de referência", icon: "↥" },
  { key: "renovacao", label: "Renovação", descricao: "Prorrogação, reajuste ou continuidade", icon: "↻" },
  { key: "emergencial", label: "Serviço emergencial", descricao: "Demanda com resposta operacional rápida", icon: "!" },
];

const ESTAGIOS = [
  { key: "lead", label: "Nova", cor: "#6b7280", descricao: "Entrada ainda não analisada" },
  { key: "qualificado", label: "Em análise", cor: "#27547d", descricao: "Escopo, recursos e custos" },
  { key: "proposta", label: "Proposta", cor: "#ad650e", descricao: "Preparada ou enviada" },
  { key: "negociacao", label: "Negociação", cor: "#6b4aa0", descricao: "Ajustes comerciais" },
  { key: "ganho", label: "Aprovada", cor: "#2f702e", descricao: "Pronta para contrato" },
  { key: "perdido", label: "Encerrada", cor: "#9b3414", descricao: "Recusada ou cancelada" },
];

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e4e9e5", borderRadius: 14 };
const campo: React.CSSProperties = { width: "100%", padding: "9px 10px", border: "1px solid #d9dfda", borderRadius: 9, background: "#fff", color: "#263827", fontSize: 12 };

function brl(valor: unknown) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Campo({ label, children, dica }: { label: string; children: React.ReactNode; dica?: string }) {
  return <label style={{ display: "block" }}><span style={{ display: "block", color: "#445047", fontSize: 10, fontWeight: 800, marginBottom: 5 }}>{label}</span>{children}{dica && <span style={{ display: "block", color: "#89938c", fontSize: 9, marginTop: 4 }}>{dica}</span>}</label>;
}

export default function OportunidadesPage() {
  const [dados, setDados] = useState<Dados>({ oportunidades: [], valorEmAberto: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  const [etapa, setEtapa] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [processandoId, setProcessandoId] = useState("");
  const [form, setForm] = useState<Formulario>(FORM_INICIAL);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/oportunidades${mostrarArquivadas ? "?arquivadas=1" : ""}`);
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Falha ao carregar demandas");
      setDados({ oportunidades: json.oportunidades || [], valorEmAberto: Number(json.valorEmAberto || 0) });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar demandas");
      setDados({ oportunidades: [], valorEmAberto: 0 });
    } finally {
      setCarregando(false);
    }
  }, [mostrarArquivadas]);

  useEffect(() => {
    carregar();
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("nova") === "1") setMostrarForm(true);
  }, [carregar]);

  const atualizar = <K extends keyof Formulario>(chave: K, valor: Formulario[K]) => setForm((anterior) => ({ ...anterior, [chave]: valor }));
  const abrirNova = () => { setForm(FORM_INICIAL); setEtapa(1); setMensagem(""); setMostrarForm(true); };
  const fechar = () => { setMostrarForm(false); setEtapa(1); setMensagem(""); };
  const podeAvancar = etapa === 1 ? Boolean(form.origin) : etapa === 2 ? Boolean(form.prospectName.trim() && form.serviceType.trim()) : true;

  const salvar = async () => {
    if (!form.prospectName.trim() || !form.serviceType.trim()) { setMensagem("Informe o cliente e o tipo de serviço."); setEtapa(2); return; }
    setSalvando(true); setMensagem("");
    try {
      const resposta = await fetch("/api/oportunidades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível salvar a demanda");
      fechar();
      setForm(FORM_INICIAL);
      await carregar();
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : "Não foi possível salvar a demanda");
    } finally { setSalvando(false); }
  };

  const mover = async (oportunidade: Oportunidade, stage: string) => {
    setProcessandoId(oportunidade.id); setErro("");
    try {
      const resposta = await fetch("/api/oportunidades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: oportunidade.id, stage }) });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Falha ao atualizar a demanda");
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao atualizar a demanda"); }
    finally { setProcessandoId(""); }
  };

  const arquivar = async (oportunidade: Oportunidade) => {
    if (!window.confirm(`Arquivar a demanda de ${oportunidade.prospectName}? O histórico e o dossiê serão preservados.`)) return;
    setProcessandoId(oportunidade.id); setErro("");
    try {
      const resposta = await fetch("/api/oportunidades", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: oportunidade.id, action: "archive" }) });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Falha ao arquivar demanda");
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao arquivar demanda"); }
    finally { setProcessandoId(""); }
  };

  const restaurar = async (oportunidade: Oportunidade) => {
    setProcessandoId(oportunidade.id); setErro("");
    try {
      const resposta = await fetch("/api/oportunidades", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: oportunidade.id, action: "restore", restoreStage: "lead" }) });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Falha ao restaurar demanda");
      await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : "Falha ao restaurar demanda"); }
    finally { setProcessandoId(""); }
  };

  const prepararAnalise = async (oportunidade: Oportunidade) => {
    setProcessandoId(oportunidade.id); setErro("");
    try {
      const resposta = await fetch("/api/oportunidades/converter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: oportunidade.id }) });
      const json = await resposta.json();
      if (!resposta.ok) throw new Error(json.error || "Não foi possível criar o dossiê");
      window.location.assign(json.url || "/dashboard/proposta-edital");
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível criar o dossiê"); setProcessandoId(""); }
  };

  const oportunidades = dados.oportunidades;
  const abertas = oportunidades.filter((item) => !["ganho", "perdido", "arquivado"].includes(item.stage));
  const emProposta = oportunidades.filter((item) => ["proposta", "negociacao"].includes(item.stage));
  const aprovadas = oportunidades.filter((item) => item.stage === "ganho");
  const origemSelecionada = ORIGENS.find((origem) => origem.key === form.origin);
  const resumo = useMemo(() => [
    { label: "Em aberto", valor: abertas.length, detalhe: brl(dados.valorEmAberto), cor: "#334532" },
    { label: "Em proposta", valor: emProposta.length, detalhe: "preparação ou negociação", cor: "#ad650e" },
    { label: "Aprovadas", valor: aprovadas.length, detalhe: "prontas para contrato", cor: "#2f702e" },
  ], [abertas.length, aprovadas.length, dados.valorEmAberto, emProposta.length]);

  return (
    <div style={{ maxWidth: 1500, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div><p style={{ color: "#e05008", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>Entrada do fluxo comercial</p><h1 style={{ color: "#263827", fontSize: 25, margin: 0 }}>Demandas</h1><p style={{ color: "#6f7972", fontSize: 12, marginTop: 5 }}>Demanda → análise → preço → proposta → contrato, sem redigitação.</p></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setMostrarArquivadas((valor) => !valor)} style={{ border: "1px solid #dfe5df", borderRadius: 9, padding: "9px 12px", background: mostrarArquivadas ? "#fff4ef" : "#fff", color: mostrarArquivadas ? "#9b3414" : "#334532", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>{mostrarArquivadas ? "Voltar às ativas" : "Ver arquivadas"}</button>
          <Link href="/dashboard/proposta-edital" style={{ textDecoration: "none", color: "#334532", background: "#fff", border: "1px solid #dfe5df", borderRadius: 9, padding: "9px 13px", fontSize: 11, fontWeight: 800 }}>Dossiês operacionais</Link>
          {!mostrarArquivadas && <button type="button" onClick={abrirNova} style={{ border: 0, borderRadius: 9, padding: "9px 14px", background: "#334532", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 850 }}>+ Nova demanda</button>}
        </div>
      </header>

      {erro && <div role="alert" style={{ background: "#fff4ef", color: "#9f350e", border: "1px solid #f0c4b3", borderRadius: 10, padding: "10px 12px", marginBottom: 13, fontSize: 11 }}>{erro}</div>}

      {!mostrarArquivadas && <section style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 9, marginBottom: 15 }}>{resumo.map((item) => <div key={item.label} style={{ ...card, padding: 13, borderTop: `3px solid ${item.cor}` }}><span style={{ color: "#7a847d", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{item.label}</span><strong style={{ display: "block", color: item.cor, fontSize: 20, marginTop: 3 }}>{item.valor}</strong><span style={{ display: "block", color: "#8a948d", fontSize: 9, marginTop: 2 }}>{item.detalhe}</span></div>)}</section>}

      {mostrarForm && !mostrarArquivadas && (
        <section style={{ ...card, padding: 0, overflow: "hidden", marginBottom: 17, boxShadow: "0 12px 34px rgba(38,56,39,.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #e7ebe7", background: "#fbfcfb" }}><div><strong style={{ color: "#263827", fontSize: 14 }}>Nova demanda</strong><span style={{ display: "block", color: "#7d8780", fontSize: 10, marginTop: 2 }}>Etapa {etapa} de 3</span></div><button type="button" onClick={fechar} style={{ width: 31, height: 31, border: "1px solid #dfe5df", background: "#fff", color: "#657068", borderRadius: 8, cursor: "pointer" }}>×</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", background: "#f6f8f6", borderBottom: "1px solid #e7ebe7" }}>{["Origem", "Serviço", "Próxima ação"].map((rotulo, indice) => { const numero = indice + 1; return <div key={rotulo} style={{ padding: "9px 12px", textAlign: "center", color: etapa >= numero ? "#334532" : "#929b95", borderBottom: etapa === numero ? "3px solid #e05008" : "3px solid transparent", fontSize: 10, fontWeight: 850 }}>{etapa > numero ? "✓" : numero} · {rotulo}</div>; })}</div>
          <div style={{ padding: 17 }}>
            {etapa === 1 && <div><h2 style={{ color: "#263827", fontSize: 16, margin: 0 }}>Como esta demanda chegou?</h2><p style={{ color: "#7a847d", fontSize: 11, marginTop: 4, marginBottom: 13 }}>A origem organiza o atendimento e o próximo fluxo.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 9 }}>{ORIGENS.map((origem) => { const selecionada = form.origin === origem.key; return <button key={origem.key} type="button" onClick={() => atualizar("origin", origem.key)} style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr)", gap: 10, textAlign: "left", padding: 12, border: `2px solid ${selecionada ? "#4a9410" : "#e4e9e5"}`, borderRadius: 11, background: selecionada ? "#f3faef" : "#fff", cursor: "pointer" }}><span style={{ width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 9, background: selecionada ? "#e1f1d9" : "#f2f4f2", fontSize: 16 }}>{origem.icon}</span><span><strong style={{ display: "block", color: "#263827", fontSize: 12 }}>{origem.label}</strong><span style={{ display: "block", color: "#7c867f", fontSize: 10, lineHeight: 1.35, marginTop: 3 }}>{origem.descricao}</span></span></button>; })}</div></div>}
            {etapa === 2 && <div><h2 style={{ color: "#263827", fontSize: 16, margin: 0 }}>Identifique cliente e serviço</h2><p style={{ color: "#7a847d", fontSize: 11, marginTop: 4, marginBottom: 13 }}>{origemSelecionada?.label || "Demanda"} · registre apenas o necessário para começar.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}><Campo label="Cliente ou empresa *"><input autoFocus value={form.prospectName} onChange={(e) => atualizar("prospectName", e.target.value)} style={campo} /></Campo><Campo label="Tipo de serviço *"><input value={form.serviceType} onChange={(e) => atualizar("serviceType", e.target.value)} placeholder="Roçada, capina, limpeza..." style={campo} /></Campo><Campo label="Pessoa de contato"><input value={form.contactName} onChange={(e) => atualizar("contactName", e.target.value)} style={campo} /></Campo><Campo label="Valor estimado" dica="A formação de preço validará o valor"><input type="number" min="0" step="0.01" value={form.estimatedValue} onChange={(e) => atualizar("estimatedValue", e.target.value)} style={campo} /></Campo><Campo label="Telefone"><input value={form.phone} onChange={(e) => atualizar("phone", e.target.value)} style={campo} /></Campo><Campo label="E-mail"><input type="email" value={form.email} onChange={(e) => atualizar("email", e.target.value)} style={campo} /></Campo></div></div>}
            {etapa === 3 && <div><h2 style={{ color: "#263827", fontSize: 16, margin: 0 }}>Defina a próxima ação</h2><p style={{ color: "#7a847d", fontSize: 11, marginTop: 4, marginBottom: 13 }}>A demanda deve terminar com uma providência objetiva.</p><div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 180px", gap: 12, marginBottom: 12 }}><Campo label="Próxima ação"><input value={form.nextAction} onChange={(e) => atualizar("nextAction", e.target.value)} placeholder="Agendar visita, medir área..." style={campo} /></Campo><Campo label="Prazo"><input type="date" value={form.nextActionDate} onChange={(e) => atualizar("nextActionDate", e.target.value)} style={campo} /></Campo></div><Campo label="Observações"><textarea value={form.notes} onChange={(e) => atualizar("notes", e.target.value)} rows={4} style={{ ...campo, resize: "vertical" }} /></Campo></div>}
            {mensagem && <div role="alert" style={{ marginTop: 12, color: "#a43b12", background: "#fff4ef", border: "1px solid #f0c4b3", borderRadius: 9, padding: "9px 11px", fontSize: 10 }}>{mensagem}</div>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderTop: "1px solid #e7ebe7", background: "#fbfcfb" }}><button type="button" onClick={() => etapa === 1 ? fechar() : setEtapa((valor) => valor - 1)} style={{ border: "1px solid #d9dfda", borderRadius: 8, padding: "8px 13px", background: "#fff", color: "#526056", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>{etapa === 1 ? "Cancelar" : "← Voltar"}</button>{etapa < 3 ? <button type="button" disabled={!podeAvancar} onClick={() => setEtapa((valor) => valor + 1)} style={{ border: 0, borderRadius: 8, padding: "8px 14px", background: "#334532", color: "#fff", cursor: podeAvancar ? "pointer" : "not-allowed", opacity: podeAvancar ? 1 : .45, fontSize: 10, fontWeight: 850 }}>Continuar →</button> : <button type="button" disabled={salvando} onClick={salvar} style={{ border: 0, borderRadius: 8, padding: "8px 14px", background: "#4a9410", color: "#fff", cursor: salvando ? "wait" : "pointer", opacity: salvando ? .65 : 1, fontSize: 10, fontWeight: 850 }}>{salvando ? "Salvando..." : "Registrar demanda"}</button>}</div>
        </section>
      )}

      {carregando ? <div style={{ ...card, padding: 18, color: "#4a9410", fontSize: 12 }}>Carregando fluxo comercial...</div> : mostrarArquivadas ? (
        <section style={{ display: "grid", gap: 8 }}>{oportunidades.map((oportunidade) => <article key={oportunidade.id} style={{ ...card, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, padding: 13 }}><div><strong style={{ color: "#263827", fontSize: 12 }}>{oportunidade.prospectName}</strong><span style={{ display: "block", color: "#707b73", fontSize: 10, marginTop: 3 }}>{oportunidade.serviceType || "Serviço não informado"}{oportunidade.dossier ? ` · ${oportunidade.dossier.code}` : ""}</span></div><button type="button" disabled={processandoId === oportunidade.id} onClick={() => restaurar(oportunidade)} style={{ border: "1px solid #d8e7d2", borderRadius: 8, padding: "7px 10px", background: "#f4faf1", color: "#3f6f2d", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>Restaurar</button></article>)}{!oportunidades.length && <div style={{ ...card, padding: 18, color: "#7a847d", fontSize: 11 }}>Nenhuma demanda arquivada.</div>}</section>
      ) : (
        <section style={{ overflowX: "auto", paddingBottom: 5 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(220px,1fr))", gap: 10, minWidth: 1380 }}>{ESTAGIOS.map((estagio) => { const itens = oportunidades.filter((oportunidade) => oportunidade.stage === estagio.key); const soma = itens.reduce((total, oportunidade) => total + Number(oportunidade.estimatedValue || 0), 0); return <div key={estagio.key} style={{ background: "#f5f7f5", border: "1px solid #e5e9e5", borderTop: `3px solid ${estagio.cor}`, borderRadius: 12, padding: 9, minHeight: 230 }}><div style={{ padding: "2px 2px 9px" }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong style={{ color: estagio.cor, fontSize: 12 }}>{estagio.label}</strong><span style={{ background: "#fff", color: estagio.cor, borderRadius: 99, padding: "2px 7px", fontSize: 9, fontWeight: 850 }}>{itens.length}</span></div><span style={{ display: "block", color: "#8a948d", fontSize: 9, marginTop: 3 }}>{estagio.descricao}</span><span style={{ display: "block", color: "#657068", fontSize: 10, fontWeight: 750, marginTop: 5 }}>{soma ? brl(soma) : "Sem valor informado"}</span></div><div style={{ display: "grid", gap: 8 }}>{itens.map((oportunidade) => <article key={oportunidade.id} style={{ ...card, padding: 11, boxShadow: "0 2px 7px rgba(30,45,33,.045)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><strong style={{ color: "#263827", fontSize: 12, lineHeight: 1.3 }}>{oportunidade.prospectName}</strong><button type="button" title="Arquivar" disabled={processandoId === oportunidade.id} onClick={() => arquivar(oportunidade)} style={{ border: 0, background: "transparent", color: "#9ba49e", cursor: "pointer", fontSize: 12 }}>□</button></div>{oportunidade.serviceType && <span style={{ display: "block", color: "#68736b", fontSize: 10, marginTop: 4 }}>{oportunidade.serviceType}</span>}{oportunidade.estimatedValue && <strong style={{ display: "block", color: "#334532", fontSize: 11, marginTop: 5 }}>{brl(oportunidade.estimatedValue)}</strong>}{oportunidade.nextAction && <div style={{ marginTop: 8, padding: "7px 8px", borderRadius: 8, background: "#fff9e9", color: "#805b0d", fontSize: 9 }}><strong>Próxima:</strong> {oportunidade.nextAction}{oportunidade.nextActionDate ? ` · ${new Date(oportunidade.nextActionDate).toLocaleDateString("pt-BR")}` : ""}</div>}{oportunidade.dossier ? <Link href="/dashboard/proposta-edital" style={{ display: "block", marginTop: 8, padding: "6px 8px", borderRadius: 8, background: "#edf5fb", color: "#27547d", textDecoration: "none", fontSize: 9, fontWeight: 800 }}>Abrir {oportunidade.dossier.code} · {oportunidade.dossier.validationStatus}</Link> : <button type="button" disabled={processandoId === oportunidade.id} onClick={() => prepararAnalise(oportunidade)} style={{ width: "100%", marginTop: 8, border: "1px solid #d8e7d2", borderRadius: 8, padding: "6px 8px", background: "#f4faf1", color: "#3f6f2d", cursor: processandoId === oportunidade.id ? "wait" : "pointer", fontSize: 9, fontWeight: 800 }}>{processandoId === oportunidade.id ? "Processando..." : "Preparar análise e preço"}</button>}<select value={oportunidade.stage} disabled={processandoId === oportunidade.id} onChange={(e) => mover(oportunidade, e.target.value)} style={{ ...campo, marginTop: 8, padding: "6px 7px", fontSize: 9 }}>{ESTAGIOS.map((opcao) => <option key={opcao.key} value={opcao.key}>{opcao.label}</option>)}</select></article>)}{!itens.length && <div style={{ padding: 13, border: "1px dashed #d8ddd8", borderRadius: 9, color: "#9aa39d", textAlign: "center", fontSize: 9 }}>Nenhuma demanda nesta etapa</div>}</div></div>; })}</div></section>
      )}
    </div>
  );
}
