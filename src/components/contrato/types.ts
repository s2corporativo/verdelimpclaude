// src/components/contrato/types.ts
// Tipos compartilhados entre as etapas do novo contrato

export interface ContratoForm {
  objeto: string;
  clienteNome: string;
  clienteCnpj: string;
  valorMensal: string;
  valorTotal: string;
  vigenciaMeses: string;
  dataInicio: string;
  dataFim: string;
  tipoServico: string;
  areaM2: string;
  diasExecucao: string;
  equipeMinima: string;
  municipio: string;
  uf: string;
  enderecos: string;
  modalidadeLicitacao: string;
  indiceReajuste: string;
  observacoes: string;
}

export const INITIAL_FORM: ContratoForm = {
  objeto: "",
  clienteNome: "",
  clienteCnpj: "",
  valorMensal: "",
  valorTotal: "",
  vigenciaMeses: "12",
  dataInicio: "",
  dataFim: "",
  tipoServico: "Roçada Manual",
  areaM2: "",
  diasExecucao: "4",
  equipeMinima: "",
  municipio: "Betim",
  uf: "MG",
  enderecos: "",
  modalidadeLicitacao: "",
  indiceReajuste: "INPC",
  observacoes: "",
};

export const TIPOS_SERVICO = [
  "Roçada Manual","Roçada Mecanizada","Jardinagem Mensal",
  "PRADA/PTRF","Limpeza","Podação","Hidrossemeadura",
  "Controle de Formigas","Outro"
];
