// Rentabilidade por contrato — receita (medições) × custos lançados.
// Custos de combustível E mão de obra mobilizada entram automaticamente:
// a margem sem o custo de equipe superestimava a rentabilidade (era o maior
// custo de um contrato de terceirização e ficava fora da conta).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

// Meses (fração) em que a mobilização esteve ativa, do início até hoje/encerramento
function mesesAtivos(startDate: Date, endDate: Date | null): number {
  const inicio = new Date(startDate).getTime();
  const fim = (endDate ? new Date(endDate) : new Date()).getTime();
  if (fim <= inicio) return 0;
  return (fim - inicio) / (30.44 * 24 * 3600 * 1000); // mês médio
}

export async function GET(req: NextRequest) {
  try {
    const contractId = req.nextUrl.searchParams.get("contractId");

    const contratos = await prisma.contract.findMany({
      include: {
        client: { select: { name: true } },
        measurements: { select: { value: true, status: true, period: true } },
        costs: { orderBy: { date: "desc" } },
        fuelLogs: { select: { totalCost: true } },
        mobilizations: { select: { costPerMonth: true, startDate: true, endDate: true, status: true } },
      },
      orderBy: { number: "asc" },
    });

    const linhas = contratos.map((c) => {
      const receita = c.measurements
        .filter((m) => ["aprovada", "faturada"].includes(m.status))
        .reduce((s, m) => s + Number(m.value), 0);
      const custosLancados = c.costs.reduce((s, x) => s + Number(x.amount), 0);
      const combustivel = c.fuelLogs.reduce((s, f) => s + Number(f.totalCost), 0);

      // Mão de obra acumulada: custo/mês × meses ativos de cada mobilização
      // (encerradas contam até o encerramento; ativas até hoje).
      const maoDeObra = c.mobilizations
        .filter((m) => m.status !== "suspensa")
        .reduce((s, m) => s + Number(m.costPerMonth) * mesesAtivos(m.startDate, m.endDate), 0);

      const custoTotal = custosLancados + combustivel + maoDeObra;
      const margem = receita - custoTotal;

      const porCategoria: Record<string, number> = {};
      for (const cst of c.costs) porCategoria[cst.category] = (porCategoria[cst.category] || 0) + Number(cst.amount);
      if (combustivel > 0) porCategoria["combustivel_auto"] = combustivel;
      if (maoDeObra > 0) porCategoria["mao_de_obra_auto"] = Number(maoDeObra.toFixed(2));

      return {
        id: c.id, number: c.number, object: c.object, status: c.status,
        cliente: c.client?.name || "—",
        valorContrato: Number(c.value), valorMensal: Number(c.monthlyValue),
        custoMensalEquipe: c.mobilizations
          .filter((m) => m.status === "ativa")
          .reduce((s, m) => s + Number(m.costPerMonth), 0),
        maoDeObraAcumulada: Number(maoDeObra.toFixed(2)),
        receita, custoTotal: Number(custoTotal.toFixed(2)), margem: Number(margem.toFixed(2)),
        margemPct: receita > 0 ? (margem / receita) * 100 : null,
        porCategoria,
        custos: contractId === c.id ? c.costs : undefined,
      };
    });

    return NextResponse.json({ linhas });
  } catch (e) {
    return erroInterno(e, "api/rentabilidade GET");
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
