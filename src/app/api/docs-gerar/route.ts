// src/app/api/docs-gerar/route.ts
// Gera todos os documentos exigidos para o contrato em HTML imprimível (PDF via browser)
// 3 categorias: Empresa | Funcionários | Contrato/Obra
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMPRESA_CONFIG = {
  razaoSocial: "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
  cnpj: "30.198.776/0001-29",
  inscricaoMunicipal: "—",
  endereco: "R. Primeiro de Janeiro, 415 — Amazonas, Betim/MG — CEP 32.685-066",
  telefone: "(31) 3591-4546",
  email: "ADM@VERDELIMP.COM.BR",
  cnae: "81.30-3-00 (Atividades de paisagismo)",
  regime: "Simples Nacional",
  porte: "EPP",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contratoId, contrato, funcionarios, tipoServico } = body;

    if (!contrato || !funcionarios?.length) {
      return NextResponse.json({ error: "Contrato e funcionários obrigatórios" }, { status: 400 });
    }

    // Buscar dados completos da empresa
    let empresa = EMPRESA_CONFIG;
    try {
      const cfg = await prisma.companyConfig.findFirst();
      if (cfg) {
        empresa = {
          razaoSocial: cfg.razaoSocial || empresa.razaoSocial,
          cnpj: cfg.cnpj || empresa.cnpj,
          inscricaoMunicipal: cfg.inscMunicipal || empresa.inscricaoMunicipal,
          endereco: `${cfg.logradouro || ""}, ${cfg.bairro || ""} ${cfg.municipio || "Betim"}/${cfg.uf || "MG"} ${cfg.cep ? "CEP "+cfg.cep : ""}`,
          telefone: cfg.telefone || empresa.telefone,
          email: cfg.email || empresa.email,
          cnae: cfg.cnaePrincipal || empresa.cnae,
          regime: cfg.regimeTributario || empresa.regime,
          porte: cfg.porte || empresa.porte,
        };
      }
    } catch { /* usar default */ }

    // ─────────────────────────────────────────────────────────────
    // Gerar lista de documentos a serem produzidos
    // ─────────────────────────────────────────────────────────────
    const documentos: any[] = [];

    // ═══ DOCUMENTOS DA EMPRESA ═════════════════════════════════════
    documentos.push({
      categoria: "EMPRESA",
      ordem: 1,
      titulo: "Cartão CNPJ",
      descricao: "Comprovante de inscrição CNPJ atualizado da empresa",
      origem: "Receita Federal",
      como_obter: "https://servicos.receita.fazenda.gov.br — Inscrição CNPJ",
      validade_meses: 12,
      obrigatorio: true,
      tipo: "externo",
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 2,
      titulo: "Certidão Negativa de Débitos (CND) Federal",
      descricao: "Certidão Conjunta da Receita Federal e PGFN",
      origem: "Receita Federal",
      como_obter: "https://solucoes.receita.fazenda.gov.br/servicos/certidaointernet/PJ/Emitir",
      validade_meses: 6,
      obrigatorio: true,
      tipo: "externo",
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 3,
      titulo: "CRF — Certificado de Regularidade FGTS",
      descricao: "Comprovante de regularidade junto ao FGTS",
      origem: "Caixa Econômica Federal",
      como_obter: "https://consulta-crf.caixa.gov.br/consultacrf",
      validade_meses: 1,
      obrigatorio: true,
      tipo: "externo",
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 4,
      titulo: "CNDT — Certidão Negativa de Débitos Trabalhistas",
      descricao: "Comprovante de inexistência de débitos trabalhistas",
      origem: "TST",
      como_obter: "https://cndt-certidao.tst.jus.br/",
      validade_meses: 6,
      obrigatorio: true,
      tipo: "externo",
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 5,
      titulo: "Certidão Negativa Estadual MG",
      descricao: "Certidão de tributos estaduais",
      origem: "SEF/MG",
      como_obter: "https://www.fazenda.mg.gov.br",
      validade_meses: 6,
      obrigatorio: true,
      tipo: "externo",
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 6,
      titulo: "Certidão Negativa Municipal",
      descricao: `Certidão de tributos do município de ${empresa.endereco.match(/\b([A-Z][a-zA-Z]+)\/[A-Z]{2}\b/)?.[1] || "Betim"}`,
      origem: "Prefeitura Municipal",
      como_obter: "Portal da prefeitura",
      validade_meses: 6,
      obrigatorio: true,
      tipo: "externo",
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 7,
      titulo: "Contrato Social (última alteração)",
      descricao: "Contrato Social com última alteração registrada na Junta Comercial",
      origem: "Junta Comercial",
      como_obter: "https://www.jucemg.mg.gov.br",
      validade_meses: null,
      obrigatorio: true,
      tipo: "interno",
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 8,
      titulo: "Declaração de não emprego de menor de idade",
      descricao: "Conforme art. 7º, XXXIII da CF — declaração padrão",
      origem: "Empresa (gerada pelo sistema)",
      como_obter: "Documento gerado abaixo",
      validade_meses: 12,
      obrigatorio: true,
      tipo: "gerado",
      gerar: true,
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 9,
      titulo: "Declaração de inexistência de fato impeditivo",
      descricao: "Declaração de que não há impedimentos para licitar/contratar",
      origem: "Empresa (gerada pelo sistema)",
      como_obter: "Documento gerado abaixo",
      validade_meses: 12,
      obrigatorio: true,
      tipo: "gerado",
      gerar: true,
    });
    documentos.push({
      categoria: "EMPRESA",
      ordem: 10,
      titulo: "Atestado de Capacidade Técnica",
      descricao: "Atestado de execução de serviços similares",
      origem: "Cliente anterior",
      como_obter: "Solicitar a clientes anteriores",
      validade_meses: null,
      obrigatorio: true,
      tipo: "externo",
    });

    // ═══ DOCUMENTOS POR FUNCIONÁRIO ═══════════════════════════════
    funcionarios.forEach((f: any, idx: number) => {
      const baseOrdem = 100 + (idx * 20);
      documentos.push({
        categoria: "FUNCIONARIO",
        funcionarioId: f.id,
        funcionarioNome: f.name,
        ordem: baseOrdem,
        titulo: `Ficha de Registro de Empregado — ${f.name}`,
        descricao: "Ficha do empregado conforme CLT, com dados pessoais e admissionais",
        tipo: "gerado",
        gerar: true,
      });
      documentos.push({
        categoria: "FUNCIONARIO",
        funcionarioId: f.id,
        funcionarioNome: f.name,
        ordem: baseOrdem + 1,
        titulo: `ASO — Atestado de Saúde Ocupacional — ${f.name}`,
        descricao: "Atestado emitido pelo médico do trabalho",
        tipo: "externo",
        como_obter: "Médico do trabalho",
        validade_meses: 12,
      });
      documentos.push({
        categoria: "FUNCIONARIO",
        funcionarioId: f.id,
        funcionarioNome: f.name,
        ordem: baseOrdem + 2,
        titulo: `Ficha de Entrega de EPI — ${f.name}`,
        descricao: "Comprovante de entrega de EPIs com nº CA conforme NR-06",
        tipo: "gerado",
        gerar: true,
      });
      documentos.push({
        categoria: "FUNCIONARIO",
        funcionarioId: f.id,
        funcionarioNome: f.name,
        ordem: baseOrdem + 3,
        titulo: `Certificado NR-06 — ${f.name}`,
        descricao: "Treinamento sobre uso correto de EPI",
        tipo: "externo",
        como_obter: "Instituição de treinamento",
        validade_meses: 24,
      });
      // Se for operador de roçadeira/motosserra, NR-12
      if (/Roçadeira|Motosserra|Operador/i.test(f.role) || tipoServico?.includes("Roçada") || tipoServico?.includes("Podação")) {
        documentos.push({
          categoria: "FUNCIONARIO",
          funcionarioId: f.id,
          funcionarioNome: f.name,
          ordem: baseOrdem + 4,
          titulo: `Certificado NR-12 — ${f.name}`,
          descricao: "Treinamento de Segurança no Trabalho em Máquinas e Equipamentos",
          tipo: "externo",
          como_obter: "SENAI / Empresa de treinamento",
          validade_meses: 24,
        });
      }
      // Trabalho em altura
      if (tipoServico === "Podação" || tipoServico === "PRADA/PTRF") {
        documentos.push({
          categoria: "FUNCIONARIO",
          funcionarioId: f.id,
          funcionarioNome: f.name,
          ordem: baseOrdem + 5,
          titulo: `Certificado NR-35 — ${f.name}`,
          descricao: "Treinamento de Trabalho em Altura (acima de 2m)",
          tipo: "externo",
          como_obter: "Empresa de treinamento credenciada",
          validade_meses: 24,
        });
      }
      // CNH para motoristas
      if (/Motorista|Operador de Retro/i.test(f.role)) {
        documentos.push({
          categoria: "FUNCIONARIO",
          funcionarioId: f.id,
          funcionarioNome: f.name,
          ordem: baseOrdem + 6,
          titulo: `CNH atualizada — ${f.name}`,
          descricao: "Carteira Nacional de Habilitação na categoria adequada",
          tipo: "externo",
          como_obter: "DETRAN",
          validade_meses: 60,
        });
      }
    });

    // ═══ DOCUMENTOS DO CONTRATO/OBRA ═══════════════════════════════
    documentos.push({
      categoria: "CONTRATO",
      ordem: 200,
      titulo: "Plano de Trabalho",
      descricao: "Documento detalhado com escopo, metodologia e cronograma",
      tipo: "gerado",
      gerar: true,
    });
    documentos.push({
      categoria: "CONTRATO",
      ordem: 201,
      titulo: "Cronograma Físico-Financeiro",
      descricao: "Cronograma de execução com marcos financeiros",
      tipo: "gerado",
      gerar: true,
    });
    documentos.push({
      categoria: "CONTRATO",
      ordem: 202,
      titulo: "Anexo I — Equipe Técnica Mobilizada",
      descricao: `Relação dos ${funcionarios.length} funcionários alocados ao contrato`,
      tipo: "gerado",
      gerar: true,
    });
    documentos.push({
      categoria: "CONTRATO",
      ordem: 203,
      titulo: "Anexo II — Lista de Equipamentos e Veículos",
      descricao: "Equipamentos a serem mobilizados na execução",
      tipo: "gerado",
      gerar: true,
    });
    documentos.push({
      categoria: "CONTRATO",
      ordem: 204,
      titulo: "ART — Anotação de Responsabilidade Técnica",
      descricao: "ART específica para o contrato (CREA-MG)",
      tipo: "externo",
      como_obter: "Sistema CREA-MG online",
      validade_meses: null,
    });
    documentos.push({
      categoria: "CONTRATO",
      ordem: 205,
      titulo: "Procedimento Operacional Padrão (POP)",
      descricao: "POP específico para o tipo de serviço executado",
      tipo: "gerado",
      gerar: true,
    });
    documentos.push({
      categoria: "CONTRATO",
      ordem: 206,
      titulo: "Plano de Gerenciamento de Resíduos",
      descricao: "PGR para destinação adequada dos resíduos vegetais",
      tipo: "gerado",
      gerar: true,
    });

    // Estatísticas
    const stats = {
      total: documentos.length,
      empresa: documentos.filter(d => d.categoria === "EMPRESA").length,
      funcionarios: documentos.filter(d => d.categoria === "FUNCIONARIO").length,
      contrato: documentos.filter(d => d.categoria === "CONTRATO").length,
      gerados: documentos.filter(d => d.tipo === "gerado").length,
      externos: documentos.filter(d => d.tipo === "externo").length,
    };

    return NextResponse.json({
      success: true,
      empresa,
      contrato,
      funcionarios,
      documentos,
      stats,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
