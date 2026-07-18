import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, registrarAuditoria } from "@/lib/admin";
import { erroInterno } from "@/lib/authz";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const body = await req.json();
    const papel = await prisma.role.findUnique({ where: { id: params.id } });
    if (!papel) return NextResponse.json({ error: "Papel não encontrado" }, { status: 404 });

    const dados: any = {};
    if (body.description !== undefined) dados.description = body.description;
    if (Array.isArray(body.permissionIds)) {
      dados.permissions = { deleteMany: {}, create: body.permissionIds.map((permissionId: string) => ({ permissionId })) };
    }
    await prisma.role.update({ where: { id: papel.id }, data: dados });
    await registrarAuditoria({
      userId: user.id, action: "editar_papel", module: "admin", entityType: "Role", entityId: papel.id,
      newValues: { description: body.description, permissionIds: body.permissionIds },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return erroInterno(e, "api/admin/papeis/[id]"); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const papel = await prisma.role.findUnique({
      where: { id: params.id },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!papel) return NextResponse.json({ error: "Papel não encontrado" }, { status: 404 });
    if (papel.name === "ADMIN") return NextResponse.json({ error: "O papel ADMIN não pode ser excluído" }, { status: 400 });
    if (papel._count.userRoles > 0) return NextResponse.json({ error: "Remova o papel dos usuários antes de excluí-lo" }, { status: 400 });

    await prisma.rolePermission.deleteMany({ where: { roleId: papel.id } });
    await prisma.role.delete({ where: { id: papel.id } });
    await registrarAuditoria({
      userId: user.id, action: "excluir_papel", module: "admin", entityType: "Role", entityId: papel.id,
      oldValues: { name: papel.name },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return erroInterno(e, "api/admin/papeis/[id]"); }
}
