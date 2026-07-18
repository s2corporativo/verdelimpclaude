// src/app/api/extrair-edital/route.ts
// Recebe texto de edital/contrato/cotação e extrai dados estruturados via GROQ
import { NextRequest, NextResponse } from "next/server";
import { groqChat } from "@/lib/groq";
import { erroInterno } from "@/lib/authz";

export async function POST(req: NextRequest) {
  try {
    const { texto } = await req.json();
    if (!texto || texto.length < 30) {
      return NextResponse.json({ error: "Texto muito curto. Cole pelo menos 30 caracteres." }, { status: 400 });
    }

    const raw = await groqChat([
      {
        role: "system",
        content: "Você extrai dados estruturados de contratos, editais ou cotações brasileiros. Responda APENAS com JSON válido, sem markdown.",
      },
      {
        role: "user",
        content: `Extraia os dados deste contrato/edital em JSON com esta estrutura exata (todos os campos opcionais, use null se não encontrar):

{
  "objeto": "string descrição do serviço",
  "clienteNome": "string nome do contratante",
  "clienteCnpj": "string apenas números",
  "valorTotal": numero em reais sem formato,
  "valorMensal": numero em reais,
  "vigenciaMeses": numero,
  "dataInicio": "AAAA-MM-DD",
  "dataFim": "AAAA-MM-DD",
  "tipoServico": "Roçada Manual" | "Roçada Mecanizada" | "Jardinagem Mensal" | "PRADA/PTRF" | "Limpeza" | "Podação" | "Outro",
  "areaM2": numero,
  "frequencia": "diaria" | "semanal" | "quinzenal" | "mensal" | "unica",
  "diasExecucao": numero estimado por mês,
  "enderecos": ["lista de locais de execução"],
  "municipio": "string",
  "uf": "string sigla",
  "modalidadeLicitacao": "Pregão Eletrônico" | "Concorrência" | "Dispensa" | "Direto" | null,
  "indiceReajuste": "INPC" | "IPCA" | "IGPM" | null,
  "garantia": "string ou null",
  "observacoes": "string",
  "equipeMinima": numero estimado de pessoas,
  "equipamentosNecessarios": ["lista"]
}

CONTRATO/EDITAL:
${texto.substring(0, 8000)}`,
      },
    ], 1500);

    let extraido;
    try {
      extraido = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      throw new Error("IA retornou formato inválido. Tente novamente ou preencha manualmente.");
    }

    return NextResponse.json({ success: true, dados: extraido });
  } catch (e: any) {
    return erroInterno(e, "api/extrair-edital");
  }
}
