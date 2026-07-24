import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { SYSTEM_NAME, SYSTEM_RELEASE, SYSTEM_VERSION } from "@/lib/system-version";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

export async function GET(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN");
  if (erro || !user) return erro;

  const formato = req.nextUrl.searchParams.get("formato") || "json";
  const modulo = req.nextUrl.searchParams.get("modulo") || "completo";
  if (!["json", "csv_financeiro"].includes(formato)) {
    return NextResponse.json({ error: "Formato de exportação inválido" }, { status: 400 });
  }
  if (!["completo", "financeiro"].includes(modulo)) {
    return NextResponse.json({ error: "Módulo de exportação inválido" }, { status: 400 });
  }

  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    if (modulo === "financeiro" || formato === "csv_financeiro") {
      const despesas = await prisma.expense.findMany({
        where: { deletedAt: null },
        orderBy: { dueDate: "desc" },
        include: { category: { select: { name: true, type: true } } },
      });
      const headers = ["Descrição", "Valor", "Vencimento", "Status", "Categoria", "Tipo", "Competência"].map(csvCell).join(";");
      const rows = despesas.map((item) => [
        item.description,
        Number(item.amount).toFixed(2).replace(".", ","),
        item.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" }),
        item.status,
        item.category?.name,
        item.category?.type,
        item.competence,
      ].map(csvCell).join(";")).join("\n");
      const response = new NextResponse(`\ufeff${headers}\n${rows}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="financeiro_${timestamp}.csv"`,
          "Cache-Control": "no-store, private",
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "EXPORT_CSV",
          module: "exportacao",
          entityType: "Expense",
          newValues: { records: despesas.length, generatedAt: new Date().toISOString() },
        },
      });
      return response;
    }

    const [
      empresa, clientes, fornecedores, funcionarios,
      contratos, propostas, medicoes,
      despesas, tributos, nfses,
      estoque, epis, veiculos,
      mobilizacoes, equipamentos, treinamentos,
      retroJobs, dedetJobs, bidPipeline,
      dossies, oportunidades,
    ] = await Promise.all([
      prisma.companyConfig.findFirst(),
      prisma.client.findMany({ where: { deletedAt: null } }),
      prisma.supplier.findMany({ where: { deletedAt: null } }),
      prisma.employee.findMany(),
      prisma.contract.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.proposal.findMany({ orderBy: { createdAt: "desc" }, include: { versions: true, items: true, teams: true } }),
      prisma.measurement.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
      prisma.expense.findMany({ where: { deletedAt: null }, orderBy: { dueDate: "desc" } }),
      prisma.fiscalTaxExpense.findMany({ orderBy: { competence: "desc" } }),
      prisma.fiscalNfse.findMany({ orderBy: { issueDate: "desc" } }),
      prisma.inventoryItem.findMany({ where: { deletedAt: null } }),
      prisma.inventoryEpiDelivery.findMany({ orderBy: { deliveryDate: "desc" } }),
      prisma.vehicle.findMany(),
      prisma.mobilization.findMany(),
      prisma.equipment.findMany({ include: { manutencoes: true, documents: true } }),
      prisma.training.findMany({ orderBy: { expiresAt: "asc" } }),
      prisma.retroJob.findMany({ orderBy: { createdAt: "desc" }, include: { despesas: true } }),
      prisma.dedetJob.findMany({ orderBy: { createdAt: "desc" }, include: { produtos: true } }),
      prisma.bidPipeline.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.serviceDossier.findMany({ orderBy: { createdAt: "desc" }, include: { compositions: true, reservations: true } }),
      prisma.opportunity.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const totalRegistros = {
      clientes: clientes.length,
      fornecedores: fornecedores.length,
      funcionarios: funcionarios.length,
      contratos: contratos.length,
      propostas: propostas.length,
      medicoes: medicoes.length,
      despesas: despesas.length,
      tributos: tributos.length,
      nfses: nfses.length,
      estoque: estoque.length,
      epis: epis.length,
      veiculos: veiculos.length,
      mobilizacoes: mobilizacoes.length,
      equipamentos: equipamentos.length,
      treinamentos: treinamentos.length,
      dossies: dossies.length,
      oportunidades: oportunidades.length,
    };

    const exportacao = {
      meta: {
        versao: SYSTEM_VERSION,
        release: SYSTEM_RELEASE,
        sistema: SYSTEM_NAME,
        tipo: "exportacao_dados",
        restauravel: false,
        aviso: "Exportação gerencial. O backup restaurável é gerado por deploy/contabo/backup.sh com pg_dump e volume de uploads.",
        exportadoEm: new Date().toISOString(),
        exportadoPor: user.email || user.name || user.id,
        empresa: empresa?.razaoSocial || "VERDELIMP",
        totalRegistros,
      },
      empresa,
      clientes,
      fornecedores,
      funcionarios,
      contratos,
      propostas,
      medicoes,
      financeiro: { despesas, tributos, nfses },
      operacional: { estoque, epis, veiculos, mobilizacoes, treinamentos },
      equipamentos,
      servicos: { retroJobs, dedetJobs },
      comercial: { bidPipeline, oportunidades, dossies },
    };

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "EXPORT_JSON",
        module: "exportacao",
        entityType: "SystemExport",
        newValues: { release: SYSTEM_RELEASE, records: Object.values(totalRegistros).reduce((sum, value) => sum + value, 0), generatedAt: exportacao.meta.exportadoEm },
      },
    });

    const response = new NextResponse(JSON.stringify(exportacao, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="verdelimp_export_${timestamp}.json"`,
        "X-Export-Records": String(Object.values(totalRegistros).reduce((sum, value) => sum + value, 0)),
        "X-System-Release": SYSTEM_RELEASE,
        "Cache-Control": "no-store, private",
      },
    });
    return response;
  } catch (error) {
    return erroInterno(error, "api/backup exportação");
  }
}
