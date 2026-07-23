// Organização de Pastas Digitais — estrutura padronizada Verdelimp
// GET: retorna a estrutura de pastas e checklist de documentos
import { NextRequest, NextResponse } from "next/server";
import { exigirPapel, erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

const PASTAS = [
  { code: "01", nome: "Clientes", icon: "👥", subpastas: ["Contratos", "Serviços", "Propostas", "Notas Fiscais", "Relatórios"] },
  { code: "02", nome: "Contratos", icon: "📋", subpastas: ["Ativos", "Aditivos", "Propostas Aprovadas", "Documentos Relacionados"] },
  { code: "03", nome: "Funcionários", icon: "👷", subpastas: ["Por Funcionário (CPF/Nome)", "Documentos Pessoais", "Ficha Cadastral", "EPI", "ASO", "Certificados", "Termos"] },
  { code: "04", nome: "Financeiro", icon: "💰", subpastas: ["Ano-Mês", "Contas a Pagar", "Contas a Receber", "Notas Fiscais", "Comprovantes"] },
  { code: "05", nome: "Fornecedores", icon: "🏢", subpastas: ["Orçamentos", "Notas", "Contatos", "Dados Bancários", "Histórico de Compras"] },
  { code: "06", nome: "Segurança do Trabalho", icon: "🦺", subpastas: ["DDS", "EPI", "Ordens de Serviço", "Certificados", "Listas de Presença", "Documentos SST"] },
  { code: "07", nome: "Relatórios Fotográficos", icon: "📸", subpastas: ["Por Cliente", "Por Data", "Por Local"] },
  { code: "08", nome: "Propostas e Orçamentos", icon: "📝", subpastas: ["Enviadas", "Aprovadas", "Recusadas", "Pendentes"] },
];

const PADRAO_NOMENCLATURA = {
  padrao: "ANO-MÊS-DIA - CLIENTE - TIPO DE DOCUMENTO - DESCRIÇÃO",
  exemplos: [
    "2026-06-30 - SADA - Nota Fiscal - Roçada Mirafiori",
    "2026-06-30 - MRV - Proposta - Plantio de Mudas",
    "2026-06-30 - Funcionário Sergio - Termo de Celular",
    "2026-06-30 - Verdelimp - Relatório Fotográfico - Pátio PVD",
  ],
};

const DOCUMENTOS_A_CONTROLAR = [
  { code: "01", item: "Contrato Social e última alteração", obrigatoria: true },
  { code: "02", item: "CNPJ atualizado", obrigatoria: true },
  { code: "03", item: "Certidão Negativa de Débitos (CND) Federal", obrigatoria: true },
  { code: "04", item: "Certidão Negativa de Débitos Estadual", obrigatoria: true },
  { code: "05", item: "Certidão Negativa de Débitos Municipal", obrigatoria: true },
  { code: "06", item: "Certificado de Regularidade do FGTS (CRF)", obrigatoria: true },
  { code: "07", item: "Certidão Negativa de Débitos Trabalhistas (CNDT)", obrigatoria: true },
  { code: "08", item: "Inscrição Estadual", obrigatoria: true },
  { code: "09", item: "Inscrição Municipal", obrigatoria: true },
  { code: "10", item: "Alvará de Funcionamento", obrigatoria: true },
  { code: "11", item: "Cartão CNPJ", obrigatoria: false },
  { code: "12", item: "Contratos sociais de empresas do grupo", obrigatoria: false },
  { code: "13", item: "Certificado Digital (e-CNPJ)", obrigatoria: true },
  { code: "14", item: "Apólice de Seguro de Responsabilidade Civil", obrigatoria: true },
  { code: "15", item: "CNAE atualizado", obrigatoria: true },
  { code: "16", item: "Regulamento Interno / Organograma", obrigatoria: false },
  { code: "17", item: "Manual de Boas Práticas", obrigatoria: false },
  { code: "18", item: "Plano de Contingência", obrigatoria: false },
  { code: "19", item: "Ficha Cadastral de Funcionários (modelos)", obrigatoria: true },
  { code: "20", item: "Política de Privacidade / LGPD", obrigatoria: true },
  { code: "21", item: "Termo de Confidencialidade (modelo)", obrigatoria: false },
  { code: "22", item: "Procuração genérica (modelo)", obrigatoria: false },
  { code: "23", item: "Ata de Reunião / Deliberação (modelo)", obrigatoria: false },
];

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "RH", "FINANCEIRO", "COMERCIAL", "OPERACIONAL");
  if (erro) return erro;
  try {
    return NextResponse.json({
      pastas: PASTAS,
      padraoNomenclatura: PADRAO_NOMENCLATURA,
      documentosAControlar: DOCUMENTOS_A_CONTROLAR,
    });
  } catch (e: any) {
    return erroInterno(e, "api/documentos/pastas GET");
  }
}
