/**
 * Tabelas fiscais/trabalhistas versionadas por ano-calendário.
 *
 * Regra de ouro: NUNCA usar número de tabela sem saber de que ano ele é.
 * Antes deste módulo, a folha misturava INSS de 2024, mínimo de 2025 e o
 * rótulo "2026" — três exercícios diferentes no mesmo holerite.
 *
 * Manutenção anual (janeiro):
 *  1. Adicionar a entrada do novo ano em TABELAS (Portaria MPS/MF + Decreto do mínimo + tabela IRRF).
 *  2. Rodar `npm test` — o teste "ano corrente tem tabela cadastrada" acusa a pendência.
 *  ⚠️ Apoio gerencial: validar sempre com o contador antes do fechamento.
 */

export interface FaixaINSS { ate: number; aliq: number }
export interface FaixaIRRF { ate: number; aliq: number; deduzir: number }

export interface TabelaFiscalAno {
  ano: number;
  salarioMinimo: number;
  /** Faixas progressivas cumulativas; a última é o teto de contribuição. */
  faixasINSS: FaixaINSS[];
  irrf: {
    faixas: FaixaIRRF[]; // última faixa: ate = Infinity
    deducaoDependente: number;
    descontoSimplificado: number;
    /**
     * Lei 15.270/2025 (vigência 2026): isenção efetiva até R$ 5.000/mês e
     * redução decrescente do imposto até R$ 7.350/mês, aplicada sobre o
     * rendimento tributável. Implementada como interpolação linear do
     * imposto entre os dois limites — CONFERIR a fórmula exata com o contador.
     */
    redutorLei15270?: { isencaoAte: number; reducaoAte: number };
  };
  fonte: string;
  /** true quando algum valor aguarda publicação/confirmação oficial */
  pendenteConfirmacao?: boolean;
}

export const TABELAS: Record<number, TabelaFiscalAno> = {
  2024: {
    ano: 2024,
    salarioMinimo: 1412.0,
    faixasINSS: [
      { ate: 1412.0, aliq: 0.075 },
      { ate: 2666.68, aliq: 0.09 },
      { ate: 4000.03, aliq: 0.12 },
      { ate: 7786.02, aliq: 0.14 },
    ],
    irrf: {
      faixas: [
        { ate: 2259.2, aliq: 0, deduzir: 0 },
        { ate: 2826.65, aliq: 0.075, deduzir: 169.44 },
        { ate: 3751.05, aliq: 0.15, deduzir: 381.44 },
        { ate: 4664.68, aliq: 0.225, deduzir: 662.77 },
        { ate: Infinity, aliq: 0.275, deduzir: 896.0 },
      ],
      deducaoDependente: 189.59,
      descontoSimplificado: 564.8,
    },
    fonte: "Portaria Interministerial MPS/MF 2/2024; Lei 14.848/2024 (IRRF mai/2024)",
  },
  2025: {
    ano: 2025,
    salarioMinimo: 1518.0,
    faixasINSS: [
      { ate: 1518.0, aliq: 0.075 },
      { ate: 2793.88, aliq: 0.09 },
      { ate: 4190.83, aliq: 0.12 },
      { ate: 8157.41, aliq: 0.14 },
    ],
    irrf: {
      faixas: [
        { ate: 2428.8, aliq: 0, deduzir: 0 },
        { ate: 2826.65, aliq: 0.075, deduzir: 182.16 },
        { ate: 3751.05, aliq: 0.15, deduzir: 394.16 },
        { ate: 4664.68, aliq: 0.225, deduzir: 675.49 },
        { ate: Infinity, aliq: 0.275, deduzir: 908.73 },
      ],
      deducaoDependente: 189.59,
      descontoSimplificado: 607.2,
    },
    fonte: "Portaria Interministerial MPS/MF 6/2025; MP 1.294/2025 (IRRF mai/2025)",
  },
  2026: {
    ano: 2026,
    salarioMinimo: 1621.0,
    // Portaria Interministerial MPS/MF nº 13, de 09/01/2026 — vigência 01/01/2026.
    // Teto de contribuição: R$ 8.475,55 (desconto máximo ≈ R$ 988,09).
    faixasINSS: [
      { ate: 1621.0, aliq: 0.075 },
      { ate: 2902.84, aliq: 0.09 },
      { ate: 4354.27, aliq: 0.12 },
      { ate: 8475.55, aliq: 0.14 },
    ],
    irrf: {
      // Tabela progressiva base mantida (mai/2025) + redutor da Lei 15.270/2025,
      // que na prática isenta até R$ 5.000 e reduz gradualmente até R$ 7.350.
      faixas: [
        { ate: 2428.8, aliq: 0, deduzir: 0 },
        { ate: 2826.65, aliq: 0.075, deduzir: 182.16 },
        { ate: 3751.05, aliq: 0.15, deduzir: 394.16 },
        { ate: 4664.68, aliq: 0.225, deduzir: 675.49 },
        { ate: Infinity, aliq: 0.275, deduzir: 908.73 },
      ],
      deducaoDependente: 189.59,
      descontoSimplificado: 607.2,
      redutorLei15270: { isencaoAte: 5000, reducaoAte: 7350 },
    },
    fonte: "Portaria Interministerial MPS/MF 13/2026 (mínimo R$1.621, teto INSS R$8.475,55); Lei 15.270/2025 (isenção IR até R$5.000)",
  },
};

export const ULTIMO_ANO_DISPONIVEL = Math.max(...Object.keys(TABELAS).map(Number));

/**
 * Retorna a tabela do ano pedido; se não existir, cai para o último ano
 * disponível anterior e sinaliza `defasada: true` para a UI alertar.
 */
export function tabelaVigente(ano: number = new Date().getFullYear()): TabelaFiscalAno & { defasada: boolean } {
  if (TABELAS[ano]) return { ...TABELAS[ano], defasada: false };
  const anterior = Object.keys(TABELAS).map(Number).filter((a) => a < ano).sort((a, b) => b - a)[0];
  const base = TABELAS[anterior] ?? TABELAS[ULTIMO_ANO_DISPONIVEL];
  return { ...base, defasada: true };
}

// ── Encargo patronal por anexo do Simples Nacional ──────────────────
// Anexos III e V: a CPP está DENTRO do DAS — não somar patronal à parte.
// Anexo IV (limpeza/conservação/vigilância — o caso da Verdelimp): a CPP é
// recolhida FORA do DAS: 20% + RAT×FAP. Empresas do Simples são dispensadas
// das contribuições a terceiros/Sistema S (LC 123/2006, art. 13 §3º).
export type AnexoSimples = "III" | "IV" | "V";

export function inssPatronalPct(anexo: AnexoSimples = "IV", ratPct = 3, fapFator = 1): number {
  if (anexo === "III" || anexo === "V") return 0;
  return 20 + ratPct * fapFator; // Anexo IV: CPP 20% + RAT ajustado pelo FAP
}
