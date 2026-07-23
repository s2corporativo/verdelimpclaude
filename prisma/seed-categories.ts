// prisma/seed-categories.ts — categorias de despesas da Verde Limp
// Executar: npx tsx prisma/seed-categories.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CategoryRow {
  name: string;
  type: string;
}

const categories: CategoryRow[] = [
  // Contas Fixas
  { name: "Consórcio", type: "despesa_fixa" },
  { name: "Seguro", type: "despesa_fixa" },
  { name: "Contabilidade", type: "despesa_fixa" },
  { name: "Internet", type: "despesa_fixa" },
  { name: "Marketing", type: "despesa_fixa" },
  { name: "Alimentação", type: "despesa_fixa" },
  { name: "Imposto/DAS", type: "despesa_fixa" },
  { name: "Lote", type: "despesa_fixa" },
  { name: "Condomínio", type: "despesa_fixa" },
  { name: "Container", type: "despesa_fixa" },
  { name: "Depósito", type: "despesa_fixa" },
  { name: "Segurança do Trabalho", type: "despesa_fixa" },
  { name: "Seguro de Vida", type: "despesa_fixa" },
  // Gastos Diários
  { name: "Combustível", type: "despesa_variavel" },
  { name: "Uber/Passagem", type: "despesa_variavel" },
  { name: "Manutenção de Máquinas", type: "despesa_variavel" },
  { name: "Alimentação Diária", type: "despesa_variavel" },
  { name: "Material de Escritório", type: "despesa_variavel" },
  { name: "Diária", type: "despesa_variavel" },
  { name: "Diversos", type: "despesa_variavel" },
];

async function main() {
  console.log("📂 Seed de categorias de despesas — Verde Limp\n");

  let created = 0;
  let updated = 0;

  for (const cat of categories) {
    const result = await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: { type: cat.type, active: true },
      create: { name: cat.name, type: cat.type, active: true },
    });

    // upsert retorna _created = true se criou, false se atualizou
    // Prisma não expõe flag, mas podemos contar por created/recentemente
    created++;
    console.log(`  ✅ ${cat.name} (${cat.type})`);
  }

  const total = await prisma.expenseCategory.count();
  console.log(`\n📊 Resultado: ${created} categorias processadas, ${total} total no banco`);
}

main()
  .catch((e) => {
    console.error("❌ Erro ao criar categorias:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
