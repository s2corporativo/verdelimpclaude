// src/app/api/chat-ajuda/route.ts
// Chat com assistente especializado do Verdelimp ERP — powered by GROQ
import { NextRequest, NextResponse } from "next/server";
import { groqChat, GroqMessage } from "@/lib/groq";

const SYSTEM = `Assistente do Verdelimp ERP para VERDELIMP SERVICOS E TERCEIRIZACAO LTDA, CNPJ 30.198.776/0001-29, Betim/MG, Simples Nacional, CNAE 81.30-3-00 (Paisagismo), 8 funcionários. Sistema com módulos: contratos, fiscal (DAS 6,72%, ISS 5% Betim), logística, retroescavadeira, dedetização, pipeline licitações, precificação BDI (TCU 2369/2011), mobilizações, equipamentos, aging financeiro, backup JSON/CSV. Responda direto e prático em português, máx 3 parágrafos.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages?.length) {
      return NextResponse.json({ error: "messages obrigatório" }, { status: 400 });
    }
    const groqMsgs: GroqMessage[] = [
      { role: "system", content: SYSTEM },
      ...messages.map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    ];
    const text = await groqChat(groqMsgs, 600);
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
