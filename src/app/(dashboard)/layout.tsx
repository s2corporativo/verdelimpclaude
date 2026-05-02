"use client";
import { NotificacoesWidget } from "@/components/NotificacoesWidget";
mport { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const MENU = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/ajuda", label: "Ajuda com IA", icon: "🤖" },
  { s: "OPERACIONAL" },
  { href: "/dashboard/novo-contrato", label: "⚡ Novo Contrato (auto)", icon: "📋" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "🤝" },
  { href: "/dashboard/fornecedores", label: "Fornecedores", icon: "📦" },
  { href: "/dashboard/propostas", label: "Propostas + PDF", icon: "📄" },
  { href: "/dashboard/contratos", label: "Contratos", icon: "📋" },
  { href: "/dashboard/medicao", label: "Medição Mensal", icon: "📏" },
  { href: "/dashboard/precificacao", label: "Precificação IA", icon: "🧮" },
  { href: "/dashboard/precificacao-regras", label: "Tabela de Preços", icon: "💲" },
  { href: "/dashboard/proposta-edital", label: "Proposta por Edital IA", icon: "📋" },
  { s: "CAMPO" },
  { href: "/dashboard/logistica", label: "Logística Operacional", icon: "🚛" },
  { href: "/dashboard/diario-obras", label: "Diário de Obras", icon: "📝" },
  { href: "/dashboard/historico-servicos", label: "Histórico Serviços", icon: "🗂️" },
  { href: "/dashboard/combustivel", label: "Combustível", icon: "⛽" },
  { href: "/dashboard/almoxarifado", label: "Almoxarifado", icon: "🏭" },
  { href: "/dashboard/epi", label: "Controle de EPI", icon: "🦺" },
  { href: "/dashboard/nfe-import", label: "Importar NF-e XML", icon: "📥" },
  { s: "FINANCEIRO & FISCAL" },
  { href: "/dashboard/fiscal", label: "Central Fiscal", icon: "💼" },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: "💰" },
  { href: "/dashboard/dre", label: "DRE — Resultado", icon: "📊" },
  { href: "/dashboard/relatorio-contador", label: "Relatório Contador", icon: "📊" },
  { s: "RH & SEGURANÇA" },
  { href: "/dashboard/rh", label: "RH & Folha", icon: "👷" },
  { href: "/dashboard/treinamentos", label: "NRs e Treinamentos", icon: "🦺" },
  { href: "/dashboard/folha-detalhada", label: "Folha INSS/IRRF", icon: "📑" },
  { href: "/dashboard/whatsapp", label: "WhatsApp Alertas", icon: "📱" },
  { s: "LICITAÇÕES" },
  { href: "/dashboard/radar-licitacoes", label: "Radar Licitações", icon: "🏛️" },
  { href: "/dashboard/regularidade", label: "Regularidade Fiscal", icon: "🔎" },
  { s: "SISTEMA" },
  { href: "/dashboard/alterar-senha", label: "Alterar Senha", icon: "🔐" },
  { href: "/dashboard/integracoes", label: "Integrações", icon: "🔌" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: "⚙️" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#1a7a4a", fontSize: 18 }}>
      🌿 Carregando...
    </div>
  );
  if (!session) return null;

  const user = session.user as any;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <aside style={{ width: 220, background: "#0f5233", color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: 13 }}>🌿 VERDELIMP ERP</p>
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "rgba(255,255,255,.4)" }}>v2.2 · Betim/MG</p>
        </div>
        <nav style={{ flex: 1, padding: "5px 4px", overflowY: "auto" }}>
          {MENU.map((m, i) => {
            if ((m as any).s) return (
              <p key={i} style={{ margin: "8px 8px 3px", fontSize: 9, color: "rgba(255,255,255,.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{(m as any).s}</p>
            );
            const active = pathname === m.href || (m.href !== "/dashboard" && pathname?.startsWith(m.href!));
            return (
              <button key={m.href} onClick={() => router.push(m.href!)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", border: "none", background: active ? "rgba(255,255,255,.18)" : "transparent", color: "#fff", cursor: "pointer", borderRadius: 7, marginBottom: 1, fontSize: 11, fontWeight: active ? 700 : 400, textAlign: "left", borderLeft: active ? "3px solid rgba(255,255,255,.6)" : "3px solid transparent" }}>
                <span style={{ fontSize: 13 }}>{m.icon}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.label}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "9px 12px", borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.7)", fontWeight: 600 }}>{user?.name}</p>
          <p style={{ margin: "2px 0 5px", fontSize: 10, color: "rgba(255,255,255,.4)" }}>{user?.roles?.join(", ")}</p>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ width: "100%", background: "rgba(255,255,255,.1)", border: "none", color: "#fff", padding: 6, borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
            Sair
          </button>
        </div>
      </aside>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 20px", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
          <NotificacoesWidget />
          <span style={{ fontSize: 11, color: "#9ca3af" }}>🌿 Verdelimp ERP v2.2</span>
        </div>
        <main style={{ flex: 1, overflowY: "auto", padding: 22, background: "#f3f4f6" }}>
        {children}
      </main>
      </div>
    </div>
  );
}
