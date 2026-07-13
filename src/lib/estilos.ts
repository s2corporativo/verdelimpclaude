/**
 * Estilos compartilhados de formulário — fonte única para os campos e rótulos
 * que antes eram redefinidos como `const IS`/`const LS` em dezenas de telas.
 */
import type { CSSProperties } from "react";
import { CORES } from "./tema";

/** Campo de formulário padrão (input/select/textarea): 100% de largura, borda cinza. */
export const estiloInput: CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${CORES.bordaInput}`,
  borderRadius: 8,
  fontSize: 13,
};

/** Rótulo de campo padrão (pequeno, semibold, cinza). */
export const estiloLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: CORES.textoLabel,
  display: "block",
  marginBottom: 3,
};
