import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, registrarAuditoria } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const [papeis, permissoes] = await Promise.all([
      prisma.role.findMany({
        orderBy: { name: "asc" },
        include: {
          permissions: { select: { permission: { select: { id: true, module: true, action: true } } } },
          _count: { select: { userRoles: true } },
        },
      }),
      prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] }),
    ]);
    return NextResponse.json({
      data: papeis.map((p) => ({
        id: p.id, name: p.name, description: p.description,
        usuarios: p._count.userRoles,
        permissionIds: p.permissions.map((rp) => rp.permission.id),
      })),
      permissoes,
    });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nome do papel é obrigatório" }, { status: 400 });
    const papel = await prisma.role.create({
      data: {
        name: body.name.toUpperCase().trim().replace(/\s+/g, "_"),
        description: body.description || null,
        permissions: { create: (body.permissionIds || []).map((permissionId: string) => ({ permissionId })) },
      },
    });
    await registrarAuditoria({
      userId: user.id, action: "criar_papel", module: "admin", entityType: "Role", entityId: papel.id,
      newValues: { name: papel.name, description: papel.description },
    });
    return NextResponse.json(papel, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Já existe papel com esse nome" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
