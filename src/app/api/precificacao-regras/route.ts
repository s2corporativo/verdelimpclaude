
// Adaptado de: verdelimp-erp-prime-final/drizzle/schema.ts → pricingRules table
// costPerM2, profitMargin, minPrice, maxPrice, marketReference por serviceType
import { NextRequest, NextResponse } from "next/server";

// Por enquanto: tabela em memória (sem model Prisma dedicado ainda)
// Os dados ficam no .env ou podem ser migrados para um model Prisma futuro
const TABELA_PRECOS: Record<string, any> = {
  "Roçada Manual":        { costPerM2: 1.20, profitMargin: 30, minPrice: 1.50, maxPrice: 3.00, marketReference: 2.20 },
  "Roçada Mecanizada":    { costPerM2: 0.80, profitMargin: 30, minPrice: 1.10, maxPrice: 2.20, marketReference: 1.60 },
  "Jardinagem Mensal":    { costPerM2: 3.50, profitMargin: 35, minPrice: 4.50, maxPrice: 8.00, marketReference: 6.00 },
  "Plantio de Mudas":     { costPerM2: 8.00, profitMargin: 40, minPrice: 10.00, maxPrice: 18.00, marketReference: 14.00 },
  "PRADA/PTRF":           { costPerM2: 2500, profitMargin: 35, minPrice: 2000, maxPrice: 5000, marketReference: 3500 },
  "Limpeza de Terreno":   { costPerM2: 0.60, profitMargin: 30, minPrice: 0.80, maxPrice: 1.80, marketReference: 1.20 },
  "Podação de Árvores":   { costPerM2: 120, profitMargin: 40, minPrice: 80, maxPrice: 300, marketReference: 180 },
  "Hidrossemeadura":      { costPerM2: 1800, profitMargin: 35, minPrice: 1500, maxPrice: 3500, marketReference: 2500 },
  "Controle de Formigas": { costPerM2: 0.20, profitMargin: 50, minPrice: 0.15, maxPrice: 0.50, marketReference: 0.30 },
};

export async function GET() {
  const regras = Object.entries(TABELA_PRECOS).map(([serviceType, v]) => ({ serviceType, ...v, unit: serviceType.includes("PRADA") || serviceType.includes("Hidro") ? "ha" : serviceType.includes("Podação") || serviceType.includes("Árvore") ? "un" : "m²" }));
  return NextResponse.json({ data: regras, aviso: "Tabela de referência — validar com histórico real de contratos" });
}

export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    if (b.serviceType && TABELA_PRECOS[b.serviceType]) {
      Object.assign(TABELA_PRECOS[b.serviceType], { costPerM2: Number(b.costPerM2), profitMargin: Number(b.profitMargin), minPrice: Number(b.minPrice), maxPrice: Number(b.maxPrice), marketReference: Number(b.marketReference) });
      return NextResponse.json({ success: true, updated: TABELA_PRECOS[b.serviceType] });
    }
    return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
