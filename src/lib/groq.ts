// src/lib/groq.ts
// Helper centralizado para chamadas GROQ (llama-3.3-70b-versatile)
// Substitui todas as chamadas Anthropic do projeto

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function groqChat(
  messages: GroqMessage[],
  maxTokens = 1000
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY não configurada nas variáveis de ambiente");

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!r.ok) {
    const err = await r.text().catch(() => r.status.toString());
    throw new Error(`GROQ API erro ${r.status}: ${err}`);
  }
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

// Transcrição de áudio via GROQ Whisper
export async function groqTranscribe(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY não configurada");

  const form = new FormData();
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mp3") ? "mp3" : "webm";
  form.append("file", new Blob([new Uint8Array(audioBuffer)], { type: mimeType }), `audio.${ext}`);
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "pt");

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!r.ok) throw new Error(`GROQ Whisper erro ${r.status}`);
  const d = await r.json();
  return d.text ?? "";
}
