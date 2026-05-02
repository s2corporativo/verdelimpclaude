// src/app/api/financeiro/aging/route.ts
// Aging de contas a receber — vencimento vs recebimento
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const hoje = new Date();

    // Buscar receitas previstas e em aberto
    const receitas = await prisma.expense.findMany({
      where: {
        categoryId: { not: undefined },
        status: { in: ["previsto","em_aberto","vencido"] },
        // Apenas receitas (positivas) pelo sinal da category
      },
      include: { category: { select: { name: true, type: true } } },
      orderBy: { dueDate: "asc" },
      take: 200,
    });

    // Filtrar apenas receitas (type=receita ou description tem "Receita")
    const aReceber = receitas.filter(e =>
      e.category?.type === "receita" ||
      e.description.toLowerCase().includes("receita") ||
      e.description.toLowerCase().includes("medição") ||
      e.description.toLowerCase().includes("cont-")
    );

    // Bucketing de aging
    const buckets = {
      corrente:  aReceber.filter(e => new Date(e.dueDate) >= hoje),
      ate30:     aReceber.filter(e => { const d = new Date(e.dueDate); return d < hoje && (hoje.getTime()-d.getTime()) <= 30*86400000; }),
      de31a60:   aReceber.filter(e => { const d = new Date(e.dueDate); const dias = (hoje.getTime()-d.getTime())/86400000; return dias > 30 && dias <= 60; }),
      de61a90:   aReceber.filter(e => { const d = new Date(e.dueDate); const dias = (hoje.getTime()-d.getTime())/86400000; return dias > 60 && dias <= 90; }),
      acima90:   aReceber.filter(e => { const d = new Date(e.dueDate); return (hoje.getTime()-d.getTime())/86400000 > 90; }),
    };

    const soma = (arr: any[]) => arr.reduce((s,e) => s + Number(e.amount||0), 0);

    const aging = {
      corrente:  { qtd: buckets.corrente.length,  valor: soma(buckets.corrente),  itens: buckets.corrente.slice(0,10) },
      ate30:     { qtd: buckets.ate30.length,      valor: soma(buckets.ate30),     itens: buckets.ate30.slice(0,10) },
      de31a60:   { qtd: buckets.de31a60.length,    valor: soma(buckets.de31a60),   itens: buckets.de31a60.slice(0,10) },
      de61a90:   { qtd: buckets.de61a90.length,    valor: soma(buckets.de61a90),   itens: buckets.de61a90.slice(0,10) },
      acima90:   { qtd: buckets.acima90.length,    valor: soma(buckets.acima90),   itens: buckets.acima90.slice(0,10) },
    };

    const totalVencido = soma(buckets.ate30) + soma(buckets.de31a60) + soma(buckets.de61a90) + soma(buckets.acima90);
    const totalGeral = soma(aReceber);

    if (!aReceber.length) return NextResponse.json({ aging: DEMO_AGING, totalVencido: 37800, totalGeral: 168000, _demo: true });
    return NextResponse.json({ aging, totalVencido, totalGeral });
  } catch {
    return NextResponse.json({ aging: DEMO_AGING, totalVencido: 37800, totalGeral: 168000, _demo: true });
  }
}

const DEMO_AGING = {
  corrente:  { qtd:4, valor:130200, itens:[
    { id:"r1", description:"Receita MAI/2026 — CONT-2026-001 PBH",  amount:38000, dueDate:"2026-05-10" },
    { id:"r2", description:"Receita MAI/2026 — CONT-2026-002 CEMIG", amount:32500, dueDate:"2026-05-15" },
    { id:"r3", description:"Receita MAI/2026 — CONT-2026-003 COPASA",amount:31200, dueDate:"2026-05-20" },
    { id:"r4", description:"Receita MAI/2026 — CONT-2026-004 Sanesul",amount:28500, dueDate:"2026-05-25" },
  ]},
  ate30:     { qtd:2, valor:22400, itens:[
    { id:"r5", description:"Receita ABR/2026 — CONT-2026-001 PBH",  amount:14800, dueDate:"2026-04-10" },
    { id:"r6", description:"Receita ABR/2026 — CONT-2026-002 CEMIG", amount:7600,  dueDate:"2026-04-22" },
  ]},
  de31a60:   { qtd:1, valor:11200, itens:[
    { id:"r7", description:"Receita MAR/2026 — CONT-2026-004 Sanesul",amount:11200, dueDate:"2026-03-30" },
  ]},
  de61a90:   { qtd:1, valor:4200,  itens:[
    { id:"r8", description:"Serviço Avulso — Retro CEMIG jan/26", amount:4200, dueDate:"2026-02-28" },
  ]},
  acima90:   { qtd:0, valor:0, itens:[] },
};
