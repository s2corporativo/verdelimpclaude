// NFS-e Nacional — orientação de emissão pelo Portal Nacional (gov.br).
// Por decisão operacional, o ERP NÃO transmite a nota por API (assinatura
// XML-DSig + mTLS): a emissão é feita diretamente no Emissor Nacional gov.br
// e a nota emitida é depois registrada aqui (POST /api/nfse/registrar).
// Esta rota monta a prévia da DPS e devolve o link do portal + os dados já
// preenchidos para copiar na emissão.
import { NextResponse } from "next/server";
import { montarDPS, PORTAL_NACIONAL, ibgeDoMunicipio } from "@/lib/nfse-nacional";
import { montarEntradaDPS } from "@/lib/nfse-fonte";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({} as any));
    const { entrada, razaoSocial, competencia, itemLC116 } = await montarEntradaDPS(b);
    const dps = montarDPS(entrada);

    return NextResponse.json({
      modo: "portal",
      emitida: false,
      mensagem: "Emita a nota diretamente no Portal Nacional (gov.br) e depois registre a nota emitida aqui.",
      portal: {
        emissor: PORTAL_NACIONAL.emissor,
        consulta: PORTAL_NACIONAL.consulta,
        primeiroAcesso: PORTAL_NACIONAL.primeiroAcesso,
      },
      // Dados prontos para copiar no formulário do Emissor Nacional.
      dados: {
        prestador: razaoSocial,
        cnpjPrestador: entrada.prestador.cnpj,
        municipio: entrada.prestador.municipio,
        codigoIBGE: ibgeDoMunicipio(entrada.prestador.municipio),
        tomador: entrada.tomador.nome,
        docTomador: entrada.tomador.cnpjCpf,
        competencia,
        valorServico: entrada.servico.valorServico,
        aliqISS: entrada.servico.aliqISS,
        issRetido: entrada.servico.issRetido,
        itemLC116Sugerido: itemLC116,
        descricao: entrada.servico.descricao,
      },
      avisos: dps.avisos,
      idDPS: dps.id,
    });
  } catch (e: any) {
    const msg = e?.message || "Erro ao preparar a emissão.";
    const code = /não encontrad|Configure/.test(msg) ? 400 : 500;
    return NextResponse.json({ emitida: false, error: msg }, { status: code });
  }
}
