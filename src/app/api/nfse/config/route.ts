// NFS-e Nacional — prontidão para emissão: verifica dados do prestador e o
// estado do certificado (sem expor segredos). Não transmite nada.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ENDPOINTS, ibgeDoMunicipio, statusCertificado } from "@/lib/nfse-nacional";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await prisma.companyConfig.findFirst();
    const cert = statusCertificado();

    const checks = [
      { item: "CNPJ do prestador", ok: !!config?.cnpj, valor: config?.cnpj || "—" },
      { item: "Inscrição municipal", ok: !!config?.inscMunicipal, valor: config?.inscMunicipal || "—" },
      { item: "Município (código IBGE)", ok: !!ibgeDoMunicipio(config?.municipio), valor: config?.municipio ? `${config.municipio} → ${ibgeDoMunicipio(config.municipio) || "não mapeado"}` : "—" },
      { item: "Alíquota de ISS", ok: !!config?.aliqISS, valor: config ? `${Number(config.aliqISS)}%` : "—" },
      { item: "Regime tributário", ok: !!config?.regimeTributario, valor: config?.regimeTributario || "—" },
      { item: "Certificado digital (servidor)", ok: cert.configurado, valor: cert.detalhe },
    ];

    const prontoParaMontar = checks.slice(0, 5).every((c) => c.ok);
    const prontoParaEmitir = prontoParaMontar && cert.configurado;

    return NextResponse.json({
      ambiente: cert.ambiente,
      ambienteLabel: ENDPOINTS[cert.ambiente].label,
      endpoint: ENDPOINTS[cert.ambiente].sefin,
      certificadoConfigurado: cert.configurado,
      prontoParaMontar,
      prontoParaEmitir,
      checks,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, prontoParaMontar: false, prontoParaEmitir: false, checks: [] }, { status: 500 });
  }
}
