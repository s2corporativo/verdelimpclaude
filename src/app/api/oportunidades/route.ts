// CRM — funil de oportunidades com clientes privados (condomínios, indústrias…).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const oportunidades = await prisma.opportunity.findMany({ orderBy: { updatedAt: "desc" } });
    const total = oportunidades.filter((o) => !["ganho", "perdido"].includes(o.stage))
      .reduce((s, o) => s + Number(o.estimatedValue || 0), 0);
    return NextResponse.json({ oportunidades, valorEmAberto: total });
  } catch (e: any) {
    return erroInterno(e, "api/oportunidades");
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.prospectName) return NextResponse.json({ error: "Nome do cliente é obrigatório" }, { status: 400 });
    const o = await prisma.opportunity.create({
      data: {
        prospectName: b.prospectName, contactName: b.contactName || null,
        phone: b.phone || null, email: b.email || null, origin: b.origin || null,
        serviceType: b.serviceType || null,
        estimatedValue: b.estimatedValue ? Number(b.estimatedValue) : null,
        stage: b.stage || "lead", nextAction: b.nextAction || null,
        nextActionDate: b.nextActionDate ? new Date(b.nextActionDate) : null,
        notes: b.notes || null,
      },
    });
    return NextResponse.json({ ok: true, id: o.id });
  } catch (e: any) {
    return erroInterno(e, "api/oportunidades");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const data: any = {};
    for (const k of ["prospectName", "contactName", "phone", "email", "origin", "serviceType", "stage", "nextAction", "notes"]) if (b[k] !== undefined) data[k] = b[k];
    if (b.estimatedValue !== undefined) data.estimatedValue = b.estimatedValue ? Number(b.estimatedValue) : null;
    if (b.nextActionDate !== undefined) data.nextActionDate = b.nextActionDate ? new Date(b.nextActionDate) : null;
    await prisma.opportunity.update({ where: { id: b.id }, data });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return erroInterno(e, "api/oportunidades");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    await prisma.opportunity.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return erroInterno(e, "api/oportunidades");
  }
}
