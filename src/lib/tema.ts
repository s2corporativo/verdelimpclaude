/**
 * Tema Verdelimp — fonte única das cores da marca e de status.
 * Use estas constantes em vez de repetir hex soltos pelas telas, para manter
 * a identidade visual consistente (verde corporativo + laranja de destaque).
 */
export const CORES = {
  // Marca
  verdeEscuro: "#334532", // títulos, sidebar
  verde: "#4a9410",       // ações primárias, valores positivos
  laranja: "#e05008",     // destaque/acento

  // Neutros
  texto: "#111827",
  textoSuave: "#6b7280",
  borda: "#e5e7eb",
  fundo: "#f3f4f6",
  fundoCard: "#ffffff",

  // Status (semânticos — separados do acento da marca)
  ok: "#15803d", okBg: "#dcfce7",
  atencao: "#92400e", atencaoBg: "#fef9c3",
  erro: "#991b1b", erroBg: "#fee2e2",
  info: "#3730a3", infoBg: "#e0e7ff",
  roxo: "#7c3aed",
} as const;
