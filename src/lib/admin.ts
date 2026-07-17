// Helpers do módulo administrativo — autorização e trilha de auditoria
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id || !(user.roles || []).includes("ADMIN")) {
    return { user: null, erro: NextResponse.json({ error: "Acesso restrito ao administrador" }, { status: 403 }) };
  }
  return { user, erro: null };
}

export async function registrarAuditoria(params: {
  userId?: string | null;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        oldValues: params.oldValues ?? undefined,
        newValues: params.newValues ?? undefined,
      },
    });
  } catch { /* auditoria nunca deve derrubar a operação principal */ }
}

// Gera senha provisória forte para novos usuários / reset.
// Usa randomInt (CSPRNG) — antes usava Math.random, previsível para uma credencial.
import { randomInt } from "crypto";
export function gerarSenhaProvisoria() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  const numeros = "23456789";
  const simbolos = "@#$%&*";
  const sortear = (s: string) => s[randomInt(s.length)];
  let senha = "";
  for (let i = 0; i < 8; i++) senha += sortear(letras);
  senha += sortear(numeros) + sortear(numeros) + sortear(simbolos);
  return senha;
}
