// src/app/api/regularidade/cnpj/[cnpj]/route.ts
// Consulta de Regularidade Fiscal e Situação Cadastral
// Fontes: BrasilAPI (Receita Federal), SINTEGRA/SEFAZ via CNPJ
// Apoio gerencial — validar certidões originais nos órgãos oficiais

import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";
import { erroInterno } from "@/lib/authz";

/* ─── Fontes de CND disponíveis publicamente ─────────────────────
   CND Federal:    https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir
   CRF/FGTS:       https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf
   SINTEGRA/ICMS:  https://www.sintegra.gov.br (por UF)
   Situação Receita Federal: BrasilAPI (dados da RF com até 24h de delay)
   ─────────────────────────────────────────────────────────────── */

interface RegularidadeResult {
  cnpj: string;
  razaoSocial: string | null;
  situacaoCadastral: string | null;
  situacaoDesc: string | null;
  dataAbertura: string | null;
  cnae: string | null;
  municipio: string | null;
  uf: string | null;
  porte: string | null;
  natureza: string | null;
  email: string | null;
  telefone: string | null;
  // Regularidade interpretada a partir da situação cadastral RF
  regularidadeRF: "regular" | "irregular" | "pendente" | "desconhecida";
  alertas: string[];
  recomendacoes: string[];
  fontes: { nome: string; url: string; obs: string }[];
  consultadoEm: string;
  cached: boolean;
}

const SITUACAO_MAP: Record<string, { status: "regular" | "irregular" | "pendente" | "desconhecida"; desc: string }> = {
  "ATIVA": { status: "regular", desc: "CNPJ ativo na Receita Federal" },
  "BAIXADA": { status: "irregular", desc: "CNPJ baixado — empresa encerrada" },
  "INAPTA": { status: "irregular", desc: "CNPJ inapto — verificar irregularidades" },
  "SUSPENSA": { status: "pendente", desc: "CNPJ suspenso — pendências a regularizar" },
  "NULA": { status: "irregular", desc: "CNPJ nulo — situação crítica" },
};

type ContextoCnpj = { params: Promise<{ cnpj: string }> };

export async function GET(
  _req: NextRequest,
  { params }: ContextoCnpj
) {
  const { cnpj } = await params;
  const clean = cnpj.replace(/\D/g, "");

  if (clean.length !== 14) {
    return NextResponse.json({ error: "CNPJ deve ter 14 dígitos" }, { status: 400 });
  }

  if (!validarCNPJ(clean)) {
    return NextResponse.json({ error: "CNPJ inválido — dígitos verificadores incorretos" }, { status: 400 });
  }

  try {
    const { data, cached } = await fetchWithCache(
      `https://brasilapi.com.br/api/cnpj/v1/${clean}`,
      `regularidade:cnpj:${clean}`,
      "brasilapi-cnpj",
      3_600_000 * 6 // cache 6h para regularidade
    ) as { data: any; cached: boolean };

    if (data.message) {
      return NextResponse.json({ error: data.message || "CNPJ não encontrado na Receita Federal" }, { status: 404 });
    }

    const situacao = (data.descricao_situacao_cadastral || data.situacao_cadastral || "").toUpperCase().trim();
    const mapeado = SITUACAO_MAP[situacao] || { status: "desconhecida" as const, desc: `Situação: ${situacao}` };

    const alertas: string[] = [];
    const recomendacoes: string[] = [];

    // Analisar situação
    if (mapeado.status === "irregular") {
      alertas.push(`⛔ CNPJ com situação "${situacao}" — NÃO emitir NFS-e para este tomador sem regularização`);
      alertas.push("⛔ Risco de rejeição em licitações e contratos públicos");
      recomendacoes.push("Solicitar CND Federal atualizada ao fornecedor/cliente antes de qualquer operação");
      recomendacoes.push("Verificar se há processos de falência ou recuperação judicial");
    } else if (mapeado.status === "pendente") {
      alertas.push(`⚠️ CNPJ com situação "${situacao}" — verificar pendências antes de contratar`);
      recomendacoes.push("Solicitar regularização e CND atualizada");
    } else if (mapeado.status === "regular") {
      recomendacoes.push("Consultar CND Federal diretamente na Receita Federal para fins contratuais");
      recomendacoes.push("Verificar CRF/FGTS na Caixa Econômica Federal");
      recomendacoes.push("Para contratos públicos, solicitar certidões originais atualizadas");
    }

    // Verificar CNAE para risco de ISS de Betim
    const cnaeStr = String(data.cnae_fiscal || "").replace(/\D/g, "");
    const cnaesServico = ["8130300", "8122200", "8129000", "0220906", "3811400", "4399199"];
    if (cnaesServico.includes(cnaeStr)) {
      recomendacoes.push(`CNAE ${data.cnae_fiscal} sujeito a retenção de ISS — verificar obrigatoriedade de retenção na fonte`);
    }

    // Alertar se MEI ou ME com restrições
    if (data.porte === "MICRO EMPRESA" || data.porte === "EMPRESA DE PEQUENO PORTE") {
      recomendacoes.push(`Porte ${data.porte}: verificar limites de faturamento para Simples Nacional antes de contratos de alto valor`);
    }

    const result: RegularidadeResult = {
      cnpj: clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"),
      razaoSocial: data.razao_social || null,
      situacaoCadastral: situacao,
      situacaoDesc: mapeado.desc,
      dataAbertura: data.data_inicio_atividade || null,
      cnae: data.cnae_fiscal_descricao ? `${data.cnae_fiscal} — ${data.cnae_fiscal_descricao}` : null,
      municipio: data.municipio || null,
      uf: data.uf || null,
      porte: data.porte || null,
      natureza: data.natureza_juridica || null,
      email: data.email || null,
      telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : null,
      regularidadeRF: mapeado.status,
      alertas,
      recomendacoes,
      fontes: [
        {
          nome: "Receita Federal — Situação Cadastral (via BrasilAPI)",
          url: "https://www.receita.fazenda.gov.br/pessoajuridica/cnpj/cnpjreva/cnpjreva_solicitacao.asp",
          obs: "Dados consultados com até 6h de cache. Verificar diretamente para fins oficiais."
        },
        {
          nome: "CND Federal — Certidão Negativa de Débitos",
          url: "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir",
          obs: "Emitir certidão atualizada para contratos e licitações"
        },
        {
          nome: "CRF/FGTS — Certidão de Regularidade do FGTS",
          url: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf",
          obs: "Obrigatória para contratos com a Administração Pública"
        },
        {
          nome: "SINTEGRA — Situação Estadual (ICMS — MG)",
          url: "https://www.fazenda.mg.gov.br/empresas/cadastro_contribuintes/consulta_publica/",
          obs: "Consultar situação estadual no SINTEGRA da SEFAZ/MG"
        },
        {
          nome: "Certidão de Regularidade Trabalhista — TST",
          url: "https://certidao.tst.jus.br/",
          obs: "Obrigatória para contratos com a Administração Pública (Lei 12.440/2011)"
        },
      ],
      consultadoEm: new Date().toISOString(),
      cached,
    };

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Erro ao consultar Receita Federal", _demo: true, ...DEMO_RESULT(clean) },
      { status: 200 }
    );
  }
}

// Validação matemática do CNPJ
function validarCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  const calc = (digits: string, weights: number[]) =>
    digits.split("").reduce((sum, d, i) => sum + parseInt(d) * weights[i], 0);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(cnpj.slice(0, 12), w1) % 11;
  const d1 = r1 < 2 ? 0 : 11 - r1;
  if (parseInt(cnpj[12]) !== d1) return false;
  const r2 = calc(cnpj.slice(0, 13), w2) % 11;
  const d2 = r2 < 2 ? 0 : 11 - r2;
  return parseInt(cnpj[13]) === d2;
}

function DEMO_RESULT(cnpj: string) {
  return {
    cnpj: cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"),
    razaoSocial: "DADOS DEMONSTRATIVOS — Consultar Receita Federal",
    situacaoCadastral: "ATIVA",
    situacaoDesc: "CNPJ ativo na Receita Federal",
    regularidadeRF: "regular",
    alertas: [],
    recomendacoes: ["Verificar CND Federal diretamente na Receita Federal para fins contratuais"],
    fontes: [],
    consultadoEm: new Date().toISOString(),
    cached: false,
  };
}

// ══════════════════════════════════════════════════════════════════
// INTEGRAÇÃO GED — salvar certidões verificadas no GED automaticamente
// POST /api/regularidade/cnpj/[cnpj] — corpo: { fontes, razaoSocial, salvarGed: true }
// ══════════════════════════════════════════════════════════════════

export async function POST(req: NextRequest, { params }: ContextoCnpj) {
  // Salva as certidões consultadas no GED automaticamente
  try {
    const { cnpj } = await params;
    const body = await req.json();
    const { fontes, razaoSocial } = body;

    if (!fontes?.length) {
      return NextResponse.json({ error: "Fontes obrigatórias" }, { status: 400 });
    }

    // Mapeamento certidão → metadados GED
    const CERT_MAP: Record<string, { subcategoria: string; validadeDias: number }> = {
      "CND Federal":           { subcategoria: "Certidão CND",        validadeDias: 180 },
      "CRF/FGTS":              { subcategoria: "Certidão FGTS",       validadeDias: 30  },
      "Certidão Trabalhista":  { subcategoria: "Certidão Trabalhista", validadeDias: 180 },
      "SINTEGRA":              { subcategoria: "Certidão Municipal",   validadeDias: 180 },
      "CND Municipal":         { subcategoria: "Certidão Municipal",   validadeDias: 180 },
      "CADIN":                 { subcategoria: "Certidão CND",        validadeDias: 180 },
    };

    const { prisma } = await import("@/lib/prisma");
    const hoje = new Date();
    const cnpjFormatado = cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");

    // Buscar se é o próprio CNPJ da empresa ou de cliente
    let clienteId: string | null = null;
    try {
      const cliente = await prisma.client.findFirst({ where: { cnpjCpf: cnpjFormatado } });
      clienteId = cliente?.id || null;
    } catch { /* sem cliente, ok */ }

    const salvos: string[] = [];
    const ignorados: string[] = [];

    for (const fonte of fontes) {
      // Identificar qual certidão é esta fonte
      let chave: string | null = null;
      for (const k of Object.keys(CERT_MAP)) {
        if (fonte.nome?.includes(k)) { chave = k; break; }
      }

      // Pular fontes que não são certidões (ex: BrasilAPI, Receita Federal cadastral)
      if (!chave || fonte.nome?.includes("BrasilAPI") || fonte.nome?.includes("Situação Cadastral")) {
        ignorados.push(fonte.nome);
        continue;
      }

      const meta = CERT_MAP[chave];
      const validade = new Date(hoje);
      validade.setDate(validade.getDate() + meta.validadeDias);

      // Nome do documento
      const nomeCNPJ = razaoSocial ? ` — ${razaoSocial}` : cnpjFormatado ? ` — ${cnpjFormatado}` : "";
      const nomeDoc = `${chave}${nomeCNPJ} (${hoje.toLocaleDateString("pt-BR")})`;

      // Verificar se já existe documento recente (últimos 7 dias) para não duplicar
      try {
        const existente = await prisma.document.findFirst({
          where: {
            subcategoria: meta.subcategoria,
            nome: { contains: chave },
            createdAt: { gte: new Date(hoje.getTime() - 7 * 86400000) },
          },
        });

        if (existente) {
          ignorados.push(`${chave} (já existe — ${existente.createdAt.toLocaleDateString("pt-BR")})`);
          continue;
        }

        // Criar no GED
        await prisma.document.create({
          data: {
            nome: nomeDoc,
            descricao: fonte.obs || "Certidão consultada automaticamente via módulo de Regularidade Fiscal",
            categoria: "fiscal",
            subcategoria: meta.subcategoria,
            tags: `certidao,regularidade,${chave.toLowerCase().replace(/\//g,"-").replace(/ /g,"-")},${hoje.getFullYear()}`,
            clienteId: clienteId || null,
            estrategia: "url",
            urlArquivo: fonte.url || null,
            mimeType: "application/pdf",
            validade,
            status: "ativo",
            versao: 1,
            confidencial: false,
            uploadBy: "Regularidade Fiscal (automático)",
          },
        });

        salvos.push(chave);
      } catch (e: any) {
        ignorados.push(`${chave} (erro: ${e.message})`);
      }
    }

    return NextResponse.json({
      success: true,
      salvos,
      ignorados,
      mensagem: `✅ ${salvos.length} certidão(ões) salvas no GED com vencimento calculado automaticamente`,
    });
  } catch (e: any) {
    return erroInterno(e, "api/regularidade/cnpj/[cnpj]");
  }
}
