import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, registrarAuditoria, gerarSenhaProvisoria } from "@/lib/admin";
import { erroInterno } from "@/lib/authz";

// PATCH — editar dados, papéis, ativar/desativar, desbloquear, resetar senha
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const { id } = await params;
    const body = await req.json();
    const alvo = await prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
    if (!alvo) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    // Reset de senha: gera provisória e força troca no próximo login
    if (body.acao === "resetar_senha") {
      const senhaProvisoria = gerarSenhaProvisoria();
      await prisma.user.update({
        where: { id: alvo.id },
        data: { passwordHash: await bcrypt.hash(senhaProvisoria, 12), mustChangePass: true, failedAttempts: 0, lockedUntil: null },
      });
      await registrarAuditoria({ userId: user.id, action: "resetar_senha", module: "admin", entityType: "User", entityId: alvo.id });
      return NextResponse.json({ ok: true, senhaProvisoria });
    }

    // Desbloqueio manual (após 5 tentativas erradas)
    if (body.acao === "desbloquear") {
      await prisma.user.update({ where: { id: alvo.id }, data: { failedAttempts: 0, lockedUntil: null } });
      await registrarAuditoria({ userId: user.id, action: "desbloquear_usuario", module: "admin", entityType: "User", entityId: alvo.id });
      return NextResponse.json({ ok: true });
    }

    // Impede o admin de desativar a própria conta
    if (body.active === false && alvo.id === user.id) {
      return NextResponse.json({ error: "Você não pode desativar a própria conta" }, { status: 400 });
    }

    const dados: any = {};
    if (body.name) dados.name = body.name;
    if (body.email) dados.email = body.email.toLowerCase().trim();
    if (typeof body.active === "boolean") dados.active = body.active;

    // Substituição do conjunto de papéis
    if (Array.isArray(body.roleIds)) {
      // Garante que sempre reste ao menos um ADMIN ativo no sistema
      const roleAdmin = await prisma.role.findUnique({ where: { name: "ADMIN" } });
      const tinhaAdmin = alvo.roles.some((r) => r.role.name === "ADMIN");
      const continuaAdmin = roleAdmin ? body.roleIds.includes(roleAdmin.id) : false;
      if (tinhaAdmin && !continuaAdmin) {
        const outrosAdmins = await prisma.userRole.count({
          where: { role: { name: "ADMIN" }, userId: { not: alvo.id }, user: { active: true } },
        });
        if (outrosAdmins === 0) return NextResponse.json({ error: "O sistema precisa de pelo menos um ADMIN ativo" }, { status: 400 });
      }
      dados.roles = { deleteMany: {}, create: body.roleIds.map((roleId: string) => ({ roleId })) };
    }

    const atualizado = await prisma.user.update({
      where: { id: alvo.id },
      data: dados,
      include: { roles: { include: { role: true } } },
    });

    await registrarAuditoria({
      userId: user.id, action: "editar_usuario", module: "admin", entityType: "User", entityId: alvo.id,
      oldValues: { name: alvo.name, email: alvo.email, active: alvo.active, roles: alvo.roles.map((r) => r.role.name) },
      newValues: { name: atualizado.name, email: atualizado.email, active: atualizado.active, roles: atualizado.roles.map((r) => r.role.name) },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    return erroInterno(e, "api/admin/usuarios/[id]");
  }
}
