// Análise jurídica de documentos com IA (GROQ). O modelo atua como advogado
// especialista brasileiro: PRIMEIRO reconhece o tipo de documento e DEPOIS faz
// a leitura técnica — partes, objeto, obrigações, cláusulas críticas, riscos,
// penalidades, base legal e recomendação. Usado pela análise de e-mail e pelo
// módulo de Análise Jurídica (upload/colagem de documento).
import { groqChat } from "@/lib/groq";

/** Tipos de documento que o analisador reconhece (o modelo pode retornar "outro"). */
export const TIPOS_DOCUMENTO = [
  "contrato", "contrato administrativo", "aditivo contratual",
  "edital de licitação", "termo de referência", "ata de registro de preços",
  "cotação", "orçamento", "proposta comercial", "pedido de compra",
  "procuração", "notificação extrajudicial", "petição",
  "acordo/distrato", "termo de compromisso", "nota fiscal", "outro",
] as const;

export interface AnaliseJuridica {
  tipoDocumento: string;
  confianca: "alta" | "media" | "baixa";
  resumo: string;
  partes: string[];
  objeto: string;
  valores: string[];
  prazos: string[];
  obrigacoes: string[];
  clausulasCriticas: string[];
  riscosJuridicos: string[];
  penalidades: string[];
  baseLegal: string[];
  pontosAtencao: string[];
  recomendacao: string;
}

const SYSTEM = `Você é um advogado brasileiro sênior, especialista em Direito Contratual, Administrativo e em licitações (Lei 14.133/2021 e Lei 8.666/93). Analise o documento fornecido com rigor técnico.

TAREFA:
1) PRIMEIRO, identifique o TIPO do documento (ex.: ${TIPOS_DOCUMENTO.join(", ")}). Se não tiver certeza, use "outro" e reduza a confiança.
2) DEPOIS, faça a leitura jurídica como um advogado experiente faria: destaque cláusulas críticas, obrigações de cada parte, riscos, penalidades/multas, prazos decadenciais/prescricionais e a base legal aplicável.

REGRAS:
- Responda APENAS com JSON válido, sem markdown, exatamente neste formato:
{"tipoDocumento":"...","confianca":"alta|media|baixa","resumo":"...","partes":["..."],"objeto":"...","valores":["..."],"prazos":["..."],"obrigacoes":["..."],"clausulasCriticas":["..."],"riscosJuridicos":["..."],"penalidades":["..."],"baseLegal":["..."],"pontosAtencao":["..."],"recomendacao":"..."}
- Em "baseLegal", cite artigos/leis pertinentes (ex.: "art. 104, CC", "art. 90, Lei 14.133/2021") somente quando aplicável.
- Em "clausulasCriticas" e "riscosJuridicos", aponte reajuste, rescisão, exclusividade, foro, garantias, multas, responsabilidade solidária, cessão e renúncia de direitos.
- Se uma informação não constar no documento, use "não informado" — NUNCA invente dados, valores ou artigos.
- Isto é apoio à decisão; a recomendação deve orientar, sem substituir a revisão de um advogado responsável.`;

/** Analisa um texto de documento e devolve o parecer estruturado. */
export async function analisarDocumentoJuridico(texto: string): Promise<AnaliseJuridica> {
  const conteudo = (texto || "").slice(0, 14000);
  const resposta = await groqChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: conteudo },
    ],
    1800
  );

  try {
    const m = resposta.match(/\{[\s\S]*\}/);
    const j = JSON.parse(m ? m[0] : resposta);
    return normalizar(j);
  } catch {
    // A IA não devolveu JSON — entrega o texto como resumo, sem inventar campos.
    return normalizar({ tipoDocumento: "outro", confianca: "baixa", resumo: resposta });
  }
}

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()) : []);

function normalizar(j: any): AnaliseJuridica {
  const conf = ["alta", "media", "baixa"].includes(j?.confianca) ? j.confianca : "baixa";
  return {
    tipoDocumento: typeof j?.tipoDocumento === "string" && j.tipoDocumento.trim() ? j.tipoDocumento : "outro",
    confianca: conf,
    resumo: typeof j?.resumo === "string" ? j.resumo : "",
    partes: arr(j?.partes),
    objeto: typeof j?.objeto === "string" ? j.objeto : "",
    valores: arr(j?.valores),
    prazos: arr(j?.prazos),
    obrigacoes: arr(j?.obrigacoes),
    clausulasCriticas: arr(j?.clausulasCriticas),
    riscosJuridicos: arr(j?.riscosJuridicos),
    penalidades: arr(j?.penalidades),
    baseLegal: arr(j?.baseLegal),
    pontosAtencao: arr(j?.pontosAtencao),
    recomendacao: typeof j?.recomendacao === "string" ? j.recomendacao : "",
  };
}
