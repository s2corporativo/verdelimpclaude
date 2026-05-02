// src/app/api/backup/route.ts
// Exporta todos os dados do sistema em JSON estruturado para download/Google Drive
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const formato = searchParams.get("formato") || "json"; // json | csv_financeiro
  const modulo = searchParams.get("modulo") || "completo";

  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    if (modulo === "financeiro" || formato === "csv_financeiro") {
      // CSV de lançamentos financeiros
      const despesas = await prisma.expense.findMany({
        orderBy: { dueDate: "desc" },
        include: { category: { select: { name: true, type: true } } },
        take: 5000,
      });
      const headers = "Descrição;Valor;Vencimento;Status;Categoria;Tipo;Competência\n";
      const rows = despesas.map(e =>
        `"${e.description||""}";"${Number(e.amount).toFixed(2).replace(".",",")"}";"${e.dueDate ? new Date(e.dueDate).toLocaleDateString("pt-BR") : ""}";"${e.status||""}";"${e.category?.name||""}";"${e.category?.type||""}";"${e.competence||""}"`
      ).join("\n");
      return new NextResponse(headers + rows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="financeiro_${timestamp}.csv"`,
        },
      });
    }

    // Backup JSON completo
    const [
      empresa, clientes, fornecedores, funcionarios,
      contratos, propostas, medicoes,
      despesas, tributos, nfses,
      estoque, epis, veiculos,
      mobilizacoes, equipamentos, treinamentos,
      retroJobs, dedetJobs, bidPipeline,
    ] = await Promise.all([
      prisma.companyConfig.findFirst(),
      prisma.client.findMany({ where: { deletedAt: null }, take: 500 }),
      prisma.supplier.findMany({ where: { deletedAt: null }, take: 200 }),
      prisma.employee.findMany({ where: { active: true } }),
      prisma.contract.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.proposal.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.measurement.findMany({ orderBy: { createdAt: "desc" }, take: 500, include: { items: true } }),
      prisma.expense.findMany({ orderBy: { dueDate: "desc" }, take: 2000 }),
      prisma.fiscalTaxExpense.findMany({ orderBy: { competence: "desc" }, take: 1000 }),
      prisma.fiscalNfse.findMany({ orderBy: { issueDate: "desc" }, take: 500 }),
      prisma.inventoryItem.findMany({ where: { deletedAt: null } }),
      prisma.inventoryEpiDelivery.findMany({ orderBy: { deliveryDate: "desc" }, take: 500 }),
      prisma.vehicle.findMany({ where: { active: true } }),
      prisma.mobilization.findMany({ where: { status: "ativa" } }),
      prisma.equipment.findMany({ where: { ativo: true }, include: { manutencoes: { take: 10 } } }),
      prisma.training.findMany({ orderBy: { expiresAt: "asc" }, take: 500 }),
      prisma.retroJob.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.dedetJob.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
      prisma.bidPipeline.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    ]);

    const backup = {
      meta: {
        versao: "2.2",
        sistema: "Verdelimp ERP",
        exportadoEm: new Date().toISOString(),
        empresa: empresa?.razaoSocial || "VERDELIMP",
        totalRegistros: {
          clientes: clientes.length, funcionarios: funcionarios.length,
          contratos: contratos.length, propostas: propostas.length,
          despesas: despesas.length, tributos: tributos.length,
          estoque: estoque.length,
        },
      },
      empresa, clientes, fornecedores, funcionarios,
      contratos, propostas, medicoes,
      financeiro: { despesas, tributos, nfses },
      operacional: { estoque, epis, veiculos, mobilizacoes, treinamentos },
      equipamentos,
      servicos: { retroJobs, dedetJobs },
      comercial: { bidPipeline },
    };

    const json = JSON.stringify(backup, null, 2);
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="verdelimp_backup_${timestamp}.json"`,
        "X-Backup-Records": String(Object.values(backup.meta.totalRegistros).reduce((s, v) => s + v, 0)),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
