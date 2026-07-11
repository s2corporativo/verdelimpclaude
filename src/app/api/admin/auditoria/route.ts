import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin";

const POR_PAGINA = 50;

export async function GET(req: NextRequest) {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const { searchParams } = new URL(req.url);
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1", 10) || 1);
    const modulo = searchParams.get("modulo") || undefined;
    const usuarioId = searchParams.get("usuarioId") || undefined;
    const de = searchParams.get("de");
    const ate = searchParams.get("ate");

    const where: any = {};
    if (modulo) where.module = modulo;
    if (usuarioId) where.userId = usuarioId;
    if (de || ate) {
      where.createdAt = {};
      if (de) where.createdAt.gte = new Date(de + "T00:00:00");
      if (ate) where.createdAt.lte = new Date(ate + "T23:59:59");
    }

    const [total, logs, modulos] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (pagina - 1) * POR_PAGINA,
        take: POR_PAGINA,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      prisma.auditLog.findMany({ distinct: ["module"], select: { module: true }, orderBy: { module: "asc" } }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
      modulos: modulos.map((m) => m.module),
    });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
