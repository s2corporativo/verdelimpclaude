// Atualização de despesa tributária individual (ex.: marcar como paga)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const b = await req.json();
    const data: any = {};
    if (b.status !== undefined) data.status = b.status;
    if (b.paymentDate !== undefined) data.paymentDate = b.paymentDate ? new Date(b.paymentDate) : null;
    if (b.notes !== undefined) data.notes = b.notes;
    if (b.accountantReviewed !== undefined) data.accountantReviewed = !!b.accountantReviewed;
    const d = await prisma.fiscalTaxExpense.update({ where: { id }, data });
    return NextResponse.json({ ok: true, data: d });
  } catch (e: any) {
    return erroInterno(e, "api/fiscal/despesas/[id]");
  }
}
