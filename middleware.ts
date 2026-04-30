import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const roles = ((token?.roles as string[]) || []);

    // Forçar troca de senha
    if (token?.mustChangePass && path !== "/dashboard/alterar-senha" && path !== "/api/auth/signout") {
      return NextResponse.redirect(new URL("/dashboard/alterar-senha", req.url));
    }

    // Proteção por perfil
    const guards: [string, string[]][] = [
      ["/api/admin", ["ADMIN"]],
      ["/dashboard/admin", ["ADMIN"]],
      ["/api/rh", ["ADMIN", "RH"]],
      ["/dashboard/rh", ["ADMIN", "RH"]],
      ["/api/fiscal", ["ADMIN", "FISCAL", "FINANCEIRO"]],
      ["/dashboard/fiscal", ["ADMIN", "FISCAL", "FINANCEIRO"]],
      ["/api/financeiro", ["ADMIN", "FINANCEIRO"]],
      ["/dashboard/financeiro", ["ADMIN", "FINANCEIRO"]],
      ["/api/almoxarifado", ["ADMIN", "ALMOXARIFADO", "OPERACIONAL"]],
      ["/dashboard/almoxarifado", ["ADMIN", "ALMOXARIFADO", "OPERACIONAL"]],
      ["/dashboard/propostas", ["ADMIN", "COMERCIAL", "OPERACIONAL"]],
      ["/dashboard/configuracoes", ["ADMIN"]],
    ];

    for (const [route, required] of guards) {
      if (path.startsWith(route)) {
        if (!required.some((r) => roles.includes(r))) {
          if (path.startsWith("/api/")) {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
          }
          return NextResponse.redirect(new URL("/dashboard/acesso-negado", req.url));
        }
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Permitir acesso às rotas de API pública sem auth
        const publicApi = [
          "/api/integracoes/publicas/",
          "/api/auth/",
        ];
        if (publicApi.some((p) => req.nextUrl.pathname.startsWith(p))) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
