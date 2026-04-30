
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competencia = searchParams.get("competencia") || new Date().toISOString().slice(0,7);
  try {
    const [nfses, tributos, folha, despesas] = await Promise.all([
      prisma.fiscalNfse.findMany({ where: { competence: competencia } }),
      prisma.fiscalTaxExpense.findMany({ where: { competence: competencia } }),
      prisma.employee.findMany({ where: { active: true }, select: { name: true, role: true, salary: true } }),
      prisma.expense.findMany({ where: { competence: competencia, deletedAt: null }, include: { category: { select: { name: true } } } }),
    ]);
    const faturamento = nfses.reduce((s,n)=>s+Number(n.serviceValue),0);
    const totalTributos = tributos.reduce((s,t)=>s+Number(t.totalAmount),0);
    const totalFolha = folha.reduce((s,f)=>s+Number(f.salary),0);
    const totalDesp = despesas.reduce((s,d)=>s+Number(d.amount),0);
    return NextResponse.json({ competencia, faturamento, nfses, tributos, folha, despesas, totalTributos, totalFolha, totalDesp, margem: faturamento - totalTributos - totalFolha - totalDesp, _demo: false });
  } catch {
    return NextResponse.json({ competencia, faturamento: 57000, nfses: [{number:"2026/0042",receiverName:"PBH",serviceValue:18500},{number:"2026/0041",receiverName:"CEMIG",serviceValue:20000},{number:"2026/0040",receiverName:"Sanesul",serviceValue:8500},{number:"2026/0039",receiverName:"Copasa",serviceValue:10000}], tributos: [{taxType:"DAS",totalAmount:3830},{taxType:"FGTS",totalAmount:1648},{taxType:"INSS",totalAmount:1442},{taxType:"ISS",totalAmount:950}], folha: [{name:"Equipe (8 colaboradores)",salary:20600}], despesas: [], totalTributos: 7870, totalFolha: 20600, totalDesp: 4200, margem: 24330, _demo: true });
  }
}
