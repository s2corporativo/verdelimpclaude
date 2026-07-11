"use client";
// Barra de abas dos hubs — aparece automaticamente quando a página atual
// pertence a um grupo (ver src/lib/nav-grupos.ts). Renderizada pelo layout.
import { usePathname, useRouter } from "next/navigation";
import { grupoDe } from "@/lib/nav-grupos";

export function SubNav() {
  const pathname = usePathname();
  const router = useRouter();
  const grupo = grupoDe(pathname);
  if (!grupo) return null;

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "6px 10px", marginBottom: 16 }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: "#9ca3af", textTransform: "uppercase", letterSpacing: ".5px", marginRight: 4 }}>{grupo.titulo}</span>
      {grupo.abas.map((a) => {
        const ativa = pathname === a.href || pathname?.startsWith(a.href + "/");
        return (
          <button key={a.href} onClick={() => router.push(a.href)}
            style={{
              background: ativa ? "#334532" : "transparent",
              color: ativa ? "#fff" : "#374151",
              border: ativa ? "none" : "1px solid #e5e7eb",
              borderBottom: ativa ? "2px solid #e05008" : "1px solid #e5e7eb",
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
