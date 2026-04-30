// src/app/api/fiscal/nfse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAliqISS } from "@/lib/iss-betim";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competencia = searchParams.get("competencia");
  try {
    const where: any = {};
    if (competencia) where.competence = competencia;
    const data = await prisma.fiscalNfse.findMany({ where, orderBy: { issueDate: "desc" }, include: { client: { select: { name: true } } } });
    if (data.length === 0) return NextResponse.json({ data: DEMO_NFSE, _demo: true });
    return NextResponse.json({ data, totalFaturado: data.reduce((s, n) => s + Number(n.serviceValue), 0) });
  } catch { return NextResponse.json({ data: DEMO_NFSE, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.number || !body.municipalityCode || !body.serviceValue) {
      return NextResponse.json({ error: "Número, município e valor obrigatórios" }, { status: 400 });
    }
    // ISS automático pela tabela de Betim
    const issRate = body.issRate ?? getAliqISS(body.serviceCode || "7.11");
    const issAmount = Number(body.serviceValue) * (issRate / 100);
    const netAmount = body.issRetained ? Number(body.serviceValue) - issAmount : Number(body.serviceValue);

    const nfse = await prisma.fiscalNfse.create({
      data: {
        number: body.number,
        municipality: body.municipality || "Betim",
        providerCnpj: body.providerCnpj || "30.198.776/0001-29",
        receiverName: body.receiverName,
        receiverCnpj: body.receiverCnpj,
        clientId: body.clientId || null,
        serviceCode: body.serviceCode,
        description: body.description || "",
        serviceValue: Number(body.serviceValue),
        calculationBase: Number(body.serviceValue),
        issRate,
        issAmount,
        issRetained: Boolean(body.issRetained),
        netAmount,
        issueDate: body.issueDate ? new Date(body.issueDate) : new Date(),
        competence: body.competence || new Date().toISOString().slice(0, 7),
        status: "lancada",
      },
    });
    return NextResponse.json(nfse, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO_NFSE = [
  { id: "n1", number: "2026/0042", receiverName: "Prefeitura de BH", serviceValue: 18500, issRate: 5, issAmount: 925, issRetained: true, netAmount: 17575, competence: "2026-04", status: "lancada" },
  { id: "n2", number: "2026/0041", receiverName: "CEMIG", serviceValue: 20000, issRate: 5, issAmount: 1000, issRetained: false, netAmount: 19000, competence: "2026-04", status: "lancada" },
  { id: "n3", number: "2026/0040", receiverName: "Sanesul", serviceValue: 8500, issRate: 5, issAmount: 425, issRetained: false, netAmount: 8075, competence: "2026-04", status: "lancada" },
];
