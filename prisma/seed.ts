// prisma/seed.ts — dados iniciais da Verdelimp
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // Roles
  await prisma.role.upsert({ where: { name: "ADMIN" }, update: {}, create: { id: "role-admin", name: "ADMIN", description: "Administrador completo" } });
  await prisma.role.upsert({ where: { name: "GESTOR" }, update: {}, create: { id: "role-gestor", name: "GESTOR", description: "Gestor operacional" } });

  // Usuários
  const hash = await bcrypt.hash("Verdelimp@2026", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@verdelimp.com.br" },
    update: {},
    create: { id: "usr-admin", name: "Administrador", email: "admin@verdelimp.com.br", passwordHash: hash, active: true, mustChangePass: true, failedAttempts: 0 },
  });
  const giovanna = await prisma.user.upsert({
    where: { email: "giovanna@verdelimp.com.br" },
    update: {},
    create: { id: "usr-giovanna", name: "Giovanna Cunha", email: "giovanna@verdelimp.com.br", passwordHash: hash, active: true, mustChangePass: true, failedAttempts: 0 },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: "usr-admin", roleId: "role-admin" } }, update: {}, create: { userId: "usr-admin", roleId: "role-admin" } });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: "usr-giovanna", roleId: "role-gestor" } }, update: {}, create: { userId: "usr-giovanna", roleId: "role-gestor" } });

  // Empresa
  const cfgExistente = await prisma.companyConfig.findFirst({ where: { cnpj: "30.198.776/0001-29" } });
  if (!cfgExistente) {
    await prisma.companyConfig.create({ data: { razaoSocial: "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA", nomeFantasia: "VERDELIMP", cnpj: "30.198.776/0001-29", porte: "EPP", regimeTributario: "Simples Nacional", cnaePrincipal: "81.30-3-00", municipio: "Betim", uf: "MG", cep: "32685-066", email: "ADM@VERDELIMP.COM.BR", telefone: "(31) 3591-4546", aliqIss: 5, aliqInss: 7, aliqIrrf: 0, aliqFgts: 8, aliqDas: 6.72 } });
  }

  // Funcionários
  const funcs = [
    { id:"emp-1", name:"Abrão Felipe", role:"Operador de Roçadeira", cpf:"111.111.111-11", salary:2500 },
    { id:"emp-2", name:"Ana Luiza Ribeiro", role:"Supervisora de Obras", cpf:"222.222.222-22", salary:3500 },
    { id:"emp-3", name:"Gilberto Ferreira", role:"Operador de Roçadeira", cpf:"333.333.333-33", salary:2400 },
    { id:"emp-4", name:"José Antonio Mariano", role:"Operador de Roçadeira", cpf:"444.444.444-44", salary:2500 },
    { id:"emp-5", name:"Leomar Souza", role:"Operador de Retroescavadeira", cpf:"555.555.555-55", salary:3200 },
    { id:"emp-6", name:"Uanderson Nunes", role:"Auxiliar de Jardinagem", cpf:"666.666.666-66", salary:2200 },
    { id:"emp-7", name:"Leonardo Souza", role:"Motorista", cpf:"777.777.777-77", salary:2800 },
    { id:"emp-8", name:"Giovanna Cunha", role:"Assistente Administrativa", cpf:"888.888.888-88", salary:2600 },
  ];
  for (const f of funcs) {
    await prisma.employee.upsert({ where: { cpf: f.cpf }, update: {}, create: { ...f, admissionDate: new Date("2023-01-01"), active: true, status: "ativo" } });
  }

  // Veículos
  const veiculos = [
    { id:"veh-1", plate:"QWE-1234", model:"Toyota Hilux Cabine Dupla", type:"Pickup", year:2025 },
    { id:"veh-2", plate:"ASD-5678", model:"Iveco Daily Carroceria", type:"Caminhao", year:2025 },
    { id:"veh-3", plate:"ZXC-9012", model:"Volkswagen Gol 1.0", type:"Leve", year:2024 },
  ];
  for (const v of veiculos) {
    await prisma.vehicle.upsert({ where: { plate: v.plate }, update: {}, create: { ...v, active: true } });
  }

  // Categorias de estoque
  const cats = [{ id:"cat-epi",name:"EPI",icon:"🦺"},{id:"cat-fer",name:"Ferramentas",icon:"🔧"},{id:"cat-com",name:"Combustível",icon:"⛽"},{id:"cat-mat",name:"Materiais",icon:"📦"}];
  for (const c of cats) {
    await prisma.inventoryCategory.upsert({ where: { name: c.name }, update: {}, create: { ...c, active: true } });
  }

  // Integrações
  const integracoes = [
    { name:"ViaCEP", slug:"viacep", category:"Endereços", provider:"ViaCEP", status:"ativa", isEnabled:true, baseUrl:"https://viacep.com.br/ws", description:"CEP automático" },
    { name:"BrasilAPI CNPJ", slug:"brasilapi-cnpj", category:"Fiscal", provider:"BrasilAPI", status:"ativa", isEnabled:true, baseUrl:"https://brasilapi.com.br/api/cnpj/v1", description:"Dados CNPJ" },
    { name:"PNCP", slug:"pncp", category:"Licitações", provider:"Governo Federal", status:"ativa", isEnabled:true, baseUrl:"https://pncp.gov.br/api/pncp/v1", description:"Portal Contratações" },
    { name:"Anthropic Claude IA", slug:"anthropic-claude", category:"IA", provider:"Anthropic", status:"ativa", requiresAuth:true, requiresPaidApi:true, isEnabled:true, baseUrl:"https://api.anthropic.com/v1", description:"IA do sistema" },
  ];
  for (const i of integracoes) {
    await prisma.integration.upsert({ where: { slug: i.slug }, update: {}, create: { ...i, requiresAuth: i.requiresAuth||false, requiresCertificate: false, requiresPaidApi: i.requiresPaidApi||false, totalCalls: 0 } });
  }

  console.log("✅ Seed concluído!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
