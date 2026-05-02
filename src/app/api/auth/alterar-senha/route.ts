
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { senhaAtual, novaSenha } = await req.json();
    if (!senhaAtual || !novaSenha) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
    if (novaSenha.length < 8) return NextResponse.json({ error: "Senha deve ter mínimo 8 caracteres" }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    const valid = await bcrypt.compare(senhaAtual, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    const hash = await bcrypt.hash(novaSenha, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash, mustChangePass: false, failedAttempts: 0 } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
