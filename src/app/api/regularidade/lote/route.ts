// Verificação em lote da situação cadastral de clientes e fornecedores.
// A consulta à BrasilAPI não substitui CND Federal, CRF/FGTS, CNDT ou certidões estaduais/municipais.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithCache } from "@/lib/api-cache";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

type Entidade = {
  id: string;
  tipo: "cliente" | "fornecedor";
  nome: string;
  cnpjOriginal: string;
  situacaoAnterior: string | null;
};

function classificarSituacao(situacao: string) {
  if (situacao === "ATIVA") return { situacaoStatus: "ativa", legacy: "regular" };
  if (situacao === "SUSPENSA") return { situacaoStatus: "suspensa", legacy: "pendente" };
  if (["BAIXADA", "INAPTA", "NULA"].includes(situacao)) return { situacaoStatus: "irregular", legacy: "irregular" };
  return { situacaoStatus: "desconhecida", legacy: "desconhecida" };
}

async function consultar(entidade: Entidade) {
  const cnpj = entidade.cnpjOriginal.replace(/\D/g, "");
  if (cnpj.length !== 14) {
    return {
      id: entidade.id,
      tipo: entidade.tipo,
      nome: entidade.nome,
      cnpj: entidade.cnpjOriginal,
      situacao: entidade.situacaoAnterior || "CNPJ INVÁLIDO",
      situacaoStatus: "desconhecida",
      regularidade: "desconhecida",
      regularidadeFiscal: "nao_verificada",
      consultado: false,
      error: "CNPJ não possui 14 dígitos",
    };
  }

  try {
    const { data, cached } = await fetchWithCache(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      `regularidade:cnpj:${cnpj}`,
      "brasilapi-cnpj",
      6 * 60 * 60 * 1000,
    ) as { data: any; cached: boolean };

    const situacao = String(data?.descricao_situacao_cadastral || data?.situacao_cadastral || "DESCONHECIDA").toUpperCase().trim();
    const classe = classificarSituacao(situacao);
    return {
      id: entidade.id,
      tipo: entidade.tipo,
      nome: entidade.nome,
      cnpj: entidade.cnpjOriginal,
      situacao,
      situacaoStatus: classe.situacaoStatus,
      regularidade: classe.legacy,
      regularidadeFiscal: "nao_verificada",
      consultado: true,
      cached,
    };
  } catch (e) {
    console.error(`[regularidade/lote:${entidade.tipo}:${cnpj}]`, e);
    return {
      id: entidade.id,
      tipo: entidade.tipo,
      nome: entidade.nome,
      cnpj: entidade.cnpjOriginal,
      situacao: entidade.situacaoAnterior || "NÃO CONSULTADO",
      situacaoStatus: "desconhecida",
      regularidade: "desconhecida",
      regularidadeFiscal: "nao_verificada",
      consultado: false,
      error: "Serviço externo indisponível ou CNPJ não localizado",
    };
  }
}

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO", "FISCAL");
  if (erro) return erro;

  try {
    const [clientes, fornecedores] = await Promise.all([
      prisma.client.findMany({
        where: { deletedAt: null, active: true, cnpjCpf: { not: null } },
        select: { id: true, name: true, cnpjCpf: true, situacao: true },
        orderBy: { name: "asc" },
        take: 500,
      }),
      prisma.supplier.findMany({
        where: { deletedAt: null, active: true, cnpj: { not: null } },
        select: { id: true, name: true, cnpj: true, situacao: true },
        orderBy: { name: "asc" },
        take: 500,
      }),
    ]);

    const entidades: Entidade[] = [
      ...clientes.map((item) => ({ id: item.id, tipo: "cliente" as const, nome: item.name, cnpjOriginal: item.cnpjCpf || "", situacaoAnterior: item.situacao })),
      ...fornecedores.map((item) => ({ id: item.id, tipo: "fornecedor" as const, nome: item.name, cnpjOriginal: item.cnpj || "", situacaoAnterior: item.situacao })),
    ];

    const resultados: any[] = [];
    const tamanhoLote = 5;
    for (let i = 0; i < entidades.length; i += tamanhoLote) {
      resultados.push(...await Promise.all(entidades.slice(i, i + tamanhoLote).map(consultar)));
    }

    const ativosCadastralmente = resultados.filter((item) => item.situacaoStatus === "ativa").length;
    const irregularesCadastrais = resultados.filter((item) => item.situacaoStatus === "irregular").length;
    const suspensos = resultados.filter((item) => item.situacaoStatus === "suspensa").length;
    const desconhecidos = resultados.filter((item) => item.situacaoStatus === "desconhecida").length;

    return NextResponse.json({
      total: entidades.length,
      consultados: resultados.filter((item) => item.consultado).length,
      ativosCadastralmente,
      irregularesCadastrais,
      suspensos,
      desconhecidos,
      // Compatibilidade temporária com a interface existente.
      regulares: ativosCadastralmente,
      irregulares: irregularesCadastrais,
      pendentes: suspensos,
      resultados,
      escopo: "situacao_cadastral_cnpj",
      regularidadeFiscalVerificada: false,
      aviso: "CNPJ ativo não comprova regularidade fiscal. Confirme as certidões oficiais antes de contratar, pagar ou habilitar em licitação.",
      empty: entidades.length === 0,
    });
  } catch (e) {
    return erroInterno(e, "api/regularidade/lote GET");
  }
}
