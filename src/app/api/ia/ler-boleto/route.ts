// IA — Leitura de boletos via GROQ AI
// Extrai informações automaticamente de imagem/PDF de boleto bancário
import { NextRequest, NextResponse } from "next/server";
import { groqChat, groqConfigurado } from "@/lib/groq";
import { exigirPapel, erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "FINANCEIRO");
  if (erro) return erro;
  try {
    if (!await groqConfigurado()) {
      return NextResponse.json({ error: "GROQ_API_KEY não configurada" }, { status: 503 });
    }

    const body = await req.json();
    const { textoBoleto, imagemBase64 } = body;

    if (!textoBoleto && !imagemBase64) {
      return NextResponse.json({ error: "Forneça textoBoleto ou imagemBase64" }, { status: 400 });
    }

    const systemPrompt = `Você é um assistente especializado em extrair informações de boletos bancários brasileiros.
Extraia TODAS as informações disponíveis e retorne em formato JSON válido com os seguintes campos:
{
  "cedente": "Nome do cedente/beneficiário",
  "sacado": "Nome do pagador",
  "cedenteCnpj": "CNPJ do cedente (se disponível)",
  "sacadoCnpj": "CNPJ do pagador (se disponível)",
  "valor": 0.00,
  "dataVencimento": "DD/MM/AAAA",
  "dataEmissao": "DD/MM/AAAA",
  "nossoNumero": "Nosso número",
  "numeroDocumento": "Número do documento",
  "bairro": "Bairro",
  "cidade": "Cidade",
  "uf": "UF",
  "cep": "CEP",
  "banco": "Nome do banco",
  "agencia": "Agência",
  "contaCorrente": "Conta corrente",
  "codigoBarras": "Código de barras",
  "linhaDigitavel": "Linha digitável",
  "instrucoes": "Instruções (multa, juros, descontos)",
  "categorias": ["possíveis categorias: Aluguel, Energia, Água, Telefone, Internet, Imposto, Folha, Material, Serviço, Outro"],
  "observações": "Qualquer outra informação relevante"
}

Se alguma informação não estiver disponível, use null. NUNCA invente dados.
Retorne APENAS o JSON, sem texto adicional.`;

    let userPrompt = "";
    if (textoBoleto) {
      userPrompt = `Extraia as informações deste boleto bancário:\n\n${textoBoleto}`;
    } else {
      userPrompt = `Extraia as informações deste boleto bancário (imagem base64). Analise a imagem e retorne os dados em JSON.`;
    }

    const resposta = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], 1500);

    // Tentar parsear o JSON da resposta
    let dadosBoleto: any;
    try {
      const jsonMatch = resposta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        dadosBoleto = JSON.parse(jsonMatch[0]);
      } else {
        dadosBoleto = { textoExtraido: resposta };
      }
    } catch {
      dadosBoleto = { textoExtraido: resposta };
    }

    return NextResponse.json({
      success: true,
      dados: dadosBoleto,
      fonte: "GROQ AI (llama-3.3-70b-versatile)",
    });
  } catch (e) {
    return erroInterno(e, "api/ia/ler-boleto");
  }
}
