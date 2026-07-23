// IA — Resumo automático de contratos via GROQ AI
// Lê PDF/texto de contrato e extrai informações-chave automaticamente
import { NextRequest, NextResponse } from "next/server";
import { groqChat, groqConfigurado } from "@/lib/groq";
import { exigirPapel, erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    if (!await groqConfigurado()) {
      return NextResponse.json({ error: "GROQ_API_KEY não configurada" }, { status: 503 });
    }

    const body = await req.json();
    const { textoContrato, contratoId } = body;

    if (!textoContrato) {
      return NextResponse.json({ error: "Forneça textoContrato" }, { status: 400 });
    }

    const systemPrompt = `Você é um advogado e analista contratual especializado em contratos brasileiros de prestação de serviços.
Analise o contrato fornecido e extraia TODAS as informações importantes em formato JSON válido:

{
  "resumo": "Resumo executivo do contrato em 3-5 linhas",
  "partes": {
    "contratante": "Nome/Razão Social",
    "contratada": "Nome/Razão Social",
    "cnpjContratante": "CNPJ",
    "cnpjContratada": "CNPJ"
  },
  "objeto": "Descrição do objeto do contrato",
  "valor": {
    "total": 0.00,
    "mensal": 0.00,
    "moeda": "BRL",
    "condicoesPagamento": "Condições de pagamento"
  },
  "vigencia": {
    "dataInicio": "DD/MM/AAAA",
    "dataFim": "DD/MM/AAAA",
    "duracao": "Ex: 12 meses",
    "renovacao": "Cláusula de renovação (automática/previa notificação/não renova)",
    "periodoMinimo": "Período mínimo de vigência"
  },
  "reajuste": {
    "indice": "INPC/IPCA/IGPM/outro",
    "periodicidade": "Anual/semestral/outro",
    "percentualMaximo": "Se houver teto"
  },
  "obrigacoes": ["Lista das principais obrigações da contratada"],
  "penalidades": ["Lista de penalidades e multas"],
  "garantias": ["Tipo de garantia exigida (caução, seguro, etc.)"],
  "rescisao": {
    "condicoes": "Condições para rescisão",
    "avisoPrevio": "Prazo de aviso prévio",
    "multaRescisao": "Multa por rescisão antecipada"
  },
  "pontosAtencao": ["Lista de pontos que merecem atenção (cláusulas abusivas, riscos, etc.)"],
  "documentosAnexos": ["Lista de documentos referenciados no contrato"],
  "prazosImportantes": [
    {"data": "DD/MM/AAAA", "evento": "Descrição do evento/prazo"}
  ],
  "classificacao": {
    "tipo": "Prestação de serviços / Locação / Compra e venda / Outro",
    "area": "Trabalhista / Civil / Comercial / Administrativo / Ambiental",
    "risco": "Baixo / Médio / Alto",
    "complexidade": "Simples / Média / Complexa"
  }
}

Se alguma informação não estiver disponível no texto, use null.
NUNCA invente dados. Extraia APENAS o que está explicitamente no contrato.
Retorne APENAS o JSON, sem texto adicional.`;

    const resposta = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analise este contrato e extraia as informações:\n\n${textoContrato}` },
    ], 3000);

    // Tentar parsear o JSON da resposta
    let dadosContrato: any;
    try {
      const jsonMatch = resposta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        dadosContrato = JSON.parse(jsonMatch[0]);
      } else {
        dadosContrato = { resumo: resposta };
      }
    } catch {
      dadosContrato = { resumo: resposta };
    }

    return NextResponse.json({
      success: true,
      dados: dadosContrato,
      fonte: "GROQ AI (llama-3.3-70b-versatile)",
    });
  } catch (e) {
    return erroInterno(e, "api/ia/resumir-contrato");
  }
}
