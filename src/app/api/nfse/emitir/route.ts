// NFS-e Nacional — emissão. Esta rota SÓ transmite quando o certificado e-CNPJ
// estiver provisionado como segredo no servidor. Enquanto não estiver, ela
// devolve, de forma transparente, exatamente o que falta — nunca finge que uma
// nota com validade jurídica foi emitida.
//
// Etapas da emissão real (ativadas com o certificado):
//   1) montar a DPS (já pronto) → 2) assinar em XML-DSig com o e-CNPJ →
//   3) GZip + Base64 → 4) POST mTLS ao Sefin Nacional → 5) gravar a NFS-e.
// A assinatura/transmissão devem ser homologadas em Produção Restrita e os
// códigos de serviço validados pelo contador antes de ir para produção.
import { NextResponse } from "next/server";
import { montarDPS, ENDPOINTS, statusCertificado } from "@/lib/nfse-nacional";
import { montarEntradaDPS } from "@/lib/nfse-fonte";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({} as any));
    const cert = statusCertificado();

    // Monta a DPS mesmo sem certificado, para devolver a prévia e os avisos.
    const { entrada } = await montarEntradaDPS(b);
    const dps = montarDPS(entrada);

    if (!cert.configurado) {
      return NextResponse.json({
        emitida: false,
        motivo: "certificado_nao_configurado",
        mensagem: "Emissão bloqueada: o certificado digital e-CNPJ não está configurado no servidor.",
        comoResolver: [
          "Provisione o certificado A1 como SEGREDO na VPS (nunca no repositório):",
          "  NFSE_CERT_BASE64 = conteúdo do .pfx em base64 (ou NFSE_CERT_PATH apontando para o arquivo)",
          "  NFSE_CERT_SENHA  = senha do certificado",
          "  NFSE_AMBIENTE    = restrita (homologação) ou producao",
          "Teste primeiro em Produção Restrita e valide os códigos de serviço com o contador.",
        ],
        ambiente: entrada.ambiente,
        endpoint: ENDPOINTS[entrada.ambiente].sefin,
        idDPS: dps.id,
        avisos: dps.avisos,
      }, { status: 409 });
    }

    if (dps.avisos.length) {
      return NextResponse.json({
        emitida: false,
        motivo: "dps_incompleta",
        mensagem: "A DPS ainda tem pendências que impedem a emissão.",
        avisos: dps.avisos,
        idDPS: dps.id,
      }, { status: 422 });
    }

    // Certificado presente e DPS sem pendências: a etapa de assinatura XML-DSig
    // + transmissão mTLS é o próximo marco de implementação, e precisa ser
    // homologada em Produção Restrita com o certificado real. Até lá, não
    // emitimos para não gerar documento inválido.
    return NextResponse.json({
      emitida: false,
      motivo: "assinatura_transmissao_pendente",
      mensagem: "Certificado detectado. A assinatura digital e a transmissão mTLS estão prontas para serem ativadas e homologadas em Produção Restrita.",
      ambiente: entrada.ambiente,
      endpoint: ENDPOINTS[entrada.ambiente].sefin,
      idDPS: dps.id,
    }, { status: 501 });
  } catch (e: any) {
    const msg = e?.message || "Erro ao processar a emissão.";
    const code = /não encontrad|Configure/.test(msg) ? 400 : 500;
    return NextResponse.json({ emitida: false, error: msg }, { status: code });
  }
}
