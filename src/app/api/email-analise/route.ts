// src/app/api/email-analise/route.ts
// Cotações & Contratos por E-mail — lista mensagens da caixa IMAP que parecem
// cotação/orçamento/contrato e analisa o documento com IA (GROQ).
//   GET               → lista os e-mails candidatos dos últimos N dias (?dias=30)
//   POST { uid }      → baixa o e-mail (corpo + anexos PDF/texto) e devolve a análise
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { validar } from "@/lib/validacao";
import { imapConfigurado, listarEmails, lerEmail } from "@/lib/email-inbox";
import { groqChat, groqConfigurado } from "@/lib/groq";

export const dynamic = "force-dynamic";

// Quem negocia cotações e contratos (middleware aplica o mesmo conjunto)
const PAPEIS = ["ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO"];

const DEMO_EMAILS = [
  { uid: -1, assunto: "Cotação — fornecimento de EPIs (luvas e botas)", de: "Suprimentos Alfa <vendas@alfa.com.br>", data: "2026-07-15T09:12:00.000Z", anexos: ["cotacao_epis.pdf"] },
  { uid: -2, assunto: "Minuta de contrato — limpeza predial 12 meses", de: "Condomínio Horizonte <adm@horizonte.com.br>", data: "2026-07-14T16:40:00.000Z", anexos: ["minuta_contrato.pdf"] },
  { uid: -3, assunto: "Orçamento de insumos de jardinagem", de: "AgroVerde <comercial@agroverde.com.br>", data: "2026-07-10T11:05:00.000Z", anexos: [] },
];

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;
  try {
    if (!(await imapConfigurado())) {
      return NextResponse.json({
        configurado: false, data: DEMO_EMAILS, _demo: true,
        aviso: "IMAP não configurado — exibindo exemplos. Cadastre o servidor/usuário/senha em Admin → Credenciais & APIs.",
      });
    }
    const dias = Math.min(Math.max(Number(req.nextUrl.searchParams.get("dias") || 30), 1), 90);
    const data = await listarEmails(dias);
    return NextResponse.json({ configurado: true, data, dias });
  } catch (e) {
    return erroInterno(e, "api/email-analise GET");
  }
}

const AnaliseSchema = z.object({ uid: z.coerce.number().int() });

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;
  try {
    const { data: body, erro: erroVal } = validar(AnaliseSchema, await req.json());
    if (erroVal) return erroVal;

    // uid negativo = item de demonstração da listagem sem IMAP
    if (body.uid < 0) {
      return NextResponse.json({
        _demo: true,
        analise: {
          tipo: "cotacao",
          resumo: "EXEMPLO (modo demonstrativo, sem IMAP): cotação de EPIs com 3 itens, validade de 15 dias.",
          partes: ["Suprimentos Alfa Ltda.", "Verde Limp Serviços"],
          valores: ["Luva nitrílica: R$ 8,90/par", "Bota PVC: R$ 62,00/par", "Total estimado: R$ 3.540,00"],
          prazos: ["Validade da proposta: 15 dias", "Entrega: 7 dias úteis"],
          condicoesPagamento: "Boleto 28 dias",
          riscos: ["Frete não incluso", "Reajuste condicionado ao dólar"],
          recomendacao: "Configure o IMAP para analisar cotações reais da sua caixa de entrada.",
        },
      });
    }

    if (!(await imapConfigurado())) {
      return NextResponse.json({ error: "IMAP não configurado — cadastre em Admin → Credenciais & APIs." }, { status: 503 });
    }
    if (!(await groqConfigurado())) {
      return NextResponse.json({ error: "Chave GROQ ausente — a análise por IA está indisponível. Cadastre em Admin → Credenciais & APIs." }, { status: 503 });
    }

    const email = await lerEmail(body.uid);
    if (!email) return NextResponse.json({ error: "E-mail não encontrado na caixa de entrada." }, { status: 404 });

    const textosAnexos = email.anexosLidos
      .map((a) => (a.texto ? `\n--- ANEXO: ${a.nome} ---\n${a.texto}` : `\n--- ANEXO: ${a.nome} (${a.tipo}) — texto não extraível ---`))
      .join("\n");
    const conteudo = `ASSUNTO: ${email.assunto}\nDE: ${email.de}\nDATA: ${email.data}\n\nCORPO:\n${email.corpo}\n${textosAnexos}`.slice(0, 14000);

    const resposta = await groqChat([
      {
        role: "system",
        content:
          "Você é analista comercial e jurídico da Verde Limp (serviços de limpeza, conservação e jardinagem em MG). " +
          "Analise o e-mail e anexos abaixo (cotação, orçamento ou contrato) e responda APENAS com JSON válido, sem markdown, no formato: " +
          '{"tipo":"cotacao|contrato|orcamento|outro","resumo":"...","partes":["..."],"valores":["..."],"prazos":["..."],"condicoesPagamento":"...","riscos":["..."],"recomendacao":"..."}. ' +
          "Em riscos, aponte cláusulas de reajuste, multas, exclusividade, frete/impostos não inclusos e prazos curtos de validade. " +
          "Se alguma informação não constar no documento, use \"não informado\" — nunca invente valores.",
      },
      { role: "user", content: conteudo },
    ], 1200);

    // A IA deve devolver JSON puro; se vier texto em volta, extrai o primeiro objeto.
    let analise: unknown;
    try {
      const m = resposta.match(/\{[\s\S]*\}/);
      analise = JSON.parse(m ? m[0] : resposta);
    } catch {
      analise = { tipo: "outro", resumo: resposta, partes: [], valores: [], prazos: [], condicoesPagamento: "", riscos: [], recomendacao: "" };
    }

    return NextResponse.json({
      analise,
      email: { uid: email.uid, assunto: email.assunto, de: email.de, data: email.data, anexos: email.anexos },
    });
  } catch (e) {
    return erroInterno(e, "api/email-analise POST");
  }
}
