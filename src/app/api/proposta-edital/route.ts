// src/app/api/proposta-edital/route.ts
// Adaptado de: verdelimp-erp-prime-final/server/routers.ts → quotesRouter.generateFromScope
// Usa Claude (Anthropic) em vez de Gemini (ajuste ao projeto atual)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SYSTEM_CONTEXT = `Você é especialista em licitações e serviços ambientais para a VERDELIMP SERVICOS E TERCEIRIZACAO LTDA (CNPJ 30.198.776/0001-29, Betim/MG, CNAE 81.30-3-00, Simples Nacional, EPP). Analise editais e gere propostas comerciais profissionais com memorial de cálculo e BDI. Valores em R$ para MG.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scopeText, title, clientId, mode } = body;

    if (!scopeText || scopeText.length < 20) {
      return NextResponse.json({ error: "Texto do escopo/edital obrigatório (mínimo 20 caracteres)" }, { status: 400 });
    }

    // ETAPA 1 — Extração estruturada do escopo
    const r1 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Extraia informações técnicas do escopo/edital em JSON. Retorne APENAS JSON válido sem markdown:\n{"objeto":"","area_m2":null,"quantidade":null,"unidade":"m²","prazo_dias":null,"local":"","servicos":[],"especificacoes":[],"modalidade":"","valor_estimado":null}`,
        messages: [{ role: "user", content: `ESCOPO:\n${scopeText.substring(0, 3000)}` }],
      }),
    });

    let extracted: any = {};
    if (r1.ok) {
      const d1 = await r1.json();
      try {
        const raw = d1.content?.[0]?.text || "{}";
        extracted = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch { extracted = {}; }
    }

    // ETAPA 2 — Gerar proposta completa
    const r2 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: SYSTEM_CONTEXT,
        messages: [{
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
        }],
      }),
    });

    let proposta = "";
    if (r2.ok) {
      const d2 = await r2.json();
      proposta = d2.content?.[0]?.text || "";
    }

    // ETAPA 3 — Salvar no banco como proposta rascunho
    let propostaSalva: any = null;
    try {
      const count = await prisma.proposal.count();
      const number = `PROP-IA-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
      propostaSalva = await prisma.proposal.create({
        data: {
          number,
          clientId: clientId || null,
          object: extracted.objeto || title || "Proposta gerada por IA",
          serviceType: extracted.servicos?.[0] || null,
          location: extracted.local || null,
          area: extracted.area_m2 ? Number(extracted.area_m2) : null,
          unit: extracted.unidade || "m²",
          days: extracted.prazo_dias ? Number(extracted.prazo_dias) : null,
          chargesRate: 70, adminRate: 10, riskRate: 5, taxRate: 8, marginRate: 30,
          totalValue: extracted.valor_estimado ? Number(extracted.valor_estimado) : 0,
          validityDays: 30,
          status: "Aberta",
          technicalNotes: proposta.substring(0, 1000),
        },
      });
    } catch { /* continuar mesmo sem banco */ }

    return NextResponse.json({
      success: true,
      extracted,
      proposta,
      propostaId: propostaSalva?.id,
      propostaNumero: propostaSalva?.number,
      aviso: "Proposta gerada por IA — valores são estimativas. Validar custos reais antes de submeter.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
