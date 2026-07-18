// Verificação ao vivo da IA nativa (GROQ). Diferente do diagnóstico, que só
// checa se a chave existe, esta rota faz um PING REAL: envia um prompt mínimo
// e confirma que o modelo respondeu — é a prova de que a IA está ativa.
import { NextResponse } from "next/server";
import { exigirPapel } from "@/lib/authz";
import { groqChat } from "@/lib/groq";

export const dynamic = "force-dynamic";

// Recursos de IA do sistema (todos usam a mesma chave GROQ).
const RECURSOS = [
  "Chat de ajuda", "Proposta por edital", "Extração de edital",
  "Análise de licitação (PNCP)", "Análise de preço", "Cronograma de contrato",
  "Plano semanal de logística", "Explicação do diagnóstico",
  "Transcrição de voz do campo", "Análise de cotações/contratos por e-mail",
];

export async function GET() {
  const { erro } = await exigirPapel(); // qualquer usuário autenticado
  if (erro) return erro;

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({
      ativa: false,
      motivo: "sem_chave",
      mensagem: "A IA está INATIVA: a variável GROQ_API_KEY não está configurada no servidor.",
      correcao: "Pegue a chave gratuita em https://console.groq.com e defina GROQ_API_KEY no .env.production; depois reinicie o app (docker compose up -d app).",
      recursos: RECURSOS,
    });
  }

  const inicio = Date.now();
  try {
    const resposta = await groqChat(
      [{ role: "user", content: "Responda apenas com a palavra: OK" }],
      5
    );
    const latenciaMs = Date.now() - inicio;
    const respondeu = /ok/i.test(resposta);
    return NextResponse.json({
      ativa: respondeu,
      motivo: respondeu ? "ok" : "resposta_inesperada",
      mensagem: respondeu
        ? `IA ATIVA — o modelo respondeu em ${latenciaMs} ms.`
        : "A chave está configurada, mas o modelo devolveu uma resposta inesperada.",
      modelo: "llama-3.3-70b-versatile",
      latenciaMs,
      recursos: RECURSOS,
    });
  } catch (e: any) {
    return NextResponse.json({
      ativa: false,
      motivo: "erro_chamada",
      mensagem: "A IA está INATIVA: a chamada ao GROQ falhou (chave inválida, cota esgotada ou serviço fora do ar).",
      detalhe: e?.message || String(e),
      correcao: "Confira se a GROQ_API_KEY é válida em console.groq.com e se a cota não foi excedida.",
      recursos: RECURSOS,
    });
  }
}
