
import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

const PALAVRAS_CHAVE = ["roçada","paisagismo","jardinagem","limpeza","areas verdes","manutenção","reflorestamento","poda","ambiental"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "roçada areas verdes";
  const pagina = searchParams.get("pagina") || "1";

  try {
    const url = `https://pncp.gov.br/api/pncp/v1/contratacoes/publicacoes?pagina=${pagina}&tamanhoPagina=20`;
    const { data, cached } = await fetchWithCache(url, `pncp:pub:${pagina}`, "pncp", 3600000*4) as any;
    const itens = (data?.data || []).filter((i: any) => {
      const obj = (i?.objetoCompra || i?.descricaoObjeto || "").toLowerCase();
      return PALAVRAS_CHAVE.some(p => obj.includes(p));
    });
    return NextResponse.json({ itens, total: itens.length, totalGeral: data?.totalRegistros||0, cached, pagina });
  } catch {
    return NextResponse.json({ itens: DEMO_PNCP, total: DEMO_PNCP.length, totalGeral: 0, cached: false, _demo: true });
  }
}

const DEMO_PNCP = [
  { objetoCompra:"Serviços de roçada manual e mecanizada de vias públicas e canteiros", nomeUnidade:"Prefeitura Demo — BH/MG", valorEstimado:85000, dataPublicacao:"2026-04-25", linkSistemaOrigem:"https://pncp.gov.br", modalidadeNome:"Pregão Eletrônico", situacaoCompra:"Ativa" },
  { objetoCompra:"Manutenção de áreas verdes e paisagismo — parques e praças", nomeUnidade:"COPASA Demo — MG", valorEstimado:220000, dataPublicacao:"2026-04-24", linkSistemaOrigem:"https://pncp.gov.br", modalidadeNome:"Concorrência", situacaoCompra:"Ativa" },
  { objetoCompra:"Controle de vegetação em faixas de dutos e linhas de transmissão", nomeUnidade:"CEMIG Demo — MG", valorEstimado:450000, dataPublicacao:"2026-04-22", linkSistemaOrigem:"https://pncp.gov.br", modalidadeNome:"Pregão Eletrônico", situacaoCompra:"Ativa" },
  { objetoCompra:"Serviços de limpeza e conservação de logradouros públicos", nomeUnidade:"Prefeitura Demo — Betim/MG", valorEstimado:380000, dataPublicacao:"2026-04-20", linkSistemaOrigem:"https://pncp.gov.br", modalidadeNome:"Pregão Eletrônico", situacaoCompra:"Ativa" },
  { objetoCompra:"Reflorestamento e recuperação de áreas degradadas — PRADA", nomeUnidade:"SEMAD Demo — MG", valorEstimado:620000, dataPublicacao:"2026-04-18", linkSistemaOrigem:"https://pncp.gov.br", modalidadeNome:"Concorrência", situacaoCompra:"Ativa" },
];
