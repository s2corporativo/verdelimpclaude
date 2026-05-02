// src/app/api/equipamentos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const equipamentos = await prisma.equipment.findMany({
      where: { ativo: true },
      include: {
        manutencoes: {
          orderBy: { dataAgendada: "asc" },
          take: 5,
        },
      },
      orderBy: { descricao: "asc" },
    });

    const hoje = new Date();
    const em7dias = new Date(Date.now() + 7 * 86400000);
    const em30dias = new Date(Date.now() + 30 * 86400000);

    const alertas = equipamentos.filter(e => {
      if (!e.proximaRevisao) return false;
      return new Date(e.proximaRevisao) <= em30dias;
    }).map(e => ({
      equipamentoId: e.id,
      descricao: e.descricao,
      tipo: new Date(e.proximaRevisao!) <= hoje ? "vencida" : new Date(e.proximaRevisao!) <= em7dias ? "urgente" : "proxima",
      data: e.proximaRevisao,
    }));

    const emManutencao = equipamentos.filter(e => e.status === "manutencao").length;

    if (!equipamentos.length) {
      return NextResponse.json({ equipamentos: DEMO_EQ, alertas: DEMO_ALERTAS, stats: { total: 7, operacional: 5, manutencao: 2, alertas: 3 }, _demo: true });
    }

    return NextResponse.json({
      equipamentos,
      alertas,
      stats: {
        total: equipamentos.length,
        operacional: equipamentos.filter(e => e.status === "operacional").length,
        manutencao: emManutencao,
        alertas: alertas.length,
      },
    });
  } catch {
    return NextResponse.json({ equipamentos: DEMO_EQ, alertas: DEMO_ALERTAS, stats: { total: 7, operacional: 5, manutencao: 2, alertas: 3 }, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "manutencao") {
      const m = await prisma.equipmentMaintenance.create({
        data: {
          equipmentId: body.equipmentId,
          tipo: body.tipo || "preventiva",
          descricao: body.descricao,
          dataAgendada: new Date(body.dataAgendada),
          dataRealizada: body.dataRealizada ? new Date(body.dataRealizada) : null,
          custo: body.custo || null,
          fornecedor: body.fornecedor || null,
          status: body.dataRealizada ? "realizada" : "agendada",
          observacoes: body.observacoes || null,
        },
      });
      // Atualizar próxima revisão do equipamento
      if (body.proximaRevisao) {
        await prisma.equipment.update({
          where: { id: body.equipmentId },
          data: { proximaRevisao: new Date(body.proximaRevisao), status: "operacional" },
        });
      }
      return NextResponse.json({ success: true, manutencao: m });
    }

    if (action === "update_status") {
      const eq = await prisma.equipment.update({
        where: { id: body.id },
        data: { status: body.status },
      });
      return NextResponse.json({ success: true, equipamento: eq });
    }

    // Criar equipamento
    const eq = await prisma.equipment.create({
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
        dataAquisicao: body.dataAquisicao ? new Date(body.dataAquisicao) : null,
        vidaUtilMeses: body.vidaUtilMeses || null,
        proximaRevisao: body.proximaRevisao ? new Date(body.proximaRevisao) : null,
      },
    });
    return NextResponse.json({ success: true, equipamento: eq });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_EQ = [
  { id:"eq1", codigo:"ROC-001", descricao:"Roçadeira Stihl FS 450", tipo:"Roçadeira", marca:"Stihl", modelo:"FS 450", anoFabricacao:2024, numeroProprio:"ROC-001", status:"operacional", horasUso:320, proximaRevisao:"2026-05-15", valorAquisicao:2800, manutencoes:[] },
  { id:"eq2", codigo:"ROC-002", descricao:"Roçadeira Stihl FS 380", tipo:"Roçadeira", marca:"Stihl", modelo:"FS 380", anoFabricacao:2023, numeroProprio:"ROC-002", status:"manutencao", horasUso:680, proximaRevisao:"2026-05-03", valorAquisicao:2400, manutencoes:[{ tipo:"corretiva", descricao:"Carburador entupido", dataAgendada:"2026-05-03", status:"agendada" }] },
  { id:"eq3", codigo:"MSS-001", descricao:"Motosserra Stihl MS 250", tipo:"Motosserra", marca:"Stihl", modelo:"MS 250", anoFabricacao:2024, status:"operacional", horasUso:140, proximaRevisao:"2026-07-01", valorAquisicao:2500, manutencoes:[] },
  { id:"eq4", codigo:"VEI-001", descricao:"Toyota Hilux Cabine Dupla", tipo:"Veiculo", marca:"Toyota", modelo:"Hilux", anoFabricacao:2025, numeroProprio:"QWE-1234", status:"operacional", horasUso:0, proximaRevisao:"2026-06-01", valorAquisicao:180000, manutencoes:[] },
  { id:"eq5", codigo:"VEI-002", descricao:"Iveco Daily Carroceria", tipo:"Veiculo", marca:"Iveco", modelo:"Daily", anoFabricacao:2025, numeroProprio:"ASD-5678", status:"operacional", horasUso:0, proximaRevisao:"2026-06-01", valorAquisicao:160000, manutencoes:[] },
  { id:"eq6", codigo:"VEI-003", descricao:"Volkswagen Gol 1.0", tipo:"Veiculo", marca:"Volkswagen", modelo:"Gol", anoFabricacao:2024, numeroProprio:"ZXC-9012", status:"operacional", horasUso:0, proximaRevisao:"2026-08-01", valorAquisicao:65000, manutencoes:[] },
  { id:"eq7", codigo:"SPL-001", descricao:"Soprador Stihl BR 600", tipo:"Soprador", marca:"Stihl", modelo:"BR 600", anoFabricacao:2024, status:"manutencao", horasUso:280, proximaRevisao:"2026-05-01", valorAquisicao:2200, manutencoes:[{ tipo:"preventiva", descricao:"Revisão geral dos 250h", dataAgendada:"2026-05-01", status:"agendada" }] },
];

const DEMO_ALERTAS = [
  { equipamentoId:"eq2", descricao:"Roçadeira Stihl FS 380", tipo:"urgente", data:"2026-05-03" },
  { equipamentoId:"eq7", descricao:"Soprador Stihl BR 600", tipo:"vencida", data:"2026-05-01" },
  { equipamentoId:"eq4", descricao:"Toyota Hilux Cabine Dupla", tipo:"proxima", data:"2026-06-01" },
];
