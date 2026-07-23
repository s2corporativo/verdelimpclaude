import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { groqChat, groqConfigurado } from "@/lib/groq";

export const dynamic = "force-dynamic";
const Input = z.object({
  text: z.string().max(100000).optional(), pdfBase64: z.string().max(25_000_000).optional(),
  sourceName: z.string().max(250).optional(), documentId: z.string().optional(),
}).refine((v) => Boolean(v.text?.trim() || v.pdfBase64), "Informe texto ou PDF");
const Output = z.object({
  documentType: z.enum(["BOLETO", "NOTA_FISCAL", "COMPROVANTE", "CONTRATO", "OUTRO"]),
  issuerName: z.string().nullable().optional(), issuerDocument: z.string().nullable().optional(),
  receiverName: z.string().nullable().optional(), receiverDocument: z.string().nullable().optional(),
  number: z.string().nullable().optional(), barcode: z.string().nullable().optional(), digitableLine: z.string().nullable().optional(),
  issueDate: z.string().nullable().optional(), dueDate: z.string().nullable().optional(), paymentDate: z.string().nullable().optional(),
  amount: z.number().nullable().optional(), paidAmount: z.number().nullable().optional(),
  description: z.string().nullable().optional(), taxes: z.array(z.object({ name: z.string(), amount: z.number().nullable().optional() })).default([]),
  warnings: z.array(z.string()).default([]), confidence: z.number().min(0).max(100).default(0),
});

function onlyDigits(value?: string | null) { return (value || "").replace(/\D/g, ""); }
function validateFinancial(data: z.infer<typeof Output>) {
  const warnings = [...data.warnings];
  if (data.documentType === "BOLETO") {
    const line = onlyDigits(data.digitableLine);
    const code = onlyDigits(data.barcode);
    if (line && ![47, 48].includes(line.length)) warnings.push("Linha digitável com quantidade de dígitos inesperada; revisar manualmente.");
    if (code && code.length !== 44) warnings.push("Código de barras com quantidade de dígitos inesperada; revisar manualmente.");
    if (!line && !code) warnings.push("Boleto sem linha digitável ou código de barras identificado.");
  }
  if (!data.amount && !data.paidAmount) warnings.push("Valor não identificado com segurança.");
  if (data.confidence < 75) warnings.push("Extração com confiança baixa: exige validação humana antes de lançar.");
  return { ...data, warnings: [...new Set(warnings)] };
}

export async function POST(req: Request) {
  const { user, erro } = await exigirPapel("ADMIN", "FINANCEIRO", "FISCAL");
  if (erro) return erro;
  try {
    const parsed = Input.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Entrada inválida", details: parsed.error.flatten() }, { status: 400 });
    if (!(await groqConfigurado())) return NextResponse.json({ error: "IA indisponível: configure GROQ_API_KEY" }, { status: 503 });
    let text = parsed.data.text?.trim() || "";
    if (parsed.data.pdfBase64) {
      const buf = Buffer.from(parsed.data.pdfBase64, "base64");
      if (buf.length > 10 * 1024 * 1024) return NextResponse.json({ error: "PDF acima de 10 MB" }, { status: 413 });
      try { text = `${(await pdfParse(buf)).text || ""}\n${text}`.trim(); }
      catch { return NextResponse.json({ error: "PDF sem texto pesquisável. Execute OCR externo ou envie o texto extraído; o sistema não inventará dados." }, { status: 422 }); }
    }
    if (text.length < 20) return NextResponse.json({ error: "Conteúdo insuficiente para extração" }, { status: 422 });

    const prompt = `Analise o documento financeiro brasileiro abaixo. Extraia somente fatos expressamente presentes. Não deduza CNPJ, datas, valores ou linha digitável. Retorne JSON válido, sem markdown, com este formato:
{"documentType":"BOLETO|NOTA_FISCAL|COMPROVANTE|CONTRATO|OUTRO","issuerName":null,"issuerDocument":null,"receiverName":null,"receiverDocument":null,"number":null,"barcode":null,"digitableLine":null,"issueDate":null,"dueDate":null,"paymentDate":null,"amount":null,"paidAmount":null,"description":null,"taxes":[],"warnings":[],"confidence":0}
Datas no formato YYYY-MM-DD. Valores como número decimal. Confidence de 0 a 100 conforme legibilidade e presença explícita.

DOCUMENTO:
${text.slice(0, 60000)}`;
    const raw = await groqChat([
      { role: "system", content: "Você extrai dados financeiros com rigor documental. Nunca complete informação ausente e responda somente JSON." },
      { role: "user", content: prompt },
    ], 1800);
    let json: unknown;
    try { json = JSON.parse(raw.replace(/```json|```/g, "").trim()); }
    catch { return NextResponse.json({ error: "A IA não retornou JSON válido; nenhum lançamento foi criado" }, { status: 502 }); }
    const out = Output.safeParse(json);
    if (!out.success) return NextResponse.json({ error: "Estrutura extraída inválida", details: out.error.flatten() }, { status: 502 });
    const data = validateFinancial(out.data); const id = randomUUID();
    await prisma.$executeRaw`INSERT INTO erp_document_extraction
      (id, document_id, source_name, document_type, extracted_text, structured_data, confidence, provider, reviewed_by)
      VALUES (${id}, ${parsed.data.documentId || null}, ${parsed.data.sourceName || null}, ${data.documentType}, ${text.slice(0, 100000)},
        ${JSON.stringify(data)}::jsonb, ${data.confidence}, 'GROQ', ${user?.email || user?.name || user?.id})`;
    return NextResponse.json({ success: true, extractionId: id, data, requiresReview: data.warnings.length > 0 });
  } catch (e) { return erroInterno(e, "api/ia/extrair-documento-financeiro POST"); }
}
