import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const CONFIG_DEFAULT = {
  custoHoraCombustivel: 45,
  custoHoraOperador: 32,
  custoHoraDepreciacao: 28,
  custoHoraManutencao: 15,
  custoHoraSeguro: 8,
  custoKmTransporte: 8,
  margemAlvo: 25,
};

const PRODUTIVIDADE: Record<string, { unidade: string; taxa: number; descricao: string }> = {
  Terraplanagem: { unidade: "m³/h", taxa: 25, descricao: "Corte e aterro de terra" },
  Valetamento: { unidade: "m/h", taxa: 8, descricao: "Abertura de valas 0,6x0,8m" },
  "Drenagem Superficial": { unidade: "m/h", taxa: 5, descricao: "Sarjeta e tubulação" },
  "Limpeza de Terreno": { unidade: "m²/h", taxa: 400, descricao: "Retirada de entulho ou vegetação" },
  Nivelamento: { unidade: "m²/h", taxa: 300, descricao: "Platô ou base para obras" },
  "Carregamento de Material": { unidade: "m³/h", taxa: 35, descricao: "Carga em caminhão" },
  "Apoio PRADA/Recuperação": { unidade: "m²/h", taxa: 180, descricao: "Modelagem de taludes" },
  "Demolição/Retirada": { unidade: "h", taxa: 1, descricao: "Trabalho por hora" },
  Outro: { unidade: "h", taxa: 1, descricao: "Trabalho por hora" },
};

const ConfigSchema = z.object({
  custoHoraCombustivel: z.coerce.number().nonnegative().max(100000),
  custoHoraOperador: z.coerce.number().nonnegative().max(100000),
  custoHoraDepreciacao: z.coerce.number().nonnegative().max(100000),
  custoHoraManutencao: z.coerce.number().nonnegative().max(100000),
  custoHoraSeguro: z.coerce.number().nonnegative().max(100000),
  custoKmTransporte: z.coerce.number().nonnegative().max(100000),
  margemAlvo: z.coerce.number().min(0).max(1000),
});

const JobSchema = z.object({
  clienteNome: z.string().trim().min(2).max(200),
  clienteId: z.string().trim().optional().nullable(),
  contratoId: z.string().trim().optional().nullable(),
  tipoServico: z.string().trim().min(2).max(120),
  endereco: z.string().trim().max(500).optional().nullable(),
  municipio: z.string().trim().max(120).optional().nullable(),
  uf: z.string().trim().max(2).optional().nullable(),
  areaM2: z.coerce.number().nonnegative().max(999999999).optional().nullable(),
  volumeM3: z.coerce.number().nonnegative().max(999999999).optional().nullable(),
  horasEstimadas: z.coerce.number().nonnegative().max(100000).optional().nullable(),
  distanciaKm: z.coerce.number().nonnegative().max(100000).default(0),
  dataInicio: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
  status: z.enum(["orcamento", "agendado", "em_execucao", "concluido", "cancelado"]).default("orcamento"),
  valorCobrado: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  artNumero: z.string().trim().max(120).optional().nullable(),
});

const StatusSchema = z.object({
  action: z.literal("update_status"),
  id: z.string().trim().min(1),
  status: z.enum(["orcamento", "agendado", "em_execucao", "concluido", "cancelado"]),
  horasRealizadas: z.coerce.number().nonnegative().max(100000).optional().nullable(),
  custoTotal: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  valorCobrado: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  dataFim: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
});

function numero(value: unknown) {
  return Number(value || 0);
}

function configNumerica(config: any) {
  return Object.fromEntries(
    Object.keys(CONFIG_DEFAULT).map((key) => [key, numero(config?.[key] ?? (CONFIG_DEFAULT as any)[key])]),
  ) as typeof CONFIG_DEFAULT;
}

function calcularCustos(config: typeof CONFIG_DEFAULT, horas: number, distanciaKm: number) {
  const custoHora = config.custoHoraCombustivel + config.custoHoraOperador + config.custoHoraDepreciacao + config.custoHoraManutencao + config.custoHoraSeguro;
  const custoMaquina = custoHora * horas;
  const custoTransporte = config.custoKmTransporte * distanciaKm * 2;
  const custoTotal = custoMaquina + custoTransporte;
  const precoIdeal = custoTotal * (1 + config.margemAlvo / 100);
  return {
    custoMaquinaHora: Number(custoHora.toFixed(2)),
    custoMaquinaTotal: Number(custoMaquina.toFixed(2)),
    custoTransporte: Number(custoTransporte.toFixed(2)),
    custoTotal: Number(custoTotal.toFixed(2)),
    precoMinimo: Number(custoTotal.toFixed(2)),
    precoIdeal: Number(precoIdeal.toFixed(2)),
    detalhamento: {
      combustivel: Number((config.custoHoraCombustivel * horas).toFixed(2)),
      operador: Number((config.custoHoraOperador * horas).toFixed(2)),
      depreciacao: Number((config.custoHoraDepreciacao * horas).toFixed(2)),
      manutencao: Number((config.custoHoraManutencao * horas).toFixed(2)),
      seguro: Number((config.custoHoraSeguro * horas).toFixed(2)),
      transporte: Number(custoTransporte.toFixed(2)),
    },
  };
}

async function carregarConfig() {
  const config = await prisma.retroConfig.findFirst();
  return { config: config ? configNumerica(config) : CONFIG_DEFAULT, configured: Boolean(config) };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO", "COMERCIAL");
  if (erro) return erro;

  const action = req.nextUrl.searchParams.get("action") || "list";
  try {
    const loaded = await carregarConfig();

    if (action === "config") {
      return NextResponse.json({ config: loaded.config, configured: loaded.configured, source: loaded.configured ? "database" : "default" });
    }

    if (action === "viabilidade") {
      const tipoServico = req.nextUrl.searchParams.get("tipo") || "Terraplanagem";
      const quantidade = Math.max(0, Number(req.nextUrl.searchParams.get("qtd") || 0));
      const distancia = Math.max(0, Number(req.nextUrl.searchParams.get("dist") || 0));
      const valorProposto = Math.max(0, Number(req.nextUrl.searchParams.get("valor") || 0));
      if (![quantidade, distancia, valorProposto].every(Number.isFinite)) {
        return NextResponse.json({ error: "Parâmetros numéricos inválidos" }, { status: 400 });
      }
      const produtividade = PRODUTIVIDADE[tipoServico] || PRODUTIVIDADE.Outro;
      const horas = produtividade.taxa > 0 ? quantidade / produtividade.taxa : quantidade;
      const calculos = calcularCustos(loaded.config, horas, distancia);
      const margemReal = valorProposto > 0 ? ((valorProposto - calculos.custoTotal) / valorProposto) * 100 : 0;
      return NextResponse.json({
        tipoServico,
        quantidade,
        unidade: produtividade.unidade,
        descricaoProdutividade: produtividade.descricao,
        horas: Number(horas.toFixed(2)),
        ...calculos,
        valorProposto,
        margemReal: Number(margemReal.toFixed(2)),
        viavel: valorProposto > 0 ? valorProposto >= calculos.precoMinimo : null,
        recomendacao: valorProposto >= calculos.precoIdeal
          ? "Lucrativo"
          : valorProposto >= calculos.precoMinimo
            ? "Margem abaixo da meta"
            : valorProposto > 0
              ? "Prejuízo estimado"
              : "Informe o valor proposto",
        configSource: loaded.configured ? "database" : "default",
      });
    }

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const jobs = await prisma.retroJob.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: { despesas: { orderBy: { createdAt: "asc" } } },
      take: 1000,
    });
    return NextResponse.json({
      jobs,
      config: loaded.config,
      configured: loaded.configured,
      total: jobs.length,
      empty: jobs.length === 0,
    });
  } catch (error) {
    return erroInterno(error, "api/retro GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO", "COMERCIAL");
  if (erro || !user) return erro;

  try {
    const raw = await req.json();

    if (raw.action === "update_config") {
      if (!["ADMIN", "GESTOR", "FINANCEIRO"].some((role) => user.roles.includes(role))) {
        return NextResponse.json({ error: "Seu perfil não pode alterar custos operacionais" }, { status: 403 });
      }
      const parsed = ConfigSchema.safeParse(raw.config);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Configuração inválida" }, { status: 400 });
      const existing = await prisma.retroConfig.findFirst();
      const config = existing
        ? await prisma.retroConfig.update({ where: { id: existing.id }, data: parsed.data })
        : await prisma.retroConfig.create({ data: parsed.data });
      await registrarAuditoria({
        userId: user.id,
        action: existing ? "EDITAR" : "CRIAR",
        module: "retro",
        entityType: "RetroConfig",
        entityId: config.id,
        oldValues: existing ? configNumerica(existing) : undefined,
        newValues: parsed.data,
      });
      return NextResponse.json({ success: true, config: configNumerica(config) });
    }

    if (raw.action === "update_status") {
      const parsed = StatusSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Atualização inválida" }, { status: 400 });
      const body = parsed.data;
      const current = await prisma.retroJob.findUnique({ where: { id: body.id } });
      if (!current) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
      const valorCobrado = body.valorCobrado ?? numero(current.valorCobrado);
      const custoTotal = body.custoTotal ?? numero(current.custoTotal);
      const margemReal = valorCobrado > 0 ? ((valorCobrado - custoTotal) / valorCobrado) * 100 : null;
      const dataFim = body.dataFim ? parseDataOperacional(body.dataFim) : body.status === "concluido" ? new Date() : current.dataFim;
      if (body.dataFim && !dataFim) return NextResponse.json({ error: "Data final inválida" }, { status: 400 });
      const job = await prisma.retroJob.update({
        where: { id: body.id },
        data: {
          status: body.status,
          horasRealizadas: body.horasRealizadas ?? current.horasRealizadas,
          custoTotal: body.custoTotal ?? current.custoTotal,
          valorCobrado: body.valorCobrado ?? current.valorCobrado,
          margemReal,
          viavel: valorCobrado > 0 ? valorCobrado >= custoTotal : current.viavel,
          dataFim,
        },
      });
      await registrarAuditoria({
        userId: user.id,
        action: "STATUS_CHANGE",
        module: "retro",
        entityType: "RetroJob",
        entityId: job.id,
        oldValues: { status: current.status, horasRealizadas: current.horasRealizadas, custoTotal: current.custoTotal, valorCobrado: current.valorCobrado },
        newValues: { status: job.status, horasRealizadas: job.horasRealizadas, custoTotal: job.custoTotal, valorCobrado: job.valorCobrado, margemReal: job.margemReal },
      });
      return NextResponse.json({ success: true, job });
    }

    const parsed = JobSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Serviço inválido" }, { status: 400 });
    const body = parsed.data;
    const [loaded, client, contract] = await Promise.all([
      carregarConfig(),
      body.clienteId ? prisma.client.findUnique({ where: { id: body.clienteId }, select: { id: true, active: true } }) : null,
      body.contratoId ? prisma.contract.findUnique({ where: { id: body.contratoId }, select: { id: true, clientId: true } }) : null,
    ]);
    if (body.clienteId && (!client || !client.active)) return NextResponse.json({ error: "Cliente inválido ou inativo" }, { status: 404 });
    if (body.contratoId && !contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (body.clienteId && contract?.clientId && contract.clientId !== body.clienteId) {
      return NextResponse.json({ error: "O contrato não pertence ao cliente informado" }, { status: 409 });
    }

    const horas = numero(body.horasEstimadas);
    const distancia = numero(body.distanciaKm);
    const calculos = calcularCustos(loaded.config, horas, distancia);
    const valorCobrado = numero(body.valorCobrado);
    const dataInicio = body.dataInicio ? parseDataOperacional(body.dataInicio) : null;
    if (body.dataInicio && !dataInicio) return NextResponse.json({ error: "Data inicial inválida" }, { status: 400 });
    const numeroJob = `RETRO-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

    const job = await prisma.$transaction(async (tx) => {
      const created = await tx.retroJob.create({
        data: {
          numero: numeroJob,
          clienteNome: body.clienteNome,
          clienteId: body.clienteId || null,
          contratoId: body.contratoId || null,
          tipoServico: body.tipoServico,
          endereco: body.endereco || null,
          municipio: body.municipio || null,
          uf: body.uf || null,
          areaM2: body.areaM2 ?? null,
          volumeM3: body.volumeM3 ?? null,
          horasEstimadas: horas || null,
          distanciaKm: distancia || null,
          dataInicio,
          status: body.status,
          precoMinimo: calculos.precoMinimo,
          precoIdeal: calculos.precoIdeal,
          valorCobrado: valorCobrado || null,
          custoTotal: horas > 0 ? calculos.custoTotal : null,
          margemReal: valorCobrado > 0 && calculos.custoTotal > 0 ? ((valorCobrado - calculos.custoTotal) / valorCobrado) * 100 : null,
          viavel: valorCobrado > 0 ? valorCobrado >= calculos.precoMinimo : true,
          observacoes: body.observacoes || null,
          artNumero: body.artNumero || null,
        },
      });
      if (horas > 0) {
        await tx.retroJobDespesa.createMany({
          data: [
            { retroJobId: created.id, tipo: "combustivel", descricao: "Combustível estimado", valor: calculos.detalhamento.combustivel, unidade: "h", quantidade: horas },
            { retroJobId: created.id, tipo: "operador", descricao: "Operador e encargos estimados", valor: calculos.detalhamento.operador, unidade: "h", quantidade: horas },
            { retroJobId: created.id, tipo: "depreciacao", descricao: "Depreciação estimada", valor: calculos.detalhamento.depreciacao, unidade: "h", quantidade: horas },
            { retroJobId: created.id, tipo: "manutencao", descricao: "Manutenção estimada", valor: calculos.detalhamento.manutencao, unidade: "h", quantidade: horas },
            { retroJobId: created.id, tipo: "seguro", descricao: "Seguro estimado", valor: calculos.detalhamento.seguro, unidade: "h", quantidade: horas },
            { retroJobId: created.id, tipo: "transporte", descricao: `Transporte estimado (${distancia} km x 2)`, valor: calculos.detalhamento.transporte, unidade: "km", quantidade: distancia * 2 },
          ],
        });
      }
      return created;
    });

    await registrarAuditoria({
      userId: user.id,
      action: "CRIAR",
      module: "retro",
      entityType: "RetroJob",
      entityId: job.id,
      newValues: { numero: job.numero, clienteNome: job.clienteNome, tipoServico: job.tipoServico, horas, distancia, calculos, configSource: loaded.configured ? "database" : "default" },
    });
    return NextResponse.json({ success: true, job: await prisma.retroJob.findUnique({ where: { id: job.id }, include: { despesas: true } }), calculos }, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/retro POST");
  }
}
