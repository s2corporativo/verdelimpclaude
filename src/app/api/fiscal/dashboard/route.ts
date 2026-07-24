// Indicadores fiscais derivados exclusivamente dos lançamentos persistidos.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const ConsultaSchema = z.object({
  competencia: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "FINANCEIRO", "GESTOR");
  if (erro) return erro;

  try {
    const validacao = ConsultaSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
    if (!validacao.success) return NextResponse.json({ error: "Competência inválida. Use AAAA-MM." }, { status: 400 });

    const hoje = new Date();
    const em30 = new Date(hoje.getTime() + 30 * 86_400_000);
    const filtroCompetencia = validacao.data.competencia ? { competence: validacao.data.competencia } : {};

    const [abertos, pagos, vencidos, nfseCount, docsVencer, proximosVencimentos] = await Promise.all([
      prisma.fiscalTaxExpense.aggregate({
        where: { ...filtroCompetencia, status: { not: "pago" } },
        _sum: { totalAmount: true },
      }),
      prisma.fiscalTaxExpense.aggregate({
        where: { ...filtroCompetencia, status: "pago" },
        _sum: { totalAmount: true },
      }),
      prisma.fiscalTaxExpense.count({
        where: { ...filtroCompetencia, status: { not: "pago" }, dueDate: { lt: hoje } },
      }),
      prisma.fiscalNfse.count({ where: filtroCompetencia }),
      prisma.fiscalDocument.count({
        where: { dueDate: { lte: em30 }, status: { notIn: ["arquivado", "substituido"] } },
      }),
      prisma.fiscalTaxExpense.findMany({
        where: { ...filtroCompetencia, status: { not: "pago" } },
        orderBy: { dueDate: "asc" },
        take: 10,
        select: {
          id: true,
          taxType: true,
          description: true,
          competence: true,
          dueDate: true,
          totalAmount: true,
          generatedAuto: true,
          status: true,
        },
      }),
    ]);

    const normalizados = proximosVencimentos.map((item) => ({
      ...item,
      vencido: item.dueDate < hoje,
      diasParaVencimento: Math.ceil((item.dueDate.getTime() - hoje.getTime()) / 86_400_000),
    }));

    return NextResponse.json({
      tributosAberto: Number(abertos._sum.totalAmount || 0),
      tributosPago: Number(pagos._sum.totalAmount || 0),
      tributosVencidos: vencidos,
      nfseCount,
      docsVencer,
      proximosVencimentos: normalizados,
      competencia: validacao.data.competencia || null,
      fonte: "lancamentos_fiscais",
      geradoEm: hoje.toISOString(),
    });
  } catch (e) {
    return erroInterno(e, "api/fiscal/dashboard GET");
  }
}
