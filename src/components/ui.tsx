"use client";
// Componentes de UI reutilizáveis do Verdelimp — padronizam elementos que
// antes eram repetidos com estilos inline levemente diferentes em cada tela.
import { CORES } from "@/lib/tema";

/** Selo "Demo" exibido quando a tela está com dados de exemplo (tabela vazia). */
export function DemoBadge({ mostrar = true }: { mostrar?: boolean }) {
  if (!mostrar) return null;
  return (
    <span style={{ fontSize: 11, background: CORES.infoBg, color: CORES.info, padding: "2px 8px", borderRadius: 8, fontWeight: 700, marginLeft: 8 }}>
      Demo
    </span>
  );
}

/** Caixa de aviso "apoio gerencial / validar com o contador" e afins. */
export function AvisoBox({ children, tom = "atencao" }: { children: React.ReactNode; tom?: "atencao" | "info" | "erro" }) {
  const cor = tom === "erro" ? [CORES.erroBg, "#fecaca", CORES.erro]
    : tom === "info" ? ["#eff6ff", "#bfdbfe", CORES.info]
    : [CORES.atencaoBg, "#fde68a", CORES.atencao];
  return (
    <div style={{ background: cor[0], border: `1px solid ${cor[1]}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: cor[2] }}>
      {children}
    </div>
  );
}

/** Cabeçalho de página padronizado (título + selo demo opcional). */
export function TituloPagina({ children, demo }: { children: React.ReactNode; demo?: boolean }) {
  return (
    <h1 style={{ color: CORES.verdeEscuro, fontSize: 20, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center" }}>
      {children} <DemoBadge mostrar={!!demo} />
    </h1>
  );
}
