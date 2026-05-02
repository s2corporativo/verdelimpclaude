// src/app/api/mobilizacoes/route.ts
// Controle de mobilização: quem está alocado em qual contrato, desde quando, com qual custo
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ENCARGOS_PCT = 0.70;

export async function GET() {
  try {
    const data = await prisma.mobilization.findMany({
      orderBy: { startDate: "desc" },
      include: {
        contract: { select: { number: true, object: true, status: true } },
        employee: { select: { name: true, role: true, salary: true } },
      },
      take: 200,
    });

    const ativas = data.filter(m => m.status === "ativa").length;
    const custoMensal = data.filter(m => m.status === "ativa").reduce((s, m) => s + Number(m.costPerMonth), 0);

    if (!data.length) return NextResponse.json({ data: DEMO, stats: { total: DEMO.length, ativas: 3, custoMensal: 17680 }, _demo: true });

    return NextResponse.json({ data, stats: { total: data.length, ativas, custoMensal } });
  } catch {
    return NextResponse.json({ data: DEMO, stats: { total: DEMO.length, ativas: 3, custoMensal: 17680 }, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contractId, mobilizacoes } = body;

    if (!contractId || !Array.isArray(mobilizacoes) || !mobilizacoes.length) {
      return NextResponse.json({ error: "contractId e mobilizacoes obrigatórios" }, { status: 400 });
    }

    const criadas: any[] = [];
    for (const mob of mobilizacoes) {
      try {
        const m = await prisma.mobilization.create({
          data: {
            contractId,
            employeeId: mob.employeeId,
            role: mob.role || "Operacional",
            startDate: new Date(mob.startDate || new Date()),
            endDate: mob.endDate ? new Date(mob.endDate) : null,
            hoursDay: mob.hoursDay || 8,
            daysWeek: mob.daysWeek || 5,
            costPerMonth: (mob.salary || 2500) * (1 + ENCARGOS_PCT),
            status: "ativa",
            notes: mob.notes,
          },
        });
        criadas.push(m);
      } catch (e: any) {
        console.error("Erro ao criar mobilização:", e.message);
      }
    }

    return NextResponse.json({ success: true, criadas: criadas.length, mobilizacoes: criadas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO = [
  { id:"m1", employee:{ name:"Ana Luiza Ribeiro", role:"Supervisora", salary:3500 }, contract:{ number:"CONT-2026-001", object:"Roçada PBH Norte", status:"Ativo" }, role:"Supervisor", startDate:"2026-01-15", endDate:"2026-12-31", hoursDay:8, daysWeek:5, costPerMonth:5950, status:"ativa" },
  { id:"m2", employee:{ name:"Abrão Felipe", role:"Op. Roçadeira", salary:2500 }, contract:{ number:"CONT-2026-001", object:"Roçada PBH Norte", status:"Ativo" }, role:"Operador Roçadeira", startDate:"2026-01-15", endDate:"2026-12-31", hoursDay:8, daysWeek:5, costPerMonth:4250, status:"ativa" },
  { id:"m3", employee:{ name:"José Antonio", role:"Op. Roçadeira", salary:2500 }, contract:{ number:"CONT-2026-002", object:"PRADA CEMIG", status:"Ativo" }, role:"Operador Roçadeira", startDate:"2026-03-01", endDate:"2027-02-28", hoursDay:8, daysWeek:5, costPerMonth:4250, status:"ativa" },
  { id:"m4", employee:{ name:"Gilberto Ferreira", role:"Op. Roçadeira", salary:2400 }, contract:{ number:"CONT-2025-003", object:"Sanesul", status:"Ativo" }, role:"Operador Roçadeira", startDate:"2025-07-01", endDate:"2026-06-30", hoursDay:8, daysWeek:5, costPerMonth:4080, status:"encerrada" },
];
