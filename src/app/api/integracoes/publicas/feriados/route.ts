// src/app/api/integracoes/publicas/feriados/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

export async function GET(req: NextRequest) {
  const year = new URL(req.url).searchParams.get("ano") || new Date().getFullYear().toString();
  try {
    const { data, cached } = await fetchWithCache(
      `https://brasilapi.com.br/api/feriados/v1/${year}`,
      `feriados:${year}`, "feriados", 86_400_000 * 30
    );
    return NextResponse.json({ feriados: data, cached });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
