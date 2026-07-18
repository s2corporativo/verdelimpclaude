// src/app/api/backup/route.ts
// Exporta todos os dados do sistema em JSON estruturado para download/Google Drive
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPapel } from "@/lib/authz";

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN");
  if (erro) return erro;
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
      });
      const headers = "Descrição;Valor;Vencimento;Status;Categoria;Tipo;Competência\n";
      const rows = despesas.map(e =>
        `"${e.description||""}";"${Number(e.amount).toFixed(2).replace(".",",")}";"${e.dueDate ? new Date(e.dueDate).toLocaleDateString("pt-BR") : ""}";"${e.status||""}";"${e.category?.name||""}";"${e.category?.type||""}";"${e.competence||""}"`
      ).join("\n");
      return new NextResponse(headers + rows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="financeiro_${timestamp}.csv"`,
        },
      });
    }

    // Exportação JSON completa — SEM limites `take`: os antigos cortes
    // (500 clientes, 200 contratos...) perdiam registros silenciosamente e
    // faziam a "exportação completa" mentir. O backup de verdade (restore de
    // desastre) é o pg_dump + tar de uploads do deploy/contabo/backup.sh —
    // este endpoint é uma exportação de dados para conferência/Drive.
    const [
      empresa, clientes, fornecedores, funcionarios,
      contratos, propostas, medicoes,
      despesas, tributos, nfses,
      estoque, epis, veiculos,
      mobilizacoes, equipamentos, treinamentos,
      retroJobs, dedetJobs, bidPipeline,
    ] = await Promise.all([
      prisma.companyConfig.findFirst(),
      prisma.client.findMany({ where: { deletedAt: null } }),
      prisma.supplier.findMany({ where: { deletedAt: null } }),
      prisma.employee.findMany({ where: { active: true } }),
      prisma.contract.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.proposal.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.measurement.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
      prisma.expense.findMany({ orderBy: { dueDate: "desc" } }),
      prisma.fiscalTaxExpense.findMany({ orderBy: { competence: "desc" } }),
      prisma.fiscalNfse.findMany({ orderBy: { issueDate: "desc" } }),
      prisma.inventoryItem.findMany({ where: { deletedAt: null } }),
      prisma.inventoryEpiDelivery.findMany({ orderBy: { deliveryDate: "desc" } }),
      prisma.vehicle.findMany({ where: { active: true } }),
      prisma.mobilization.findMany(),
      prisma.equipment.findMany({ where: { ativo: true }, include: { manutencoes: true } }),
      prisma.training.findMany({ orderBy: { expiresAt: "asc" } }),
      prisma.retroJob.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.dedetJob.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.bidPipeline.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const backup = {
      meta: {
        versao: "2.2",
        sistema: "Verdelimp ERP",
        tipo: "exportacao_dados", // backup de desastre = pg_dump (deploy/contabo/backup.sh)
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
  } catch (e) {
    console.error("[api/backup]", e);
    return NextResponse.json({ error: "Falha na exportação — veja os logs do servidor." }, { status: 500 });
  }
}
