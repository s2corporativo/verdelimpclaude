import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const dataOpcional = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  z.literal(""),
]).optional().nullable();

const EquipamentoSchema = z.object({
  codigo: z.string().trim().min(2).max(80).optional().nullable(),
  descricao: z.string().trim().min(2).max(250),
  tipo: z.string().trim().min(2).max(120),
  marca: z.string().trim().max(120).optional().nullable(),
  modelo: z.string().trim().max(120).optional().nullable(),
  anoFabricacao: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().nullable(),
  numeroProprio: z.string().trim().max(120).optional().nullable(),
  localAtual: z.string().trim().max(250).optional().nullable(),
  contratoId: z.string().trim().optional().nullable(),
  valorAquisicao: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  dataAquisicao: dataOpcional,
  vidaUtilMeses: z.coerce.number().int().positive().max(1200).optional().nullable(),
  proximaRevisao: dataOpcional,
});

const ManutencaoSchema = z.object({
  action: z.literal("manutencao"),
  equipmentId: z.string().trim().min(1),
  tipo: z.enum(["preventiva", "corretiva", "revisao"]).default("preventiva"),
  descricao: z.string().trim().min(2).max(500),
  dataAgendada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data agendada inválida"),
  dataRealizada: dataOpcional,
  custo: z.coerce.number().nonnegative().max(9999999999999.99).optional().nullable(),
  fornecedor: z.string().trim().max(200).optional().nullable(),
  observacoes: z.string().trim().max(1000).optional().nullable(),
  proximaRevisao: dataOpcional,
});

const StatusSchema = z.object({
  action: z.literal("update_status"),
  id: z.string().trim().min(1),
  status: z.enum(["operacional", "manutencao", "inativo"]),
});

const DocumentoSchema = z.object({
  action: z.literal("documento"),
  equipmentId: z.string().trim().min(1),
  docType: z.string().trim().min(2).max(120),
  filePath: z.string().trim().min(1).max(1000),
  issuedAt: dataOpcional,
  expiresAt: dataOpcional,
  notes: z.string().trim().max(1000).optional().nullable(),
});

const RevisaoSchema = z.object({
  action: z.literal("revisar_documento"),
  documentId: z.string().trim().min(1),
  status: z.enum(["aprovado", "rejeitado"]),
  rejectionReason: z.string().trim().max(1000).optional().nullable(),
});

function parseDate(value?: string | null) {
  if (!value) return null;
  return parseDataOperacional(value);
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "ALMOXARIFADO", "FINANCEIRO");
  if (erro) return erro;

  try {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const tipo = req.nextUrl.searchParams.get("tipo") || undefined;
    const incluirInativos = req.nextUrl.searchParams.get("inativos") === "true";
    const equipamentos = await prisma.equipment.findMany({
      where: {
        ...(incluirInativos ? {} : { ativo: true }),
        ...(status ? { status } : {}),
        ...(tipo ? { tipo } : {}),
      },
      include: {
        manutencoes: { orderBy: { dataAgendada: "asc" }, take: 20 },
        documents: { orderBy: { createdAt: "desc" } },
        reservations: { where: { status: { in: ["provisoria", "confirmada"] } }, orderBy: { startDate: "asc" } },
      },
      orderBy: { descricao: "asc" },
    });

    const today = new Date();
    const in7Days = new Date(Date.now() + 7 * 86_400_000);
    const in30Days = new Date(Date.now() + 30 * 86_400_000);
    const alertas = equipamentos
      .filter((item) => item.proximaRevisao && new Date(item.proximaRevisao) <= in30Days)
      .map((item) => ({
        equipamentoId: item.id,
        descricao: item.descricao,
        tipo: new Date(item.proximaRevisao!) <= today ? "vencida" : new Date(item.proximaRevisao!) <= in7Days ? "urgente" : "proxima",
        data: item.proximaRevisao,
      }));
    const documentosPendentes = equipamentos.reduce(
      (soma, item) => soma + item.documents.filter((document) => document.status !== "aprovado" || (document.expiresAt && new Date(document.expiresAt) < today)).length,
      0,
    );

    return NextResponse.json({
      equipamentos,
      alertas,
      stats: {
        total: equipamentos.length,
        operacional: equipamentos.filter((item) => item.status === "operacional").length,
        manutencao: equipamentos.filter((item) => item.status === "manutencao").length,
        inativo: equipamentos.filter((item) => item.status === "inativo").length,
        alertas: alertas.length,
        documentosPendentes,
      },
      empty: equipamentos.length === 0,
    });
  } catch (error) {
    return erroInterno(error, "api/equipamentos GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "OPERACIONAL", "ALMOXARIFADO");
  if (erro || !user) return erro;

  try {
    const raw = await req.json();

    if (raw.action === "manutencao") {
      const parsed = ManutencaoSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Manutenção inválida" }, { status: 400 });
      const body = parsed.data;
      const equipment = await prisma.equipment.findUnique({ where: { id: body.equipmentId } });
      if (!equipment || !equipment.ativo) return NextResponse.json({ error: "Equipamento não encontrado ou inativo" }, { status: 404 });
      const dataAgendada = parseDate(body.dataAgendada);
      const dataRealizada = parseDate(body.dataRealizada);
      const proximaRevisao = parseDate(body.proximaRevisao);
      if (!dataAgendada || (body.dataRealizada && !dataRealizada) || (body.proximaRevisao && !proximaRevisao)) {
        return NextResponse.json({ error: "Uma das datas informadas é inválida" }, { status: 400 });
      }

      const maintenance = await prisma.$transaction(async (tx) => {
        const created = await tx.equipmentMaintenance.create({
          data: {
            equipmentId: body.equipmentId,
            tipo: body.tipo,
            descricao: body.descricao,
            dataAgendada,
            dataRealizada,
            custo: body.custo ?? null,
            fornecedor: body.fornecedor || null,
            status: dataRealizada ? "realizada" : "agendada",
            observacoes: body.observacoes || null,
          },
        });
        await tx.equipment.update({
          where: { id: body.equipmentId },
          data: {
            status: dataRealizada ? "operacional" : "manutencao",
            ...(proximaRevisao ? { proximaRevisao } : {}),
          },
        });
        return created;
      });
      await registrarAuditoria({ userId: user.id, action: "CRIAR", module: "equipamentos", entityType: "EquipmentMaintenance", entityId: maintenance.id, newValues: body });
      return NextResponse.json({ success: true, manutencao: maintenance }, { status: 201 });
    }

    if (raw.action === "update_status") {
      const parsed = StatusSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Status inválido" }, { status: 400 });
      const current = await prisma.equipment.findUnique({ where: { id: parsed.data.id } });
      if (!current) return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
      const equipment = await prisma.equipment.update({
        where: { id: parsed.data.id },
        data: { status: parsed.data.status, ativo: parsed.data.status !== "inativo" },
      });
      await registrarAuditoria({ userId: user.id, action: "STATUS_CHANGE", module: "equipamentos", entityType: "Equipment", entityId: equipment.id, oldValues: { status: current.status, ativo: current.ativo }, newValues: { status: equipment.status, ativo: equipment.ativo } });
      return NextResponse.json({ success: true, equipamento: equipment });
    }

    if (raw.action === "documento") {
      const parsed = DocumentoSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Documento inválido" }, { status: 400 });
      const body = parsed.data;
      const equipment = await prisma.equipment.findUnique({ where: { id: body.equipmentId }, select: { id: true, ativo: true } });
      if (!equipment || !equipment.ativo) return NextResponse.json({ error: "Equipamento não encontrado ou inativo" }, { status: 404 });
      const issuedAt = parseDate(body.issuedAt);
      const expiresAt = parseDate(body.expiresAt);
      if ((body.issuedAt && !issuedAt) || (body.expiresAt && !expiresAt)) return NextResponse.json({ error: "Data do documento inválida" }, { status: 400 });
      if (issuedAt && expiresAt && expiresAt < issuedAt) return NextResponse.json({ error: "Validade anterior à emissão" }, { status: 400 });
      const document = await prisma.equipmentDoc.create({
        data: { equipmentId: body.equipmentId, docType: body.docType, issuedAt, expiresAt, filePath: body.filePath, notes: body.notes || null },
      });
      await registrarAuditoria({ userId: user.id, action: "CRIAR", module: "equipamentos", entityType: "EquipmentDoc", entityId: document.id, newValues: body });
      return NextResponse.json({ success: true, documento: document }, { status: 201 });
    }

    if (raw.action === "revisar_documento") {
      if (!["ADMIN", "GESTOR"].some((role) => user.roles.includes(role))) {
        return NextResponse.json({ error: "A revisão documental exige perfil de administração ou gestão" }, { status: 403 });
      }
      const parsed = RevisaoSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Revisão inválida" }, { status: 400 });
      if (parsed.data.status === "rejeitado" && !parsed.data.rejectionReason) return NextResponse.json({ error: "Informe o motivo da rejeição" }, { status: 400 });
      const current = await prisma.equipmentDoc.findUnique({ where: { id: parsed.data.documentId } });
      if (!current) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
      if (parsed.data.status === "aprovado" && !current.filePath) return NextResponse.json({ error: "Anexe o arquivo antes da aprovação" }, { status: 422 });
      const document = await prisma.equipmentDoc.update({
        where: { id: parsed.data.documentId },
        data: {
          status: parsed.data.status,
          reviewedBy: user.email || user.name || user.id,
          reviewedAt: new Date(),
          rejectionReason: parsed.data.status === "rejeitado" ? parsed.data.rejectionReason : null,
        },
      });
      await registrarAuditoria({ userId: user.id, action: "REVISAR", module: "equipamentos", entityType: "EquipmentDoc", entityId: document.id, oldValues: { status: current.status, rejectionReason: current.rejectionReason }, newValues: { status: document.status, rejectionReason: document.rejectionReason } });
      return NextResponse.json({ success: true, documento: document });
    }

    const parsed = EquipamentoSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Equipamento inválido" }, { status: 400 });
    const body = parsed.data;
    const dataAquisicao = parseDate(body.dataAquisicao);
    const proximaRevisao = parseDate(body.proximaRevisao);
    if ((body.dataAquisicao && !dataAquisicao) || (body.proximaRevisao && !proximaRevisao)) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    if (body.contratoId) {
      const contract = await prisma.contract.findUnique({ where: { id: body.contratoId }, select: { id: true } });
      if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    }
    const codigo = body.codigo || `EQ-${Date.now()}`;
    const equipment = await prisma.equipment.create({
      data: {
        codigo,
        descricao: body.descricao,
        tipo: body.tipo,
        marca: body.marca || null,
        modelo: body.modelo || null,
        anoFabricacao: body.anoFabricacao ?? null,
        numeroProprio: body.numeroProprio || null,
        localAtual: body.localAtual || null,
        contratoId: body.contratoId || null,
        status: "operacional",
        valorAquisicao: body.valorAquisicao ?? null,
        dataAquisicao,
        vidaUtilMeses: body.vidaUtilMeses ?? null,
        proximaRevisao,
      },
    });
    await registrarAuditoria({ userId: user.id, action: "CRIAR", module: "equipamentos", entityType: "Equipment", entityId: equipment.id, newValues: { ...body, codigo } });
    return NextResponse.json({ success: true, equipamento: equipment }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "Código ou identificação do equipamento já cadastrada" }, { status: 409 });
    return erroInterno(error, "api/equipamentos POST");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR");
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const current = await prisma.equipment.findUnique({
      where: { id },
      include: { reservations: { where: { status: { in: ["provisoria", "confirmada"] }, endDate: { gte: new Date() } }, select: { id: true } } },
    });
    if (!current) return NextResponse.json({ error: "Equipamento não encontrado" }, { status: 404 });
    if (current.reservations.length) return NextResponse.json({ error: "Equipamento possui reserva ativa e não pode ser arquivado" }, { status: 409 });
    const equipment = await prisma.equipment.update({ where: { id }, data: { ativo: false, status: "inativo" } });
    await registrarAuditoria({ userId: user.id, action: "ARQUIVAR", module: "equipamentos", entityType: "Equipment", entityId: id, oldValues: { ativo: current.ativo, status: current.status }, newValues: { ativo: equipment.ativo, status: equipment.status } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return erroInterno(error, "api/equipamentos DELETE");
  }
}
