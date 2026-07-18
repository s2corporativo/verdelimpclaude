// Cronograma de serviços — programação de atividades por contrato.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const contractId = p.get("contractId");
    const de = p.get("de");
    const ate = p.get("ate");

    const where: any = {};
    if (contractId) where.contractId = contractId;
    if (de || ate) where.date = { ...(de ? { gte: new Date(de) } : {}), ...(ate ? { lte: new Date(ate + "T23:59:59") } : {}) };

    const [itens, contratos] = await Promise.all([
      prisma.scheduleItem.findMany({
        where,
        include: { contract: { select: { number: true, client: { select: { name: true } } } } },
        orderBy: { date: "asc" },
      }),
      prisma.contract.findMany({
        where: { status: "Ativo" },
        select: { id: true, number: true, object: true, client: { select: { name: true } } },
        orderBy: { number: "asc" },
      }),
    ]);

    return NextResponse.json({ itens, contratos });
  } catch (e: any) {
    return erroInterno(e, "api/cronograma");
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.contractId || !b.date || !b.activity) return NextResponse.json({ error: "Contrato, data e atividade são obrigatórios" }, { status: 400 });
    const item = await prisma.scheduleItem.create({
      data: {
        contractId: b.contractId, date: new Date(b.date), activity: b.activity,
        location: b.location || null, team: b.team || null, notes: b.notes || null,
        status: b.status || "planejado",
      },
    });
    return NextResponse.json({ ok: true, id: item.id });
  } catch (e: any) {
    return erroInterno(e, "api/cronograma");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const data: any = {};
    for (const k of ["activity", "location", "team", "notes", "status"]) if (b[k] !== undefined) data[k] = b[k];
    if (b.date) data.date = new Date(b.date);
    await prisma.scheduleItem.update({ where: { id: b.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return erroInterno(e, "api/cronograma");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.scheduleItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return erroInterno(e, "api/cronograma");
  }
}
