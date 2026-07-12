// NFS-e Nacional — pré-visualização da DPS. Monta o XML a partir de um contrato
// ou medição (ou de dados avulsos) SEM enviar nada. Serve para conferência e
// para o contador validar os campos antes de qualquer emissão real.
import { NextResponse } from "next/server";
import { montarDPS, ibgeDoMunicipio } from "@/lib/nfse-nacional";
import { montarEntradaDPS } from "@/lib/nfse-fonte";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({} as any));
    const { entrada, razaoSocial, competencia, itemLC116 } = await montarEntradaDPS(b);
    const dps = montarDPS(entrada);

    return NextResponse.json({
      id: dps.id,
      xml: dps.xml,
      avisos: dps.avisos,
      itemLC116Sugerido: itemLC116,
      cLocEmi: ibgeDoMunicipio(entrada.prestador.municipio),
      ambiente: entrada.ambiente,
      resumo: {
        prestador: razaoSocial,
        tomador: entrada.tomador.nome,
        valor: entrada.servico.valorServico,
        aliqISS: entrada.servico.aliqISS,
        competencia,
      },
    });
  } catch (e: any) {
    const msg = e?.message || "Erro ao montar a DPS.";
    const code = /não encontrad|Configure/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
