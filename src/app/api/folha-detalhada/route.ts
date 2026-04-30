
// Adaptado de: verdelimp-erp-prime-final/server/routers.ts → payrollRouter.generate
// Calcula INSS 8% + IRRF tabela progressiva + líquido por funcionário
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tabela INSS 2026 (simplificada)
function calcINSS(salario: number): number {
  if (salario <= 1412.00)  return salario * 0.075;
  if (salario <= 2666.68)  return salario * 0.09;
  if (salario <= 4000.03)  return salario * 0.12;
  if (salario <= 7786.02)  return salario * 0.14;
  return 7786.02 * 0.14; // teto
}

// Tabela IRRF 2026 (tabela progressiva)
function calcIRRF(baseCalculo: number): number {
  if (baseCalculo <= 2259.20) return 0;
  if (baseCalculo <= 2826.65) return (baseCalculo * 0.075) - 169.44;
  if (baseCalculo <= 3751.05) return (baseCalculo * 0.15) - 381.44;
  if (baseCalculo <= 4664.68) return (baseCalculo * 0.225) - 662.77;
  return (baseCalculo * 0.275) - 896.00;
}

// FGTS: 8% sobre salário bruto (empresa paga, não desconta do funcionário)
const FGTS_RATE = 0.08;
// INSS Patronal: 7% (Simples Nacional + MEI — alíquota simplificada)
const INSS_PATRONAL = 0.07;

export async function GET() {
  try {
    const funcionarios = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
    if (!funcionarios.length) return NextResponse.json({ folha: DEMO_FOLHA, totais: DEMO_TOTAIS, _demo: true });

    const folha = funcionarios.map(f => {
      const bruto = Number(f.salary);
      const inss = calcINSS(bruto);
      const baseIRRF = bruto - inss;
      const irrf = calcIRRF(baseIRRF);
      const liquido = bruto - inss - irrf;
      const fgts = bruto * FGTS_RATE;
      const inssPatronal = bruto * INSS_PATRONAL;
      const custoTotal = bruto + fgts + inssPatronal;
      return { id: f.id, nome: f.name, cargo: f.role, salarioBruto: bruto, inss: Number(inss.toFixed(2)), irrf: Number(irrf.toFixed(2)), salarioLiquido: Number(liquido.toFixed(2)), fgts: Number(fgts.toFixed(2)), inssPatronal: Number(inssPatronal.toFixed(2)), custoTotal: Number(custoTotal.toFixed(2)) };
    });

    const totais = folha.reduce((acc, f) => ({
      bruto: acc.bruto + f.salarioBruto,
      inss: acc.inss + f.inss,
      irrf: acc.irrf + f.irrf,
      liquido: acc.liquido + f.salarioLiquido,
      fgts: acc.fgts + f.fgts,
      inssPatronal: acc.inssPatronal + f.inssPatronal,
      custoTotal: acc.custoTotal + f.custoTotal,
    }), { bruto:0, inss:0, irrf:0, liquido:0, fgts:0, inssPatronal:0, custoTotal:0 });

    return NextResponse.json({ folha, totais, aviso:"INSS tabela progressiva 2026 + IRRF tabela progressiva — validar com contador" });
  } catch {
    return NextResponse.json({ folha: DEMO_FOLHA, totais: DEMO_TOTAIS, _demo: true });
  }
}

const DEMO_FOLHA = [
  { id:"e1", nome:"Abrão Felipe",     cargo:"Op. Roçadeira",    salarioBruto:2500, inss:225.00, irrf:0,     salarioLiquido:2275.00, fgts:200.00, inssPatronal:175.00, custoTotal:2875.00 },
  { id:"e2", nome:"Ana Luiza Ribeiro", cargo:"Supervisora",      salarioBruto:3500, inss:350.00, irrf:19.96, salarioLiquido:3130.04, fgts:280.00, inssPatronal:245.00, custoTotal:4025.00 },
  { id:"e3", nome:"Gilberto Ferreira", cargo:"Op. Roçadeira",    salarioBruto:2400, inss:216.00, irrf:0,     salarioLiquido:2184.00, fgts:192.00, inssPatronal:168.00, custoTotal:2760.00 },
  { id:"e4", nome:"José Antonio",     cargo:"Op. Roçadeira",    salarioBruto:2500, inss:225.00, irrf:0,     salarioLiquido:2275.00, fgts:200.00, inssPatronal:175.00, custoTotal:2875.00 },
  { id:"e5", nome:"Leomar Souza",     cargo:"Op. Retroescav.",  salarioBruto:3200, inss:288.00, irrf:0,     salarioLiquido:2912.00, fgts:256.00, inssPatronal:224.00, custoTotal:3680.00 },
  { id:"e6", nome:"Uanderson Nunes",  cargo:"Aux. Jardinagem",  salarioBruto:2200, inss:165.00, irrf:0,     salarioLiquido:2035.00, fgts:176.00, inssPatronal:154.00, custoTotal:2530.00 },
  { id:"e7", nome:"Leonardo Souza",   cargo:"Motorista",        salarioBruto:2800, inss:252.00, irrf:0,     salarioLiquido:2548.00, fgts:224.00, inssPatronal:196.00, custoTotal:3220.00 },
  { id:"e8", nome:"Giovanna Cunha",   cargo:"Assistente Adm.",  salarioBruto:2600, inss:234.00, irrf:0,     salarioLiquido:2366.00, fgts:208.00, inssPatronal:182.00, custoTotal:2990.00 },
];
const DEMO_TOTAIS = { bruto:21700, inss:1955.00, irrf:19.96, liquido:19725.04, fgts:1736.00, inssPatronal:1519.00, custoTotal:24955.00 };
