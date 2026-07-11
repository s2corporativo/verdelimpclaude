import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, registrarAuditoria, gerarSenhaProvisoria } from "@/lib/admin";

export async function GET() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const usuarios = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, email: true, active: true, mustChangePass: true,
        lastLoginAt: true, failedAttempts: true, lockedUntil: true, createdAt: true,
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json({
      data: usuarios.map((u) => ({ ...u, roles: u.roles.map((r) => r.role) })),
    });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.name || !body.email) return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });

    const senhaProvisoria = gerarSenhaProvisoria();
    const novo = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(senhaProvisoria, 12),
        active: true,
        mustChangePass: true,
        roles: {
          create: (body.roleIds || []).map((roleId: string) => ({ roleId })),
        },
      },
      include: { roles: { include: { role: true } } },
    });

    await registrarAuditoria({
      userId: user.id, action: "criar_usuario", module: "admin",
      entityType: "User", entityId: novo.id,
      newValues: { name: novo.name, email: novo.email, roles: novo.roles.map((r) => r.role.name) },
    });

    // A senha provisória é exibida uma única vez para o administrador repassar
    return NextResponse.json({ id: novo.id, senhaProvisoria }, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
