"use client";
import { NotificacoesWidget } from "@/components/NotificacoesWidget";
import { SubNav } from "@/components/SubNav";
import { grupoDe } from "@/lib/nav-grupos";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Menu consolidado: módulos afins viram um hub (entrada única) com abas no
// topo da página (SubNav). Todas as URLs antigas continuam funcionando.
const MENU = [
  { s: "VISÃO GERAL" },
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/erp-completo", label: "ERP Completo", icon: "🌿" },
  { href: "/dashboard/alertas", label: "Central de Alertas", icon: "🚨", grupo: "alertas" },
  { href: "/dashboard/ajuda", label: "Ajuda com IA", icon: "🤖" },
  { href: "/dashboard/manual", label: "Manual do Sistema", icon: "📖" },

  { s: "COMERCIAL" },
  { href: "/dashboard/oportunidades", label: "Oportunidades CRM", icon: "🎯" },
  { href: "/dashboard/pipeline", label: "Licitações", icon: "🏆", grupo: "licitacoes" },
  { href: "/dashboard/propostas", label: "Propostas + PDF", icon: "📄" },
  { href: "/dashboard/precificacao-central", label: "Precificação", icon: "🧮", grupo: "precificacao" },

  { s: "CONTRATOS" },
  { href: "/dashboard/contratos", label: "Contratos", icon: "📋", grupo: "contratos" },
  { href: "/dashboard/monitor-docs", label: "Docs & Conformidade", icon: "🚦", grupo: "docs" },
  { href: "/dashboard/clientes", label: "Clientes", icon: "🤝" },
  { href: "/dashboard/fornecedores", label: "Fornecedores", icon: "📦" },

  { s: "CAMPO" },
  { href: "/dashboard/ordens-servico", label: "Operação de Campo", icon: "🚛", grupo: "campo" },
  { href: "/dashboard/equipamentos", label: "Frota & Equipamentos", icon: "🔧", grupo: "frota" },
  { href: "/dashboard/retro", label: "Serviços Especiais", icon: "🚜", grupo: "especiais" },

  { s: "ESTOQUE & SEGURANÇA" },
  { href: "/dashboard/almoxarifado", label: "Almoxarifado & EPI", icon: "🏭", grupo: "estoque" },
  { href: "/dashboard/ambiental", label: "Ambiental", icon: "🌱" },

  { s: "FINANCEIRO & FISCAL" },
  { href: "/dashboard/financeiro", label: "Financeiro", icon: "💰", grupo: "financeiro" },
  { href: "/dashboard/fiscal", label: "Fiscal & Contábil", icon: "💼", grupo: "fiscal" },
  { href: "/dashboard/tributario", label: "Inteligência Tributária", icon: "🧾" },
  { href: "/dashboard/nfse", label: "NFS-e Nacional", icon: "🧾" },

  { s: "RH" },
  { href: "/dashboard/rh", label: "RH & Pessoas", icon: "👷", grupo: "rh" },

  { s: "ASSISTENTE" },
  { href: "/dashboard/rotinas", label: "Rotinas", icon: "📋", grupo: "assistente" },
  { href: "/dashboard/sada", label: "Controle SADA", icon: "🚛" },

  { s: "SISTEMA" },
  { href: "/dashboard/diagnostico", label: "Central de Diagnóstico", icon: "🩺" },
  { href: "/dashboard/admin", label: "Administração", icon: "🛡️", roles: ["ADMIN"] },
  { href: "/dashboard/credenciais", label: "Credenciais & APIs", icon: "🔑", roles: ["ADMIN"] },
  { href: "/dashboard/integracoes", label: "Integrações", icon: "🔌" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: "⚙️" },
  { href: "/dashboard/alterar-senha", label: "Alterar Senha", icon: "🔐" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [semLogo, setSemLogo] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => { setMenuAberto(false); }, [pathname]);

  if (status === "loading") return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#4a9410", fontSize: 18 }}>
      🌿 Carregando...
    </div>
  );
  if (!session) return null;

  const user = session.user as any;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {menuAberto && <div className="vl-backdrop" onClick={() => setMenuAberto(false)} aria-hidden="true" />}
      <aside className={`vl-sidebar${menuAberto ? " aberta" : ""}`} style={{ width: 220, background: "#334532", color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
          {!semLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo.png" alt="Verdelimp" onError={() => setSemLogo(true)}
              style={{ maxWidth: 180, maxHeight: 48, objectFit: "contain", display: "block", margin: "0 auto 6px", background: "#fff", borderRadius: 6, padding: 4 }} />
          )}
          <p style={{ margin: 0, fontWeight: 900, fontSize: 13, textAlign: semLogo ? "left" : "center" }}>{semLogo ? "🌿 " : ""}VERDELIMP ERP</p>
          <p style={{ margin: "2px 0 0", fontSize: 9, color: "rgba(255,255,255,.4)", textAlign: semLogo ? "left" : "center" }}>v2.4 · Betim/MG</p>
        </div>
        <nav style={{ flex: 1, padding: "5px 4px", overflowY: "auto" }}>
          {MENU.map((m, i) => {
            if ((m as any).s) return (
              <p key={i} style={{ margin: "8px 8px 3px", fontSize: 9, color: "rgba(255,255,255,.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{(m as any).s}</p>
            );
            const requeridos = (m as any).roles as string[] | undefined;
            if (requeridos && !requeridos.some((r) => (user?.roles || []).includes(r))) return null;
            const grupoItem = (m as any).grupo as string | undefined;
            const grupoAtual = grupoDe(pathname);
            const active = pathname === m.href
              || (m.href !== "/dashboard" && pathname?.startsWith(m.href!))
              || (!!grupoItem && grupoAtual?.key === grupoItem);
            return (
              <button key={m.href} onClick={() => router.push(m.href!)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", border: "none", background: active ? "rgba(255,255,255,.18)" : "transparent", color: "#fff", cursor: "pointer", borderRadius: 7, marginBottom: 1, fontSize: 11, fontWeight: active ? 700 : 400, textAlign: "left", borderLeft: active ? "3px solid #e05008" : "3px solid transparent" }}>
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
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "8px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <button className="vl-hamburger" onClick={() => setMenuAberto(true)} aria-label="Abrir menu de navegação">☰</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <NotificacoesWidget />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>🌿 Verdelimp ERP v2.4</span>
          </div>
        </div>
        <main className="vl-main" style={{ flex: 1, overflowY: "auto", padding: 22, background: "#f3f4f6" }}>
          <SubNav />
          {children}
        </main>
      </div>
    </div>
  );
}
