import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { CONTATOS_OPERACIONAIS, ROTINAS_BASE, type FrequenciaRotina, type RotinaTemplate } from "@/lib/rotinas-base";

export const dynamic = "force-dynamic";

const FREQUENCIAS: FrequenciaRotina[] = ["diaria", "semanal", "mensal"];
const PAPEIS_CONFIGURACAO = ["ADMIN", "GESTOR"];

function diaIso(data = new Date()) {
  return data.toISOString().slice(0, 10);
}

function inicioSemana(data: Date) {
  const resultado = new Date(data);
  const dia = resultado.getDay();
  const deslocamento = dia === 0 ? -6 : 1 - dia;
  resultado.setDate(resultado.getDate() + deslocamento);
  resultado.setHours(12, 0, 0, 0);
  return diaIso(resultado);
}

function inicioMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-01`;
}

function referenciaDaRotina(frequencia: FrequenciaRotina, data: Date) {
  if (frequencia === "diaria") return diaIso(data);
  if (frequencia === "semanal") return inicioSemana(data);
  return inicioMes(data);
}

function podeConfigurar(roles: string[]) {
  return PAPEIS_CONFIGURACAO.some((papel) => roles.includes(papel));
}

function jsonSeguro(valor: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}

function normalizarTemplate(valor: Record<string, unknown>, anterior?: RotinaTemplate): RotinaTemplate {
  const frequencia = String(valor.frequencia ?? anterior?.frequencia ?? "diaria") as FrequenciaRotina;
  if (!FREQUENCIAS.includes(frequencia)) throw new Error("Frequência inválida");

  const titulo = String(valor.titulo ?? anterior?.titulo ?? "").trim();
  const descricao = String(valor.descricao ?? anterior?.descricao ?? "").trim();
  const categoria = String(valor.categoria ?? anterior?.categoria ?? "Organização").trim();
  if (!titulo) throw new Error("Título é obrigatório");
  if (!descricao) throw new Error("Descrição é obrigatória");

  const prioridade = String(valor.prioridade ?? anterior?.prioridade ?? "normal");
  if (!["normal", "alta", "critica"].includes(prioridade)) throw new Error("Prioridade inválida");

  return {
    id: String(valor.id ?? anterior?.id ?? `custom-${randomUUID()}`),
    titulo: titulo.slice(0, 180),
    descricao: descricao.slice(0, 1000),
    frequencia,
    categoria: categoria.slice(0, 80),
    horario: String(valor.horario ?? anterior?.horario ?? "").trim().slice(0, 60) || undefined,
    responsavel: String(valor.responsavel ?? anterior?.responsavel ?? "").trim().slice(0, 120) || undefined,
    prioridade: prioridade as RotinaTemplate["prioridade"],
    link: String(valor.link ?? anterior?.link ?? "").trim().slice(0, 300) || undefined,
    ativa: valor.ativa === undefined ? anterior?.ativa !== false : Boolean(valor.ativa),
    personalizada: true,
  };
}

async function carregarTemplates() {
  const mapa = new Map<string, RotinaTemplate>(
    ROTINAS_BASE.map((rotina) => [rotina.id, { ...rotina, ativa: true, personalizada: false }]),
  );

  const alteracoes = await prisma.auditLog.findMany({
    where: { module: "rotinas-template", entityType: "RoutineTemplate" },
    orderBy: { createdAt: "asc" },
  });

  for (const alteracao of alteracoes) {
    const atual = mapa.get(alteracao.entityId || "");
    const dados = alteracao.newValues && typeof alteracao.newValues === "object" && !Array.isArray(alteracao.newValues)
      ? alteracao.newValues as Record<string, unknown>
      : {};

    if (alteracao.action === "ARCHIVE" && atual) {
      mapa.set(atual.id, { ...atual, ativa: false });
      continue;
    }
    if (alteracao.action === "RESTORE" && atual) {
      mapa.set(atual.id, { ...atual, ativa: true });
      continue;
    }
    if (["CREATE", "UPDATE"].includes(alteracao.action)) {
      try {
        const template = normalizarTemplate({ ...dados, id: alteracao.entityId || dados.id }, atual);
        mapa.set(template.id, template);
      } catch {
        // Uma alteração histórica inválida não pode derrubar o painel operacional.
      }
    }
  }

  return mapa;
}

export async function GET(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro || !user) return erro;

  try {
    const periodoSolicitado = req.nextUrl.searchParams.get("periodo") || "diaria";
    const periodo = FREQUENCIAS.includes(periodoSolicitado as FrequenciaRotina)
      ? periodoSolicitado as FrequenciaRotina
      : "diaria";
    const dataInformada = req.nextUrl.searchParams.get("data");
    const dataBase = dataInformada ? new Date(`${dataInformada}T12:00:00`) : new Date();
    if (Number.isNaN(dataBase.getTime())) return NextResponse.json({ error: "Data inválida" }, { status: 400 });

    const frequenciasVisiveis: FrequenciaRotina[] = periodo === "diaria"
      ? ["diaria"]
      : periodo === "semanal"
        ? ["diaria", "semanal"]
        : ["diaria", "semanal", "mensal"];

    const templates = await carregarTemplates();
    const selecionadas = [...templates.values()]
      .filter((rotina) => rotina.ativa !== false && frequenciasVisiveis.includes(rotina.frequencia))
      .sort((a, b) => {
        const prioridade = { critica: 0, alta: 1, normal: 2 };
        const diferenca = prioridade[a.prioridade || "normal"] - prioridade[b.prioridade || "normal"];
        return diferenca || a.categoria.localeCompare(b.categoria, "pt-BR") || a.titulo.localeCompare(b.titulo, "pt-BR");
      });

    const chaves = selecionadas.map((rotina) => `${rotina.id}:${referenciaDaRotina(rotina.frequencia, dataBase)}`);
    const execucoes = chaves.length ? await prisma.auditLog.findMany({
      where: { module: "rotinas-execucao", entityType: "RoutineExecution", entityId: { in: chaves } },
      orderBy: { createdAt: "asc" },
    }) : [];

    const estadoExecucao = new Map<string, { concluida: boolean; dataConclusao?: string; observacao?: string }>();
    for (const execucao of execucoes) {
      const dados = execucao.newValues && typeof execucao.newValues === "object" && !Array.isArray(execucao.newValues)
        ? execucao.newValues as Record<string, unknown>
        : {};
      estadoExecucao.set(execucao.entityId || "", {
        concluida: execucao.action === "COMPLETE",
        dataConclusao: execucao.action === "COMPLETE" ? execucao.createdAt.toISOString() : undefined,
        observacao: typeof dados.observacao === "string" ? dados.observacao : undefined,
      });
    }

    const rotinas = selecionadas.map((rotina) => {
      const referenceDate = referenciaDaRotina(rotina.frequencia, dataBase);
      const execucao = estadoExecucao.get(`${rotina.id}:${referenceDate}`);
      return {
        ...rotina,
        templateId: rotina.id,
        referenceDate,
        concluida: execucao?.concluida || false,
        dataConclusao: execucao?.dataConclusao,
        observacao: execucao?.observacao,
      };
    });

    const porCategoria: Record<string, number> = {};
    for (const rotina of rotinas) porCategoria[rotina.categoria] = (porCategoria[rotina.categoria] || 0) + 1;

    return NextResponse.json({
      rotinas,
      resumo: {
        total: rotinas.length,
        concluidas: rotinas.filter((rotina) => rotina.concluida).length,
        pendentes: rotinas.filter((rotina) => !rotina.concluida).length,
        porCategoria,
      },
      contatos: CONTATOS_OPERACIONAIS,
      data: diaIso(dataBase),
      podeConfigurar: podeConfigurar(user.roles || []),
    });
  } catch (error) {
    return erroInterno(error, "api/rotinas GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro || !user) return erro;

  try {
    const body = await req.json();
    const action = String(body.action || "toggle");

    if (action === "create") {
      if (!podeConfigurar(user.roles || [])) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      const template = normalizarTemplate(body);
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          module: "rotinas-template",
          entityType: "RoutineTemplate",
          entityId: template.id,
          newValues: jsonSeguro(template),
        },
      });
      return NextResponse.json({ ok: true, rotina: template }, { status: 201 });
    }

    const id = String(body.id || "").trim();
    const referenceDate = String(body.referenceDate || diaIso()).trim();
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
      return NextResponse.json({ error: "Rotina e data de referência são obrigatórias" }, { status: 400 });
    }

    const templates = await carregarTemplates();
    if (!templates.has(id)) return NextResponse.json({ error: "Rotina não encontrada" }, { status: 404 });
    const concluida = Boolean(body.concluida);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: concluida ? "COMPLETE" : "REOPEN",
        module: "rotinas-execucao",
        entityType: "RoutineExecution",
        entityId: `${id}:${referenceDate}`,
        newValues: jsonSeguro({ id, referenceDate, concluida, observacao: String(body.observacao || "").slice(0, 1000) || null }),
      },
    });

    return NextResponse.json({ ok: true, id, referenceDate, concluida, dataConclusao: concluida ? new Date().toISOString() : null });
  } catch (error) {
    if (error instanceof Error && ["Frequência inválida", "Título é obrigatório", "Descrição é obrigatória", "Prioridade inválida"].includes(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return erroInterno(error, "api/rotinas POST");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR");
  if (erro || !user) return erro;

  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const templates = await carregarTemplates();
    const atual = templates.get(id);
    if (!atual) return NextResponse.json({ error: "Rotina não encontrada" }, { status: 404 });
    const template = normalizarTemplate({ ...body, id }, atual);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        module: "rotinas-template",
        entityType: "RoutineTemplate",
        entityId: id,
        oldValues: jsonSeguro(atual),
        newValues: jsonSeguro(template),
      },
    });
    return NextResponse.json({ ok: true, rotina: template });
  } catch (error) {
    if (error instanceof Error && ["Frequência inválida", "Título é obrigatório", "Descrição é obrigatória", "Prioridade inválida"].includes(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return erroInterno(error, "api/rotinas PATCH");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR");
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const templates = await carregarTemplates();
    const atual = templates.get(id);
    if (!atual) return NextResponse.json({ error: "Rotina não encontrada" }, { status: 404 });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ARCHIVE",
        module: "rotinas-template",
        entityType: "RoutineTemplate",
        entityId: id,
        oldValues: jsonSeguro(atual),
        newValues: jsonSeguro({ ...atual, ativa: false }),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return erroInterno(error, "api/rotinas DELETE");
  }
}
