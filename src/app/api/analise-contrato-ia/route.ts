// src/app/api/analise-contrato-ia/route.ts
// API que usa Groq (llama-3.3-70b) para ler contrato/cotação e extrair:
// - escopo do serviço, área, prazo, local
// - equipe necessária (quantidade e funções)
// - materiais e insumos
// - dias de serviço
// - documentação exigida (empresa e funcionários)
import { NextRequest, NextResponse } from "next/server";
import { groqChat, groqConfigurado } from "@/lib/groq";

export const dynamic = "force-dynamic";

interface AnaliseResultado {
  cliente?: string;
  objeto?: string;
  local?: string;
  areaM2?: number;
  prazoDias?: number;
  tipoServico?: string;
  equipeNecessaria: { funcao: string; quantidade: number; salarioSugerido: number }[];
  materiais: { item: string; quantidade?: number; unidade?: string }[];
  mobilizacao: { item: string; custoEstimado: number }[];
  desmobilizacao: { item: string; custoEstimado: number }[];
  documentacaoEmpresa: { documento: string; obrigatorio: boolean; validadeDias?: number }[];
  documentacaoFuncionario: { documento: string; obrigatorio: boolean; validadeDias?: number; norma?: string }[];
  observacoes?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await groqConfigurado())) {
      return NextResponse.json({ error: "GROQ_API_KEY não configurada — cadastre em Admin → Credenciais & APIs" }, { status: 503 });
    }

    const body = await req.json();
    const { texto, tipoDocumento } = body; // texto = conteúdo do contrato/cotação colado ou extraído

    if (!texto || typeof texto !== "string") {
      return NextResponse.json({ error: "Texto do documento não fornecido" }, { status: 400 });
    }

    const promptSistema = `Você é um especialista em análise de contratos e cotações para empresas de prestação de serviços (limpeza, jardinagem, manutenção, roçada, poda).
Sua tarefa é extrair informações estruturadas do documento fornecido.

Responda APENAS com JSON válido, sem markdown, sem explicações, no seguinte formato exato:
{
  "cliente": "nome do cliente ou contratante",
  "objeto": "descrição resumida do objeto do contrato",
  "local": "local de execução do serviço",
  "areaM2": número ou null,
  "prazoDias": número total de dias de serviço ou null,
  "tipoServico": "ex: Roçada, Poda, Limpeza, Manutenção de Área Verde",
  "equipeNecessaria": [
    {"funcao": "nome da função", "quantidade": número, "salarioSugerido": número}
  ],
  "materiais": [
    {"item": "nome do material/insumo", "quantidade": número ou null, "unidade": "unidade de medida ou null"}
  ],
  "mobilizacao": [
    {"item": "item necessário para mobilização", "custoEstimado": número}
  ],
  "desmobilizacao": [
    {"item": "item necessário para desmobilização", "custoEstimado": número}
  ],
  "documentacaoEmpresa": [
    {"documento": "nome do documento", "obrigatorio": true/false, "validadeDias": número ou null}
  ],
  "documentacaoFuncionario": [
    {"documento": "nome do documento", "obrigatorio": true/false, "validadeDias": número ou null, "norma": "NR-X ou null"}
  ],
  "observacoes": "observações importantes extraídas do documento"
}

Regras:
- Se não encontrar alguma informação, use null ou arrays vazios.
- Para equipe: considere 1 supervisor para cada 10 operadores, ajuste conforme complexidade.
- Salários sugeridos: Auxiliar R$ 1400, Operador R$ 1600, Supervisor R$ 2500, Motorista R$ 1800.
- Documentação típica de empresa: Certidões Negativas (CNDT, FGTS, INSS), Seguro Garantia, Alvarás.
- Documentação típica de funcionário: ASO, NR-6 (EPI), NR-12 (Operador de Máquinas), NR-35 (Trabalho em Altura), CNH (se motorista).
- Validade padrão: ASO 1 ano, NR-12 2 anos, NR-35 2 anos, Certidões 6 meses.`;

    const promptUsuario = `Analise o seguinte documento (${tipoDocumento || "contrato/cotação"}):

---
${texto.slice(0, 15000)}
---

Extraia as informações no formato JSON solicitado.`;

    const resposta = await groqChat([
      { role: "system", content: promptSistema },
      { role: "user", content: promptUsuario }
    ], 2000);

    // Tentar parsear JSON da resposta
    let resultado: AnaliseResultado;
    try {
      // Remover possíveis marcações de código
      const jsonLimpo = resposta.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      resultado = JSON.parse(jsonLimpo);
    } catch (e) {
      // Tentar extrair JSON embutido no texto
      const match = resposta.match(/\{[\s\S]*\}/);
      if (match) {
        resultado = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ error: "Não foi possível parsear a resposta da IA como JSON", respostaBruta: resposta }, { status: 500 });
      }
    }

    return NextResponse.json(resultado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro na análise do contrato" }, { status: 500 });
  }
}
