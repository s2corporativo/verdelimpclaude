// Central de Diagnóstico — bateria de autotestes do sistema.
// Verifica banco, configuração, segurança, integrações, migrações e
// consistência de dados. Cada teste devolve status + correção sugerida.
// Nunca lança: cada verificação é isolada em try/catch.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // 1. Banco de dados
  try {
    await prisma.$queryRaw`SELECT 1`;
    add({ id: "db", area: "Infraestrutura", titulo: "Banco de dados", status: "ok", detalhe: "Conexão com o PostgreSQL respondendo normalmente." });
  } catch (e: any) {
    add({ id: "db", area: "Infraestrutura", titulo: "Banco de dados", status: "falha",
      detalhe: `Sem conexão com o banco: ${e.message}`,
      correcao: "Na VPS: cd /opt/verdelimp-erp && docker compose ps (o container verdelimp-db deve estar 'healthy'). Se estiver parado: docker compose up -d db." });
  }

  // 2. Migrações do banco (as tabelas novas precisam existir)
  try {
    await prisma.asoExam.count();
    await prisma.vacation.count();
    await prisma.contractDocRequirement.count();
    add({ id: "migracoes", area: "Infraestrutura", titulo: "Estrutura do banco (migrações)", status: "ok", detalhe: "Todas as tabelas esperadas existem e estão acessíveis." });
  } catch (e: any) {
    add({ id: "migracoes", area: "Infraestrutura", titulo: "Estrutura do banco (migrações)", status: "falha",
      detalhe: "Faltam tabelas novas — as migrações não foram aplicadas na última atualização.",
      correcao: "Na VPS: docker compose run --rm app npx prisma migrate deploy (ou rode ./deploy/contabo/deploy.sh, que já faz isso)." });
  }

  // 3. Configuração da empresa
  try {
    const cfg = await prisma.companyConfig.findFirst();
    if (cfg) add({ id: "config", area: "Configuração", titulo: "Dados da empresa", status: "ok", detalhe: `Empresa configurada: ${cfg.razaoSocial} (CNPJ ${cfg.cnpj}).` });
    else add({ id: "config", area: "Configuração", titulo: "Dados da empresa", status: "atencao",
      detalhe: "Nenhuma configuração de empresa cadastrada — cálculos fiscais usam valores padrão.",
      correcao: "Abra Configurações e preencha CNPJ, endereço e alíquotas (ISS, INSS, FGTS)." });
  } catch (e: any) {
    add({ id: "config", area: "Configuração", titulo: "Dados da empresa", status: "falha", detalhe: e.message });
  }

  // 4. Usuário administrador
  try {
    const admins = await prisma.userRole.count({ where: { role: { name: "ADMIN" }, user: { active: true } } });
    if (admins > 0) add({ id: "admin", area: "Segurança", titulo: "Usuário administrador", status: "ok", detalhe: `${admins} administrador(es) ativo(s).` });
    else add({ id: "admin", area: "Segurança", titulo: "Usuário administrador", status: "falha",
      detalhe: "Nenhum administrador ativo — o sistema pode ficar sem gestão de acessos.",
      correcao: "Rode o seed na VPS (docker compose exec app npm run prisma:seed) ou reative um usuário ADMIN no banco." });
  } catch (e: any) {
    add({ id: "admin", area: "Segurança", titulo: "Usuário administrador", status: "atencao", detalhe: e.message });
  }

  // 5. Segurança — segredo de sessão
  const secret = process.env.NEXTAUTH_SECRET || "";
  if (!secret) add({ id: "secret", area: "Segurança", titulo: "Segredo de sessão (NEXTAUTH_SECRET)", status: "falha",
    detalhe: "NEXTAUTH_SECRET não está definido — o login pode falhar.",
    correcao: "No .env.production da VPS, defina NEXTAUTH_SECRET com: openssl rand -base64 32." });
  else if (secret.includes("teste") || secret.length < 16) add({ id: "secret", area: "Segurança", titulo: "Segredo de sessão", status: "atencao",
    detalhe: "O segredo de sessão parece fraco ou de teste.",
    correcao: "Gere um segredo forte (openssl rand -base64 32) e reinicie a aplicação." });
  else add({ id: "secret", area: "Segurança", titulo: "Segredo de sessão", status: "ok", detalhe: "Segredo de sessão configurado." });

  // 6. Integração de IA (GROQ)
  if (process.env.GROQ_API_KEY) add({ id: "groq", area: "Integrações", titulo: "IA (GROQ)", status: "ok", detalhe: "Chave GROQ configurada — recursos de IA disponíveis." });
  else add({ id: "groq", area: "Integrações", titulo: "IA (GROQ)", status: "atencao",
    detalhe: "Chave GROQ ausente — chat de ajuda, proposta por edital e análise de preço ficam indisponíveis.",
    correcao: "Pegue a chave gratuita em console.groq.com e adicione GROQ_API_KEY no .env.production; depois docker compose up -d app." });

  // 7. E-mail (SMTP)
  if (process.env.SMTP_HOST && process.env.SMTP_USER) add({ id: "smtp", area: "Integrações", titulo: "E-mail (SMTP)", status: "ok", detalhe: "SMTP configurado — envio de relatórios por e-mail disponível." });
  else add({ id: "smtp", area: "Integrações", titulo: "E-mail (SMTP)", status: "atencao",
    detalhe: "SMTP não configurado — o envio de e-mail (ex.: relatório ao contador) fica indisponível.",
    correcao: "Preencha SMTP_HOST/PORT/USER/PASS no .env.production se quiser enviar e-mails. (Opcional.)" });

  // 8. Contratos ativos sem cliente vinculado
  try {
    const semCliente = await prisma.contract.count({ where: { status: "Ativo", clientId: null } });
    if (semCliente === 0) add({ id: "ctr-cliente", area: "Consistência", titulo: "Contratos com cliente", status: "ok", detalhe: "Todos os contratos ativos têm cliente vinculado." });
    else add({ id: "ctr-cliente", area: "Consistência", titulo: "Contratos sem cliente", status: "atencao",
      detalhe: `${semCliente} contrato(s) ativo(s) sem cliente vinculado.`,
      correcao: "Em Contratos, edite cada um e selecione o cliente no formulário." });
  } catch {}

  // 9. Mobilizações de funcionários inativos
  try {
    const mobs = await prisma.mobilization.findMany({ where: { status: "ativa" }, include: { employee: { select: { active: true } } } });
    const invalidas = mobs.filter((m) => !m.employee?.active).length;
    if (invalidas === 0) add({ id: "mob", area: "Consistência", titulo: "Mobilizações", status: "ok", detalhe: "Todas as mobilizações ativas são de funcionários ativos." });
    else add({ id: "mob", area: "Consistência", titulo: "Mobilizações inconsistentes", status: "atencao",
      detalhe: `${invalidas} mobilização(ões) ativa(s) de funcionário(s) desligado(s).`,
      correcao: "Em RH → Mobilizações, encerre as mobilizações de quem não está mais ativo." });
  } catch {}

  // 10. Funcionários ativos sem ASO
  try {
    const ativos = await prisma.employee.count({ where: { active: true } });
    const comAso = await prisma.asoExam.findMany({ select: { employeeId: true }, distinct: ["employeeId"] });
    const semAso = ativos - comAso.length;
    if (ativos === 0) add({ id: "aso", area: "Conformidade", titulo: "ASO dos funcionários", status: "atencao", detalhe: "Nenhum funcionário cadastrado ainda.", correcao: "Cadastre os funcionários em RH & Folha." });
    else if (semAso <= 0) add({ id: "aso", area: "Conformidade", titulo: "ASO dos funcionários", status: "ok", detalhe: "Todos os funcionários ativos têm ao menos um ASO registrado." });
    else add({ id: "aso", area: "Conformidade", titulo: "ASO faltando", status: "atencao",
      detalhe: `${semAso} funcionário(s) ativo(s) sem ASO registrado.`,
      correcao: "Registre os exames em RH → ASO — a contratante exige ASO válido." });
  } catch {}

  // 11. Documentos e EPI vencidos (aponta para a Central de Alertas)
  try {
    const hoje = new Date();
    const [docsVenc, epiVenc] = await Promise.all([
      prisma.employeeDoc.count({ where: { expiresAt: { lt: hoje } } }),
      prisma.inventoryEpiDelivery.count({ where: { status: "ativo", caExpirationDate: { lt: hoje } } }).catch(() => 0),
    ]);
    const total = docsVenc + epiVenc;
    if (total === 0) add({ id: "vencidos", area: "Conformidade", titulo: "Documentos vencidos", status: "ok", detalhe: "Nenhum documento ou EPI vencido." });
    else add({ id: "vencidos", area: "Conformidade", titulo: "Documentos vencidos", status: "atencao",
      detalhe: `${total} item(ns) vencido(s) (${docsVenc} documentos, ${epiVenc} EPIs).`,
      correcao: "Abra a Central de Alertas para ver e resolver cada vencimento." });
  } catch {}

  // 12. Contratos ativos sem requisitos de documentação
  try {
    const contratos = await prisma.contract.findMany({ where: { status: "Ativo" }, select: { id: true } });
    let semReq = 0;
    for (const c of contratos) {
      const n = await prisma.contractDocRequirement.count({ where: { contractId: c.id } });
      if (n === 0) semReq++;
    }
    if (contratos.length === 0) add({ id: "req", area: "Conformidade", titulo: "Requisitos de documentação", status: "ok", detalhe: "Sem contratos ativos para exigir documentação." });
    else if (semReq === 0) add({ id: "req", area: "Conformidade", titulo: "Requisitos de documentação", status: "ok", detalhe: "Todos os contratos ativos têm requisitos de documentação definidos." });
    else add({ id: "req", area: "Conformidade", titulo: "Contratos sem checklist de docs", status: "atencao",
      detalhe: `${semReq} contrato(s) ativo(s) sem requisitos de documentação.`,
      correcao: "Em Docs & Conformidade → Monitor, selecione o contrato e aplique o modelo (SST / Contratual SADA)." });
  } catch {}

  const resumo = {
    total: checks.length,
    ok: checks.filter((c) => c.status === "ok").length,
    atencao: checks.filter((c) => c.status === "atencao").length,
    falha: checks.filter((c) => c.status === "falha").length,
  };
  const saude = resumo.falha > 0 ? "falha" : resumo.atencao > 0 ? "atencao" : "ok";

  return NextResponse.json({ checks, resumo, saude, geradoEm: new Date().toISOString() });
}
