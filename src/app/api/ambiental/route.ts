// Registros ambientais — licenças, DOF, autorizações de poda, descartes.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusPorValidade } from "@/lib/monitor-docs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [registros, contratos] = await Promise.all([
      prisma.environmentalRecord.findMany({
        include: { contract: { select: { number: true, client: { select: { name: true } } } } },
        orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
      }),
      prisma.contract.findMany({ where: { status: "Ativo" }, select: { id: true, number: true, object: true, client: { select: { name: true } } }, orderBy: { number: "asc" } }),
    ]);
    const linhas = registros.map((r) => ({ ...r, situacao: statusPorValidade(r.expiresAt, true) }));
    const vencidos = linhas.filter((l) => l.situacao === "vencido").length;
    const aVencer = linhas.filter((l) => l.situacao === "a_vencer").length;
    return NextResponse.json({ linhas, contratos, resumo: { total: linhas.length, vencidos, aVencer } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.type) return NextResponse.json({ error: "Tipo é obrigatório" }, { status: 400 });
    const r = await prisma.environmentalRecord.create({
      data: {
        type: b.type, number: b.number || null, agency: b.agency || null,
        contractId: b.contractId || null,
        issuedAt: b.issuedAt ? new Date(b.issuedAt) : null,
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        notes: b.notes || null,
      },
    });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.environmentalRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
