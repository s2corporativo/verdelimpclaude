"use client";

import { usePathname, useRouter } from "next/navigation";
import { grupoDe } from "@/lib/nav-grupos";

export function SubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const grupo = grupoDe(pathname);

  if (!grupo) return null;

  return (
    <section className="vl-subnav" aria-label={`Navegação de ${grupo.titulo}`}>
      <div className="vl-subnav-titulo">{grupo.titulo}</div>
      <div className="vl-subnav-scroll">
        {grupo.abas.map((aba) => {
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
