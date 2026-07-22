import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const equipamentos = await prisma.equipment.findMany({
      where: { ativo: true },
      include: {
        manutencoes: { orderBy: { dataAgendada: "asc" }, take: 5 },
        documents: { orderBy: { createdAt: "desc" } },
        reservations: { where: { status: { in: ["provisoria", "confirmada"] } }, orderBy: { startDate: "asc" } },
      },
      orderBy: { descricao: "asc" },
    });
    const today = new Date();
    const in7Days = new Date(Date.now() + 7 * 86400000);
    const in30Days = new Date(Date.now() + 30 * 86400000);
    const alertas = equipamentos.filter((item) => item.proximaRevisao && new Date(item.proximaRevisao) <= in30Days).map((item) => ({
      equipamentoId: item.id,
      descricao: item.descricao,
      tipo: new Date(item.proximaRevisao!) <= today ? "vencida" : new Date(item.proximaRevisao!) <= in7Days ? "urgente" : "proxima",
      data: item.proximaRevisao,
    }));
    const documentsPending = equipamentos.reduce((sum, item) => sum + item.documents.filter((document) => document.status !== "aprovado" || (document.expiresAt && new Date(document.expiresAt) < today)).length, 0);
    return NextResponse.json({
      equipamentos,
      alertas,
      stats: {
        total: equipamentos.length,
        operacional: equipamentos.filter((item) => item.status === "operacional").length,
        manutencao: equipamentos.filter((item) => item.status === "manutencao").length,
        alertas: alertas.length,
        documentosPendentes: documentsPending,
      },
    });
  } catch (error) {
    return erroInterno(error, "api/equipamentos:get");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "OPERACIONAL", "OPERACAO", "OPERAÇÃO", "DIRETORIA");
  if (erro) return erro;
  try {
    const body = await req.json();
    if (body.action === "manutencao") {
      const dataAgendada = parseDataOperacional(body.dataAgendada);
      if (!dataAgendada) return NextResponse.json({ error: "Data agendada inválida" }, { status: 400 });
      const maintenance = await prisma.equipmentMaintenance.create({
        data: {
          equipmentId: body.equipmentId,
          tipo: body.tipo || "preventiva",
          descricao: body.descricao,
          dataAgendada,
          dataRealizada: parseDataOperacional(body.dataRealizada),
          custo: body.custo || null,
          fornecedor: body.fornecedor || null,
          status: body.dataRealizada ? "realizada" : "agendada",
          observacoes: body.observacoes || null,
        },
      });
      if (body.proximaRevisao) await prisma.equipment.update({ where: { id: body.equipmentId }, data: { proximaRevisao: parseDataOperacional(body.proximaRevisao), status: "operacional" } });
      return NextResponse.json({ success: true, manutencao: maintenance });
    }
    if (body.action === "update_status") {
      const equipment = await prisma.equipment.update({ where: { id: body.id }, data: { status: body.status } });
      return NextResponse.json({ success: true, equipamento: equipment });
    }
    if (body.action === "documento") {
      if (!body.equipmentId || !body.docType || !body.filePath) return NextResponse.json({ error: "Equipamento, tipo e arquivo do documento são obrigatórios" }, { status: 400 });
      const document = await prisma.equipmentDoc.create({
        data: { equipmentId: body.equipmentId, docType: body.docType, issuedAt: parseDataOperacional(body.issuedAt), expiresAt: parseDataOperacional(body.expiresAt), filePath: body.filePath || null, notes: body.notes || null },
      });
      return NextResponse.json({ success: true, documento: document }, { status: 201 });
    }
    if (body.action === "revisar_documento") {
      if (!["ADMIN", "DIRETORIA"].some((role) => user!.roles.includes(role))) {
        return NextResponse.json({ error: "A revisão documental exige perfil de administração ou diretoria" }, { status: 403 });
      }
      if (!body.documentId || !["aprovado", "rejeitado"].includes(body.status)) return NextResponse.json({ error: "Documento e decisão válidos são obrigatórios" }, { status: 400 });
      const current = await prisma.equipmentDoc.findUnique({ where: { id: body.documentId }, select: { filePath: true } });
      if (!current) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
      if (body.status === "aprovado" && !current.filePath) return NextResponse.json({ error: "Anexe o arquivo antes da aprovação" }, { status: 422 });
      const document = await prisma.equipmentDoc.update({
        where: { id: body.documentId },
        data: { status: body.status, reviewedBy: user?.email || user?.name, reviewedAt: new Date(), rejectionReason: body.status === "rejeitado" ? body.rejectionReason || "Rejeitado na revisão" : null },
      });
      return NextResponse.json({ success: true, documento: document });
    }

    if (!body.descricao || !body.tipo) return NextResponse.json({ error: "Descrição e tipo são obrigatórios" }, { status: 400 });
    const equipment = await prisma.equipment.create({
      data: {
        codigo: body.codigo || `EQ-${Date.now()}`,
        descricao: body.descricao,
        tipo: body.tipo,
        marca: body.marca || null,
        modelo: body.modelo || null,
        anoFabricacao: body.anoFabricacao || null,
        numeroProprio: body.numeroProprio || null,
        status: "operacional",
        valorAquisicao: body.valorAquisicao || null,
        dataAquisicao: parseDataOperacional(body.dataAquisicao),
        vidaUtilMeses: body.vidaUtilMeses || null,
        proximaRevisao: parseDataOperacional(body.proximaRevisao),
      },
    });
    return NextResponse.json({ success: true, equipamento: equipment }, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/equipamentos:post");
  }
}
