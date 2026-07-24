"use client";

import { DemoBadge } from "@/components/ui";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Alerta = {
  categoria: string;
  titulo: string;
  detalhe: string;
  vence: string | null;
  nivel: "critico" | "atencao" | "info";
  link: string;
};

type Rotina = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  horario?: string;
};

type Painel = {
  dashboard: Record<string, any>;
  fiscal: Record<string, any>;
  erp: Record<string, any>;
  alertas: Alerta[];
  resumoAlertas: { total: number; criticos: number; atencao: number };
  rotinas: Rotina[];
  carregando: boolean;
  erro: string;
};

const caixa: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4e9e5",
  borderRadius: 14,
  padding: 16,
};

function moeda(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function numero(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return "—";
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido.toLocaleString("pt-BR") : "—";
}

function dataCurta(valor: string | null) {
  if (!valor) return "Sem data";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "Sem data" : data.toLocaleDateString("pt-BR");
}

function Indicador({ titulo, valor, detalhe, href, destaque = "verde", icon }: { titulo: string; valor: string; detalhe: string; href: string; destaque?: "verde" | "laranja" | "vermelho" | "azul"; icon: string }) {
  const estilos = {
    verde: { cor: "#334532", fundo: "#eaf5e4" },
    laranja: { cor: "#ad450f", fundo: "#fff1e8" },
    vermelho: { cor: "#ad2f0b", fundo: "#fff0eb" },
    azul: { cor: "#27547d", fundo: "#edf5fb" },
  }[destaque];

  return (
    <Link href={href} style={{ ...caixa, padding: 13, display: "grid", gridTemplateColumns: "36px minmax(0,1fr)", gap: 10, alignItems: "center", textDecoration: "none", color: "inherit" }}>
      <span aria-hidden="true" style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 10, background: estilos.fundo, color: estilos.cor, fontWeight: 900 }}>{icon}</span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", color: "#7a847d", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>{titulo}</span>
        <strong style={{ display: "block", color: estilos.cor, fontSize: 19, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis" }}>{valor}</strong>
        <span style={{ display: "block", color: "#8b958e", fontSize: 9, marginTop: 2 }}>{detalhe}</span>
      </span>
    </Link>
  );
}

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export default function DashboardPage() {
  const [painel, setPainel] = useState<Painel>({
    dashboard: {},
    fiscal: {},
    erp: {},
    alertas: [],
    resumoAlertas: { total: 0, criticos: 0, atencao: 0 },
    rotinas: [],
    carregando: true,
    erro: "",
  });

  useEffect(() => {
    let ativo = true;

    async function carregarJson(url: string) {
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error(`${url}: ${resposta.status}`);
      return resposta.json();
    }

    async function carregar() {
      const resultados = await Promise.allSettled([
        carregarJson("/api/dashboard"),
        carregarJson("/api/fiscal/dashboard"),
        carregarJson("/api/dashboard/erp-completo"),
        carregarJson("/api/alertas-central"),
        carregarJson("/api/rotinas?periodo=diaria"),
      ]);

      if (!ativo) return;

      const valor = (indice: number) => resultados[indice].status === "fulfilled" ? resultados[indice].value : {};
      const dashboard = valor(0);
      const fiscal = valor(1);
      const erp = valor(2);
      const alertasResposta = valor(3);
      const rotinasResposta = valor(4);
      const falharam = resultados.filter((resultado) => resultado.status === "rejected").length;

      setPainel({
        dashboard,
        fiscal,
        erp,
        alertas: alertasResposta.alertas || [],
        resumoAlertas: alertasResposta.resumo || { total: 0, criticos: 0, atencao: 0 },
        rotinas: rotinasResposta.rotinas || [],
        carregando: false,
        erro: falharam === resultados.length
          ? "Não foi possível carregar o painel. Verifique a conexão e tente novamente."
          : falharam > 0
            ? "Parte das informações está temporariamente indisponível. Os dados exibidos são os que puderam ser confirmados."
            : "",
      });
    }

    carregar();
    return () => { ativo = false; };
  }, []);

  const prioridades = useMemo(
    () => [...painel.alertas].sort((a, b) => {
      const peso = { critico: 0, atencao: 1, info: 2 };
      return peso[a.nivel] - peso[b.nivel];
    }).slice(0, 7),
    [painel.alertas],
  );

  const demo = Boolean(painel.dashboard._demo || painel.fiscal._demo || painel.erp._demo);
  const operacoes = painel.erp.operations || {};
  const financeiro = painel.erp.finance || {};
  const contratos = painel.erp.contracts || {};
  const contasVencidas = financeiro.overduePayable || {};

  return (
    <div style={{ maxWidth: 1380, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <p style={{ color: "#e05008", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".09em", marginBottom: 5 }}>Visão diária</p>
          <h1 style={{ color: "#263827", fontSize: 26, margin: 0 }}>{saudacao()}. O que precisa de atenção?</h1>
          <p style={{ color: "#6e7971", fontSize: 12, marginTop: 5 }}>
            Prioridades, execução e situação financeira em uma única tela.
            <DemoBadge mostrar={demo} />
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard/atividades" style={{ textDecoration: "none", color: "#334532", background: "#fff", border: "1px solid #dfe5df", borderRadius: 9, padding: "9px 13px", fontSize: 11, fontWeight: 800 }}>Central de atividades</Link>
          <Link href="/dashboard/oportunidades?nova=1" style={{ textDecoration: "none", color: "#fff", background: "#334532", borderRadius: 9, padding: "9px 13px", fontSize: 11, fontWeight: 800 }}>+ Nova demanda</Link>
        </div>
      </header>

      {painel.erro && (
        <div role="alert" style={{ marginBottom: 14, padding: "10px 13px", borderRadius: 10, border: "1px solid #f1c8b8", background: "#fff7f3", color: "#9b390f", fontSize: 11 }}>
          {painel.erro}
        </div>
      )}

      {painel.carregando ? (
        <div style={{ ...caixa, color: "#4a9410", fontSize: 12 }}>Consolidando informações confirmadas do sistema...</div>
      ) : (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9, marginBottom: 15 }}>
            <Indicador
              titulo="Críticos"
              valor={numero(painel.resumoAlertas.criticos)}
              detalhe="exigem ação imediata"
              href="/dashboard/alertas"
              destaque={painel.resumoAlertas.criticos > 0 ? "vermelho" : "verde"}
              icon="!"
            />
            <Indicador titulo="Rotinas de hoje" valor={numero(painel.rotinas.length)} detalhe="atividades previstas" href="/dashboard/atividades" icon="✓" />
            <Indicador titulo="Contratos ativos" valor={numero(contratos.active ?? painel.dashboard.totalContratos)} detalhe={`${numero(contratos.due90)} vencendo em 90 dias`} href="/dashboard/contratos" destaque={Number(contratos.due90 || 0) > 0 ? "laranja" : "verde"} icon="▤" />
            <Indicador titulo="Em execução" valor={numero(operacoes.inProgress)} detalhe={`${numero(operacoes.blocked)} OS bloqueadas`} href="/dashboard/ordens-servico" destaque={Number(operacoes.blocked || 0) > 0 ? "vermelho" : "azul"} icon="▶" />
            <Indicador titulo="A receber" valor={moeda(financeiro.receivable?.total)} detalhe="contas registradas" href="/dashboard/contas-receber" destaque="azul" icon="$" />
            <Indicador titulo="Resultado do mês" valor={moeda(financeiro.monthProfit)} detalhe="receitas menos despesas" href="/dashboard/dre" destaque={Number(financeiro.monthProfit || 0) < 0 ? "vermelho" : "verde"} icon="↗" />
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.35fr) minmax(320px,.65fr)", gap: 14, marginBottom: 14 }}>
            <div style={caixa}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div>
                  <h2 style={{ color: "#263827", fontSize: 15, margin: 0 }}>Prioridades</h2>
                  <p style={{ color: "#7a847d", fontSize: 10, marginTop: 3 }}>Ordenadas por criticidade</p>
                </div>
                <Link href="/dashboard/alertas" style={{ color: "#3f6f2d", fontSize: 10, fontWeight: 800, textDecoration: "none" }}>Ver todas →</Link>
              </div>

              {prioridades.length ? (
                <div style={{ display: "grid", gap: 7 }}>
                  {prioridades.map((alerta, indice) => {
                    const critico = alerta.nivel === "critico";
                    return (
                      <Link key={`${alerta.titulo}-${indice}`} href={alerta.link} style={{ display: "grid", gridTemplateColumns: "8px minmax(0,1fr) auto", gap: 10, padding: "10px 11px", border: "1px solid #edf0ed", borderRadius: 10, textDecoration: "none", color: "inherit", background: critico ? "#fff8f5" : "#fffdf7" }}>
                        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, marginTop: 5, background: critico ? "#c2410c" : "#d49a18" }} />
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ display: "block", color: "#263827", fontSize: 12 }}>{alerta.titulo}</strong>
                          <span style={{ display: "block", color: "#707b73", fontSize: 10, lineHeight: 1.35, marginTop: 2 }}>{alerta.detalhe}</span>
                          <span style={{ display: "block", color: "#9aa39d", fontSize: 9, fontWeight: 800, textTransform: "uppercase", marginTop: 4 }}>{alerta.categoria}</span>
                        </span>
                        <span style={{ color: critico ? "#b9380a" : "#946b0c", fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{dataCurta(alerta.vence)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#758078", fontSize: 12 }}>Nenhuma prioridade pendente foi identificada.</p>
              )}
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={caixa}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
                  <h2 style={{ color: "#263827", fontSize: 15, margin: 0 }}>Hoje</h2>
                  <Link href="/dashboard/rotinas" style={{ color: "#3f6f2d", fontSize: 10, fontWeight: 800, textDecoration: "none" }}>Rotinas →</Link>
                </div>
                {painel.rotinas.length ? painel.rotinas.slice(0, 6).map((rotina) => (
                  <div key={rotina.id} style={{ display: "grid", gridTemplateColumns: "25px minmax(0,1fr) auto", gap: 8, alignItems: "start", padding: "8px 0", borderBottom: "1px solid #f0f2f0" }}>
                    <span aria-hidden="true" style={{ width: 23, height: 23, display: "grid", placeItems: "center", borderRadius: 7, background: "#eaf5e4", color: "#334532", fontSize: 10, fontWeight: 900 }}>✓</span>
                    <span style={{ color: "#344038", fontSize: 11, lineHeight: 1.3 }}>{rotina.titulo}</span>
                    <span style={{ color: "#8a948d", fontSize: 9, whiteSpace: "nowrap" }}>{rotina.horario || rotina.categoria}</span>
                  </div>
                )) : <p style={{ color: "#758078", fontSize: 12 }}>Nenhuma rotina diária encontrada.</p>}
              </div>

              <div style={{ ...caixa, background: "linear-gradient(145deg,#263827,#3f6f2d)", border: 0, color: "#fff" }}>
                <h2 style={{ fontSize: 15, margin: 0 }}>Próxima ação</h2>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,.7)", marginTop: 4, marginBottom: 12 }}>Comece pelo que gera receita ou evita risco.</p>
                {[
                  ["Registrar nova demanda", "/dashboard/oportunidades?nova=1"],
                  ["Validar dossiês", "/dashboard/proposta-edital"],
                  ["Revisar mobilizações", "/dashboard/mobilizacoes"],
                  ["Preparar faturamento", "/dashboard/nfse"],
                ].map(([rotulo, href]) => (
                  <Link key={href} href={href} style={{ display: "flex", justifyContent: "space-between", color: "#fff", textDecoration: "none", padding: "8px 9px", marginTop: 5, background: "rgba(255,255,255,.1)", borderRadius: 8, fontSize: 11, fontWeight: 750 }}>
                    <span>{rotulo}</span><span>→</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
            <div style={caixa}>
              <h2 style={{ color: "#263827", fontSize: 14, margin: 0 }}>Fluxo operacional</h2>
              <p style={{ color: "#7a847d", fontSize: 10, marginTop: 3, marginBottom: 11 }}>Da análise à execução</p>
              {[
                ["Dossiês aguardando validação", painel.dashboard.dossiesPendentes, "/dashboard/proposta-edital"],
                ["Mobilizações bloqueadas", painel.dashboard.mobilizacoesBloqueadas, "/dashboard/mobilizacoes"],
                ["Documentos para revisar", painel.dashboard.documentosAguardandoRevisao, "/dashboard/monitor-docs"],
                ["Alterações de escopo", painel.dashboard.alteracoesEscopoPendentes, "/dashboard/alteracoes-escopo"],
              ].map(([rotulo, valor, href]) => (
                <Link key={String(rotulo)} href={String(href)} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f2f0", color: "#465048", textDecoration: "none", fontSize: 11 }}>
                  <span>{rotulo}</span><strong style={{ color: Number(valor || 0) > 0 ? "#b84213" : "#334532" }}>{numero(valor)}</strong>
                </Link>
              ))}
            </div>

            <div style={caixa}>
              <h2 style={{ color: "#263827", fontSize: 14, margin: 0 }}>Financeiro do mês</h2>
              <p style={{ color: "#7a847d", fontSize: 10, marginTop: 3, marginBottom: 11 }}>Valores efetivamente registrados</p>
              {[
                ["Receitas", moeda(financeiro.monthRevenue), "#2f6f2e"],
                ["Despesas", moeda(financeiro.monthExpenses), "#a74a18"],
                ["Resultado", moeda(financeiro.monthProfit), Number(financeiro.monthProfit || 0) < 0 ? "#b12d0c" : "#2f6f2e"],
                ["Contas vencidas", moeda(contasVencidas.total), Number(contasVencidas.count || 0) > 0 ? "#b12d0c" : "#334532"],
              ].map(([rotulo, valor, cor]) => (
                <div key={String(rotulo)} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid #f0f2f0", fontSize: 11 }}>
                  <span style={{ color: "#657068" }}>{rotulo}</span><strong style={{ color: String(cor) }}>{valor}</strong>
                </div>
              ))}
              <Link href="/dashboard/dre" style={{ display: "inline-block", color: "#3f6f2d", fontSize: 10, fontWeight: 800, textDecoration: "none", marginTop: 11 }}>Abrir análise financeira →</Link>
            </div>

            <div style={caixa}>
              <h2 style={{ color: "#263827", fontSize: 14, margin: 0 }}>Acessos frequentes</h2>
              <p style={{ color: "#7a847d", fontSize: 10, marginTop: 3, marginBottom: 11 }}>Atalhos para a operação administrativa</p>
              {[
                ["Anexar documento", "/dashboard/documentos"],
                ["Registrar despesa", "/dashboard/financeiro-avancado"],
                ["Admitir funcionário", "/dashboard/rh-admissao"],
                ["Criar ordem de serviço", "/dashboard/ordens-servico"],
                ["Emitir ou registrar NFS-e", "/dashboard/nfse"],
              ].map(([rotulo, href]) => (
                <Link key={href} href={href} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f2f0", color: "#465048", textDecoration: "none", fontSize: 11 }}>
                  <span>{rotulo}</span><span style={{ color: "#4a9410" }}>→</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
