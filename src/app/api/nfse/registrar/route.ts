// NFS-e Nacional — registra no ERP uma nota já emitida no Portal Nacional (gov.br).
// O usuário emite no Emissor Nacional e informa aqui o número, a chave de acesso
// e (opcional) o link do PDF/DANFSE. Os demais dados (prestador, tomador, valor,
// ISS, competência) vêm da mesma fonte da prévia (medição/contrato), garantindo
// coerência com o que foi conferido.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { validar } from "@/lib/validacao";
import { montarEntradaDPS } from "@/lib/nfse-fonte";

export const dynamic = "force-dynamic";

const PAPEIS = ["ADMIN", "FISCAL", "FINANCEIRO"];

const RegistrarSchema = z.object({
  measurementId: z.string().optional(),
  contractId: z.string().optional(),
  numero: z.string().trim().min(1, "número da NFS-e obrigatório").max(40),
  chaveAcesso: z.string().trim().max(120).optional().nullable(),
  pdfLink: z.string().trim().url("link do PDF inválido").max(500).optional().nullable().or(z.literal("")),
  dataEmissao: z.string().trim().max(40).optional().nullable(),
  // Campos opcionais para override; por padrão vêm da medição/contrato.
  competencia: z.string().optional(),
  aliqISS: z.union([z.string(), z.number()]).optional(),
  issRetido: z.boolean().optional(),
  descricao: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;
  try {
    const { data: body, erro: erroVal } = validar(RegistrarSchema, await req.json().catch(() => ({})));
    if (erroVal) return erroVal;

    // Reaproveita a fonte da prévia para prestador/tomador/valor/ISS/competência.
    const { entrada, competencia } = await montarEntradaDPS(body);

    // Resolve o cliente vinculado (para a NFS-e apontar para o cadastro).
    let clientId: string | null = null;
    if (body.measurementId) {
      const m = await prisma.measurement.findUnique({ where: { id: body.measurementId }, include: { contract: { select: { clientId: true } } } });
      clientId = m?.contract?.clientId ?? null;
    } else if (body.contractId) {
      const c = await prisma.contract.findUnique({ where: { id: body.contractId }, select: { clientId: true } });
      clientId = c?.clientId ?? null;
    }

    const valor = entrada.servico.valorServico;
    const issRate = entrada.servico.aliqISS;
    const issAmount = Number((valor * (issRate / 100)).toFixed(2));
    const netAmount = entrada.servico.issRetido ? Number((valor - issAmount).toFixed(2)) : valor;

    const nfse = await prisma.fiscalNfse.create({
      data: {
        number: body.numero,
        municipality: entrada.prestador.municipio || "Betim",
        providerCnpj: entrada.prestador.cnpj,
        receiverName: entrada.tomador.nome,
        receiverCnpj: entrada.tomador.cnpjCpf || null,
        clientId,
        serviceCode: entrada.servico.itemLC116,
        description: body.descricao || entrada.servico.descricao,
        serviceValue: valor,
        calculationBase: valor,
        issRate,
        issAmount,
        issRetained: entrada.servico.issRetido,
        netAmount,
        issueDate: body.dataEmissao ? new Date(body.dataEmissao) : new Date(),
        competence: body.competencia || competencia,
        status: "emitida",
        accessKey: body.chaveAcesso || null,
        pdfLink: body.pdfLink || null,
      },
    });

    return NextResponse.json({ ok: true, nfse }, { status: 201 });
  } catch (e: any) {
    // Conflito de unique (número já registrado para o mesmo prestador/município)
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma NFS-e com esse número para este prestador/município." }, { status: 409 });
    }
    return erroInterno(e, "api/nfse/registrar");
  }
}
