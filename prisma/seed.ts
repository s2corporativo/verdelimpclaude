// prisma/seed.ts — dados estruturais iniciais da Verdelimp
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const demoPermitido = process.env.SEED_DEMO_DATA === "true" && process.env.NODE_ENV !== "production";

async function criarDadosDemonstrativos() {
  console.warn("⚠️  SEED_DEMO_DATA=true: criando registros exclusivamente para desenvolvimento.");

  const usuarioDemo = await prisma.user.upsert({
    where: { email: "demo@verdelimp.local" },
    update: {},
    create: {
      id: "usr-demo",
      name: "Usuário de Demonstração",
      email: "demo@verdelimp.local",
      passwordHash: await bcrypt.hash(process.env.SEED_DEMO_PASSWORD || "Demo@Verdelimp2026", 12),
      active: true,
      mustChangePass: true,
      failedAttempts: 0,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: usuarioDemo.id, roleId: "role-gestor" } },
    update: {},
    create: { userId: usuarioDemo.id, roleId: "role-gestor" },
  });

  const funcionarios = [
    { id: "demo-emp-1", name: "Funcionário Demonstração 1", role: "Operador", cpf: "900.000.000-01", salary: 2500 },
    { id: "demo-emp-2", name: "Funcionário Demonstração 2", role: "Supervisora", cpf: "900.000.000-02", salary: 3500 },
  ];
  for (const funcionario of funcionarios) {
    await prisma.employee.upsert({
      where: { cpf: funcionario.cpf },
      update: {},
      create: { ...funcionario, admissionDate: new Date("2026-01-01"), active: true, status: "ativo" },
    });
  }

  await prisma.vehicle.upsert({
    where: { plate: "DEM-0001" },
    update: {},
    create: { id: "demo-veh-1", plate: "DEM-0001", model: "Veículo de Demonstração", type: "Leve", year: 2026, active: true },
  });
}

async function main() {
  console.log("🌱 Iniciando seed estrutural...");

  if (process.env.SEED_DEMO_DATA === "true" && process.env.NODE_ENV === "production") {
    throw new Error("SEED_DEMO_DATA não pode ser ativado em produção.");
  }

  const roles = [
    { id: "role-admin", name: "ADMIN", description: "Administrador completo" },
    { id: "role-diretoria", name: "DIRETORIA", description: "Diretoria e alçadas executivas" },
    { id: "role-gestor", name: "GESTOR", description: "Gestor operacional" },
    { id: "role-comercial", name: "COMERCIAL", description: "Propostas, licitações e clientes" },
    { id: "role-operacional", name: "OPERACIONAL", description: "Campo, obras e equipamentos" },
    { id: "role-financeiro", name: "FINANCEIRO", description: "Financeiro e fiscal" },
    { id: "role-fiscal", name: "FISCAL", description: "Central fiscal e apurações" },
    { id: "role-rh", name: "RH", description: "RH, folha e treinamentos" },
    { id: "role-almoxarifado", name: "ALMOXARIFADO", description: "Estoque, EPI e ferramentas" },
  ];
  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }

  const MODULOS = ["dashboard", "comercial", "contratos", "clientes", "campo", "estoque", "financeiro", "fiscal", "rh", "sistema", "admin"];
  const ACOES = ["visualizar", "criar", "editar", "excluir"];
  const permIds: Record<string, string> = {};

  for (const modulo of MODULOS) {
    for (const acao of ACOES) {
      const permissao = await prisma.permission.upsert({
        where: { module_action: { module: modulo, action: acao } },
        update: {},
        create: { module: modulo, action: acao },
      });
      permIds[`${modulo}:${acao}`] = permissao.id;
    }
  }

  const modulosPorRole: Record<string, string[]> = {
    ADMIN: MODULOS,
    DIRETORIA: MODULOS.filter((modulo) => modulo !== "admin"),
    GESTOR: MODULOS.filter((modulo) => modulo !== "admin"),
    COMERCIAL: ["dashboard", "comercial", "clientes", "contratos"],
    OPERACIONAL: ["dashboard", "campo", "estoque", "contratos"],
    FINANCEIRO: ["dashboard", "financeiro", "fiscal"],
    FISCAL: ["dashboard", "fiscal"],
    RH: ["dashboard", "rh"],
    ALMOXARIFADO: ["dashboard", "estoque"],
  };

  for (const [roleName, modulos] of Object.entries(modulosPorRole)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) continue;
    for (const modulo of modulos) {
      for (const acao of ACOES) {
        const permissionId = permIds[`${modulo}:${acao}`];
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId } },
          update: {},
          create: { roleId: role.id, permissionId },
        });
      }
    }
  }

  if (!process.env.SEED_ADMIN_PASSWORD && process.env.NODE_ENV === "production") {
    throw new Error("SEED_ADMIN_PASSWORD é obrigatória em produção.");
  }
  const senhaInicial = process.env.SEED_ADMIN_PASSWORD || "Verdelimp@2026";
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn("⚠️  SEED_ADMIN_PASSWORD não definida — senha permitida somente em desenvolvimento.");
  }

  const admin = await prisma.user.upsert({
    where: { email: "admin@verdelimp.com.br" },
    update: {},
    create: {
      id: "usr-admin",
      name: "Administrador",
      email: "admin@verdelimp.com.br",
      passwordHash: await bcrypt.hash(senhaInicial, 12),
      active: true,
      mustChangePass: true,
      failedAttempts: 0,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: "role-admin" } },
    update: {},
    create: { userId: admin.id, roleId: "role-admin" },
  });

  const configExistente = await prisma.companyConfig.findFirst({ where: { cnpj: "30.198.776/0001-29" } });
  if (!configExistente) {
    await prisma.companyConfig.create({
      data: {
        razaoSocial: "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
        nomeFantasia: "VERDELIMP",
        cnpj: "30.198.776/0001-29",
        porte: "EPP",
        regimeTributario: "Simples Nacional",
        cnaePrincipal: "81.30-3-00",
        municipio: "Betim",
        uf: "MG",
        cep: "32685-066",
        email: "ADM@VERDELIMP.COM.BR",
        telefone: "(31) 3591-4546",
        aliqISS: 5,
        aliqINSS: 7,
        aliqIRRF: 0,
        aliqFGTS: 8,
        aliqDAS: 6.72,
      },
    });
  }

  const categorias = [
    { id: "cat-epi", name: "EPI", icon: "🦺" },
    { id: "cat-fer", name: "Ferramentas", icon: "🔧" },
    { id: "cat-com", name: "Combustível", icon: "⛽" },
    { id: "cat-mat", name: "Materiais", icon: "📦" },
  ];
  for (const categoria of categorias) {
    await prisma.inventoryCategory.upsert({
      where: { name: categoria.name },
      update: {},
      create: { ...categoria, active: true },
    });
  }

  const integracoes = [
    { name: "ViaCEP", slug: "viacep", category: "Endereços", provider: "ViaCEP", status: "ativa", isEnabled: true, baseUrl: "https://viacep.com.br/ws", description: "CEP automático" },
    { name: "BrasilAPI CNPJ", slug: "brasilapi-cnpj", category: "Fiscal", provider: "BrasilAPI", status: "ativa", isEnabled: true, baseUrl: "https://brasilapi.com.br/api/cnpj/v1", description: "Dados CNPJ" },
    { name: "PNCP", slug: "pncp", category: "Licitações", provider: "Governo Federal", status: "ativa", isEnabled: true, baseUrl: "https://pncp.gov.br/api/pncp/v1", description: "Portal Nacional de Contratações Públicas" },
    { name: "Anthropic Claude IA", slug: "anthropic-claude", category: "IA", provider: "Anthropic", status: "pendente_config", requiresAuth: true, requiresPaidApi: true, isEnabled: false, baseUrl: "https://api.anthropic.com/v1", description: "Integração de IA opcional" },
  ];
  for (const integracao of integracoes) {
    await prisma.integration.upsert({
      where: { slug: integracao.slug },
      update: { name: integracao.name, description: integracao.description, baseUrl: integracao.baseUrl },
      create: {
        ...integracao,
        requiresAuth: integracao.requiresAuth || false,
        requiresCertificate: false,
        requiresPaidApi: integracao.requiresPaidApi || false,
        totalCalls: 0,
      },
    });
  }

  if (demoPermitido) await criarDadosDemonstrativos();

  console.log("✅ Seed estrutural concluído sem dados operacionais fictícios.");
}

main()
  .catch((error) => {
    console.error("❌ Falha no seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
