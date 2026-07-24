// Consulta de situação cadastral de CNPJ e referências para emissão de certidões.
// Situação ATIVA na Receita Federal não equivale a regularidade fiscal.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchWithCache } from "@/lib/api-cache";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/admin";

export const dynamic = "force-dynamic";

const PAPEIS = ["ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO", "FISCAL"];

type ContextoCnpj = { params: Promise<{ cnpj: string }> };

type StatusCadastral = "ativa" | "irregular" | "suspensa" | "desconhecida";

const SITUACAO_MAP: Record<string, { status: StatusCadastral; legacy: "regular" | "irregular" | "pendente" | "desconhecida"; desc: string }> = {
  ATIVA: { status: "ativa", legacy: "regular", desc: "CNPJ ativo no cadastro da Receita Federal" },
  BAIXADA: { status: "irregular", legacy: "irregular", desc: "CNPJ baixado no cadastro da Receita Federal" },
  INAPTA: { status: "irregular", legacy: "irregular", desc: "CNPJ inapto no cadastro da Receita Federal" },
  SUSPENSA: { status: "suspensa", legacy: "pendente", desc: "CNPJ suspenso no cadastro da Receita Federal" },
  NULA: { status: "irregular", legacy: "irregular", desc: "CNPJ nulo no cadastro da Receita Federal" },
};

const FonteSchema = z.object({
  nome: z.string().trim().min(2).max(250),
  url: z.string().trim().url().max(2000).optional().nullable(),
  obs: z.string().trim().max(1000).optional().nullable(),
  documentUrl: z.string().trim().url().max(2000).optional().nullable(),
  validade: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

const SalvarGedSchema = z.object({
  fontes: z.array(FonteSchema).min(1).max(30),
  razaoSocial: z.string().trim().max(250).optional().nullable(),
});

function validarCNPJ(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (digits: string, weights: number[]) =>
    digits.split("").reduce((sum, digit, index) => sum + Number(digit) * weights[index], 0);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const r1 = calc(cnpj.slice(0, 12), w1) % 11;
  const d1 = r1 < 2 ? 0 : 11 - r1;
  if (Number(cnpj[12]) !== d1) return false;
  const r2 = calc(cnpj.slice(0, 13), w2) % 11;
  const d2 = r2 < 2 ? 0 : 11 - r2;
  return Number(cnpj[13]) === d2;
}

function formatarCnpj(cnpj: string) {
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

const FONTES_OFICIAIS = [
  {
    nome: "Receita Federal — Comprovante de Inscrição e Situação Cadastral",
    url: "https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp",
    obs: "Confirma dados cadastrais. Não comprova inexistência de débitos.",
  },
  {
    nome: "CND Federal — Receita Federal e PGFN",
    url: "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir",
    obs: "Emitir certidão atualizada para verificar débitos federais e dívida ativa da União.",
  },
  {
    nome: "CRF/FGTS — Caixa Econômica Federal",
    url: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf",
    obs: "Consultar a regularidade do FGTS diretamente na Caixa.",
  },
  {
    nome: "CNDT — Tribunal Superior do Trabalho",
    url: "https://certidao.tst.jus.br/",
    obs: "Emitir a Certidão Negativa de Débitos Trabalhistas.",
  },
  {
    nome: "Situação estadual — SEF/MG",
    url: "https://www.fazenda.mg.gov.br/empresas/cadastro_contribuintes/consulta_publica/",
    obs: "Aplicável quando houver inscrição estadual em Minas Gerais.",
  },
];

export async function GET(_req: NextRequest, { params }: ContextoCnpj) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  const { cnpj } = await params;
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return NextResponse.json({ error: "CNPJ deve ter 14 dígitos" }, { status: 400 });
  if (!validarCNPJ(clean)) return NextResponse.json({ error: "CNPJ inválido — dígitos verificadores incorretos" }, { status: 400 });

  try {
    const { data, cached } = await fetchWithCache(
      `https://brasilapi.com.br/api/cnpj/v1/${clean}`,
      `regularidade:cnpj:${clean}`,
      "brasilapi-cnpj",
      6 * 60 * 60 * 1000,
    ) as { data: any; cached: boolean };

    if (!data || data.message) {
      return NextResponse.json({ error: data?.message || "CNPJ não localizado na fonte consultada" }, { status: 404 });
    }

    const situacao = String(data.descricao_situacao_cadastral || data.situacao_cadastral || "DESCONHECIDA").toUpperCase().trim();
    const mapeado = SITUACAO_MAP[situacao] || {
      status: "desconhecida" as const,
      legacy: "desconhecida" as const,
      desc: situacao ? `Situação cadastral informada: ${situacao}` : "Situação cadastral não informada",
    };

    const alertas: string[] = [];
    const recomendacoes = [
      "Emita e confira as certidões oficiais antes de habilitação, contratação, pagamento relevante ou concessão de crédito.",
      "CNPJ ativo comprova apenas situação cadastral; não comprova regularidade fiscal, trabalhista ou perante o FGTS.",
    ];

    if (mapeado.status === "irregular") {
      alertas.push(`CNPJ com situação cadastral ${situacao}. Verifique a situação diretamente na Receita Federal antes de prosseguir.`);
    } else if (mapeado.status === "suspensa") {
      alertas.push("CNPJ suspenso. Solicite esclarecimentos e documentos atualizados antes de contratar ou liberar operação sensível.");
    }

    const cnae = data.cnae_fiscal_descricao
      ? `${data.cnae_fiscal || ""} — ${data.cnae_fiscal_descricao}`.trim()
      : data.cnae_fiscal ? String(data.cnae_fiscal) : null;

    return NextResponse.json({
      cnpj: formatarCnpj(clean),
      razaoSocial: data.razao_social || null,
      situacaoCadastral: situacao || null,
      situacaoStatus: mapeado.status,
      situacaoDesc: mapeado.desc,
      // Campo legado para não quebrar a interface; representa somente a situação cadastral.
      regularidadeRF: mapeado.legacy,
      regularidadeFiscal: "nao_verificada",
      dataAbertura: data.data_inicio_atividade || null,
      cnae,
      municipio: data.municipio || null,
      uf: data.uf || null,
      porte: data.porte || null,
      natureza: data.natureza_juridica || null,
      email: data.email || null,
      telefone: data.ddd_telefone_1 || data.telefone_1 || null,
      alertas,
      recomendacoes,
      fontes: FONTES_OFICIAIS,
      consultadoEm: new Date().toISOString(),
      cached,
      source: "BrasilAPI / dados cadastrais da Receita Federal",
      avisoLegal: "Resultado gerencial. Para prova de regularidade, utilize as certidões emitidas nos portais oficiais.",
    });
  } catch (e) {
    console.error("[api/regularidade/cnpj GET]", e);
    return NextResponse.json({
      error: "O serviço externo de consulta cadastral está indisponível. Nenhum dado demonstrativo foi utilizado.",
      source: "BrasilAPI",
    }, { status: 502 });
  }
}

export async function POST(req: NextRequest, { params }: ContextoCnpj) {
  const { user, erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  try {
    const { cnpj } = await params;
    const clean = cnpj.replace(/\D/g, "");
    if (!validarCNPJ(clean)) return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });

    const parsed = SalvarGedSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const cnpjFormatado = formatarCnpj(clean);
    const cliente = await prisma.client.findFirst({
      where: { OR: [{ cnpjCpf: cnpjFormatado }, { cnpjCpf: clean }] },
      select: { id: true },
    });

    const salvos: string[] = [];
    const ignorados: string[] = [];
    const criados: string[] = [];

    for (const fonte of parsed.data.fontes) {
      const urlArquivo = fonte.documentUrl || fonte.url || null;
      if (!urlArquivo) {
        ignorados.push(`${fonte.nome} (sem URL)`);
        continue;
      }

      const documentoEmitido = Boolean(fonte.documentUrl);
      const nome = documentoEmitido
        ? `${fonte.nome} — ${parsed.data.razaoSocial || cnpjFormatado}`
        : `Portal de consulta — ${fonte.nome} — ${parsed.data.razaoSocial || cnpjFormatado}`;

      const existente = await prisma.document.findFirst({
        where: {
          urlArquivo,
          clienteId: cliente?.id || null,
          status: "ativo",
        },
        select: { id: true },
      });
      if (existente) {
        ignorados.push(`${fonte.nome} (referência já cadastrada)`);
        continue;
      }

      const doc = await prisma.document.create({
        data: {
          nome,
          descricao: documentoEmitido
            ? fonte.obs || "Certidão informada pelo usuário no módulo de regularidade"
            : `${fonte.obs || "Portal oficial de consulta"} Este registro é apenas uma referência de acesso e não representa certidão emitida.`,
          categoria: "fiscal",
          subcategoria: documentoEmitido ? "Certidão" : "Referência de Regularidade",
          tags: `regularidade,cnpj,${clean},${documentoEmitido ? "certidao" : "portal-consulta"}`,
          clienteId: cliente?.id || null,
          estrategia: "url",
          urlArquivo,
          validade: fonte.validade ? new Date(`${fonte.validade}T12:00:00`) : null,
          status: "ativo",
          versao: 1,
          confidencial: false,
          uploadBy: user!.name || user!.email || user!.id,
        },
      });
      criados.push(doc.id);
      salvos.push(fonte.nome);
    }

    await registrarAuditoria({
      userId: user!.id,
      action: "CRIAR_REFERENCIAS",
      module: "regularidade",
      entityType: "Document",
      newValues: { cnpj: cnpjFormatado, documentos: criados, salvos, ignorados },
    });

    return NextResponse.json({
      success: true,
      salvos,
      ignorados,
      mensagem: salvos.length
        ? `${salvos.length} referência(s) ou documento(s) cadastrados no GED. Portais de emissão foram identificados como referências, não como certidões emitidas.`
        : "Nenhum novo registro foi criado.",
    });
  } catch (e) {
    return erroInterno(e, "api/regularidade/cnpj POST");
  }
}
