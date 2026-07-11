// Rentabilidade por contrato — receita (medições) × custos lançados.
// Custos de combustível vinculados ao contrato entram automaticamente.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const contractId = req.nextUrl.searchParams.get("contractId");

    const contratos = await prisma.contract.findMany({
      include: {
        client: { select: { name: true } },
        measurements: { select: { value: true, status: true, period: true } },
        costs: { orderBy: { date: "desc" } },
        fuelLogs: { select: { totalCost: true } },
        mobilizations: { where: { status: "ativa" }, select: { costPerMonth: true } },
      },
      orderBy: { number: "asc" },
    });

    const linhas = contratos.map((c) => {
      const receita = c.measurements
        .filter((m) => ["aprovada", "faturada"].includes(m.status))
        .reduce((s, m) => s + Number(m.value), 0);
      const custosLancados = c.costs.reduce((s, x) => s + Number(x.amount), 0);
      const combustivel = c.fuelLogs.reduce((s, f) => s + Number(f.totalCost), 0);
      const custoTotal = custosLancados + combustivel;
      const margem = receita - custoTotal;

      const porCategoria: Record<string, number> = {};
      for (const cst of c.costs) porCategoria[cst.category] = (porCategoria[cst.category] || 0) + Number(cst.amount);
      if (combustivel > 0) porCategoria["combustivel_auto"] = combustivel;

      return {
        id: c.id, number: c.number, object: c.object, status: c.status,
        cliente: c.client?.name || "—",
        valorContrato: Number(c.value), valorMensal: Number(c.monthlyValue),
        custoMensalEquipe: c.mobilizations.reduce((s, m) => s + Number(m.costPerMonth), 0),
        receita, custoTotal, margem,
        margemPct: receita > 0 ? (margem / receita) * 100 : null,
        porCategoria,
        custos: contractId === c.id ? c.costs : undefined,
      };
    });

    return NextResponse.json({ linhas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.contractId || !b.description || !b.amount) return NextResponse.json({ error: "Contrato, descrição e valor são obrigatórios" }, { status: 400 });
    const c = await prisma.contractCost.create({
      data: {
        contractId: b.contractId,
        date: b.date ? new Date(b.date) : new Date(),
        category: b.category || "outros",
        description: b.description,
        amount: Number(b.amount),
      },
    });
    return NextResponse.json({ ok: true, id: c.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.contractCost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
