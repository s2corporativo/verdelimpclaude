import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchWithCache } from "@/lib/api-cache";
import { exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const PALAVRAS_CHAVE = [
  "roçada", "paisagismo", "jardinagem", "limpeza", "áreas verdes",
  "areas verdes", "manutenção", "reflorestamento", "poda", "ambiental",
];

const QuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  pagina: z.coerce.number().int().min(1).max(1000).default(1),
  dias: z.coerce.number().int().min(1).max(180).default(60),
});

const formatarDataPncp = (data: Date) =>
  `${data.getFullYear()}${String(data.getMonth() + 1).padStart(2, "0")}${String(data.getDate()).padStart(2, "0")}`;

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (erro) return erro;

  const parsed = QuerySchema.safeParse({
    q: req.nextUrl.searchParams.get("q") || undefined,
    pagina: req.nextUrl.searchParams.get("pagina") || undefined,
    dias: req.nextUrl.searchParams.get("dias") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parâmetros inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  const { pagina, dias } = parsed.data;
  const consulta = parsed.data.q?.trim() || "";
  const termos = consulta
    ? consulta.toLocaleLowerCase("pt-BR").split(/\s+/).map((item) => item.trim()).filter(Boolean).slice(0, 12)
    : PALAVRAS_CHAVE;

  const hoje = new Date();
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - dias);
  const dataInicial = formatarDataPncp(inicio);
  const dataFinal = formatarDataPncp(hoje);
  const tamanhoPagina = 50;
  const url = `https://pncp.gov.br/api/pncp/v1/contratacoes/publicacoes?dataInicial=${dataInicial}&dataFinal=${dataFinal}&pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`;

  try {
    const { data, cached } = await fetchWithCache(
      url,
      `pncp:publicacoes:${dataInicial}:${dataFinal}:${pagina}:${tamanhoPagina}`,
      "pncp",
      4 * 60 * 60 * 1000,
    ) as { data: any; cached: boolean };

    if (!data || !Array.isArray(data.data)) {
      return NextResponse.json({
        error: "O PNCP respondeu em formato inesperado",
        source: "PNCP",
        itens: [],
        total: 0,
      }, { status: 502 });
    }

    const itens = data.data.filter((item: any) => {
      const texto = [
        item?.objetoCompra,
        item?.descricaoObjeto,
        item?.informacaoComplementar,
        item?.nomeUnidade,
        item?.orgaoEntidade?.razaoSocial,
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return termos.some((termo) => texto.includes(termo));
    });

    return NextResponse.json({
      itens,
      total: itens.length,
      totalGeral: Number(data.totalRegistros || 0),
      cached,
      pagina,
      dias,
      termos,
      janela: { dataInicial, dataFinal },
      source: "PNCP",
      empty: itens.length === 0,
    });
  } catch (e) {
    console.error("[api/pncp GET]", e);
    return NextResponse.json({
      error: "Não foi possível consultar o PNCP neste momento",
      source: "PNCP",
      itens: [],
      total: 0,
      totalGeral: 0,
      cached: false,
      pagina,
      dias,
      termos,
    }, { status: 502 });
  }
}
