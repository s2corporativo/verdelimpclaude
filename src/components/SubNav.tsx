"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { grupoDe } from "@/lib/nav-grupos";

export function SubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const grupo = grupoDe(pathname);

  if (!grupo) return null;

  const user = session?.user as { roles?: string[] } | undefined;
  const roles = user?.roles || [];
  const administrador = roles.includes("ADMIN");
  const abasVisiveis = grupo.abas.filter(
    (aba) => !aba.roles?.length || administrador || aba.roles.some((papel) => roles.includes(papel)),
  );

  if (!abasVisiveis.length) return null;

  return (
    <section className="vl-subnav" aria-label={`Navegação de ${grupo.titulo}`}>
      <div className="vl-subnav-titulo">{grupo.titulo}</div>
      <div className="vl-subnav-scroll">
        {abasVisiveis.map((aba) => {
          const ativa = pathname === aba.href || pathname?.startsWith(`${aba.href}/`);
          return (
            <button
              key={aba.href}
              type="button"
              aria-current={ativa ? "page" : undefined}
              onClick={() => router.push(aba.href)}
              className={`vl-subnav-item${ativa ? " ativa" : ""}`}
            >
              {aba.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
