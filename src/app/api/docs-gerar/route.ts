// Gera o checklist de documentos do contrato (empresa, funcionários e contrato)
// Consumido pela etapa "Equipe + Docs" do fluxo Novo Contrato
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface DocItem {
  categoria: "EMPRESA" | "FUNCIONARIO" | "CONTRATO";
  titulo: string;
  descricao?: string;
  tipo: "gerado" | "externo";
  origem?: string;
  validade_meses?: number;
  como_obter?: string;
  funcionarioNome?: string;
}

const DOCS_EMPRESA: DocItem[] = [
  { categoria: "EMPRESA", titulo: "Cartão CNPJ atualizado", descricao: "Comprovante de inscrição e situação cadastral", tipo: "externo", origem: "Receita Federal", validade_meses: 3, como_obter: "receita.fazenda.gov.br → Emissão de Comprovante CNPJ" },
  { categoria: "EMPRESA", titulo: "Contrato Social consolidado", descricao: "Última alteração registrada na Junta Comercial", tipo: "externo", origem: "JUCEMG", como_obter: "Portal JUCEMG → Certidão de Inteiro Teor" },
  { categoria: "EMPRESA", titulo: "CND Federal (Receita/PGFN)", descricao: "Certidão negativa de débitos federais e dívida ativa", tipo: "externo", origem: "Receita Federal", validade_meses: 6, como_obter: "servicos.receita.fazenda.gov.br → Certidões" },
  { categoria: "EMPRESA", titulo: "CRF — FGTS", descricao: "Certificado de regularidade do FGTS", tipo: "externo", origem: "Caixa Econômica", validade_meses: 1, como_obter: "consulta-crf.caixa.gov.br" },
  { categoria: "EMPRESA", titulo: "CNDT — Débitos Trabalhistas", descricao: "Certidão negativa de débitos trabalhistas", tipo: "externo", origem: "TST", validade_meses: 6, como_obter: "cndt-certidao.tst.jus.br" },
  { categoria: "EMPRESA", titulo: "CND Municipal (Betim)", descricao: "Certidão negativa de tributos municipais", tipo: "externo", origem: "Prefeitura de Betim", validade_meses: 3, como_obter: "Portal da Prefeitura de Betim → Certidões" },
  { categoria: "EMPRESA", titulo: "CND Estadual (MG)", descricao: "Certidão de débitos tributários estaduais", tipo: "externo", origem: "SEF/MG", validade_meses: 3, como_obter: "www.fazenda.mg.gov.br → CDT" },
  { categoria: "EMPRESA", titulo: "PGR — Programa de Gerenciamento de Riscos", descricao: "NR-01, elaborado por profissional de SST", tipo: "externo", origem: "Consultoria SST", validade_meses: 24, como_obter: "Contratar técnico/engenheiro de segurança" },
  { categoria: "EMPRESA", titulo: "PCMSO — Programa de Controle Médico", descricao: "NR-07, coordenado por médico do trabalho", tipo: "externo", origem: "Clínica ocupacional", validade_meses: 12, como_obter: "Clínica de medicina ocupacional" },
  { categoria: "EMPRESA", titulo: "Apólice de seguro de responsabilidade civil", descricao: "Quando exigida pelo contratante", tipo: "externo", origem: "Seguradora", validade_meses: 12, como_obter: "Corretor de seguros" },
];

// Documentos por funcionário, com NRs conforme o tipo de serviço
function docsFuncionario(nome: string, tipoServico: string): DocItem[] {
  const t = (tipoServico || "").toLowerCase();
  const docs: DocItem[] = [
    { categoria: "FUNCIONARIO", titulo: `Ficha de registro — ${nome}`, descricao: "Comprovante de vínculo empregatício", tipo: "gerado", funcionarioNome: nome },
    { categoria: "FUNCIONARIO", titulo: `ASO — ${nome}`, descricao: "Atestado de Saúde Ocupacional vigente", tipo: "externo", validade_meses: 12, funcionarioNome: nome },
    { categoria: "FUNCIONARIO", titulo: `Ordem de Serviço — ${nome}`, descricao: "OS com riscos e medidas de proteção da função", tipo: "gerado", funcionarioNome: nome },
    { categoria: "FUNCIONARIO", titulo: `Ficha de entrega de EPI — ${nome}`, descricao: "Com nº do CA e assinatura do trabalhador", tipo: "gerado", funcionarioNome: nome },
    { categoria: "FUNCIONARIO", titulo: `Treinamento NR-06 (EPI) — ${nome}`, descricao: "Uso e conservação de EPIs", tipo: "externo", validade_meses: 12, funcionarioNome: nome },
  ];
  if (t.includes("roçada") || t.includes("rocada") || t.includes("jardin") || t.includes("poda") || t.includes("supress")) {
    docs.push({ categoria: "FUNCIONARIO", titulo: `Treinamento NR-12 (roçadeira/motosserra) — ${nome}`, descricao: "Operação segura de máquinas", tipo: "externo", validade_meses: 24, funcionarioNome: nome });
  }
  if (t.includes("altura") || t.includes("poda")) {
    docs.push({ categoria: "FUNCIONARIO", titulo: `Treinamento NR-35 (altura) — ${nome}`, descricao: "Trabalho em altura, quando aplicável", tipo: "externo", validade_meses: 24, funcionarioNome: nome });
  }
  if (t.includes("dedetiza") || t.includes("praga") || t.includes("químic") || t.includes("quimic") || t.includes("capina química")) {
    docs.push({ categoria: "FUNCIONARIO", titulo: `Treinamento FISPQ (químicos) — ${nome}`, descricao: "Manuseio de produtos químicos", tipo: "externo", validade_meses: 12, funcionarioNome: nome });
  }
  return docs;
}

function docsContrato(contrato: any): DocItem[] {
  return [
    { categoria: "CONTRATO", titulo: "Proposta comercial aprovada", descricao: "Proposta com composição de preços aceita pelo cliente", tipo: "gerado" },
    { categoria: "CONTRATO", titulo: "Instrumento contratual assinado", descricao: `Objeto: ${contrato?.objeto || "prestação de serviços"}`, tipo: "externo", origem: "Jurídico/Cliente" },
    { categoria: "CONTRATO", titulo: "ART — Anotação de Responsabilidade Técnica", descricao: "Quando exigida (CREA-MG)", tipo: "externo", origem: "CREA-MG", como_obter: "Portal CREA-MG → emissão de ART" },
    { categoria: "CONTRATO", titulo: "Cronograma físico de execução", descricao: "Planejamento mensal aprovado", tipo: "gerado" },
    { categoria: "CONTRATO", titulo: "Relação de equipe mobilizada", descricao: "Funcionários alocados com funções", tipo: "gerado" },
    { categoria: "CONTRATO", titulo: "Diário de obras (modelo)", descricao: "Registro diário de atividades em campo", tipo: "gerado" },
    { categoria: "CONTRATO", titulo: "Boletim de medição (modelo)", descricao: "Medição mensal para faturamento", tipo: "gerado" },
    { categoria: "CONTRATO", titulo: "Dossiê SSO da equipe", descricao: "Checklist de 19 requisitos por funcionário (módulo Documentação SSO)", tipo: "gerado" },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const contrato = body.contrato || {};
    const funcionarios: any[] = Array.isArray(body.funcionarios) ? body.funcionarios : [];
    const tipoServico: string = body.tipoServico || contrato.tipoServico || "";

    let config = null;
    try { config = await prisma.companyConfig.findFirst(); } catch { /* banco indisponível — usa padrão */ }

    const documentos: DocItem[] = [
      ...DOCS_EMPRESA,
      ...funcionarios.flatMap((f) => docsFuncionario(f.name || f.nome || "Funcionário", tipoServico)),
      ...docsContrato(contrato),
    ];

    const stats = {
      total: documentos.length,
      empresa: documentos.filter((d) => d.categoria === "EMPRESA").length,
      funcionarios: documentos.filter((d) => d.categoria === "FUNCIONARIO").length,
      contrato: documentos.filter((d) => d.categoria === "CONTRATO").length,
      gerados: documentos.filter((d) => d.tipo === "gerado").length,
      externos: documentos.filter((d) => d.tipo === "externo").length,
    };

    return NextResponse.json({
      success: true,
      stats,
      documentos,
      empresa: {
        razaoSocial: config?.razaoSocial || "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
        cnpj: config?.cnpj || "30.198.776/0001-29",
        endereco: `${config?.logradouro || "R. Primeiro de Janeiro, 415"} – ${config?.bairro || "Amazonas"}, ${config?.municipio || "Betim"}/${config?.uf || "MG"}`,
        telefone: config?.telefone || "(31) 3591-4546",
        email: config?.email?.toLowerCase() || "adm@verdelimp.com.br",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
