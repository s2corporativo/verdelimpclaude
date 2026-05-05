// src/app/api/analise-preco/route.ts
// Análise de precificação via GROQ — chamada server-side (seguro)
import { NextRequest, NextResponse } from "next/server";
import { groqChat } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "prompt obrigatório" }, { status: 400 });
    const text = await groqChat([
      { role: "system", content: "Especialista em precificação de serviços ambientais e paisagismo para licitações públicas em MG. Analise o preço e dê feedback objetivo. Seja prático e direto." },
      { role: "user", content: prompt },
    ], 700);
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
