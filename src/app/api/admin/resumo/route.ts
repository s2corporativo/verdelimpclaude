import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin";
import { erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const agora = new Date();
    const seteDias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalUsuarios, ativos, bloqueados, pendentesTroca, totalPapeis, eventos7d, ultimosLogins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.user.count({ where: { lockedUntil: { gt: agora } } }),
      prisma.user.count({ where: { mustChangePass: true, active: true } }),
      prisma.role.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: seteDias } } }),
      prisma.user.findMany({
        where: { lastLoginAt: { not: null } },
        orderBy: { lastLoginAt: "desc" },
        take: 8,
        select: { id: true, name: true, email: true, lastLoginAt: true },
      }),
    ]);

    return NextResponse.json({
      totalUsuarios, ativos, inativos: totalUsuarios - ativos,
      bloqueados, pendentesTroca, totalPapeis, eventos7d, ultimosLogins,
    });
  } catch (e: any) { return erroInterno(e, "api/admin/resumo"); }
}
