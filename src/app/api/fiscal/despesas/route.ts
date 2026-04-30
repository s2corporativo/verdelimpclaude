// src/app/api/fiscal/despesas/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competencia = searchParams.get("competencia");
  const status = searchParams.get("status");

  try {
    const where: any = {};
    if (competencia) where.competence = competencia;
    if (status) where.status = status;

    const despesas = await prisma.fiscalTaxExpense.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });

    if (despesas.length === 0) {
      // Retornar dados demo se banco vazio
      return NextResponse.json({ data: DEMO_DESPESAS, _demo: true });
    }
    return NextResponse.json({ data: despesas });
  } catch {
    return NextResponse.json({ data: DEMO_DESPESAS, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taxType, description, competence, dueDate, principalAmount } = body;

    if (!taxType) return NextResponse.json({ error: "Tipo obrigatório" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "Descrição obrigatória" }, { status: 400 });
    if (!competence) return NextResponse.json({ error: "Competência obrigatória" }, { status: 400 });
    if (!dueDate) return NextResponse.json({ error: "Vencimento obrigatório" }, { status: 400 });
    if (body.status === "pago" && !body.paymentDate) {
      return NextResponse.json({ error: "Data de pagamento obrigatória quando status é pago" }, { status: 400 });
    }

    const total =
      Number(principalAmount || 0) +
      Number(body.penaltyAmount || 0) +
      Number(body.interestAmount || 0) -
      Number(body.discountAmount || 0);

    const despesa = await prisma.fiscalTaxExpense.create({
      data: {
        taxType,
        description,
        competence,
        dueDate: new Date(dueDate),
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        principalAmount: Number(principalAmount || 0),
        penaltyAmount: Number(body.penaltyAmount || 0),
        interestAmount: Number(body.interestAmount || 0),
        totalAmount: total,
        status: body.status || "em_aberto",
        revenueCode: body.revenueCode,
        notes: body.notes,
        generatedAuto: false,
      },
    });

    return NextResponse.json(despesa, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_DESPESAS = [
  { id: "d1", taxType: "DAS", description: "Simples Nacional Abril/2026", competence: "2026-04", dueDate: "2026-05-20", totalAmount: 3840, status: "em_aberto", generatedAuto: false },
  { id: "d2", taxType: "FGTS", description: "FGTS Abril/2026", competence: "2026-04", dueDate: "2026-05-07", paymentDate: "2026-05-07", totalAmount: 1648, status: "pago", generatedAuto: false },
  { id: "d3", taxType: "ISS", description: "ISS Betim Abril/2026", competence: "2026-04", dueDate: "2026-05-10", totalAmount: 950, status: "em_aberto", generatedAuto: false },
];
