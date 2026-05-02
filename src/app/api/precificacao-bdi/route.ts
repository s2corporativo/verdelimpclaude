// src/app/api/precificacao-bdi/route.ts
// Calculadora de BDI e composição de preço unitário para licitações públicas
// Baseada nas diretrizes TCU/SINAPI para contratos públicos
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itens, bdi } = body;

    // ── Calcular BDI conforme TCU Acórdão 2369/2011 ──────────────
    const AC = bdi.ac || 0;      // Administração Central (%)
    const S = bdi.s || 0;        // Seguro + Garantia (%)
    const R = bdi.r || 0;        // Riscos (%)
    const G = bdi.g || 0;        // Garantia (%)
    const DF = bdi.df || 0;      // Despesas Financeiras (%)
    const L = bdi.l || 0;        // Lucro (%)
    const I = bdi.i || 0;        // Impostos PIS+COFINS+ISS (%)

    // Fórmula TCU: BDI = [(1+AC/100+S/100+R/100+G/100+DF/100) × (1+L/100) / (1-I/100) - 1] × 100
    const numerador = (1 + (AC + S + R + G + DF) / 100) * (1 + L / 100);
    const denominador = 1 - I / 100;
    const bdiFinal = denominador > 0 ? (numerador / denominador - 1) * 100 : 0;
    const bdiArredondado = Math.round(bdiFinal * 100) / 100;

    // ── Calcular custo unitário de cada item ──────────────────────
    const itensCalculados = itens.map((item: any) => {
      const mo = Number(item.custoMO) || 0;       // Mão de obra direta
      const enc = mo * (Number(item.encargos) || 0.70); // Encargos CLT
      const mat = Number(item.custoMat) || 0;     // Materiais
      const eq = Number(item.custoEq) || 0;       // Equipamentos
      const ter = Number(item.terceiros) || 0;    // Terceiros

      const custoDirecto = mo + enc + mat + eq + ter;
      const valorBdi = custoDirecto * bdiArredondado / 100;
      const precoUnitario = custoDirecto + valorBdi;

      const quantidade = Number(item.quantidade) || 0;
      const totalItem = precoUnitario * quantidade;

      return {
        ...item,
        moComEncargos: Math.round((mo + enc) * 100) / 100,
        custoDirecto: Math.round(custoDirecto * 100) / 100,
        valorBdi: Math.round(valorBdi * 100) / 100,
        precoUnitario: Math.round(precoUnitario * 100) / 100,
        totalItem: Math.round(totalItem * 100) / 100,
      };
    });

    const totalGeral = itensCalculados.reduce((s: number, i: any) => s + i.totalItem, 0);
    const custoDirectoTotal = itensCalculados.reduce((s: number, i: any) => s + i.custoDirecto * (i.quantidade || 1), 0);
    const bdiValorTotal = totalGeral - custoDirectoTotal;
    const margemReal = custoDirectoTotal > 0 ? (L / 100) * (custoDirectoTotal * (1 + bdiArredondado / 100)) : 0;

    return NextResponse.json({
      success: true,
      bdi: {
        componentes: { AC, S, R, G, DF, L, I },
        bdiFinal: bdiArredondado,
        formula: `[(1+${(AC+S+R+G+DF).toFixed(2)}%) × (1+${L}%) / (1-${I}%) - 1]`,
      },
      itens: itensCalculados,
      totais: {
        custoDirectoTotal: Math.round(custoDirectoTotal * 100) / 100,
        bdiValorTotal: Math.round(bdiValorTotal * 100) / 100,
        totalGeral: Math.round(totalGeral * 100) / 100,
        margemReal: Math.round(margemReal * 100) / 100,
        margemPct: Math.round(L * 10) / 10,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
