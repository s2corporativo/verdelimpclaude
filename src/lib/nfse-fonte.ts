// NFS-e Nacional — monta a EntradaDPS a partir dos dados reais (medição >
// contrato > avulso). Compartilhado pela pré-visualização e pela emissão para
// que os dois caminhos nunca divirjam.
import { prisma } from "@/lib/prisma";
import {
  sugerirServico, statusCertificado, type EntradaDPS, type Ambiente,
} from "@/lib/nfse-nacional";

export interface FonteDPS { entrada: EntradaDPS; razaoSocial: string; competencia: string; itemLC116: string }

export async function montarEntradaDPS(b: any): Promise<FonteDPS> {
  const config = await prisma.companyConfig.findFirst();
  if (!config) throw new Error("Configure os dados da empresa primeiro (Configurações).");

  let objeto = b.descricao || "";
  let valor = Number(b.valor) || 0;
  let competencia = b.competencia || "";
  let tomadorNome = b.tomadorNome || "";
  let tomadorDoc = b.tomadorDoc || "";
  let tomador: any = null;

  if (b.measurementId) {
    const m = await prisma.measurement.findUnique({ where: { id: b.measurementId }, include: { contract: { include: { client: true } } } });
    if (!m) throw new Error("Medição não encontrada.");
    valor = Number(m.value);
    competencia = competencia || m.period;
    objeto = objeto || m.contract.object;
    tomador = m.contract.client;
  } else if (b.contractId) {
    const c = await prisma.contract.findUnique({ where: { id: b.contractId }, include: { client: true } });
    if (!c) throw new Error("Contrato não encontrado.");
    valor = valor || Number(c.monthlyValue || c.value);
    objeto = objeto || c.object;
    tomador = c.client;
  }

  if (tomador) { tomadorNome = tomadorNome || tomador.name; tomadorDoc = tomadorDoc || tomador.cnpjCpf; }
  if (!competencia) { const d = new Date(); competencia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

  const sug = sugerirServico(objeto);
  const cert = statusCertificado();
  const ambiente: Ambiente = (b.ambiente as Ambiente) || cert.ambiente;

  const entrada: EntradaDPS = {
    ambiente,
    serie: b.serie || "1",
    numero: Number(b.numero) || 1,
    competencia,
    dhEmissao: b.dhEmissao || new Date().toISOString(),
    prestador: {
      cnpj: config.cnpj,
      inscMunicipal: config.inscMunicipal,
      municipio: config.municipio,
      optanteSimples: (config.regimeTributario || "").toLowerCase().includes("simples"),
    },
    tomador: {
      nome: tomadorNome || "Tomador não informado",
      cnpjCpf: tomadorDoc,
      municipio: tomador?.municipio,
      uf: tomador?.uf,
      logradouro: tomador?.logradouro,
      cep: tomador?.cep,
    },
    servico: {
      descricao: b.descricao || `${sug.descricao} Ref.: ${objeto}`.trim(),
      cTribNac: b.cTribNac || null,
      itemLC116: sug.itemLC116,
      valorServico: valor,
      aliqISS: Number(b.aliqISS) || Number(config.aliqISS),
      issRetido: !!b.issRetido,
    },
  };

  return { entrada, razaoSocial: config.razaoSocial, competencia, itemLC116: sug.itemLC116 };
}
