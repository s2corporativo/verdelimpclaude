
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hoje = new Date();
    const meses: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const comp = d.toISOString().slice(0,7);
      const [nfses, tributos, desp] = await Promise.all([
        prisma.fiscalNfse.aggregate({ where: { competence: comp }, _sum: { serviceValue: true } }),
        prisma.fiscalTaxExpense.aggregate({ where: { competence: comp }, _sum: { totalAmount: true } }),
        prisma.expense.aggregate({ where: { competence: comp, deletedAt: null }, _sum: { amount: true } }),
      ]);
      meses.push({ mes: comp, faturamento: Number(nfses._sum.serviceValue||0), tributos: Number(tributos._sum.totalAmount||0), despesas: Number(desp._sum.amount||0) });
    }
    return NextResponse.json({ meses });
  } catch {
    return NextResponse.json({ meses: DEMO_MESES });
  }
}

const DEMO_MESES = [
  { mes:"2025-11", faturamento:42000, tributos:5200, despesas:18000 },
  { mes:"2025-12", faturamento:45000, tributos:5800, despesas:19200 },
  { mes:"2026-01", faturamento:50000, tributos:6200, despesas:20100 },
  { mes:"2026-02", faturamento:48600, tributos:6000, despesas:19800 },
  { mes:"2026-03", faturamento:54200, tributos:6800, despesas:21000 },
  { mes:"2026-04", faturamento:57000, tributos:7870, despesas:22100 },
];
