import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

// Sempre executar no servidor — nunca pré-renderizar com dados demo no build
export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const em90 = new Date(); em90.setHours(0, 0, 0, 0); em90.setDate(em90.getDate() + 90);
    const [
      totalClientes, totalFuncionarios, totalNfse, totalPropostas,
      totalContratos, faturamentoAgg, contratosVencendo,
      dossiesPendentes, mobilizacoesBloqueadas, alteracoesEscopoPendentes, documentosAguardandoRevisao,
    ] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.employee.count({ where: { active: true } }),
      prisma.fiscalNfse.count(),
      prisma.proposal.count({ where: { deletedAt: null } }),
      prisma.contract.count({ where: { status: "Ativo" } }),
      prisma.contract.aggregate({ where: { status: "Ativo" }, _sum: { monthlyValue: true } }),
      prisma.contract.count({ where: { status: "Ativo", endDate: { lte: em90 } } }),
      prisma.serviceDossier.count({ where: { OR: [{ validationStatus: "pendente" }, { status: "em_validacao" }] } }),
      prisma.mobilization.count({ where: { complianceStatus: "bloqueada" } }),
      prisma.scopeChange.count({ where: { status: "pendente" } }),
      prisma.contractDocRecord.count({ where: { status: "pendente" } }),
    ]);
    return NextResponse.json({
      totalClientes, totalFuncionarios, totalNfse, totalPropostas,
      totalContratos,
      faturamentoContratado: Number(faturamentoAgg._sum.monthlyValue) || 0, // MRR — receita mensal contratada
      contratosVencendo, // contratos ativos que vencem nos próximos 90 dias
      dossiesPendentes,
      mobilizacoesBloqueadas,
      alteracoesEscopoPendentes,
      documentosAguardandoRevisao,
    });
  } catch (error) {
    return erroInterno(error, "api/dashboard");
  }
}
