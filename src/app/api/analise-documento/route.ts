// Análise Jurídica de Documento — recebe texto colado ou um PDF (base64),
// extrai o conteúdo e devolve o parecer jurídico estruturado (tipo reconhecido +
// leitura de advogado especialista). Não persiste nada; é análise sob demanda.
import { NextResponse } from "next/server";
import { z } from "zod";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { validar } from "@/lib/validacao";
import { analisarDocumentoJuridico } from "@/lib/analise-juridica";
import { groqConfigurado } from "@/lib/groq";
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const Schema = z.object({
  texto: z.string().max(60000).optional(),
  pdfBase64: z.string().max(20_000_000).optional(),
  nomeArquivo: z.string().max(200).optional(),
}).refine((d) => (d.texto && d.texto.trim().length > 20) || d.pdfBase64, {
  message: "Envie um PDF ou cole ao menos 20 caracteres de texto.",
});

export async function POST(req: Request) {
  const { erro } = await exigirPapel(); // qualquer usuário autenticado
  if (erro) return erro;
  try {
    if (!(await groqConfigurado())) {
      return NextResponse.json({ error: "Chave GROQ ausente — a análise por IA está indisponível. Cadastre em Admin → Credenciais & APIs." }, { status: 503 });
    }

    const { data: body, erro: erroVal } = validar(Schema, await req.json().catch(() => ({})));
    if (erroVal) return erroVal;

    let texto = (body.texto || "").trim();
    if (body.pdfBase64) {
      const buf = Buffer.from(body.pdfBase64, "base64");
      if (buf.length > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "PDF acima de 10 MB. Envie um arquivo menor ou cole o texto." }, { status: 413 });
      }
      try {
        const extraido = (await pdfParse(buf)).text || "";
        texto = `${extraido}\n${texto}`.trim();
      } catch {
        return NextResponse.json({ error: "Não foi possível ler o PDF (protegido, escaneado ou corrompido). Cole o texto manualmente." }, { status: 422 });
      }
    }

    if (texto.length < 20) {
      return NextResponse.json({ error: "Conteúdo insuficiente para análise." }, { status: 422 });
    }

    const analise = await analisarDocumentoJuridico(texto);
    return NextResponse.json({ analise, nomeArquivo: body.nomeArquivo || null, caracteres: texto.length });
  } catch (e) {
    return erroInterno(e, "api/analise-documento");
  }
}
