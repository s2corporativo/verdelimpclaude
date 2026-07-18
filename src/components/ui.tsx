"use client";
// Componentes de UI reutilizáveis do Verdelimp — padronizam elementos que
// antes eram repetidos com estilos inline levemente diferentes em cada tela.
import { cloneElement, isValidElement, useId } from "react";
import { CORES } from "@/lib/tema";
import { estiloInput, estiloLabel } from "@/lib/estilos";

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

/** Caixa branca padrão (borda + cantos arredondados) usada como container de tabelas, formulários, etc. */
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: CORES.fundoCard, border: `1px solid ${CORES.borda}`, borderRadius: 12, overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

/** Grade de KPI cards. `colunas` controla quantas colunas (default 4). */
export function KpiGrid({ colunas = 4, children }: { colunas?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${colunas},1fr)`, gap: 10, marginBottom: 16 }}>
      {children}
    </div>
  );
}

/** Card de indicador: rótulo em caixa alta + valor destacado, com borda superior colorida e ícone opcional. */
export function KpiCard({ label, valor, cor = CORES.verde, icone }: { label: React.ReactNode; valor: React.ReactNode; cor?: string; icone?: React.ReactNode }) {
  return (
    <div style={{ background: CORES.fundoCard, border: `1px solid ${CORES.borda}`, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${cor}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: CORES.textoSuave, fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
        {icone != null && <span>{icone}</span>}
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: cor, marginTop: 4 }}>{valor}</div>
    </div>
  );
}

/** Campo de formulário padrão. Aceita todas as props de <input> + override de style. */
export function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...estiloInput, ...style }} />;
}

/** Rótulo + campo em bloco. `label` opcional; `children` é o input/select/textarea.
 *  Gera id/htmlFor automaticamente: sem o vínculo, leitores de tela não
 *  anunciam o rótulo do campo (o <label> era só visual). */
export function Campo({ label, children, style }: { label?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  const idAuto = useId();
  const filhoComId = isValidElement(children) && !(children.props as any).id
    ? cloneElement(children as React.ReactElement<any>, { id: idAuto })
    : children;
  const idDoFilho = isValidElement(filhoComId) ? (filhoComId.props as any).id : undefined;
  return (
    <div style={style}>
      {label != null && <label htmlFor={idDoFilho} style={estiloLabel}>{label}</label>}
      {filhoComId}
    </div>
  );
}

/** Botão padronizado com variantes de cor da marca. */
export function Botao({ variante = "primario", style, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: "primario" | "escuro" | "perigo" | "neutro" }) {
  const vars: Record<string, React.CSSProperties> = {
    primario: { background: CORES.verde, color: "#fff", border: "none" },
    escuro: { background: CORES.verdeEscuro, color: "#fff", border: "none" },
    perigo: { background: CORES.erro, color: "#fff", border: "none" },
    neutro: { background: "#fff", color: CORES.textoLabel, border: `1px solid ${CORES.bordaInput}` },
  };
  const base: React.CSSProperties = { borderRadius: 8, padding: "8px 16px", cursor: props.disabled ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, opacity: props.disabled ? 0.6 : 1 };
  return <button {...props} style={{ ...base, ...vars[variante], ...style }}>{children}</button>;
}

/** Cabeçalho de tabela padrão (fundo verde-claro da marca). Passe os rótulos das colunas. */
export function TabelaHead({ colunas, alinhar = "left" }: { colunas: string[]; alinhar?: "left" | "right" }) {
  return (
    <thead>
      <tr style={{ background: CORES.verdeClaro }}>
        {colunas.map(h => (
          <th key={h} scope="col" style={{ padding: "9px 12px", textAlign: alinhar, fontSize: 11, fontWeight: 700, color: CORES.verdeEscuro }}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

/** Wrapper de tabela com rolagem horizontal — tabelas largas não estouram
 *  a tela no celular do pessoal de campo. Use em volta de <table>. */
export function TabelaScroll({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", ...style }}>{children}</div>;
}
