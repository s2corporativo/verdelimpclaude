"use client";
import { useEffect, useState } from "react";

const money = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const Card = ({ label, value, href, alert, icon }: any) => (
  <a href={href || "#"} style={{ textDecoration: "none", background: "#fff", border: `1px solid ${alert ? "#fca5a5" : "#e5e7eb"}`, borderTop: `3px solid ${alert ? "#dc2626" : "#4a9410"}`, borderRadius: 12, padding: "12px 14px", color: "#111827" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}><span>{label}</span><span>{icon}</span></div>
    <div style={{ fontSize: 21, fontWeight: 800, marginTop: 5, color: alert ? "#dc2626" : "#334532" }}>{value}</div>
  </a>
);

export default function ErpCompletoPage() {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState("");
  useEffect(() => { fetch("/api/dashboard/erp-completo").then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); setD(j); }).catch(e => setErro(e.message)); }, []);
  if (erro) return <div style={{ background: "#fee2e2", color: "#991b1b", padding: 16, borderRadius: 10 }}>{erro}</div>;
  if (!d) return <div style={{ padding: 30, color: "#4a9410" }}>⟳ Consolidando dados do ERP...</div>;
  const asoAlert = Number(d.rh.aso?.expired || 0) + Number(d.rh.aso?.due_30 || 0) + Number(d.rh.aso?.without_aso || 0);
  const links = [
    ["Admissões e desligamentos", "/dashboard/rh-admissao", "Cadastro completo, documentos pessoais e ciclo do vínculo"],
    ["Matriz PGR/PCMSO", "/dashboard/matriz-sst", "Função → riscos → exames → NRs → EPIs → documentos"],
    ["Financeiro avançado", "/dashboard/financeiro-avancado", "Recorrências, importação de despesas, boletos e comprovantes"],
    ["Folha por competência", "/dashboard/folha-competencias", "Histórico mensal, benefícios, adiantamentos, 13º e pagamentos"],
    ["Ordens de Serviço", "/dashboard/ordens-servico", "Equipe, equipamentos, checklist, fotos e assinaturas"],
    ["Eventos contratuais", "/dashboard/contratos-eventos", "Renovações, aditivos, obrigações, penalidades e encerramento"],
  ];
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
      <div><h1 style={{ margin: 0, color: "#334532", fontSize: 23 }}>🌿 ERP Completo Verdelimp</h1><p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 12 }}>Visão integrada de RH, SST, financeiro, contratos, operação e documentos.</p></div>
      <span style={{ background: "#dcfce7", color: "#15803d", padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Atualizado {new Date(d.generatedAt).toLocaleString("pt-BR")}</span>
    </div>

    <h2 style={{ fontSize: 13, color: "#334532", margin: "0 0 8px" }}>Pessoas e SST</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 9, marginBottom: 16 }}>
      <Card label="Funcionários ativos" value={d.rh.employees} href="/dashboard/rh-admissao" icon="👷" />
      <Card label="ASO pendente/vencendo" value={asoAlert} href="/dashboard/aso" icon="🩺" alert={asoAlert > 0} />
      <Card label="EPI estoque baixo" value={d.inventory.lowEpiStock} href="/dashboard/epi" icon="🦺" alert={d.inventory.lowEpiStock > 0} />
      <Card label="Folha não paga" value={money(d.payroll.unpaid_total)} href="/dashboard/folha-competencias" icon="💵" alert={Number(d.payroll.unpaid_total) > 0} />
    </div>

    <h2 style={{ fontSize: 13, color: "#334532", margin: "0 0 8px" }}>Financeiro</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 9, marginBottom: 16 }}>
      <Card label="Contas a pagar" value={money(d.finance.payable.total)} href="/dashboard/financeiro-avancado" icon="📤" />
      <Card label="Contas vencidas" value={money(d.finance.overduePayable.total)} href="/dashboard/financeiro-avancado" icon="🚨" alert={d.finance.overduePayable.count > 0} />
      <Card label="Contas a receber" value={money(d.finance.receivable.total)} href="/dashboard/financeiro" icon="📥" />
      <Card label="Receita do mês" value={money(d.finance.monthRevenue)} href="/dashboard/dre" icon="📈" />
      <Card label="Despesa do mês" value={money(d.finance.monthExpenses)} href="/dashboard/dre" icon="📉" />
      <Card label="Resultado do mês" value={money(d.finance.monthProfit)} href="/dashboard/dre" icon="💹" alert={d.finance.monthProfit < 0} />
      <Card label="Contas recorrentes" value={d.finance.activeRecurringRules} href="/dashboard/financeiro-avancado" icon="🔁" />
    </div>

    <h2 style={{ fontSize: 13, color: "#334532", margin: "0 0 8px" }}>Contratos e operação</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 9, marginBottom: 18 }}>
      <Card label="Contratos ativos" value={d.contracts.active} href="/dashboard/contratos" icon="📋" />
      <Card label="Vencendo em 90 dias" value={d.contracts.due90} href="/dashboard/contratos-eventos" icon="⏳" alert={d.contracts.due90 > 0} />
      <Card label="OS abertas" value={d.operations.open + d.operations.scheduled} href="/dashboard/ordens-servico" icon="🧾" />
      <Card label="Serviços em andamento" value={d.operations.inProgress} href="/dashboard/ordens-servico" icon="🚧" />
      <Card label="OS bloqueadas" value={d.operations.blocked} href="/dashboard/ordens-servico" icon="⛔" alert={d.operations.blocked > 0} />
      <Card label="OS concluídas" value={d.operations.completed} href="/dashboard/ordens-servico" icon="✅" />
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
      {links.map(([title, href, desc]) => <a key={href} href={href} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 15, textDecoration: "none", color: "#111827" }}><div style={{ fontWeight: 800, color: "#334532", fontSize: 13 }}>{title} →</div><div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{desc}</div></a>)}
    </div>
  </div>;
}
