/**
 * VERDELIMP ERP — Seed Profissional v2.2
 * Idempotente — usa upsert — não duplica ao rodar novamente
 */
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🌱 Seed Verdelimp ERP v2.2\n");

  // ── 1. PERFIS ────────────────────────────────────────
  const roles = ["ADMIN","FINANCEIRO","FISCAL","RH","OPERACIONAL","ALMOXARIFADO","COMERCIAL","LEITURA"];
  for (const name of roles) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("✓ Perfis:", roles.join(", "));

  // ── 2. USUÁRIO ADMIN ─────────────────────────────────
  const pwHash = await bcrypt.hash("Verdelimp@2026", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@verdelimp.com.br" },
    update: {},
    create: { name: "Administrador", email: "admin@verdelimp.com.br", passwordHash: pwHash, mustChangePass: true },
  });
  const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
  if (adminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: {}, create: { userId: admin.id, roleId: adminRole.id },
    });
  }

  // Usuário Giovanna (Financeiro)
  const giovanna = await prisma.user.upsert({
    where: { email: "giovanna@verdelimp.com.br" },
    update: {},
    create: { name: "Giovanna Luiza Cunha", email: "giovanna@verdelimp.com.br", passwordHash: pwHash },
  });
  console.log("✓ Usuários: admin@verdelimp.com.br | giovanna@verdelimp.com.br");

  // ── 3. EMPRESA ───────────────────────────────────────
  await prisma.companyConfig.upsert({
    where: { cnpj: "30.198.776/0001-29" },
    update: {},
    create: {
      razaoSocial: "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
      nomeFantasia: "VERDELIMP SERVIÇOS",
      cnpj: "30.198.776/0001-29",
      porte: "EPP",
      regimeTributario: "Simples Nacional",
      cnaePrincipal: "81.30-3-00",
      inscMunicipal: "ISS-BETIM-2026",
      logradouro: "R. Primeiro de Janeiro, 415",
      bairro: "Amazonas",
      municipio: "Betim",
      uf: "MG",
      cep: "32.685-066",
      email: "ADM@VERDELIMP.COM.BR",
      telefone: "(31) 3591-4546",
      aliqDAS: 6.72,
      aliqFGTS: 8.0,
      aliqINSS: 7.0,
      aliqISS: 5.0,
      aliqIRRF: 1.5,
      nomeContador: "Escritório Contábil Demo",
      emailContador: "contador@demo.com.br",
    },
  });
  console.log("✓ Empresa configurada");

  // ── 4. CATEGORIAS DE ESTOQUE ─────────────────────────
  const catEstoque = [
    { name: "Material de Limpeza", icon: "🧴", color: "#0891b2" },
    { name: "EPI", icon: "🦺", color: "#d97706" },
    { name: "Ferramentas", icon: "🔧", color: "#7c3aed" },
    { name: "Máquinas e Equipamentos", icon: "⚙️", color: "#1d4ed8" },
    { name: "Peças e Manutenção", icon: "🔩", color: "#92400e" },
    { name: "Combustíveis e Lubrificantes", icon: "⛽", color: "#dc2626" },
    { name: "Patrimônio", icon: "🏛️", color: "#1a7a4a" },
  ];
  for (const c of catEstoque) {
    await prisma.inventoryCategory.upsert({ where: { name: c.name }, update: {}, create: c });
  }
  console.log("✓ Categorias de estoque");

  // ── 5. CATEGORIAS FINANCEIRAS ────────────────────────
  const catFin = [
    { name: "Combustível", type: "operacional" },
    { name: "Materiais de Limpeza", type: "operacional" },
    { name: "EPI e Segurança", type: "operacional" },
    { name: "Ferramentas e Equipamentos", type: "operacional" },
    { name: "Salários e Encargos", type: "rh" },
    { name: "Impostos e Tributos", type: "tributario" },
    { name: "Honorários Contábeis", type: "administrativo" },
    { name: "Aluguel e Infraestrutura", type: "administrativo" },
  ];
  for (const c of catFin) {
    await prisma.expenseCategory.upsert({ where: { name: c.name }, update: {}, create: c });
  }
  console.log("✓ Categorias financeiras");

  // ── 6. CLIENTES ──────────────────────────────────────
  const clientes = [
    { cnpjCpf: "17.317.344/0001-19", name: "Prefeitura de Belo Horizonte", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA", phone: "(31) 3277-8000", email: "licitacoes@pbh.gov.br" },
    { cnpjCpf: "17.038.582/0001-53", name: "CEMIG", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA", phone: "(31) 3506-5000", email: "contatos@cemig.com.br" },
    { cnpjCpf: "28.193.570/0001-69", name: "Sanesul", category: "Público", municipio: "Campo Grande", uf: "MS", situacao: "ATIVA" },
    { cnpjCpf: "17.054.027/0001-78", name: "Copasa", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA" },
    { cnpjCpf: "25.848.716/0001-65", name: "Naturais Serviços Ambientais", category: "Privado", municipio: "São Paulo", uf: "SP", situacao: "ATIVA" },
  ];
  for (const c of clientes) {
    await prisma.client.upsert({ where: { cnpjCpf: c.cnpjCpf }, update: {}, create: c });
  }
  console.log("✓ Clientes (5)");

  // ── 7. FORNECEDORES ──────────────────────────────────
  const fornecedores = [
    { cnpj: "00.000.000/0001-00", name: "Fornecedor Demonstração Ltda", type: "Material" },
    { cnpj: "00.000.000/0001-01", name: "Loja de EPI Exemplo ME", type: "EPI" },
    { cnpj: "00.000.000/0001-02", name: "Ferramentas Alfa Comércio", type: "Ferramentas" },
    { cnpj: "00.000.000/0001-03", name: "Posto de Combustível Demo", type: "Combustível" },
  ];
  for (const f of fornecedores) {
    await prisma.supplier.upsert({ where: { cnpj: f.cnpj }, update: {}, create: f });
  }
  console.log("✓ Fornecedores (4)");

  // ── 8. FUNCIONÁRIOS ──────────────────────────────────
  const funcionarios = [
    { cpf: "112.824.616-30", name: "Abrão Felipe Boa Ventura Carvalho", role: "Operador de Roçadeira", salary: 2500, admissionDate: new Date("2023-07-22") },
    { cpf: "106.192.446-74", name: "Ana Luiza Gonçalves Ribeiro", role: "Supervisora de Obras", salary: 3500, admissionDate: new Date("2025-04-03") },
    { cpf: "099.149.826-07", name: "Gilberto Ferreira", role: "Operador de Roçadeira", salary: 2400, admissionDate: new Date("2022-06-07") },
    { cpf: "049.995.006-20", name: "José Antonio Mariano", role: "Operador de Roçadeira", salary: 2500, admissionDate: new Date("2023-05-04") },
    { cpf: "083.478.616-84", name: "Leomar Nascimento de Souza", role: "Op. Retroescavadeira", salary: 3200, admissionDate: new Date("2022-06-01") },
    { cpf: "862.297.015-96", name: "Uanderson Nunes de Jesus", role: "Auxiliar de Jardinagem", salary: 2200, admissionDate: new Date("2025-10-01") },
    { cpf: "033.540.116-37", name: "Leonardo Nascimento de Souza", role: "Motorista", salary: 2800, admissionDate: new Date("2026-04-27") },
    { cpf: "703.678.726-09", name: "Giovanna Luiza Cunha", role: "Assistente Administrativa", salary: 2600, admissionDate: new Date("2026-01-13") },
  ];
  for (const e of funcionarios) {
    await prisma.employee.upsert({ where: { cpf: e.cpf }, update: {}, create: e });
  }
  console.log("✓ Funcionários (8)");

  // ── 9. ITENS DE ALMOXARIFADO ─────────────────────────
  const catLimpeza = await prisma.inventoryCategory.findUnique({ where: { name: "Material de Limpeza" } });
  const catEpi = await prisma.inventoryCategory.findUnique({ where: { name: "EPI" } });
  const catFerr = await prisma.inventoryCategory.findUnique({ where: { name: "Ferramentas" } });
  if (catLimpeza && catEpi && catFerr) {
    const itens = [
      { internalCode: "LIM-001", description: "Detergente Profissional 5L", categoryId: catLimpeza.id, unit: "UN", currentQuantity: 48, minimumStock: 20, averageCost: 22.50 },
      { internalCode: "EPI-001", description: "Luva Nitrílica Resistente (Par)", categoryId: catEpi.id, unit: "PAR", currentQuantity: 40, minimumStock: 20, averageCost: 8.90, isEpi: true },
      { internalCode: "EPI-002", description: "Capacete de Segurança Classe A", categoryId: catEpi.id, unit: "UN", currentQuantity: 8, minimumStock: 10, averageCost: 28.00, isEpi: true, status: "atencao" },
      { internalCode: "FER-001", description: "Roçadeira a Gasolina 52cc Stihl FS220", categoryId: catFerr.id, unit: "UN", currentQuantity: 3, minimumStock: 2, averageCost: 1850.00, isTool: true, isPatrimony: true, patrimonyNumber: "PAT-2025-010", serialNumber: "SN2025010" },
      { internalCode: "FER-002", description: "Motosserra 40cm Husqvarna 450e", categoryId: catFerr.id, unit: "UN", currentQuantity: 2, minimumStock: 1, averageCost: 2450.00, isTool: true, isPatrimony: true, patrimonyNumber: "PAT-2025-011", status: "manutencao" },
    ];
    for (const item of itens) {
      await prisma.inventoryItem.upsert({ where: { internalCode: item.internalCode }, update: {}, create: item });
    }
    console.log("✓ Itens de almoxarifado (5)");
  }

  // ── 10. DESPESAS TRIBUTÁRIAS ─────────────────────────
  const despTrib = [
    { taxType: "FGTS", description: "FGTS Abril/2026", competence: "2026-04", dueDate: new Date("2026-05-07"), paymentDate: new Date("2026-05-07"), principalAmount: 1648, totalAmount: 1648, status: "pago" },
    { taxType: "DAS", description: "Simples Nacional Março/2026", competence: "2026-03", dueDate: new Date("2026-04-22"), paymentDate: new Date("2026-04-22"), principalAmount: 3642, totalAmount: 3642, status: "pago" },
    { taxType: "Alvará", description: "Alvará de Funcionamento 2026", competence: "2026-01", dueDate: new Date("2026-02-28"), paymentDate: new Date("2026-02-25"), principalAmount: 480, totalAmount: 480, status: "pago" },
  ];
  for (const d of despTrib) {
    const exists = await prisma.fiscalTaxExpense.findFirst({ where: { taxType: d.taxType, competence: d.competence } });
    if (!exists) await prisma.fiscalTaxExpense.create({ data: d });
  }
  console.log("✓ Despesas tributárias (3 históricas)");

  // ── 11. DOCUMENTOS FISCAIS ───────────────────────────
  const docsFiscais = [
    { documentType: "CND Federal", issuer: "Receita Federal", dueDate: new Date("2026-07-15"), status: "regular", responsible: "Giovanna Cunha" },
    { documentType: "CRF/FGTS", issuer: "Caixa Econômica Federal", dueDate: new Date("2026-07-31"), status: "regular", responsible: "Giovanna Cunha" },
    { documentType: "Certidão Municipal", issuer: "Pref. Betim", dueDate: new Date("2026-06-01"), status: "a_vencer", responsible: "Giovanna Cunha" },
    { documentType: "Licença Ambiental", issuer: "SEMAD/MG", dueDate: new Date("2026-03-31"), status: "vencido", responsible: "Ana Luiza Ribeiro" },
    { documentType: "Alvará de Funcionamento", issuer: "Pref. Betim", dueDate: new Date("2026-12-31"), status: "regular", responsible: "Giovanna Cunha" },
  ];
  for (const d of docsFiscais) {
    const exists = await prisma.fiscalDocument.findFirst({ where: { documentType: d.documentType, issuer: d.issuer } });
    if (!exists) await prisma.fiscalDocument.create({ data: d });
  }
  console.log("✓ Documentos fiscais (5)");

  // ── 12. NFS-e DEMONSTRATIVAS ─────────────────────────
  const cliPBH = await prisma.client.findFirst({ where: { name: { contains: "Belo Horizonte" } } });
  const nfses = [
    { number: "2026/0042", municipality: "Belo Horizonte", providerCnpj: "30.198.776/0001-29", receiverName: "Prefeitura de BH", receiverCnpj: "17.317.344/0001-19", clientId: cliPBH?.id, serviceCode: "7.10", description: "Serviços de roçada e limpeza de vias públicas", serviceValue: 18500, calculationBase: 18500, issRate: 5, issAmount: 925, issRetained: true, netAmount: 17575, issueDate: new Date("2026-04-30"), competence: "2026-04", status: "lancada" },
    { number: "2026/0041", municipality: "Belo Horizonte", providerCnpj: "30.198.776/0001-29", receiverName: "CEMIG", receiverCnpj: "17.038.582/0001-53", serviceCode: "7.11", description: "PRADA — Recuperação de áreas degradadas", serviceValue: 20000, calculationBase: 20000, issRate: 5, issAmount: 1000, issRetained: false, netAmount: 19000, issueDate: new Date("2026-04-25"), competence: "2026-04", status: "lancada" },
    { number: "2026/0040", municipality: "Belo Horizonte", providerCnpj: "30.198.776/0001-29", receiverName: "Sanesul", receiverCnpj: "28.193.570/0001-69", serviceCode: "7.11", description: "Jardinagem mensal HQ Betim", serviceValue: 8500, calculationBase: 8500, issRate: 5, issAmount: 425, issRetained: false, netAmount: 8075, issueDate: new Date("2026-04-20"), competence: "2026-04", status: "lancada" },
  ];
  for (const n of nfses) {
    const exists = await prisma.fiscalNfse.findFirst({ where: { number: n.number } });
    if (!exists) await prisma.fiscalNfse.create({ data: n });
  }
  console.log("✓ NFS-e demonstrativas (3)");

  // ── 13. INTEGRAÇÕES ──────────────────────────────────
  const integracoes = [
    { slug: "viacep", name: "ViaCEP — Consulta de CEP", category: "publica", provider: "ViaCEP", environment: "producao", status: "ativa", requiresAuth: false, baseUrl: "https://viacep.com.br/ws", isEnabled: true },
    { slug: "cnpj-brasilapi", name: "CNPJ — BrasilAPI", category: "publica", provider: "BrasilAPI", environment: "producao", status: "ativa", requiresAuth: false, baseUrl: "https://brasilapi.com.br/api/cnpj/v1", isEnabled: true },
    { slug: "ibge", name: "IBGE — Municípios e UFs", category: "publica", provider: "IBGE", environment: "producao", status: "ativa", requiresAuth: false, baseUrl: "https://servicodados.ibge.gov.br/api/v1", isEnabled: true },
    { slug: "pncp", name: "PNCP — Radar de Licitações", category: "publica", provider: "Governo Federal", environment: "producao", status: "ativa", requiresAuth: false, baseUrl: "https://pncp.gov.br/api/pncp/v1", isEnabled: true },
    { slug: "feriados", name: "Feriados Nacionais", category: "publica", provider: "BrasilAPI", environment: "producao", status: "ativa", requiresAuth: false, isEnabled: true },
    { slug: "iss-betim", name: "ISS Betim LC 33/2003", category: "fiscal", provider: "Tabela Local", environment: "producao", status: "ativa", requiresAuth: false, isEnabled: true },
    { slug: "nfe-sefaz", name: "NF-e / SEFAZ", category: "fiscal", provider: "SEFAZ Nacional", environment: "homologacao", status: "pendente_certificado", requiresAuth: true, requiresCertificate: true, isEnabled: false },
    { slug: "esocial", name: "eSocial — Preparação", category: "trabalhista", provider: "Governo Federal", environment: "producao_restrita", status: "pendente_certificado", requiresAuth: true, requiresCertificate: true, isEnabled: false },
    { slug: "claude-ia", name: "Anthropic Claude — IA", category: "ia", provider: "Anthropic", environment: "producao", status: process.env.ANTHROPIC_API_KEY ? "ativa" : "pendente_config", requiresAuth: true, requiresPaidApi: true, baseUrl: "https://api.anthropic.com/v1", isEnabled: !!process.env.ANTHROPIC_API_KEY },
  ];
  for (const i of integracoes) {
    await prisma.integration.upsert({ where: { slug: i.slug }, update: {}, create: i });
  }
  console.log("✓ Integrações (9)");

  console.log("\n✅ Seed concluído!\n");
  console.log("═══════════════════════════════════════");
  console.log("  Credenciais de acesso:");
  console.log("  admin@verdelimp.com.br / Verdelimp@2026");
  console.log("  ⚠️  Alterar senha no primeiro login");
  console.log("═══════════════════════════════════════\n");
}

main()
  .catch((e) => { console.error("❌ Erro no seed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
