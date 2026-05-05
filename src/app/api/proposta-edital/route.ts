// src/app/api/proposta-edital/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { groqChat } from "@/lib/groq";

const SYSTEM_CONTEXT = `Você é especialista em licitações e serviços ambientais para a VERDELIMP SERVICOS E TERCEIRIZACAO LTDA (CNPJ 30.198.776/0001-29, Betim/MG, CNAE 81.30-3-00, Simples Nacional, EPP). Analise editais e gere propostas comerciais profissionais com memorial de cálculo e BDI. Valores em R$ para MG.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scopeText, title, clientId, mode } = body;

    if (!scopeText || scopeText.length < 20) {
      return NextResponse.json({ error: "Texto do escopo/edital obrigatório (mínimo 20 caracteres)" }, { status: 400 });
    }

    // ETAPA 1 — Extração estruturada do escopo
    let extracted: any = {};
    try {
      const raw1 = await groqChat([
        {
          role: "system",
          content: `Extraia informações técnicas do escopo/edital em JSON. Retorne APENAS JSON válido sem markdown:\n{"objeto":"","area_m2":null,"quantidade":null,"unidade":"m²","prazo_dias":null,"local":"","servicos":[],"especificacoes":[],"modalidade":"","valor_estimado":null}`,
        },
        { role: "user", content: `ESCOPO:\n${scopeText.substring(0, 3000)}` },
      ], 1000);
      extracted = JSON.parse(raw1.replace(/```json|```/g, "").trim());
    } catch { extracted = {}; }

    // ETAPA 2 — Gerar proposta completa
    let proposta = "";
    try {
      proposta = await groqChat([
        { role: "system", content: SYSTEM_CONTEXT },
        {
          role: "user",
          content: `Com base no escopo abaixo e dados extraídos, gere uma PROPOSTA COMERCIAL completa em Markdown com:
1. Objeto do serviço
2. Escopo técnico detalhado  
3. Composição de custos (MO, materiais, equipamentos, encargos 70%, BDI)
4. Cronograma de execução
5. Valor total recomendado com memorial de cálculo
6. Condições comerciais (prazo pagamento, reajuste, garantia)
7. Validade da proposta: 30 dias

ESCOPO ORIGINAL: ${scopeText.substring(0, 2000)}
DADOS EXTRAÍDOS: ${JSON.stringify(extracted)}

Seja específico com valores realistas para MG. Indique que é apoio gerencial.`,
        },
      ], 2000);
    } catch { proposta = ""; }

    // ETAPA 3 — Salvar no banco como proposta rascunho
    let propostaSalva: any = null;
    try {
      const count = await prisma.proposal.count();
      const number = `PROP-IA-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
      propostaSalva = await prisma.proposal.create({
        data: {
          number,
          clientId: clientId || null,
          title: title || extracted.objeto || "Proposta gerada por IA",
          status: "Rascunho",
          totalValue: extracted.valor_estimado || 0,
          validUntil: new Date(Date.now() + 30 * 86400000),
          notes: proposta,
        },
      });
    } catch { /* salvar é opcional */ }

    return NextResponse.json({
      success: true,
      proposta,
      extracted,
      propostaId: propostaSalva?.id,
      propostaNumber: propostaSalva?.number,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
