import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [totalClientes, totalFuncionarios, totalNfse, totalPropostas] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.employee.count({ where: { active: true } }),
      prisma.fiscalNfse.count(),
      prisma.proposal.count({ where: { deletedAt: null } }),
    ]);
    return NextResponse.json({ totalClientes, totalFuncionarios, totalNfse, totalPropostas });
  } catch {
    return NextResponse.json({ totalClientes: 5, totalFuncionarios: 8, totalNfse: 3, totalPropostas: 2, _demo: true });
  }
}
