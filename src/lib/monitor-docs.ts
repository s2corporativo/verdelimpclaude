/**
 * Verdelimp ERP — Monitor de Documentação por Contrato
 * Cada contratante (SADA, Vallourec…) exige uma relação de documentos por
 * funcionário/empresa. Este módulo define os modelos oficiais de requisitos e
 * o cálculo de status por validade. Requisitos com autoSource são preenchidos
 * automaticamente a partir dos módulos ASO, Treinamentos e EPI.
 *
 * Fontes dos modelos:
 * - MODELO_SADA_SST: "Relação dos Documentos de SST — Matriz Betim/MG,
 *   atividade Jardinagem" (Grupo SADA, 19 itens).
 * - MODELO_SADA_CONTRATUAL: Condições Gerais de Contratação do Grupo SADA,
 *   cláusula 6.12 (itens i a xxxiv) — documentos trabalhistas, fiscais e de
 *   SST exigíveis "sempre que solicitado", com periodicidade própria.
 */

export interface RequisitoModelo {
  name: string;
  scope: "FUNCIONARIO" | "EMPRESA";
  itemRef?: string;
  validityDays?: number | null; // null = sem vencimento; 30 = mensal; 90 = trimestral; 180 = semestral; 365/730 = anual/bienal
  autoSource?: "ASO" | "TREINAMENTO" | "EPI";
  sourceHint?: string;
}

export const MODELO_SADA_SST: RequisitoModelo[] = [
  { name: "Relação de trabalhadores ativos (nome, CPF, RG, função)", scope: "EMPRESA", itemRef: "SST item 1", validityDays: 30 },
  { name: "Ficha de registro do trabalhador", scope: "FUNCIONARIO", itemRef: "SST item 2", validityDays: null },
  { name: "PGR — Programa de Gerenciamento de Riscos", scope: "EMPRESA", itemRef: "SST item 3", validityDays: 365 },
  { name: "PCMSO — Controle Médico de Saúde Ocupacional", scope: "EMPRESA", itemRef: "SST item 3", validityDays: 365 },
  { name: "Procedimento detalhado assinado pelo trabalhador", scope: "FUNCIONARIO", itemRef: "SST item 4", validityDays: 365 },
  { name: "ASO — Atestado de Saúde Ocupacional", scope: "FUNCIONARIO", itemRef: "SST item 5", validityDays: 365, autoSource: "ASO" },
  { name: "Ordem de Serviço (NR-01)", scope: "FUNCIONARIO", itemRef: "SST item 6", validityDays: 365 },
  { name: "Certificados de treinamento NR válidos", scope: "FUNCIONARIO", itemRef: "SST item 7", validityDays: 365, autoSource: "TREINAMENTO", sourceHint: "NR" },
  { name: "Certificado motosserra/motopoda/roçadeira (NR-12)", scope: "FUNCIONARIO", itemRef: "SST item 8", validityDays: 365, autoSource: "TREINAMENTO", sourceHint: "NR-12" },
  { name: "Certificado NR-35 — trabalho em altura (se aplicável)", scope: "FUNCIONARIO", itemRef: "SST item 9", validityDays: 730, autoSource: "TREINAMENTO", sourceHint: "NR-35" },
  { name: "Autorização de trabalho em altura (NR-35)", scope: "FUNCIONARIO", itemRef: "SST item 10", validityDays: 365 },
  { name: "Certificado de treinamento FISPQ (produtos químicos)", scope: "FUNCIONARIO", itemRef: "SST item 11", validityDays: 365, autoSource: "TREINAMENTO", sourceHint: "FISPQ" },
  { name: "Ficha de entrega de EPI", scope: "FUNCIONARIO", itemRef: "SST item 12", validityDays: 180, autoSource: "EPI" },
  { name: "Contato de emergência (nome e telefone)", scope: "EMPRESA", itemRef: "SST item 13", validityDays: null },
  { name: "Responsável SESMT e coordenador operacional", scope: "EMPRESA", itemRef: "SST item 14", validityDays: null },
  { name: "Indicadores de segurança mensais (HH, desvios, TFSA, TFCA)", scope: "EMPRESA", itemRef: "SST item 15", validityDays: 30 },
  { name: "Acompanhamento mensal dos programas (PGR, PCMSO, AET, DDS)", scope: "EMPRESA", itemRef: "SST item 16", validityDays: 30 },
  { name: "Treinamento de integração próprio", scope: "FUNCIONARIO", itemRef: "SST item 17", validityDays: 365, autoSource: "TREINAMENTO", sourceHint: "Integra" },
  { name: "Integração da contratante (antes de iniciar)", scope: "FUNCIONARIO", itemRef: "SST item 18", validityDays: 365 },
  { name: "PPRE do Grupo SADA (ciência)", scope: "EMPRESA", itemRef: "SST item 19", validityDays: null },
];

export const MODELO_SADA_CONTRATUAL: RequisitoModelo[] = [
  { name: "Relação de empregados alocados (registro, cargo, admissão)", scope: "EMPRESA", itemRef: "cl. 6.12-i", validityDays: 30 },
  { name: "Cartão/folha de ponto legível e sem rasura", scope: "FUNCIONARIO", itemRef: "cl. 6.12-ii", validityDays: 30 },
  { name: "Comprovante de quitação de salários (remessa/retorno bancário)", scope: "EMPRESA", itemRef: "cl. 6.12-iii", validityDays: 30 },
  { name: "Contracheque / folha eletrônica (fopag)", scope: "FUNCIONARIO", itemRef: "cl. 6.12-iv", validityDays: 30 },
  { name: "Quitação de vale-transporte (ou carta de recusa assinada)", scope: "FUNCIONARIO", itemRef: "cl. 6.12-v", validityDays: 30 },
  { name: "Quitação de vale-alimentação/refeição/cesta (CCT vigente)", scope: "FUNCIONARIO", itemRef: "cl. 6.12-vi", validityDays: 30 },
  { name: "Quitação de TRCT (rescisões, quando houver)", scope: "EMPRESA", itemRef: "cl. 6.12-vii", validityDays: null },
  { name: "Quitação de FGTS (guia + quitação)", scope: "EMPRESA", itemRef: "cl. 6.12-viii", validityDays: 30 },
  { name: "Extrato da conta vinculada do FGTS (alocados na SADA)", scope: "FUNCIONARIO", itemRef: "cl. 6.12-ix", validityDays: 90 },
  { name: "Quitação de INSS ou DARF (DCTFWeb)", scope: "EMPRESA", itemRef: "cl. 6.12-x", validityDays: 30 },
  { name: "Quitação de IRRF (DARF + quitação)", scope: "EMPRESA", itemRef: "cl. 6.12-xi", validityDays: 30 },
  { name: "Recibo da Conectividade Social", scope: "EMPRESA", itemRef: "cl. 6.12-xii", validityDays: 30 },
  { name: "GFIP — declaração de contribuições (FPAS)", scope: "EMPRESA", itemRef: "cl. 6.12-xiii", validityDays: 30 },
  { name: "GFIP — relação analítica da GRF (FGTS)", scope: "EMPRESA", itemRef: "cl. 6.12-xiv", validityDays: 30 },
  { name: "GFIP — relação de empregados por tomador", scope: "EMPRESA", itemRef: "cl. 6.12-xv", validityDays: 30 },
  { name: "Relatório DCTFWeb completo (eSocial)", scope: "EMPRESA", itemRef: "cl. 6.12-xvi", validityDays: 30 },
  { name: "Recibo de entrega da DCTFWeb (eSocial)", scope: "EMPRESA", itemRef: "cl. 6.12-xvii", validityDays: 30 },
  { name: "Balanço patrimonial assinado (empresário + CRC)", scope: "EMPRESA", itemRef: "cl. 6.12-xviii", validityDays: 180 },
  { name: "DRE assinada (empresário + contador CRC)", scope: "EMPRESA", itemRef: "cl. 6.12-xix", validityDays: 180 },
  { name: "Ficha atualizada de entrega de EPI (NR-06 + PGR)", scope: "FUNCIONARIO", itemRef: "cl. 6.12-xx", validityDays: 180, autoSource: "EPI" },
  { name: "PGR válido (NR-01)", scope: "EMPRESA", itemRef: "cl. 6.12-xxi", validityDays: 365 },
  { name: "Ordem de Serviço de cada trabalhador (NR-01)", scope: "FUNCIONARIO", itemRef: "cl. 6.12-xxii", validityDays: 365 },
  { name: "PCMSO válido (NR-07)", scope: "EMPRESA", itemRef: "cl. 6.12-xxiii", validityDays: 365 },
  { name: "ASO admissional/periódico/mudança de função", scope: "FUNCIONARIO", itemRef: "cl. 6.12-xxiv", validityDays: 365, autoSource: "ASO" },
  { name: "ASO demissional dos desligados", scope: "EMPRESA", itemRef: "cl. 6.12-xxv", validityDays: null },
  { name: "Lista de presença + certificados de treinamentos NR", scope: "FUNCIONARIO", itemRef: "cl. 6.12-xxvi", validityDays: 365, autoSource: "TREINAMENTO", sourceHint: "NR" },
  { name: "APR — Análise Preliminar de Risco das etapas", scope: "EMPRESA", itemRef: "cl. 6.12-xxvii", validityDays: 365 },
  { name: "Contato do representante para emergência", scope: "EMPRESA", itemRef: "cl. 6.12-xxviii", validityDays: null },
  { name: "PAE — Plano de Atendimento a Emergência da unidade", scope: "EMPRESA", itemRef: "cl. 6.12-xxix", validityDays: 365 },
  { name: "Treinamento de integração da contratante", scope: "FUNCIONARIO", itemRef: "cl. 6.12-xxx", validityDays: 365 },
  { name: "Apólices de seguro com quitação (garantias)", scope: "EMPRESA", itemRef: "cl. 6.12-xxxi", validityDays: 365 },
  { name: "Apólice de seguro por danos a terceiros", scope: "EMPRESA", itemRef: "cl. 6.12-xxxiii", validityDays: 365 },
  { name: "Instrumento coletivo vigente (ACT/CCT da categoria)", scope: "EMPRESA", itemRef: "cl. 6.12-xxxiv", validityDays: 365 },
];

export const MODELOS: Record<string, { titulo: string; itens: RequisitoModelo[] }> = {
  SST: { titulo: "SST — Saúde e Segurança (19 itens)", itens: MODELO_SADA_SST },
  CONTRATUAL: { titulo: "Contratual SADA — cláusula 6.12 (33 itens)", itens: MODELO_SADA_CONTRATUAL },
};

// Compatibilidade com chamadas antigas (modelo padrão = SST)
export const MODELO_SADA = MODELO_SADA_SST;

export type StatusDoc = "valido" | "a_vencer" | "vencido" | "faltante";

export const DIAS_ALERTA = 30; // "a vencer" quando faltam ≤ 30 dias

/** Status a partir da data de validade (null = documento sem vencimento → válido). */
export function statusPorValidade(expiresAt: Date | string | null | undefined, temRegistro: boolean): StatusDoc {
  if (!temRegistro) return "faltante";
  if (!expiresAt) return "valido";
  const v = new Date(expiresAt);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  if (v < hoje) return "vencido";
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + DIAS_ALERTA);
  return v <= limite ? "a_vencer" : "valido";
}

export const STATUS_UI: Record<StatusDoc, { label: string; cor: string; fundo: string; icone: string }> = {
  valido:   { label: "Válido",   cor: "#15803d", fundo: "#dcfce7", icone: "🟢" },
  a_vencer: { label: "A vencer", cor: "#92400e", fundo: "#fef3c7", icone: "🟡" },
  vencido:  { label: "Vencido",  cor: "#991b1b", fundo: "#fee2e2", icone: "🔴" },
  faltante: { label: "Faltante", cor: "#374151", fundo: "#e5e7eb", icone: "⚪" },
};
