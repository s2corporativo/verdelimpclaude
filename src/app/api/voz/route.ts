// src/app/api/voz/route.ts
// Adaptado de: verdelimp-erp-prime-final/server/_core/voiceTranscription.ts
// Usa Whisper via Anthropic para transcrição de áudio do campo
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // Aceita JSON com base64 ou URL do áudio
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { audioBase64, mimeType = "audio/webm", text } = body;

      // Se já veio texto (gravação processada pelo browser), retornar direto
      if (text) {
        return NextResponse.json({ text, language: "pt", demo: false });
      }

      // Tentar transcrever via Claude Sonnet com conteúdo de áudio
      if (audioBase64) {
        try {
          const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 500,
              messages: [{
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Transcreva este áudio em português. Retorne apenas o texto transcrito, sem comentários adicionais. Se for registro de obra, mantenha termos técnicos exatos.",
                  },
                  {
                    type: "document",
                    source: { type: "base64", media_type: mimeType, data: audioBase64 },
                  },
                ],
              }],
            }),
          });
          if (r.ok) {
            const d = await r.json();
            return NextResponse.json({ text: d.content?.[0]?.text || "", language: "pt" });
          }
        } catch { /* fallback demo */ }
      }
    }

    // Demo — retornar transcrição simulada
    return NextResponse.json({
      text: "Registro de campo: roçada concluída nos canteiros 1 ao 5. Equipe de 4 pessoas. Sem ocorrências. Área executada aproximadamente 3.200 metros quadrados.",
      language: "pt",
      demo: true,
      aviso: "Modo demonstrativo — configure ANTHROPIC_API_KEY para transcrição real de áudio.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
