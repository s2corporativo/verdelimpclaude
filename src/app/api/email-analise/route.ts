import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { validar } from "@/lib/validacao";
import { imapConfigurado, listarEmails, lerEmail } from "@/lib/email-inbox";
import { groqChat, groqConfigurado } from "@/lib/groq";

export const dynamic = "force-dynamic";

const PAPEIS = ["ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO"];
const AnaliseSchema = z.object({ uid: z.coerce.number().int().positive("UID do e-mail inválido") });
const ResultadoSchema = z.object({
  tipo: z.enum(["cotacao", "contrato", "orcamento", "outro"]).default("outro"),
  resumo: z.string().max(4000).default(""),
  partes: z.array(z.string().max(500)).max(30).default([]),
  valores: z.array(z.string().max(500)).max(50).default([]),
  prazos: z.array(z.string().max(500)).max(50).default([]),
  condicoesPagamento: z.string().max(2000).default(""),
  riscos: z.array(z.string().max(1000)).max(50).default([]),
  recomendacao: z.string().max(4000).default(""),
});

function parseDays(value: unknown) {
  const numeric = Number(value || 30);
  return Number.isFinite(numeric) ? Math.min(Math.max(Math.trunc(numeric), 1), 90) : 30;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  try {
    if (!(await imapConfigurado())) {
      return NextResponse.json({
        configurado: false,
        data: [],
        aviso: "A integração IMAP não está configurada. Cadastre as credenciais antes de analisar e-mails.",
      });
    }
    const dias = parseDays(req.nextUrl.searchParams.get("dias"));
    const data = await listarEmails(dias);
    return NextResponse.json({ configurado: true, data, dias, total: data.length, source: "imap" });
  } catch (error) {
    return erroInterno(error, "api/email-analise GET");
  }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  try {
    const { data: body, erro: validationError } = validar(AnaliseSchema, await req.json());
    if (validationError) return validationError;

    if (!(await imapConfigurado())) {
      return NextResponse.json({ error: "A integração IMAP não está configurada." }, { status: 503 });
    }
    if (!(await groqConfigurado())) {
      return NextResponse.json({ error: "A chave GROQ não está configurada; a análise por IA está indisponível." }, { status: 503 });
    }

    const email = await lerEmail(body.uid);
    if (!email) return NextResponse.json({ error: "E-mail não encontrado na caixa de entrada." }, { status: 404 });

    const attachmentText = email.anexosLidos
      .map((attachment) => attachment.texto
        ? `\n--- ANEXO: ${attachment.nome} ---\n${attachment.texto}`
        : `\n--- ANEXO: ${attachment.nome} (${attachment.tipo}) — texto não extraível ---`)
      .join("\n");
    const content = `ASSUNTO: ${email.assunto}\nDE: ${email.de}\nDATA: ${email.data}\n\nCORPO:\n${email.corpo}\n${attachmentText}`.slice(0, 14_000);

    const answer = await groqChat([
      {
        role: "system",
        content:
          "Você é analista comercial e contratual da Verde Limp. Analise somente o conteúdo fornecido e responda apenas com JSON válido no formato " +
          '{"tipo":"cotacao|contrato|orcamento|outro","resumo":"...","partes":["..."],"valores":["..."],"prazos":["..."],"condicoesPagamento":"...","riscos":["..."],"recomendacao":"..."}. ' +
          "Nunca invente valores, partes, datas ou obrigações. Quando algo não constar, informe 'não informado'. Sinalize reajustes, multas, exclusividade, frete, tributos, garantias, prazos e inconsistências.",
      },
      { role: "user", content },
    ], 1200);

    let parsedJson: unknown;
    try {
      const match = answer.match(/\{[\s\S]*\}/);
      parsedJson = JSON.parse(match ? match[0] : answer);
    } catch {
      return NextResponse.json({ error: "A IA retornou uma resposta em formato inválido. Tente novamente." }, { status: 502 });
    }

    const validated = ResultadoSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json({ error: "A análise retornada não passou pela validação estrutural." }, { status: 502 });
    }

    return NextResponse.json({
      analise: validated.data,
      email: { uid: email.uid, assunto: email.assunto, de: email.de, data: email.data, anexos: email.anexos },
      source: "imap+groq",
    });
  } catch (error) {
    return erroInterno(error, "api/email-analise POST");
  }
}
