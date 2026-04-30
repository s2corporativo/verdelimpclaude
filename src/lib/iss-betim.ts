/**
 * Tabela de ISS do Município de Betim/MG
 * Fonte: Lei Complementar (LC) nº 33/2003 — LC33/2003 e atualizações posteriores
 * Apoio gerencial — validar com contador antes de emitir NFS-e
 */
export const ISS_BETIM: Record<string, number> = {
  "1.01": 2, "1.07": 2, "1.08": 2,
  "3.04": 2,
  "7.09": 2,
  "7.10": 5, "7.11": 5, "7.12": 5, "7.13": 5,
  "7.16": 5, "7.17": 5, "7.18": 5,
  "14.01": 5, "14.05": 5,
  "17.05": 5, "17.06": 5,
};

export const LISTA_SERVICOS = [
  { codigo: "1.01", descricao: "Análise e desenvolvimento de sistemas", aliq: 2 },
  { codigo: "7.09", descricao: "Varrição, coleta, remoção, incineração e tratamento de lixo", aliq: 2 },
  { codigo: "7.10", descricao: "Limpeza, manutenção e conservação de vias e logradouros públicos", aliq: 5 },
  { codigo: "7.11", descricao: "Decoração e jardinagem — corte e poda de árvores", aliq: 5 },
  { codigo: "7.12", descricao: "Controle e tratamento de efluentes", aliq: 5 },
  { codigo: "7.13", descricao: "Dedetização, desinfecção, desinsetização e imunização", aliq: 5 },
  { codigo: "7.16", descricao: "Florestamento, reflorestamento, semeadura e adubação", aliq: 5 },
  { codigo: "7.17", descricao: "Escoramento e contenção de encostas", aliq: 5 },
  { codigo: "14.01", descricao: "Lubrificação, limpeza, lustração e manutenção de máquinas", aliq: 5 },
  { codigo: "17.05", descricao: "Fornecimento de mão de obra — inclusive temporário", aliq: 5 },
  { codigo: "17.06", descricao: "Propaganda e publicidade", aliq: 5 },
];

export const CNAE_ISS: Record<string, { lista: string; aliq: number }> = {
  "8130300": { lista: "7.11", aliq: 5 },
  "0220906": { lista: "7.16", aliq: 5 },
  "3811400": { lista: "7.09", aliq: 2 },
  "8122200": { lista: "7.13", aliq: 5 },
  "8129000": { lista: "7.10", aliq: 5 },
  "4399199": { lista: "7.17", aliq: 5 },
};

export function getAliqISS(listaServico: string): number {
  return ISS_BETIM[listaServico] ?? 5;
}
