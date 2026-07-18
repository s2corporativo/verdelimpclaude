
// Calcula INSS (tabela progressiva por faixas) + IRRF + líquido por funcionário.
// A lógica de cálculo vive em src/lib/folha.ts (pura e coberta por testes).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { linhaFolha, totaisDe, AVISO_FOLHA } from "@/lib/folha";
import { exigirPapel, erroInterno } from "@/lib/authz";

// Sempre executar no servidor — nunca pré-renderizar com dados demo no build
export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const funcionarios = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    if (!funcionarios.length) { const folha = DEMO_EMPLOYEES.map(f => linhaFolha(f)); return NextResponse.json({ folha, totais: totaisDe(folha), _demo: true }); }
    const folha = funcionarios.map(f => linhaFolha(f as any));
    return NextResponse.json({ folha, totais: totaisDe(folha), aviso: AVISO_FOLHA });
  } catch {
    const folha = DEMO_EMPLOYEES.map(f => linhaFolha(f));
    return NextResponse.json({ folha, totais: totaisDe(folha), _demo: true });
  }
}

// Recalcula a folha aplicando horas extras por funcionário no mês.
// body: { extras: { [employeeId]: { he50, he100 } } }
export async function POST(req: Request) {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const { extras } = await req.json().catch(() => ({ extras: {} }));
    const funcionarios = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    const base = funcionarios.length ? funcionarios : DEMO_EMPLOYEES;
    const folha = base.map((f: any) => linhaFolha(f, extras?.[f.id]));
    return NextResponse.json({ folha, totais: totaisDe(folha), _demo: !funcionarios.length, aviso: AVISO_FOLHA });
  } catch (e) {
    return erroInterno(e, "api/folha-detalhada POST");
  }
}

// Demo passa pelos MESMOS cálculos da folha real (antes tinha INSS flat obsoleto).
const DEMO_EMPLOYEES = [
  { id:"e1", name:"Abrão Felipe",      role:"Op. Roçadeira",   salary:2500 },
  { id:"e2", name:"Ana Luiza Ribeiro", role:"Supervisora",     salary:3500 },
  { id:"e3", name:"Gilberto Ferreira", role:"Op. Roçadeira",   salary:2400 },
  { id:"e4", name:"José Antonio",      role:"Op. Roçadeira",   salary:2500 },
  { id:"e5", name:"Leomar Souza",      role:"Op. Retroescav.", salary:3200 },
  { id:"e6", name:"Uanderson Nunes",   role:"Aux. Jardinagem", salary:2200 },
  { id:"e7", name:"Leonardo Souza",    role:"Motorista",       salary:2800 },
  { id:"e8", name:"Giovanna Cunha",    role:"Assistente Adm.", salary:2600 },
];
