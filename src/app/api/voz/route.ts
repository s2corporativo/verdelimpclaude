// src/app/api/voz/route.ts
// Transcrição de áudio do campo via GROQ Whisper
import { NextRequest, NextResponse } from "next/server";
import { groqTranscribe } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { audioBase64, mimeType = "audio/webm", text } = body;

      // Se o browser já entregou texto via WebSpeech API, retornar direto
      if (text) {
        return NextResponse.json({ text, language: "pt", demo: false });
      }

      // Transcrição via GROQ Whisper
      if (audioBase64) {
        try {
          const buf = Buffer.from(audioBase64, "base64");
          const transcrito = await groqTranscribe(buf, mimeType);
          return NextResponse.json({ text: transcrito, language: "pt", demo: false });
        } catch {
          /* fallback para demo */
        }
      }
    }

    // Demo — retornar transcrição simulada quando sem áudio ou sem chave
    return NextResponse.json({
      text: "Registro de campo: roçada concluída nos canteiros 1 ao 5. Equipe de 4 pessoas. Sem ocorrências. Área executada aproximadamente 3.200 metros quadrados.",
      language: "pt",
      demo: true,
      aviso: "Modo demonstrativo — envie o áudio em base64 para transcrição real via GROQ Whisper.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
