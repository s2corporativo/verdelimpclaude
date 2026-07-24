"use client";

import { NotificacoesWidget } from "@/components/NotificacoesWidget";
import { SubNav } from "@/components/SubNav";
import { grupoDe } from "@/lib/nav-grupos";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ItemMenu = {
  href: string;
  label: string;
  icon: string;
  grupo?: string;
  roles?: string[];
};

type EntradaMenu = ItemMenu | { secao: string };

const MENU: EntradaMenu[] = [
  { secao: "INÍCIO" },
  { href: "/dashboard", label: "Hoje", icon: "⌂" },
  { href: "/dashboard/atividades", label: "Central de atividades", icon: "✓" },
  { href: "/dashboard/alertas", label: "Alertas", icon: "!" },

  { secao: "ÁREAS" },
  {
    href: "/dashboard/oportunidades",
    label: "Comercial",
    icon: "◎",
    grupo: "comercial",
    roles: ["ADMIN", "GESTOR", "COMERCIAL"],
  },
  {
    href: "/dashboard/contratos",
    label: "Contratos e serviços",
    icon: "▤",
    grupo: "contratos-servicos",
    roles: ["ADMIN", "GESTOR", "COMERCIAL", "OPERACIONAL"],
  },
  {
    href: "/dashboard/rh",
    label: "Pessoas e SST",
    icon: "♙",
    grupo: "pessoas-sst",
    roles: ["ADMIN", "GESTOR", "RH"],
  },
  {
    href: "/dashboard/financeiro",
    label: "Financeiro e fiscal",
    icon: "$",
    grupo: "financeiro-fiscal",
    roles: ["ADMIN", "GESTOR", "FINANCEIRO", "FISCAL"],
  },
  {
    href: "/dashboard/almoxarifado",
    label: "Recursos",
    icon: "◇",
    grupo: "recursos",
    roles: ["ADMIN", "GESTOR", "OPERACIONAL"],
  },

  { secao: "GESTÃO" },
  {
    href: "/dashboard/rotinas",
    label: "Administração",
    icon: "⚙",
    grupo: "administracao",
  },
  { href: "/dashboard/ajuda", label: "Assistente de IA", icon: "✦", grupo: "ia" },
];

function itemDeMenu(entrada: EntradaMenu): entrada is ItemMenu {
  return "href" in entrada;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [semLogo, setSemLogo] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  const user = session?.user as
    | { name?: string | null; email?: string | null; roles?: string[] }
    | undefined;
  const roles = useMemo(() => user?.roles ?? [], [user?.roles]);
  const grupoAtual = grupoDe(pathname);

  if (status === "loading") {
    return (
      <div className="vl-loading" role="status" aria-live="polite">
        <span className="vl-loading-marca">V</span>
        <span>Carregando Verdelimp...</span>
      </div>
    );
  }

  if (!session) return null;

  const podeVer = (item: ItemMenu) => {
    if (!item.roles?.length || roles.includes("ADMIN")) return true;
    return item.roles.some((papel) => roles.includes(papel));
  };

  return (
    <div className="vl-shell">
      {menuAberto && (
        <button
          type="button"
          className="vl-backdrop"
          onClick={() => setMenuAberto(false)}
          aria-label="Fechar menu"
        />
      )}

      <aside className={`vl-sidebar${menuAberto ? " aberta" : ""}`}>
        <div className="vl-brand">
          {!semLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logo.png"
              alt="Verdelimp"
              onError={() => setSemLogo(true)}
              className="vl-brand-logo"
            />
          ) : (
            <div className="vl-brand-fallback" aria-hidden="true">V</div>
          )}
          <strong>VERDELIMP</strong>
          <span>Gestão integrada · v3.0</span>
        </div>

        <nav className="vl-menu" aria-label="Menu principal">
          {MENU.map((entrada, indice) => {
            if (!itemDeMenu(entrada)) {
              return (
                <p key={`${entrada.secao}-${indice}`} className="vl-menu-secao">
                  {entrada.secao}
                </p>
              );
            }

            if (!podeVer(entrada)) return null;

            const ativa =
              pathname === entrada.href ||
              (entrada.href !== "/dashboard" && pathname?.startsWith(`${entrada.href}/`)) ||
              (!!entrada.grupo && grupoAtual?.key === entrada.grupo);

            return (
              <button
                key={entrada.href}
                type="button"
                onClick={() => router.push(entrada.href)}
                className={`vl-menu-item${ativa ? " ativo" : ""}`}
                aria-current={ativa ? "page" : undefined}
              >
                <span className="vl-menu-icone" aria-hidden="true">{entrada.icon}</span>
                <span>{entrada.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="vl-user">
          <div className="vl-user-avatar" aria-hidden="true">
            {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="vl-user-dados">
            <strong>{user?.name || "Usuário"}</strong>
            <span>{roles.join(" · ") || "Acesso padrão"}</span>
          </div>
          <button
            type="button"
            className="vl-user-sair"
            onClick={() => signOut({ callbackUrl: "/login" })}
            aria-label="Sair do sistema"
            title="Sair"
          >
            ↗
          </button>
        </div>
      </aside>

      <div className="vl-workspace">
        <header className="vl-topbar">
          <button
            type="button"
            className="vl-hamburger"
            onClick={() => setMenuAberto(true)}
            aria-label="Abrir menu de navegação"
          >
            ☰
          </button>
          <div className="vl-topbar-contexto">
            <span>Área atual</span>
            <strong>{grupoAtual?.titulo || (pathname === "/dashboard" ? "Hoje" : "Verdelimp")}</strong>
          </div>
          <div className="vl-topbar-acoes">
            <button
              type="button"
              className="vl-topbar-nova"
              onClick={() => router.push("/dashboard/oportunidades?nova=1")}
            >
              + Nova demanda
            </button>
            <NotificacoesWidget />
          </div>
        </header>

        <main className="vl-main">
          <SubNav />
          {children}
        </main>
      </div>
    </div>
  );
}
