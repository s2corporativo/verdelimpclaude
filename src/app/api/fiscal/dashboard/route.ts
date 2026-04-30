// src/app/api/fiscal/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    const [tributosAberto, tributosPago, tributosVencidos, nfseCount, docsVencer] = await Promise.all([
      prisma.fiscalTaxExpense.aggregate({ where: { status: "em_aberto" }, _sum: { totalAmount: true } }),
      prisma.fiscalTaxExpense.aggregate({ where: { status: "pago" }, _sum: { totalAmount: true } }),
      prisma.fiscalTaxExpense.count({ where: { status: "vencido" } }),
      prisma.fiscalNfse.count(),
      prisma.fiscalDocument.count({ where: { status: { in: ["a_vencer", "vencido"] } } }),
    ]);

    const proximosVenc = await prisma.fiscalTaxExpense.findMany({
      where: { status: "em_aberto" },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: { taxType: true, competence: true, dueDate: true, totalAmount: true, generatedAuto: true },
    });

    return NextResponse.json({
      tributosAberto: Number(tributosAberto._sum.totalAmount) || 0,
      tributosPago: Number(tributosPago._sum.totalAmount) || 0,
      tributosVencidos,
      nfseCount,
      docsVencer,
      proximosVencimentos: proximosVenc,
    });
  } catch {
    // Retornar dados demo se banco não estiver disponível
    return NextResponse.json({
      tributosAberto: 8450, tributosPago: 12300, tributosVencidos: 1,
      nfseCount: 4, docsVencer: 2, proximosVencimentos: [], _demo: true,
    });
  }
}
