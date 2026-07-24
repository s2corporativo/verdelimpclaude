"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Frequencia = "diaria" | "semanal" | "mensal";
type Prioridade = "normal" | "alta" | "critica";

type Rotina = {
  id: string;
  templateId: string;
  titulo: string;
  descricao: string;
  frequencia: Frequencia;
  categoria: string;
  horario?: string;
  responsavel?: string;
  prioridade?: Prioridade;
  link?: string;
  concluida: boolean;
  referenceDate: string;
  personalizada?: boolean;
};

type FormRotina = {
  id?: string;
  titulo: string;
  descricao: string;
  frequencia: Frequencia;
  categoria: string;
  horario: string;
  responsavel: string;
  prioridade: Prioridade;
  link: string;
};

const FORM_INICIAL: FormRotina = {
  titulo: "",
  descricao: "",
  frequencia: "diaria",
  categoria: "Organização",
  horario: "",
  responsavel: "Assistente",
  prioridade: "normal",
  link: "",
};

const PERIODOS: { key: Frequencia; label: string; descricao: string }[] = [
  { key: "diaria", label: "Hoje", descricao: "atividades do dia" },
  { key: "semanal", label: "Semana", descricao: "diárias e semanais" },
  { key: "mensal", label: "Mês", descricao: "todas as obrigações" },
];

const CORES: Record<string, string> = {
  Comunicação: "#27547d",
  Organização: "#67508c",
  Financeiro: "#2f702e",
  Documentos: "#a46a0b",
  Fiscal: "#ad450f",
  Contratos: "#187080",
  Comercial: "#4d57a6",
  Operacional: "#8a6a0b",
  Estoque: "#5c7f25",
  RH: "#a83d61",
  SST: "#28796c",
  SADA: "#9b3414",
};

const caixa: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4e9e5",
  borderRadius: 14,
};

const campo: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d9dfda",
  borderRadius: 9,
  padding: "9px 10px",
  background: "#fff",
  color: "#263827",
  fontSize: 11,
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", color: "#4b574e", fontSize: 10, fontWeight: 800, marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

export default function RotinasPage() {
  const [periodo, setPeriodo] = useState<Frequencia>("diaria");
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [resumo, setResumo] = useState({ total: 0, concluidas: 0, pendentes: 0, porCategoria: {} as Record<string, number> });
  const [contatos, setContatos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [dataAtual, setDataAtual] = useState("");
  const [podeConfigurar, setPodeConfigurar] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<FormRotina>(FORM_INICIAL);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/rotinas?periodo=${periodo}`);
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Falha ao carregar rotinas");
      setRotinas(dados.rotinas || []);
      setResumo(dados.resumo || { total: 0, concluidas: 0, pendentes: 0, porCategoria: {} });
      setContatos(dados.contatos || []);
      setDataAtual(dados.data || "");
      setPodeConfigurar(Boolean(dados.podeConfigurar));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar rotinas");
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => { carregar(); }, [carregar]);

  const alternar = async (rotina: Rotina) => {
    setErro("");
    const concluida = !rotina.concluida;
    setRotinas((atuais) => atuais.map((item) => item.id === rotina.id ? { ...item, concluida } : item));
    try {
      const resposta = await fetch("/api/rotinas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rotina.id, referenceDate: rotina.referenceDate, concluida, action: "toggle" }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Falha ao atualizar rotina");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao atualizar rotina");
      await carregar();
    }
  };

  const abrirNova = () => {
    setForm(FORM_INICIAL);
    setMostrarForm(true);
  };

  const editar = (rotina: Rotina) => {
    setForm({
      id: rotina.id,
      titulo: rotina.titulo,
      descricao: rotina.descricao,
      frequencia: rotina.frequencia,
      categoria: rotina.categoria,
      horario: rotina.horario || "",
      responsavel: rotina.responsavel || "",
      prioridade: rotina.prioridade || "normal",
      link: rotina.link || "",
    });
    setMostrarForm(true);
  };

  const salvar = async () => {
    if (!form.titulo.trim() || !form.descricao.trim()) {
      setErro("Informe o título e a descrição da obrigação.");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/rotinas", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, action: form.id ? "update" : "create" }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível salvar a obrigação");
      setMostrarForm(false);
      setForm(FORM_INICIAL);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar a obrigação");
    } finally {
      setSalvando(false);
    }
  };

  const arquivar = async (rotina: Rotina) => {
    if (!window.confirm(`Desativar a obrigação “${rotina.titulo}”? O histórico de conclusões será preservado.`)) return;
    setErro("");
    try {
      const resposta = await fetch(`/api/rotinas?id=${encodeURIComponent(rotina.id)}`, { method: "DELETE" });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Falha ao desativar obrigação");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao desativar obrigação");
    }
  };

  const categorias = useMemo(() => [...new Set(rotinas.map((rotina) => rotina.categoria))], [rotinas]);
  const filtradas = filtro ? rotinas.filter((rotina) => rotina.categoria === filtro) : rotinas;
  const progresso = resumo.total ? Math.round((resumo.concluidas / resumo.total) * 100) : 0;

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <p style={{ color: "#e05008", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>Administração operacional</p>
          <h1 style={{ color: "#263827", fontSize: 24, margin: 0 }}>Rotinas e obrigações</h1>
          <p style={{ color: "#6f7972", fontSize: 11, marginTop: 5 }}>{dataAtual || "—"} · conclusões persistidas e auditáveis</p>
        </div>
        {podeConfigurar && <button type="button" onClick={abrirNova} style={{ border: 0, borderRadius: 9, padding: "9px 14px", background: "#334532", color: "#fff", fontSize: 11, fontWeight: 850, cursor: "pointer" }}>+ Nova obrigação</button>}
      </header>

      {erro && <div role="alert" style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid #f0c4b3", background: "#fff5f0", color: "#9d350e", fontSize: 11 }}>{erro}</div>}

      {mostrarForm && (
        <section style={{ ...caixa, padding: 16, marginBottom: 15, boxShadow: "0 10px 28px rgba(38,56,39,.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <div><strong style={{ color: "#263827", fontSize: 14 }}>{form.id ? "Editar obrigação" : "Nova obrigação"}</strong><span style={{ display: "block", color: "#838d86", fontSize: 9, marginTop: 2 }}>A alteração passa a valer imediatamente e fica registrada na auditoria.</span></div>
            <button type="button" onClick={() => setMostrarForm(false)} style={{ width: 30, height: 30, border: "1px solid #dfe4df", borderRadius: 8, background: "#fff", cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 11 }}>
            <Campo label="Título *"><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} style={campo} /></Campo>
            <Campo label="Categoria"><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={campo} /></Campo>
            <Campo label="Frequência"><select value={form.frequencia} onChange={(e) => setForm({ ...form, frequencia: e.target.value as Frequencia })} style={campo}><option value="diaria">Diária</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option></select></Campo>
            <Campo label="Prioridade"><select value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value as Prioridade })} style={campo}><option value="normal">Normal</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></Campo>
            <Campo label="Horário ou referência"><input value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="Ex.: 08:00, Dia 05, 5º dia útil" style={campo} /></Campo>
            <Campo label="Responsável"><input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} style={campo} /></Campo>
            <Campo label="Link interno"><input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/dashboard/..." style={campo} /></Campo>
            <Campo label="Descrição *"><textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} style={{ ...campo, resize: "vertical" }} /></Campo>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => setMostrarForm(false)} style={{ border: "1px solid #d9dfda", borderRadius: 8, padding: "8px 12px", background: "#fff", color: "#556159", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando} style={{ border: 0, borderRadius: 8, padding: "8px 13px", background: "#4a9410", color: "#fff", cursor: salvando ? "wait" : "pointer", opacity: salvando ? .65 : 1, fontSize: 10, fontWeight: 850 }}>{salvando ? "Salvando..." : "Salvar obrigação"}</button>
          </div>
        </section>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 9, marginBottom: 13 }}>
        {[
          ["Total", resumo.total, "#334532"],
          ["Concluídas", resumo.concluidas, "#2f702e"],
          ["Pendentes", resumo.pendentes, resumo.pendentes ? "#ad450f" : "#2f702e"],
          ["Progresso", `${progresso}%`, progresso === 100 ? "#2f702e" : "#27547d"],
        ].map(([rotulo, valor, cor]) => <div key={String(rotulo)} style={{ ...caixa, padding: 12, borderTop: `3px solid ${cor}` }}><span style={{ display: "block", color: "#7a847d", fontSize: 9, fontWeight: 800, textTransform: "uppercase" }}>{rotulo}</span><strong style={{ display: "block", color: String(cor), fontSize: 20, marginTop: 3 }}>{valor}</strong></div>)}
      </section>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
        {PERIODOS.map((item) => <button key={item.key} type="button" onClick={() => { setPeriodo(item.key); setFiltro(null); }} style={{ border: `1px solid ${periodo === item.key ? "#334532" : "#dfe4df"}`, borderRadius: 9, padding: "7px 11px", background: periodo === item.key ? "#334532" : "#fff", color: periodo === item.key ? "#fff" : "#526056", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>{item.label} <span style={{ opacity: .7 }}>· {item.descricao}</span></button>)}
      </div>

      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 5, marginBottom: 8 }}>
        <button type="button" onClick={() => setFiltro(null)} style={{ flex: "0 0 auto", border: "1px solid #dfe4df", borderRadius: 99, padding: "5px 9px", background: !filtro ? "#eaf5e4" : "#fff", color: "#334532", cursor: "pointer", fontSize: 9, fontWeight: 800 }}>Todas ({resumo.total})</button>
        {categorias.map((categoria) => <button key={categoria} type="button" onClick={() => setFiltro(filtro === categoria ? null : categoria)} style={{ flex: "0 0 auto", border: "1px solid #dfe4df", borderRadius: 99, padding: "5px 9px", background: filtro === categoria ? CORES[categoria] || "#334532" : "#fff", color: filtro === categoria ? "#fff" : "#556159", cursor: "pointer", fontSize: 9, fontWeight: 800 }}>{categoria} ({resumo.porCategoria[categoria] || 0})</button>)}
      </div>

      {carregando ? <div style={{ ...caixa, padding: 18, color: "#4a9410", fontSize: 11 }}>Carregando obrigações...</div> : (
        <section style={{ display: "grid", gap: 7 }}>
          {filtradas.map((rotina) => {
            const cor = rotina.prioridade === "critica" ? "#b9380a" : rotina.prioridade === "alta" ? "#b27a0d" : CORES[rotina.categoria] || "#718078";
            return (
              <article key={`${rotina.id}-${rotina.referenceDate}`} onClick={() => alternar(rotina)} style={{ ...caixa, display: "grid", gridTemplateColumns: "30px minmax(0,1fr) auto", gap: 10, alignItems: "start", padding: "10px 12px", borderLeft: `4px solid ${rotina.concluida ? "#2f702e" : cor}`, background: rotina.concluida ? "#f4faf1" : "#fff", cursor: "pointer" }}>
                <span aria-hidden="true" style={{ width: 27, height: 27, display: "grid", placeItems: "center", borderRadius: 8, border: `2px solid ${rotina.concluida ? "#2f702e" : "#d5dcd6"}`, background: rotina.concluida ? "#2f702e" : "#fff", color: "#fff", fontSize: 12, fontWeight: 900 }}>{rotina.concluida ? "✓" : ""}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <strong style={{ color: rotina.concluida ? "#79837c" : "#263827", fontSize: 12, textDecoration: rotina.concluida ? "line-through" : "none" }}>{rotina.titulo}</strong>
                    <span style={{ borderRadius: 99, padding: "2px 6px", background: `${cor}16`, color: cor, fontSize: 8, fontWeight: 850, textTransform: "uppercase" }}>{rotina.prioridade || "normal"}</span>
                    {rotina.horario && <span style={{ color: "#77827a", fontSize: 9 }}>{rotina.horario}</span>}
                  </div>
                  <p style={{ color: "#717c74", fontSize: 10, lineHeight: 1.4, marginTop: 3 }}>{rotina.descricao}</p>
                  <span style={{ display: "inline-block", color: "#929b95", fontSize: 8, fontWeight: 800, textTransform: "uppercase", marginTop: 4 }}>{rotina.categoria}{rotina.responsavel ? ` · ${rotina.responsavel}` : ""} · referência {rotina.referenceDate}</span>
                </div>
                <div style={{ display: "flex", gap: 5 }} onClick={(e) => e.stopPropagation()}>
                  {rotina.link && <Link href={rotina.link} style={{ border: "1px solid #dfe4df", borderRadius: 7, padding: "5px 7px", background: "#fff", color: "#3f6f2d", textDecoration: "none", fontSize: 9, fontWeight: 800 }}>Abrir</Link>}
                  {podeConfigurar && <button type="button" onClick={() => editar(rotina)} style={{ border: "1px solid #dfe4df", borderRadius: 7, padding: "5px 7px", background: "#fff", color: "#556159", cursor: "pointer", fontSize: 9, fontWeight: 800 }}>Editar</button>}
                  {podeConfigurar && <button type="button" onClick={() => arquivar(rotina)} style={{ border: "1px solid #f1d2c6", borderRadius: 7, padding: "5px 7px", background: "#fff8f5", color: "#a23b12", cursor: "pointer", fontSize: 9, fontWeight: 800 }}>Desativar</button>}
                </div>
              </article>
            );
          })}
          {!filtradas.length && <div style={{ ...caixa, padding: 18, color: "#7a847d", fontSize: 11 }}>Nenhuma obrigação encontrada para este período.</div>}
        </section>
      )}

      {contatos.length > 0 && <section style={{ ...caixa, padding: 15, marginTop: 18 }}><h2 style={{ color: "#263827", fontSize: 14, margin: 0 }}>Contatos operacionais</h2><p style={{ color: "#7a847d", fontSize: 9, marginTop: 3, marginBottom: 10 }}>Terceiros utilizados nas rotinas administrativas.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8 }}>{contatos.map((contato, indice) => <div key={`${contato.nome}-${indice}`} style={{ padding: 10, border: "1px solid #e7ebe7", borderRadius: 9, background: "#fafbfa" }}><strong style={{ display: "block", color: "#263827", fontSize: 11 }}>{contato.nome}</strong><span style={{ display: "block", color: "#747f77", fontSize: 9, marginTop: 2 }}>{contato.empresa} · {contato.funcao}</span><span style={{ display: "block", color: "#27547d", fontSize: 10, marginTop: 4, fontWeight: 750 }}>{contato.telefone}</span></div>)}</div></section>}
    </div>
  );
}
