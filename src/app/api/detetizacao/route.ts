import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const PRECOS_REFERENCIA: Record<string, { minM2: number; maxM2: number; dosagemL100m2: number; tempoH100m2: number }> = {
  Desinsetizacao: { minM2: 0.80, maxM2: 2.50, dosagemL100m2: 0.4, tempoH100m2: 1.5 },
  Desratizacao: { minM2: 0.60, maxM2: 1.80, dosagemL100m2: 0.1, tempoH100m2: 1.0 },
  Descupinizacao: { minM2: 3.50, maxM2: 9.00, dosagemL100m2: 1.2, tempoH100m2: 3.0 },
  Geral: { minM2: 1.20, maxM2: 3.50, dosagemL100m2: 0.6, tempoH100m2: 2.0 },
  "Controle Formigas": { minM2: 0.40, maxM2: 1.20, dosagemL100m2: 0.3, tempoH100m2: 1.0 },
  Fumigacao: { minM2: 4.00, maxM2: 10.0, dosagemL100m2: 0, tempoH100m2: 4.0 },
};

const DOCS_OBRIGATORIOS: Record<string, string[]> = {
  Desinsetizacao: ["Licença sanitária aplicável", "Registro dos produtos utilizados", "Responsabilidade técnica quando exigida", "Certificado do aplicador", "Laudo pré-aplicação", "Certificado do serviço", "FISPQ dos produtos"],
  Desratizacao: ["Licença sanitária aplicável", "Registro dos produtos utilizados", "Responsabilidade técnica quando exigida", "Certificado do aplicador", "Mapa de iscas", "Certificado do serviço"],
  Descupinizacao: ["Licença sanitária aplicável", "Registro do termicida", "Responsabilidade técnica quando exigida", "Laudo de inspeção", "Relatório fotográfico", "Certificado do serviço", "Termo de garantia"],
  Geral: ["Licença sanitária aplicável", "Registros dos produtos", "Responsabilidade técnica quando exigida", "Certificado do aplicador", "Laudo técnico", "Certificado do serviço", "FISPQ dos produtos"],
  "Controle Formigas": ["Licença sanitária aplicável", "Registro do produto", "Certificado do serviço", "Responsabilidade técnica quando exigida"],
  Fumigacao: ["Licença sanitária aplicável", "Registro dos produtos", "Responsabilidade técnica", "Plano de segurança", "Certificado do serviço"],
};

const ProdutoSchema = z.object({
  produtoCatalogoId: z.string().trim().min(1),
  dosagemUsada: z.string().trim().max(120).optional().nullable(),
  quantidadeL: z.coerce.number().positive().max(100000),
  custoUnitario: z.coerce.number().nonnegative().max(1_000_000).optional().nullable(),
});

const JobSchema = z.object({
  clienteNome: z.string().trim().min(2).max(200),
  clienteId: z.string().trim().optional().nullable(),
  tipoServico: z.enum(["Desinsetizacao", "Desratizacao", "Descupinizacao", "Geral", "Controle Formigas", "Fumigacao"]),
  endereco: z.string().trim().min(2).max(500),
  municipio: z.string().trim().max(120).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(),
  areaM2: z.coerce.number().positive().max(999999999).optional().nullable(),
  ambientes: z.string().trim().max(1000).optional().nullable(),
  infestacaoNivel: z.enum(["leve", "moderado", "grave"]).default("leve"),
  dataAplicacao: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
  dataRetorno: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
  status: z.enum(["orcamento", "agendado", "em_execucao", "concluido", "cancelado"]).default("orcamento"),
  valorCobrado: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  custoTotal: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  tecnicoId: z.string().trim().optional().nullable(),
  tecnicoNome: z.string().trim().max(200).optional().nullable(),
  artNumero: z.string().trim().max(120).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  garantiaDias: z.coerce.number().int().min(0).max(3650).optional().nullable(),
  produtos: z.array(ProdutoSchema).max(50).optional().default([]),
});

const StatusSchema = z.object({
  action: z.literal("update_status"),
  id: z.string().trim().min(1),
  status: z.enum(["orcamento", "agendado", "em_execucao", "concluido", "cancelado"]),
  dataAplicacao: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
  dataRetorno: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
  certificadoEmitido: z.coerce.boolean().optional(),
  certificadoDataVal: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
  tecnicoId: z.string().trim().optional().nullable(),
  tecnicoNome: z.string().trim().max(200).optional().nullable(),
  artNumero: z.string().trim().max(120).optional().nullable(),
  custoTotal: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  valorCobrado: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
});

function data(value?: string | null) {
  if (!value) return null;
  return parseDataOperacional(value);
}

function garantiaPadrao(tipo: string) {
  const defaults: Record<string, number> = { Descupinizacao: 1825, Geral: 90, Desinsetizacao: 90, Desratizacao: 90, "Controle Formigas": 30, Fumigacao: 60 };
  return defaults[tipo] || 90;
}

async function numeroJob() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `DETET-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const exists = await prisma.dedetJob.findUnique({ where: { numero: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `DETET-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "COMERCIAL", "FINANCEIRO");
  if (erro) return erro;
  const action = req.nextUrl.searchParams.get("action") || "list";

  try {
    if (action === "catalogo") {
      const produtos = await prisma.dedetProdutoCatalogo.findMany({ where: { ativo: true }, orderBy: { nomeComercial: "asc" } });
      return NextResponse.json({ produtos, total: produtos.length, empty: produtos.length === 0 });
    }

    if (action === "viabilidade") {
      const tipo = req.nextUrl.searchParams.get("tipo") || "Geral";
      if (!PRECOS_REFERENCIA[tipo]) return NextResponse.json({ error: "Tipo de serviço inválido" }, { status: 400 });
      const areaM2 = Number(req.nextUrl.searchParams.get("area") || 0);
      const valorProposto = Number(req.nextUrl.searchParams.get("valor") || 0);
      const produtoId = req.nextUrl.searchParams.get("produtoId") || undefined;
      if (!Number.isFinite(areaM2) || areaM2 <= 0 || !Number.isFinite(valorProposto) || valorProposto < 0) return NextResponse.json({ error: "Área ou valor inválido" }, { status: 400 });

      const produto = produtoId ? await prisma.dedetProdutoCatalogo.findUnique({ where: { id: produtoId } }) : null;
      if (produtoId && (!produto || !produto.ativo)) return NextResponse.json({ error: "Produto não encontrado ou inativo" }, { status: 404 });
      const preco = PRECOS_REFERENCIA[tipo];
      const litros = (preco.dosagemL100m2 * areaM2) / 100;
      const horasExec = (preco.tempoH100m2 * areaM2) / 100;
      const custoProdutoUnitario = produto ? Number(produto.custoLitro) : 180;
      const premissas = { custoTecnicoHora: 28, custoEpiJob: 35, custoDeslocamento: 60, custoProdutoLitro: custoProdutoUnitario };
      const custoProduto = litros * premissas.custoProdutoLitro;
      const custoTecnico = horasExec * premissas.custoTecnicoHora;
      const custoTotal = custoProduto + custoTecnico + premissas.custoEpiJob + premissas.custoDeslocamento;
      const precoIdealTotal = areaM2 * preco.minM2;
      const precoMaximoTotal = areaM2 * preco.maxM2;
      const margemReal = valorProposto > 0 ? ((valorProposto - custoTotal) / valorProposto) * 100 : null;

      return NextResponse.json({
        tipo,
        areaM2,
        litros: Number(litros.toFixed(2)),
        horasExec: Number(horasExec.toFixed(2)),
        custoTotal: Number(custoTotal.toFixed(2)),
        detalhamento: { produto: Number(custoProduto.toFixed(2)), tecnico: Number(custoTecnico.toFixed(2)), epi: premissas.custoEpiJob, deslocamento: premissas.custoDeslocamento },
        precoMinimoTotal: Number(custoTotal.toFixed(2)),
        precoIdealTotal: Number(precoIdealTotal.toFixed(2)),
        precoMaximoTotal: Number(precoMaximoTotal.toFixed(2)),
        valorProposto,
        margemReal: margemReal === null ? null : Number(margemReal.toFixed(2)),
        viavel: valorProposto > 0 ? valorProposto >= custoTotal : null,
        recomendacao: valorProposto <= 0 ? "Informe o valor proposto" : valorProposto >= precoMaximoTotal * 0.8 ? "Margem elevada" : valorProposto >= precoIdealTotal ? "Lucrativo" : valorProposto >= custoTotal ? "Margem abaixo da referência" : "Prejuízo estimado",
        documentosObrigatorios: DOCS_OBRIGATORIOS[tipo] || [],
        premissas,
        estimated: true,
        productSource: produto ? "catalogo" : "referencia_sem_produto_cadastrado",
        warning: "Cálculo gerencial estimado. Confirme produto, dosagem, exigências sanitárias e responsabilidade técnica antes da proposta ou execução.",
      });
    }

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const jobs = await prisma.dedetJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: { produtos: true },
      take: 1000,
    });
    return NextResponse.json({ jobs, total: jobs.length, empty: jobs.length === 0 });
  } catch (error) {
    return erroInterno(error, "api/detetizacao GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "COMERCIAL");
  if (erro || !user) return erro;

  try {
    const raw = await req.json();

    if (raw.action === "update_status") {
      const parsed = StatusSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Atualização inválida" }, { status: 400 });
      const body = parsed.data;
      const current = await prisma.dedetJob.findUnique({ where: { id: body.id } });
      if (!current) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
      const dataAplicacao = body.dataAplicacao ? data(body.dataAplicacao) : undefined;
      const dataRetorno = body.dataRetorno ? data(body.dataRetorno) : undefined;
      const certificadoDataVal = body.certificadoDataVal ? data(body.certificadoDataVal) : undefined;
      if ((body.dataAplicacao && !dataAplicacao) || (body.dataRetorno && !dataRetorno) || (body.certificadoDataVal && !certificadoDataVal)) return NextResponse.json({ error: "Uma das datas é inválida" }, { status: 400 });
      if (body.status === "concluido" && !body.dataAplicacao && !current.dataAplicacao) return NextResponse.json({ error: "Informe a data da aplicação antes de concluir" }, { status: 422 });
      if (body.certificadoEmitido && !body.certificadoDataVal && !current.certificadoDataVal) return NextResponse.json({ error: "Informe a validade do certificado" }, { status: 422 });
      if (body.tecnicoId) {
        const technician = await prisma.employee.findUnique({ where: { id: body.tecnicoId }, select: { id: true, active: true, name: true } });
        if (!technician || !technician.active) return NextResponse.json({ error: "Técnico inválido ou inativo" }, { status: 404 });
        if (!body.tecnicoNome) body.tecnicoNome = technician.name;
      }

      const job = await prisma.dedetJob.update({
        where: { id: body.id },
        data: {
          status: body.status,
          ...(dataAplicacao !== undefined ? { dataAplicacao } : {}),
          ...(dataRetorno !== undefined ? { dataRetorno } : {}),
          ...(body.certificadoEmitido !== undefined ? { certificadoEmitido: body.certificadoEmitido } : {}),
          ...(certificadoDataVal !== undefined ? { certificadoDataVal } : {}),
          ...(body.tecnicoId !== undefined ? { tecnicoId: body.tecnicoId || null } : {}),
          ...(body.tecnicoNome !== undefined ? { tecnicoNome: body.tecnicoNome || null } : {}),
          ...(body.artNumero !== undefined ? { artNumero: body.artNumero || null } : {}),
          ...(body.custoTotal !== undefined ? { custoTotal: body.custoTotal } : {}),
          ...(body.valorCobrado !== undefined ? { valorCobrado: body.valorCobrado } : {}),
        },
      });
      await registrarAuditoria({ userId: user.id, action: "STATUS_CHANGE", module: "dedetizacao", entityType: "DedetJob", entityId: job.id, oldValues: { status: current.status, dataAplicacao: current.dataAplicacao, certificadoEmitido: current.certificadoEmitido }, newValues: { status: job.status, dataAplicacao: job.dataAplicacao, certificadoEmitido: job.certificadoEmitido } });
      return NextResponse.json({ success: true, job });
    }

    const parsed = JobSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Serviço inválido" }, { status: 400 });
    const body = parsed.data;
    const dataAplicacao = data(body.dataAplicacao);
    const dataRetorno = data(body.dataRetorno);
    if ((body.dataAplicacao && !dataAplicacao) || (body.dataRetorno && !dataRetorno)) return NextResponse.json({ error: "Uma das datas é inválida" }, { status: 400 });
    if (dataAplicacao && dataRetorno && dataRetorno < dataAplicacao) return NextResponse.json({ error: "Data de retorno anterior à aplicação" }, { status: 400 });

    const [client, technician, catalogProducts] = await Promise.all([
      body.clienteId ? prisma.client.findUnique({ where: { id: body.clienteId }, select: { id: true, active: true, name: true } }) : null,
      body.tecnicoId ? prisma.employee.findUnique({ where: { id: body.tecnicoId }, select: { id: true, active: true, name: true } }) : null,
      body.produtos.length ? prisma.dedetProdutoCatalogo.findMany({ where: { id: { in: body.produtos.map((item) => item.produtoCatalogoId) }, ativo: true } }) : [],
    ]);
    if (body.clienteId && (!client || !client.active)) return NextResponse.json({ error: "Cliente inválido ou inativo" }, { status: 404 });
    if (body.tecnicoId && (!technician || !technician.active)) return NextResponse.json({ error: "Técnico inválido ou inativo" }, { status: 404 });
    if (catalogProducts.length !== new Set(body.produtos.map((item) => item.produtoCatalogoId)).size) return NextResponse.json({ error: "Um ou mais produtos não existem ou estão inativos" }, { status: 404 });
    const catalogMap = new Map(catalogProducts.map((item) => [item.id, item]));
    const numero = await numeroJob();

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.dedetJob.create({
        data: {
          numero,
          clienteNome: client?.name || body.clienteNome,
          clienteId: body.clienteId || null,
          tipoServico: body.tipoServico,
          endereco: body.endereco,
          municipio: body.municipio || null,
          uf: body.uf || null,
          areaM2: body.areaM2 ?? null,
          ambientes: body.ambientes || null,
          infestacaoNivel: body.infestacaoNivel,
          dataAplicacao,
          dataRetorno,
          status: body.status,
          valorCobrado: body.valorCobrado ?? null,
          custoTotal: body.custoTotal ?? null,
          tecnicoId: body.tecnicoId || null,
          tecnicoNome: technician?.name || body.tecnicoNome || null,
          artNumero: body.artNumero || null,
          observacoes: body.observacoes || null,
          garantiaDias: body.garantiaDias ?? garantiaPadrao(body.tipoServico),
        },
      });
      for (const input of body.produtos) {
        const product = catalogMap.get(input.produtoCatalogoId)!;
        await tx.dedetProduto.create({
          data: {
            dedetJobId: created.id,
            nomeComercial: product.nomeComercial,
            principioAtivo: product.principioAtivo,
            registroAnvisa: product.registroAnvisa,
            concentracao: product.concentracao,
            dosagemUsada: input.dosagemUsada || null,
            quantidadeL: input.quantidadeL,
            custoUnitario: input.custoUnitario ?? Number(product.custoLitro),
          },
        });
      }
      return created;
    });

    await registrarAuditoria({ userId: user.id, action: "CRIAR", module: "dedetizacao", entityType: "DedetJob", entityId: job.id, newValues: { numero, clienteNome: job.clienteNome, tipoServico: job.tipoServico, areaM2: job.areaM2, produtoIds: body.produtos.map((item) => item.produtoCatalogoId) } });
    return NextResponse.json({ success: true, job: await prisma.dedetJob.findUnique({ where: { id: job.id }, include: { produtos: true } }) }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "Número do serviço já cadastrado. Tente novamente." }, { status: 409 });
    return erroInterno(error, "api/detetizacao POST");
  }
}
