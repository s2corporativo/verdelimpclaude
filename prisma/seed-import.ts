// prisma/seed-import.ts — importa funcionários reais via SQL raw (idempotente)
// Executar: npx tsx prisma/seed-import.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface EmployeeRow {
  name: string;
  cpf: string;
  role: string;
  admissionDate: string;
  salary: number;
  pix: string;
  bank: string;
}

const employees: EmployeeRow[] = [
  { name: "LEOMAR NASCIMENTO DE SOUZA", cpf: "083.478.616-84", role: "OPERADOR DE RETROESCAVADEIRA", admissionDate: "2022-06-01", salary: 2200, pix: "(31) 9 8824-2112", bank: "NUBANK" },
  { name: "GILBERTO FERREIRA", cpf: "991.498.267-00", role: "OPERADOR DE ROÇADEIRA", admissionDate: "2022-06-07", salary: 1957.35, pix: "991.498.267-00", bank: "CAIXA" },
  { name: "JOSÉ ANTONIO MARIANO", cpf: "049.995.006-20", role: "OPERADOR DE ROÇADEIRA", admissionDate: "2023-05-04", salary: 1957.35, pix: "(31) 9 9520-2351", bank: "CAIXA" },
  { name: "CLEITON DOS SANTOS BARBOSA", cpf: "152.301.336-27", role: "OPERADOR DE ROÇADEIRA", admissionDate: "2026-04-08", salary: 1235.35, pix: "(31) 9 9271-7796", bank: "INTER" },
  { name: "GIOVANNA LUIZA CUNHA", cpf: "703.678.726-09", role: "ASSISTENTE ADMINISTRATIVA", admissionDate: "2026-01-13", salary: 1662.32, pix: "(31) 9 9423-4579", bank: "INTER" },
  { name: "PABLO MARQUES DA SILVA", cpf: "701.875.196-92", role: "OPERADOR DE ROÇADEIRA", admissionDate: "2025-05-29", salary: 1957.35, pix: "lucinetettt@gmail.com", bank: "NUBANK" },
  { name: "MARCELO FERREIRA", cpf: "068.878.416-06", role: "AUXILIAR DE JARDINAGEM", admissionDate: "2025-06-11", salary: 1200.05, pix: "068.878.416-06", bank: "NUBANK" },
  { name: "JHONATAN PEREIRA FAGUNDES", cpf: "023.005.316-58", role: "OPERADOR DE ROÇADEIRA", admissionDate: "2025-06-17", salary: 1586.95, pix: "(31) 9 9224-0423", bank: "NUBANK" },
];

function genId(): string {
  return "emp-" + Math.random().toString(36).slice(2, 10);
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

async function main() {
  console.log("📥 Importação de funcionários — Verde Limp\n");

  let inserted = 0;
  let skipped = 0;

  for (const emp of employees) {
    const id = genId();
    const sql = `
      INSERT INTO "Employee" (
        "id", "name", "cpf", "role", "admissionDate", "salary",
        "bankAccount", "bank",
        "active", "status", "dependentes", "insalubridadeGrau", "periculosidade",
        "createdAt", "updatedAt"
      ) VALUES (
        '${id}',
        '${escapeSql(emp.name)}',
        '${escapeSql(emp.cpf)}',
        '${escapeSql(emp.role)}',
        '${emp.admissionDate}'::timestamp,
        ${emp.salary},
        '${escapeSql(emp.pix)}',
        '${escapeSql(emp.bank)}',
        true,
        'ativo',
        0,
        0,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("cpf") DO NOTHING
    `;

    const result = await prisma.$executeRawUnsafe(sql);
    if (result === 1) {
      inserted++;
      console.log(`  ✅ ${emp.name} — inserido`);
    } else {
      skipped++;
      console.log(`  ⏭️  ${emp.name} — já existe (CPF duplicado)`);
    }
  }

  console.log(`\n📊 Resultado: ${inserted} inserido(s), ${skipped} pulado(s), ${employees.length} total`);
}

main()
  .catch((e) => {
    console.error("❌ Erro na importação:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
