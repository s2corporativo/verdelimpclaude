// Tabela de referência de preços por tipo de serviço — persistida no banco
// Na primeira consulta, popula com os valores padrão de mercado MG
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

// Sempre executar no servidor — nunca pré-renderizar com dados demo no build
export const dynamic = "force-dynamic";

const PADRAO: Record<string, { unit: string; costPerM2: number; profitMargin: number; minPrice: number; maxPrice: number; marketReference: number }> = {
  "Roçada Manual":        { unit: "m²", costPerM2: 1.20, profitMargin: 30, minPrice: 1.50, maxPrice: 3.00, marketReference: 2.20 },
  "Roçada Mecanizada":    { unit: "m²", costPerM2: 0.80, profitMargin: 30, minPrice: 1.10, maxPrice: 2.20, marketReference: 1.60 },
  "Jardinagem Mensal":    { unit: "m²", costPerM2: 3.50, profitMargin: 35, minPrice: 4.50, maxPrice: 8.00, marketReference: 6.00 },
  "Plantio de Mudas":     { unit: "m²", costPerM2: 8.00, profitMargin: 40, minPrice: 10.00, maxPrice: 18.00, marketReference: 14.00 },
  "PRADA/PTRF":           { unit: "ha", costPerM2: 2500, profitMargin: 35, minPrice: 2000, maxPrice: 5000, marketReference: 3500 },
  "Limpeza de Terreno":   { unit: "m²", costPerM2: 0.60, profitMargin: 30, minPrice: 0.80, maxPrice: 1.80, marketReference: 1.20 },
  "Podação de Árvores":   { unit: "un", costPerM2: 120, profitMargin: 40, minPrice: 80, maxPrice: 300, marketReference: 180 },
  "Hidrossemeadura":      { unit: "ha", costPerM2: 1800, profitMargin: 35, minPrice: 1500, maxPrice: 3500, marketReference: 2500 },
  "Controle de Formigas": { unit: "m²", costPerM2: 0.20, profitMargin: 50, minPrice: 0.15, maxPrice: 0.50, marketReference: 0.30 },
};

async function garantirPadrao() {
  const total = await prisma.pricingRule.count();
  if (total > 0) return;
  for (const [serviceType, v] of Object.entries(PADRAO)) {
    await prisma.pricingRule.upsert({ where: { serviceType }, update: {}, create: { serviceType, ...v } });
  }
}

export async function GET() {
  try {
    await garantirPadrao();
    const regras = await prisma.pricingRule.findMany({ orderBy: { serviceType: "asc" } });
    return NextResponse.json({
      data: regras.map((r) => ({
        serviceType: r.serviceType, unit: r.unit,
        costPerM2: Number(r.costPerM2), profitMargin: Number(r.profitMargin),
        minPrice: Number(r.minPrice), maxPrice: Number(r.maxPrice), marketReference: Number(r.marketReference),
      })),
      aviso: "Tabela de referência — validar com histórico real de contratos",
    });
  } catch (e: any) {
    // Banco indisponível — devolve os padrões em modo somente-leitura
    const regras = Object.entries(PADRAO).map(([serviceType, v]) => ({ serviceType, ...v }));
    return NextResponse.json({ data: regras, _demo: true, aviso: "Banco indisponível — exibindo tabela padrão" });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.serviceType) return NextResponse.json({ error: "serviceType obrigatório" }, { status: 400 });
    const dados = {
      costPerM2: Number(b.costPerM2 || 0), profitMargin: Number(b.profitMargin || 30),
      minPrice: Number(b.minPrice || 0), maxPrice: Number(b.maxPrice || 0),
      marketReference: Number(b.marketReference || 0),
      ...(b.unit ? { unit: b.unit } : {}),
    };
    const regra = await prisma.pricingRule.upsert({
      where: { serviceType: b.serviceType },
      update: dados,
      create: { serviceType: b.serviceType, unit: b.unit || "m²", ...dados },
    });
    return NextResponse.json({ success: true, updated: regra });
  } catch (e: any) { return erroInterno(e, "api/precificacao-regras"); }
}
