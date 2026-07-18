// src/app/api/analise-licitacao/route.ts
// Análise de edital PNCP via GROQ — chamada server-side (seguro)
import { NextRequest, NextResponse } from "next/server";
import { groqChat } from "@/lib/groq";
import { erroInterno } from "@/lib/authz";

export async function POST(req: NextRequest) {
  try {
    const { edital } = await req.json();
    if (!edital) return NextResponse.json({ error: "edital obrigatório" }, { status: 400 });
    const text = await groqChat([
      {
        role: "system",
        content: "Você é consultor de licitações para a VERDELIMP SERVICOS E TERCEIRIZACAO LTDA, CNPJ 30.198.776/0001-29, EPP, Simples Nacional, CNAE 81.30-3-00 (Paisagismo), Betim/MG, 8 funcionários. Analise se vale participar do edital. Responda: VALE PARTICIPAR? SIM/NÃO/TALVEZ — e em 3 linhas: motivo, risco principal e sugestão de preço estimado por m² ou unidade. Seja direto e prático.",
      },
      { role: "user", content: edital },
    ], 600);
    return NextResponse.json({ text });
  } catch (e: any) {
    return erroInterno(e, "api/analise-licitacao");
  }
}
