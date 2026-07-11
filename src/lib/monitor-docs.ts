/**
 * Verdelimp ERP — Monitor de Documentação por Contrato
 * Cada contratante (SADA, Vallourec…) exige uma relação de documentos por
 * funcionário. Este módulo define o modelo padrão de requisitos (base:
 * "Relação dos Documentos de SST" do Grupo SADA, 19 itens) e o cálculo de
 * status por validade. Requisitos com autoSource são preenchidos
 * automaticamente a partir dos módulos ASO, Treinamentos e EPI.
 */

export interface RequisitoModelo {
  name: string;
  scope: "FUNCIONARIO" | "EMPRESA";
  itemRef?: string;
  validityDays?: number | null;
  autoSource?: "ASO" | "TREINAMENTO" | "EPI";
  sourceHint?: string;
}

export const MODELO_SADA: RequisitoModelo[] = [
  { name: "Relação de trabalhadores ativos", scope: "EMPRESA", itemRef: "item 1", validityDays: 30 },
  { name: "Ficha de registro do trabalhador", scope: "FUNCIONARIO", itemRef: "item 2", validityDays: null },
  { name: "Comprovante de vínculo (CTPS/eSocial)", scope: "FUNCIONARIO", itemRef: "item 3", validityDays: null },
  { name: "Procedimento operacional assinado", scope: "FUNCIONARIO", itemRef: "item 4", validityDays: 365 },
  { name: "ASO — Atestado de Saúde Ocupacional", scope: "FUNCIONARIO", itemRef: "item 5", validityDays: 365, autoSource: "ASO" },
  { name: "Ordem de Serviço (NR-01)", scope: "FUNCIONARIO", itemRef: "item 6", validityDays: 365 },
  { name: "Certificado NR-06 (uso de EPI)", scope: "FUNCIONARIO", itemRef: "item 7", validityDays: 365, autoSource: "TREINAMENTO", sourceHint: "NR-06" },
  { name: "Certificado NR-12 (roçadeira/máquinas)", scope: "FUNCIONARIO", itemRef: "item 8", validityDays: 365, autoSource: "TREINAMENTO", sourceHint: "NR-12" },
  { name: "Certificado NR-35 (trabalho em altura)", scope: "FUNCIONARIO", itemRef: "item 9", validityDays: 730, autoSource: "TREINAMENTO", sourceHint: "NR-35" },
  { name: "Autorização para trabalho em altura", scope: "FUNCIONARIO", itemRef: "item 10", validityDays: 365 },
  { name: "PGR — Programa de Gerenciamento de Riscos", scope: "EMPRESA", itemRef: "item 11", validityDays: 365 },
  { name: "PCMSO — Controle Médico de Saúde Ocupacional", scope: "EMPRESA", itemRef: "item 11", validityDays: 365 },
  { name: "Ficha de entrega de EPI", scope: "FUNCIONARIO", itemRef: "item 12", validityDays: 180, autoSource: "EPI" },
  { name: "Contatos de emergência e responsável SESMT", scope: "EMPRESA", itemRef: "itens 13-14", validityDays: null },
  { name: "FISPQ dos produtos químicos utilizados", scope: "EMPRESA", itemRef: "item 15", validityDays: null },
  { name: "CNH válida (motoristas/operadores)", scope: "FUNCIONARIO", itemRef: "item 16", validityDays: null, autoSource: "TREINAMENTO", sourceHint: "CNH" },
  { name: "Seguro de vida em grupo", scope: "EMPRESA", itemRef: "item 17", validityDays: 365 },
  { name: "CND / regularidade fiscal e trabalhista", scope: "EMPRESA", itemRef: "item 18", validityDays: 90 },
  { name: "ART/CREA do responsável técnico (quando exigido)", scope: "EMPRESA", itemRef: "item 19", validityDays: 365 },
];

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
