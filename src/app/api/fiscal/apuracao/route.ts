// src/app/api/fiscal/apuracao/route.ts
import { NextRequest, NextResponse } from "next/server";
import { apurarTributos, salvarApuracao } from "@/lib/fiscal-calc";

export async function POST(req: NextRequest) {
  try {
    const { competencia, faturamento } = await req.json();

    if (!competencia || !faturamento) {
      return NextResponse.json({ error: "Competência e faturamento obrigatórios" }, { status: 400 });
    }

    if (faturamento <= 0) {
      return NextResponse.json({ error: "Faturamento deve ser positivo" }, { status: 400 });
    }

    // Calcular tributos
    const lancamentos = await apurarTributos(competencia, Number(faturamento));

    // Salvar no banco (remove automáticos anteriores e cria novos)
    await salvarApuracao(lancamentos, competencia);

    return NextResponse.json({
      success: true,
      competencia,
      faturamento,
      lancamentos,
      total: lancamentos.reduce((s, l) => s + l.valor, 0),
      aviso: "Apoio gerencial — validar com contador antes do pagamento. DAS exige apuração no PGDAS-D.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro interno" }, { status: 500 });
  }
}
