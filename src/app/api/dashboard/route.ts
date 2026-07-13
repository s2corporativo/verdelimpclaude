import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Sempre executar no servidor — nunca pré-renderizar com dados demo no build
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const em90 = new Date(); em90.setHours(0, 0, 0, 0); em90.setDate(em90.getDate() + 90);
    const [
      totalClientes, totalFuncionarios, totalNfse, totalPropostas,
      totalContratos, faturamentoAgg, contratosVencendo,
    ] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.employee.count({ where: { active: true } }),
      prisma.fiscalNfse.count(),
      prisma.proposal.count({ where: { deletedAt: null } }),
      prisma.contract.count({ where: { status: "Ativo" } }),
      prisma.contract.aggregate({ where: { status: "Ativo" }, _sum: { monthlyValue: true } }),
      prisma.contract.count({ where: { status: "Ativo", endDate: { lte: em90 } } }),
    ]);
    return NextResponse.json({
      totalClientes, totalFuncionarios, totalNfse, totalPropostas,
      totalContratos,
      faturamentoContratado: Number(faturamentoAgg._sum.monthlyValue) || 0, // MRR — receita mensal contratada
      contratosVencendo, // contratos ativos que vencem nos próximos 90 dias
    });
  } catch {
    return NextResponse.json({
      totalClientes: 5, totalFuncionarios: 8, totalNfse: 3, totalPropostas: 2,
      totalContratos: 4, faturamentoContratado: 128500, contratosVencendo: 1, _demo: true,
    });
  }
}
