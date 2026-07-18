// src/app/api/fotos-os/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workDiaryId = searchParams.get("workDiaryId");
  const contractId = searchParams.get("contractId");

  try {
    const where: any = {};
    if (workDiaryId) where.workDiaryId = workDiaryId;
    if (contractId) where.contractId = contractId;

    const fotos = await prisma.servicePhoto.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json({ fotos });
  } catch {
    return NextResponse.json({ fotos: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { workDiaryId, contractId, tipo, url, descricao, latitude, longitude, tamanhoKb } = body;

    if (!url || !tipo) {
      return NextResponse.json({ error: "url e tipo obrigatórios" }, { status: 400 });
    }

    const foto = await prisma.servicePhoto.create({
      data: { workDiaryId, contractId, tipo, url, descricao, latitude, longitude, tamanhoKb },
    });

    return NextResponse.json({ success: true, foto });
  } catch (e: any) {
    return erroInterno(e, "api/fotos-os");
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  try {
    await prisma.servicePhoto.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return erroInterno(e, "api/fotos-os");
  }
}
