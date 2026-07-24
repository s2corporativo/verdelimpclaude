"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Rotina = {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  horario?: string;
  concluida?: boolean;
};

type Alerta = {
  categoria: string;
  titulo: string;
  detalhe: string;
  vence: string | null;
  nivel: "critico" | "atencao" | "info";
  link: string;
};

type Estado = {
  rotinas: Rotina[];
  alertas: Alerta[];
  carregando: boolean;
  erro: string;
};

const ATALHOS = [
  { label: "Nova demanda", descricao: "Registrar solicitação, edital ou renovação", href: "/dashboard/oportunidades?nova=1", icon: "＋" },
  { label: "Nova despesa", descricao: "Lançar custo e vincular ao centro de custo", href: "/dashboard/financeiro-avancado", icon: "$" },
  { label: "Novo funcionário", descricao: "Iniciar admissão e documentos obrigatórios", href: "/dashboard/rh-admissao", icon: "♙" },
  { label: "Ordem de serviço", descricao: "Planejar equipe, recursos e execução", href: "/dashboard/ordens-servico", icon: "▤" },
  { label: "Anexar documento", descricao: "Arquivar e relacionar documento no GED", href: "/dashboard/documentos", icon: "↥" },
  { label: "Registrar pagamento", descricao: "Dar baixa e anexar comprovante", href: "/dashboard/financeiro", icon: "✓" },
];

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4e9e5",
  borderRadius: 14,
  padding: 16,
};

function dataCurta(valor: string | null) {
  if (!valor) return "Sem data definida";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "Data não informada";
  return data.toLocaleDateString("pt-BR");
}

function ListaAlertas({ itens, vazio }: { itens: Alerta[]; vazio: string }) {
  if (!itens.length) {
    return <p style={{ color: "#7b857e", fontSize: 12, margin: 0 }}>{vazio}</p>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {itens.slice(0, 8).map((alerta, indice) => {
        const critico = alerta.nivel === "critico";
        return (
          <Link
            key={`${alerta.categoria}-${alerta.titulo}-${indice}`}
            href={alerta.link}
            style={{
              display: "grid",
              gridTemplateColumns: "8px minmax(0,1fr) auto",
              gap: 10,
              alignItems: "start",
              padding: "10px 11px",
              border: "1px solid #edf0ed",
              borderRadius: 10,
              color: "inherit",
              textDecoration: "none",
              background: critico ? "#fff8f6" : "#fffdf6",
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 8, height: 8, borderRadius: 99, marginTop: 5, background: critico ? "#c2410c" : "#d59b16" }}
            />
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: "block", color: "#263827", fontSize: 12 }}>{alerta.titulo}</strong>
              <span style={{ display: "block", color: "#68736b", fontSize: 11, marginTop: 3, lineHeight: 1.35 }}>{alerta.detalhe}</span>
              <span style={{ display: "block", color: "#929b95", fontSize: 9, marginTop: 5, textTransform: "uppercase", fontWeight: 800 }}>{alerta.categoria}</span>
            </span>
            <span style={{ color: critico ? "#b9380a" : "#946b0c", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>{dataCurta(alerta.vence)}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function CentralAtividadesPage() {
  const [estado, setEstado] = useState<Estado>({ rotinas: [], alertas: [], carregando: true, erro: "" });

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const resultados = await Promise.allSettled([
        fetch("/api/rotinas?periodo=diaria").then(async (resposta) => {
          if (!resposta.ok) throw new Error("Falha ao carregar rotinas");
          return resposta.json();
        }),
        fetch("/api/alertas-central").then(async (resposta) => {
          if (!resposta.ok) throw new Error("Falha ao carregar alertas");
          return resposta.json();
        }),
      ]);

      if (!ativo) return;

      const rotinas = resultados[0].status === "fulfilled" ? resultados[0].value.rotinas || [] : [];
      const alertas = resultados[1].status === "fulfilled" ? resultados[1].value.alertas || [] : [];
      const nenhumaFonte = resultados.every((resultado) => resultado.status === "rejected");

      setEstado({
        rotinas,
        alertas,
        carregando: false,
        erro: nenhumaFonte ? "Não foi possível carregar as atividades. Atualize a página ou tente novamente mais tarde." : "",
      });
    }

    carregar();
    return () => { ativo = false; };
  }, []);

  const criticos = useMemo(() => estado.alertas.filter((alerta) => alerta.nivel === "critico"), [estado.alertas]);
  const atencao = useMemo(() => estado.alertas.filter((alerta) => alerta.nivel === "atencao"), [estado.alertas]);
  const dataHoje = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date());

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <p style={{ color: "#e05008", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>Execução diária</p>
          <h1 style={{ color: "#263827", fontSize: 25, margin: 0 }}>Central de atividades</h1>
          <p style={{ color: "#69736c", fontSize: 12, marginTop: 5, textTransform: "capitalize" }}>{dataHoje}</p>
        </div>
        <Link href="/dashboard/alertas" style={{ textDecoration: "none", color: "#334532", background: "#fff", border: "1px solid #dfe5df", borderRadius: 9, padding: "8px 12px", fontSize: 11, fontWeight: 800 }}>
          Ver todos os alertas →
        </Link>
      </header>

      {estado.erro && (
        <div role="alert" style={{ background: "#fff4f0", color: "#9f310b", border: "1px solid #f4c5b5", borderRadius: 11, padding: "11px 13px", marginBottom: 14, fontSize: 12 }}>
          {estado.erro}
        </div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 9, marginBottom: 18 }}>
        {ATALHOS.map((atalho) => (
          <Link key={atalho.href + atalho.label} href={atalho.href} style={{ ...card, display: "flex", gap: 11, alignItems: "flex-start", textDecoration: "none", color: "inherit", padding: 13 }}>
            <span aria-hidden="true" style={{ width: 32, height: 32, display: "grid", placeItems: "center", flex: "0 0 32px", borderRadius: 9, background: "#eaf5e4", color: "#334532", fontSize: 15, fontWeight: 900 }}>{atalho.icon}</span>
            <span>
              <strong style={{ display: "block", color: "#263827", fontSize: 12 }}>{atalho.label}</strong>
              <span style={{ display: "block", color: "#7a847d", fontSize: 10, marginTop: 3, lineHeight: 1.35 }}>{atalho.descricao}</span>
            </span>
          </Link>
        ))}
      </section>

      {estado.carregando ? (
        <div style={{ ...card, color: "#4a9410", fontSize: 12 }}>Consolidando rotinas e pendências...</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 14 }}>
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <div>
                <h2 style={{ color: "#263827", fontSize: 15, margin: 0 }}>Hoje</h2>
                <p style={{ color: "#7a847d", fontSize: 10, marginTop: 3 }}>Rotinas operacionais previstas para o dia</p>
              </div>
              <span style={{ background: "#eaf5e4", color: "#334532", padding: "4px 8px", borderRadius: 99, fontSize: 10, fontWeight: 850 }}>{estado.rotinas.length}</span>
            </div>
            {estado.rotinas.length ? (
              <div style={{ display: "grid", gap: 7 }}>
                {estado.rotinas.slice(0, 10).map((rotina) => (
                  <div key={rotina.id} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr) auto", gap: 9, alignItems: "start", padding: "9px 10px", background: "#fafbfa", border: "1px solid #edf0ed", borderRadius: 10 }}>
                    <span aria-hidden="true" style={{ width: 25, height: 25, display: "grid", placeItems: "center", border: "1px solid #dfe5df", borderRadius: 7, color: "#4a9410", fontSize: 12 }}>✓</span>
                    <span>
                      <strong style={{ display: "block", fontSize: 12, color: "#263827" }}>{rotina.titulo}</strong>
                      <span style={{ display: "block", fontSize: 10, color: "#758078", marginTop: 2, lineHeight: 1.35 }}>{rotina.descricao}</span>
                    </span>
                    <span style={{ fontSize: 9, color: "#8a948d", fontWeight: 750, whiteSpace: "nowrap" }}>{rotina.horario || rotina.categoria}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "#7b857e", fontSize: 12 }}>Nenhuma rotina diária foi encontrada.</p>
            )}
            <Link href="/dashboard/rotinas" style={{ display: "inline-block", marginTop: 12, color: "#3f6f2d", fontSize: 11, fontWeight: 800, textDecoration: "none" }}>Abrir rotinas e obrigações →</Link>
          </section>

          <div style={{ display: "grid", gap: 14 }}>
            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
                <h2 style={{ color: "#263827", fontSize: 15, margin: 0 }}>Críticos e atrasados</h2>
                <span style={{ background: criticos.length ? "#fff0eb" : "#eef6ea", color: criticos.length ? "#b9380a" : "#39712d", padding: "4px 8px", borderRadius: 99, fontSize: 10, fontWeight: 850 }}>{criticos.length}</span>
              </div>
              <ListaAlertas itens={criticos} vazio="Nenhuma pendência crítica identificada." />
            </section>

            <section style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11 }}>
                <h2 style={{ color: "#263827", fontSize: 15, margin: 0 }}>Aguardando ação</h2>
                <span style={{ background: "#fff8df", color: "#8b650d", padding: "4px 8px", borderRadius: 99, fontSize: 10, fontWeight: 850 }}>{atencao.length}</span>
              </div>
              <ListaAlertas itens={atencao} vazio="Nenhuma pendência em atenção." />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
