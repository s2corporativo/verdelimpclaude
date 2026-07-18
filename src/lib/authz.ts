// Autorização por papel dentro dos handlers (defesa em profundidade).
// O middleware já bloqueia por prefixo de rota; estes helpers garantem que
// rotas sensíveis revalidem a sessão e o papel mesmo se o guard central
// mudar ou uma rota for renomeada.
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type SessaoUsuario = { id: string; name?: string | null; email?: string | null; roles: string[] };

/**
 * Exige sessão válida com pelo menos um dos papéis informados.
 * Sem argumentos, exige apenas usuário autenticado (qualquer papel).
 * Uso: const { user, erro } = await exigirPapel("ADMIN", "RH"); if (erro) return erro;
 */
export async function exigirPapel(...papeis: string[]) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessaoUsuario | undefined;
  if (!user?.id) {
    return { user: null, erro: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  const roles = user.roles || [];
  if (papeis.length > 0 && !papeis.some((p) => roles.includes(p))) {
    return { user: null, erro: NextResponse.json({ error: "Acesso negado para o seu perfil" }, { status: 403 }) };
  }
  return { user, erro: null };
}

/**
 * Resposta 500 padronizada: loga o detalhe no servidor e devolve mensagem
 * genérica ao cliente (nunca vazar mensagens do Prisma/stack ao navegador).
 */
export function erroInterno(e: unknown, contexto: string) {
  console.error(`[${contexto}]`, e);
  return NextResponse.json({ error: "Erro interno. Tente novamente ou contate o administrador." }, { status: 500 });
}
