import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

export async function GET(_req: NextRequest, { params }: { params: { cnpj: string } }) {
  const clean = params.cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  try {
    const { data, cached } = await fetchWithCache(
      `https://brasilapi.com.br/api/cnpj/v1/${clean}`,
      `cnpj:${clean}`, "cnpj", 86_400_000
    );
    return NextResponse.json({ ...(data as object), _cached: cached });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
