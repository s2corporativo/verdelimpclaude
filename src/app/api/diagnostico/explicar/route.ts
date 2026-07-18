// Explicação de um problema do diagnóstico via IA (GROQ) — orientação passo a
// passo em linguagem simples para o operador do sistema.
import { NextRequest, NextResponse } from "next/server";
import { groqChat } from "@/lib/groq";
import { erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { titulo, detalhe, correcao } = await req.json();
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ text: correcao || "Configure a chave GROQ para receber explicações da IA. A correção sugerida acima já é o caminho." });
    }
    const texto = await groqChat([
      { role: "system", content: "Você é o técnico de suporte do Verdelimp ERP (Next.js + PostgreSQL + Docker numa VPS Contabo). Explique o problema e a solução para um usuário LEIGO, em português do Brasil, de forma curta, calma e prática. Use passos numerados quando houver comandos. Nunca invente; se precisar de dado que não tem, diga o que verificar. Não peça senhas." },
      { role: "user", content: `Problema detectado no diagnóstico:\nTítulo: ${titulo}\nDetalhe: ${detalhe}\nCorreção sugerida pelo sistema: ${correcao || "(nenhuma)"}\n\nExplique o que aconteceu e como resolver, passo a passo.` },
    ], 600);
    return NextResponse.json({ text: texto });
  } catch (e: any) {
    return erroInterno(e, "api/diagnostico/explicar");
  }
}
