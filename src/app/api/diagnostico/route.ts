import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCredenciais } from "@/lib/cofre";
import { exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

type Status = "ok" | "atencao" | "falha";
interface Check {
  id: string;
  area: string;
  titulo: string;
  status: Status;
  detalhe: string;
  correcao?: string;
}

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "DIRETORIA");
  if (erro) return erro;

  const checks: Check[] = [];
  const add = (check: Check) => checks.push(check);

  try {
    await prisma.$queryRaw`SELECT 1`;
    add({ id: "db", area: "Infraestrutura", titulo: "Banco de dados", status: "ok", detalhe: "Conexão com o PostgreSQL respondendo normalmente." });
  } catch {
    add({
      id: "db",
      area: "Infraestrutura",
      titulo: "Banco de dados",
      status: "falha",
      detalhe: "O PostgreSQL não respondeu à verificação do sistema.",
      correcao: "Na VPS: cd /opt/verdelimp-erp && docker compose ps. O container verdelimp-db deve estar healthy.",
    });
  }

  try {
    await Promise.all([
      prisma.asoExam.count(),
      prisma.vacation.count(),
      prisma.contractDocRequirement.count(),
      prisma.$queryRaw(Prisma.sql`SELECT "opportunityId" FROM "ServiceDossier" LIMIT 0`),
    ]);
    add({ id: "migracoes", area: "Infraestrutura", titulo: "Estrutura do banco", status: "ok", detalhe: "Tabelas e colunas críticas das migrations estão acessíveis." });
  } catch {
    add({
      id: "migracoes",
      area: "Infraestrutura",
      titulo: "Estrutura do banco",
      status: "falha",
      detalhe: "A estrutura esperada não está integralmente aplicada.",
      correcao: "Na VPS: cd /opt/verdelimp-erp && docker compose run --rm migrate. Preferencialmente execute deploy/contabo/deploy.sh, que faz backup antes.",
    });
  }

  try {
    const config = await prisma.companyConfig.findFirst();
    if (config) {
      add({ id: "config", area: "Configuração", titulo: "Dados da empresa", status: "ok", detalhe: `Empresa configurada: ${config.razaoSocial} (CNPJ ${config.cnpj}).` });
    } else {
      add({
        id: "config",
        area: "Configuração",
        titulo: "Dados da empresa",
        status: "atencao",
        detalhe: "Nenhuma configuração empresarial foi cadastrada.",
        correcao: "Preencha os dados empresariais e alíquotas em Configurações antes de emitir propostas ou relatórios fiscais.",
      });
    }
  } catch {
    add({ id: "config", area: "Configuração", titulo: "Dados da empresa", status: "falha", detalhe: "Falha ao consultar a configuração empresarial." });
  }

  try {
    const [admins, diretoria] = await Promise.all([
      prisma.userRole.count({ where: { role: { name: "ADMIN" }, user: { active: true } } }),
      prisma.role.count({ where: { name: "DIRETORIA" } }),
    ]);
    add(admins > 0
      ? { id: "admin", area: "Segurança", titulo: "Usuário administrador", status: "ok", detalhe: `${admins} administrador(es) ativo(s).` }
      : {
          id: "admin",
          area: "Segurança",
          titulo: "Usuário administrador",
          status: "falha",
          detalhe: "Nenhum administrador ativo foi encontrado.",
          correcao: "Reative ou atribua o papel ADMIN pela gestão de usuários. Não execute o seed novamente como rotina de reparo.",
        });
    add(diretoria > 0
      ? { id: "diretoria", area: "Segurança", titulo: "Papel DIRETORIA", status: "ok", detalhe: "Papel executivo disponível para as alçadas de aprovação." }
      : { id: "diretoria", area: "Segurança", titulo: "Papel DIRETORIA", status: "falha", detalhe: "O papel DIRETORIA não existe.", correcao: "Aplique as migrations e o seed estrutural da versão atual em ambiente controlado." });
  } catch {
    add({ id: "admin", area: "Segurança", titulo: "Papéis e administradores", status: "falha", detalhe: "Não foi possível validar usuários e papéis." });
  }

  const secret = process.env.NEXTAUTH_SECRET || "";
  if (!secret) {
    add({ id: "secret", area: "Segurança", titulo: "NEXTAUTH_SECRET", status: "falha", detalhe: "Segredo de sessão ausente.", correcao: "Defina NEXTAUTH_SECRET na VPS com um valor forte gerado localmente e reinicie a aplicação." });
  } else if (secret.includes("teste") || secret.includes("test") || secret.length < 32) {
    add({ id: "secret", area: "Segurança", titulo: "NEXTAUTH_SECRET", status: "atencao", detalhe: "O segredo de sessão parece fraco ou destinado a testes.", correcao: "Gere um segredo forte diretamente na VPS com openssl rand -base64 32." });
  } else {
    add({ id: "secret", area: "Segurança", titulo: "NEXTAUTH_SECRET", status: "ok", detalhe: "Segredo de sessão configurado." });
  }

  try {
    const credenciais = await getCredenciais(
      "GROQ_API_KEY",
      "SMTP_HOST",
      "SMTP_USER",
      "SMTP_PASS",
      "EMAIL_IMAP_HOST",
      "EMAIL_IMAP_USER",
      "EMAIL_IMAP_PASS",
    );

    add(credenciais.GROQ_API_KEY
      ? { id: "groq", area: "Integrações", titulo: "IA GROQ", status: "ok", detalhe: "Credencial configurada." }
      : { id: "groq", area: "Integrações", titulo: "IA GROQ", status: "atencao", detalhe: "Credencial ausente; recursos dependentes de IA ficarão indisponíveis.", correcao: "Cadastre a chave no cofre de credenciais do sistema." });

    add(credenciais.SMTP_HOST && credenciais.SMTP_USER && credenciais.SMTP_PASS
      ? { id: "smtp", area: "Integrações", titulo: "E-mail SMTP", status: "ok", detalhe: "Envio de e-mail configurado." }
      : { id: "smtp", area: "Integrações", titulo: "E-mail SMTP", status: "atencao", detalhe: "Envio de e-mail indisponível por falta de configuração.", correcao: "Cadastre host, usuário e senha de aplicativo SMTP no cofre." });

    add(credenciais.EMAIL_IMAP_HOST && credenciais.EMAIL_IMAP_USER && credenciais.EMAIL_IMAP_PASS
      ? { id: "imap", area: "Integrações", titulo: "E-mail IMAP", status: "ok", detalhe: "Leitura de cotações e contratos configurada." }
      : { id: "imap", area: "Integrações", titulo: "E-mail IMAP", status: "atencao", detalhe: "A caixa de entrada não será consultada enquanto o IMAP não estiver configurado.", correcao: "Cadastre host, usuário e senha de aplicativo IMAP no cofre." });
  } catch {
    add({ id: "credenciais", area: "Integrações", titulo: "Cofre de credenciais", status: "falha", detalhe: "Não foi possível consultar o cofre de integrações." });
  }

  try {
    const [funcionariosLegados, veiculosLegados, demosNovos] = await Promise.all([
      prisma.employee.count({ where: { id: { in: ["emp-1", "emp-2", "emp-3", "emp-4", "emp-5", "emp-6", "emp-7", "emp-8"] } } }),
      prisma.vehicle.count({ where: { id: { in: ["veh-1", "veh-2", "veh-3"] } } }),
      prisma.employee.count({ where: { id: { startsWith: "demo-" } } }),
    ]);
    const totalDemo = funcionariosLegados + veiculosLegados + demosNovos;
    add(totalDemo === 0
      ? { id: "seed-demo", area: "Consistência", titulo: "Dados de seed", status: "ok", detalhe: "Nenhum registro operacional conhecido do seed demonstrativo foi detectado." }
      : {
          id: "seed-demo",
          area: "Consistência",
          titulo: "Dados de seed para revisão",
          status: "atencao",
          detalhe: `${totalDemo} registro(s) com identificadores conhecidos de demonstração foram encontrados.`,
          correcao: "Revise esses registros antes de arquivar. A atualização não os exclui automaticamente para evitar perda de dados eventualmente corrigidos pelo usuário.",
        });
  } catch {
    add({ id: "seed-demo", area: "Consistência", titulo: "Dados de seed", status: "atencao", detalhe: "Não foi possível concluir a verificação de registros demonstrativos." });
  }

  try {
    const contratosSemCliente = await prisma.contract.count({ where: { status: "Ativo", clientId: null } });
    add(contratosSemCliente === 0
      ? { id: "ctr-cliente", area: "Consistência", titulo: "Contratos com cliente", status: "ok", detalhe: "Todos os contratos ativos possuem cliente vinculado." }
      : { id: "ctr-cliente", area: "Consistência", titulo: "Contratos sem cliente", status: "atencao", detalhe: `${contratosSemCliente} contrato(s) ativo(s) sem cliente.`, correcao: "Vincule o cliente correto no cadastro contratual." });
  } catch {
    add({ id: "ctr-cliente", area: "Consistência", titulo: "Contratos com cliente", status: "falha", detalhe: "Falha ao verificar os vínculos contratuais." });
  }

  try {
    const mobilizacoes = await prisma.mobilization.findMany({ where: { status: "ativa" }, include: { employee: { select: { active: true } } } });
    const invalidas = mobilizacoes.filter((item) => !item.employee.active).length;
    add(invalidas === 0
      ? { id: "mobilizacao", area: "Consistência", titulo: "Mobilizações", status: "ok", detalhe: "Mobilizações ativas vinculadas a funcionários ativos." }
      : { id: "mobilizacao", area: "Consistência", titulo: "Mobilizações inconsistentes", status: "atencao", detalhe: `${invalidas} mobilização(ões) ativa(s) de funcionário inativo.`, correcao: "Encerre ou suspenda as mobilizações inconsistentes." });
  } catch {
    add({ id: "mobilizacao", area: "Consistência", titulo: "Mobilizações", status: "falha", detalhe: "Falha ao verificar mobilizações." });
  }

  try {
    const [ativos, comAso] = await Promise.all([
      prisma.employee.count({ where: { active: true } }),
      prisma.asoExam.findMany({ select: { employeeId: true }, distinct: ["employeeId"] }),
    ]);
    const semAso = Math.max(0, ativos - comAso.length);
    add(ativos === 0
      ? { id: "aso", area: "Conformidade", titulo: "ASO", status: "atencao", detalhe: "Nenhum funcionário ativo cadastrado." }
      : semAso === 0
        ? { id: "aso", area: "Conformidade", titulo: "ASO", status: "ok", detalhe: "Todos os funcionários ativos possuem ao menos um ASO." }
        : { id: "aso", area: "Conformidade", titulo: "ASO faltando", status: "atencao", detalhe: `${semAso} funcionário(s) ativo(s) sem ASO.`, correcao: "Registre e valide os exames ocupacionais antes da mobilização." });
  } catch {
    add({ id: "aso", area: "Conformidade", titulo: "ASO", status: "falha", detalhe: "Falha ao verificar ASOs." });
  }

  try {
    const hoje = new Date();
    const [documentosVencidos, episVencidos] = await Promise.all([
      prisma.employeeDoc.count({ where: { expiresAt: { lt: hoje } } }),
      prisma.inventoryEpiDelivery.count({ where: { status: "ativo", caExpirationDate: { lt: hoje } } }),
    ]);
    const total = documentosVencidos + episVencidos;
    add(total === 0
      ? { id: "vencidos", area: "Conformidade", titulo: "Validades", status: "ok", detalhe: "Nenhum documento ou CA de EPI vencido." }
      : { id: "vencidos", area: "Conformidade", titulo: "Validades vencidas", status: "atencao", detalhe: `${total} item(ns) vencido(s).`, correcao: "Trate os vencimentos na Central de Alertas antes da mobilização." });
  } catch {
    add({ id: "vencidos", area: "Conformidade", titulo: "Validades", status: "falha", detalhe: "Falha ao verificar documentos e EPIs." });
  }

  try {
    const contratos = await prisma.contract.findMany({ where: { status: "Ativo" }, select: { id: true, _count: { select: { docRequirements: true } } } });
    const semRequisitos = contratos.filter((contract) => contract._count.docRequirements === 0).length;
    add(semRequisitos === 0
      ? { id: "requisitos", area: "Conformidade", titulo: "Matriz documental", status: "ok", detalhe: contratos.length ? "Contratos ativos possuem requisitos documentais." : "Sem contratos ativos para avaliar." }
      : { id: "requisitos", area: "Conformidade", titulo: "Contratos sem matriz documental", status: "atencao", detalhe: `${semRequisitos} contrato(s) ativo(s) sem requisitos documentais.`, correcao: "Defina ou aplique o perfil documental correspondente ao contrato." });
  } catch {
    add({ id: "requisitos", area: "Conformidade", titulo: "Matriz documental", status: "falha", detalhe: "Falha ao verificar requisitos contratuais." });
  }

  const resumo = {
    total: checks.length,
    ok: checks.filter((check) => check.status === "ok").length,
    atencao: checks.filter((check) => check.status === "atencao").length,
    falha: checks.filter((check) => check.status === "falha").length,
  };
  const saude = resumo.falha > 0 ? "falha" : resumo.atencao > 0 ? "atencao" : "ok";
  const response = NextResponse.json({ checks, resumo, saude, geradoEm: new Date().toISOString() });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
