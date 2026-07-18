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

    // Proteção por perfil. FIN = financeiro/fiscal; RH_ = pessoas; SST = campo/segurança;
    // GES = gestão/comercial; OPE = operação de campo.
    const FIN = ["ADMIN", "FISCAL", "FINANCEIRO"];
    const RH_ = ["ADMIN", "RH"];
    const SST = ["ADMIN", "RH", "OPERACIONAL"];
    const GES = ["ADMIN", "GESTOR", "COMERCIAL"];
    const OPE = ["ADMIN", "GESTOR", "OPERACIONAL"];
    const guards: [string, string[]][] = [
      // Sistema / administração
      ["/api/admin", ["ADMIN"]],
      ["/dashboard/admin", ["ADMIN"]],
      ["/api/backup", ["ADMIN"]],
      ["/api/diagnostico", ["ADMIN"]],
      ["/dashboard/diagnostico", ["ADMIN"]],
      ["/api/alertas/whatsapp", ["ADMIN"]],
      ["/dashboard/configuracoes", ["ADMIN"]],
      // E-mail — cotações/contratos recebidos + análise IA
      ["/api/email-analise", [...GES, "FINANCEIRO"]],
      ["/dashboard/email-analise", [...GES, "FINANCEIRO"]],
      // Financeiro & fiscal (as rotas reais não começam todas com /api/fiscal)
      ["/api/fiscal", FIN], ["/dashboard/fiscal", FIN],
      ["/api/financeiro", ["ADMIN", "FINANCEIRO"]], ["/dashboard/financeiro", ["ADMIN", "FINANCEIRO"]],
      ["/api/dre", FIN], ["/dashboard/dre", FIN],
      ["/api/rentabilidade", FIN], ["/dashboard/rentabilidade", FIN],
      ["/api/tributario", FIN], ["/dashboard/tributario", FIN],
      ["/api/nfse", FIN], ["/dashboard/nfse", FIN],
      ["/api/nfe", FIN], ["/dashboard/nfe-import", FIN],
      ["/api/relatorio", FIN], ["/dashboard/relatorio-contador", FIN],
      ["/api/regularidade", FIN], ["/dashboard/regularidade", FIN],
      // RH & pessoas (folha, funcionários expõem salário/CPF)
      ["/api/rh", RH_], ["/dashboard/rh", RH_],
      ["/api/funcionarios", RH_],
      ["/api/folha-detalhada", ["ADMIN", "RH", "FINANCEIRO"]], ["/dashboard/folha-detalhada", ["ADMIN", "RH", "FINANCEIRO"]],
      // SST / campo
      ["/api/sso", SST], ["/dashboard/sso", SST],
      ["/api/aso", SST], ["/dashboard/aso", SST],
      ["/api/epi", SST], ["/dashboard/epi", SST],
      ["/api/treinamentos", SST], ["/dashboard/treinamentos", SST],
      ["/api/mobilizacoes", SST],
      // Estoque / comercial
      ["/api/almoxarifado", ["ADMIN", "ALMOXARIFADO", "OPERACIONAL"]],
      ["/dashboard/almoxarifado", ["ADMIN", "ALMOXARIFADO", "OPERACIONAL"]],
      ["/dashboard/propostas", ["ADMIN", "COMERCIAL", "OPERACIONAL"]],
      // GED — documentos podem conter holerite/ASO/contrato social; papel mínimo
      // aqui, e o handler ainda restringe os confidenciais por categoria.
      ["/api/documentos", ["ADMIN", "GESTOR", "COMERCIAL", "RH", "FINANCEIRO", "FISCAL"]],
      ["/dashboard/documentos", ["ADMIN", "GESTOR", "COMERCIAL", "RH", "FINANCEIRO", "FISCAL"]],
      // Comercial / licitações / precificação
      ["/api/clientes", [...GES, "FINANCEIRO", "FISCAL"]],
      ["/api/fornecedores", [...GES, "FINANCEIRO", "FISCAL", "ALMOXARIFADO"]],
      ["/api/oportunidades", GES],
      ["/api/pncp", GES],
      ["/api/bid-pipeline", GES],
      ["/api/analise-licitacao", GES],
      ["/api/analise-preco", GES],
      ["/api/proposta-edital", GES],
      ["/api/extrair-edital", GES],
      ["/api/precificacao-bdi", GES],
      ["/api/hora-homem", [...GES, "FINANCEIRO"]],
      ["/api/equipe-otimizada", GES],
      ["/api/propostas", [...GES, "OPERACIONAL"]],
      ["/api/proposta-contrato", GES],
      // Contratos e medição (valores contratuais)
      ["/api/contratos", [...GES, "OPERACIONAL", "FINANCEIRO", "FISCAL"]],
      ["/api/contrato-impacto", GES],
      ["/api/contrato-propagar", GES],
      ["/api/cronograma-contrato", [...GES, "OPERACIONAL"]],
      ["/api/medicao", [...GES, "OPERACIONAL", "FINANCEIRO", "FISCAL"]],
      // Operação de campo e frota
      ["/api/logistica", OPE],
      ["/api/equipamentos", OPE],
      ["/api/combustivel", [...OPE, "FINANCEIRO"]],
      ["/api/retro", OPE],
      ["/api/detetizacao", OPE],
      ["/api/voz", [...OPE, "COMERCIAL"]],
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
          "/api/health",
          // Portal do cliente: acesso externo por token. A emissão de token
          // (com clientId) exige sessão interna, checada dentro do handler.
          "/api/portal-cliente",
        ];
        if (publicApi.some((p) => req.nextUrl.pathname.startsWith(p))) return true;
        return !!token;
      },
    },
    pages: { signIn: "/login" },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
