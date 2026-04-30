// src/app/api/integracoes/publicas/cep/[cep]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";

export async function GET(_req: NextRequest, { params }: { params: { cep: string } }) {
  const clean = params.cep.replace(/\D/g, "");
  if (clean.length !== 8) return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  try {
    const { data, cached } = await fetchWithCache(
      `https://viacep.com.br/ws/${clean}/json/`,
      `cep:${clean}`, "viacep", 86_400_000
    );
    return NextResponse.json({ ...(data as object), _cached: cached });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 });
  }
}
