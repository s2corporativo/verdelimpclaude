import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const STATUS = ["previsto", "em_aberto", "pago", "vencido", "cancelado"] as const;
const ExpenseSchema = z.object({
  description: z.string().trim().min(2, "Descrição obrigatória").max(250),
  amount: z.coerce.number().positive("Valor deve ser maior que zero").max(9999999999999.99),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vencimento inválido"),
  paidAt: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pagamento inválido"), z.literal("")]).optional().nullable(),
  status: z.enum(STATUS).optional().default("em_aberto"),
  categoryId: z.string().trim().optional().nullable(),
  categoryName: z.string().trim().max(120).optional().nullable(),
  supplierId: z.string().trim().optional().nullable(),
  competence: z.string().trim().max(30).optional().nullable(),
  receiptPath: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

function localDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "FINANCEIRO", "FISCAL");
  if (erro) return erro;

  try {
    const status = req.nextUrl.searchParams.get("tipo");
    const competence = req.nextUrl.searchParams.get("competencia")?.trim();
    const search = req.nextUrl.searchParams.get("q")?.trim();
    if (status && !STATUS.includes(status as typeof STATUS[number])) {
      return NextResponse.json({ error: "Situação financeira inválida" }, { status: 400 });
    }

    const where: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(competence ? { competence } : {}),
      ...(search ? { description: { contains: search, mode: "insensitive" } } : {}),
    };

    const [data, expenseTotals, nfseTotals] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
        take: 500,
        include: { category: true, supplier: true },
      }),
      prisma.expense.findMany({
        where: { deletedAt: null, status: { not: "cancelado" } },
        select: { amount: true, category: { select: { type: true } } },
      }),
      prisma.fiscalNfse.aggregate({
        where: { status: { notIn: ["cancelada", "cancelado"] } },
        _sum: { serviceValue: true, netAmount: true },
      }),
    ]);

    const receitaManual = expenseTotals
      .filter((item) => item.category?.type === "receita")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const totalDespesas = expenseTotals
      .filter((item) => item.category?.type !== "receita")
      .reduce((sum, item) => sum + Number(item.amount), 0);
    const receitaNfse = Number(nfseTotals._sum.serviceValue || 0);
    const receitaLiquidaNfse = Number(nfseTotals._sum.netAmount || 0);
    const totalReceitas = receitaNfse + receitaManual;

    return NextResponse.json({
      data,
      total: data.length,
      empty: data.length === 0,
      totalReceitas,
      receitaNfse,
      receitaLiquidaNfse,
      receitaManual,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      criterio: "Valores cancelados são excluídos. Receita considera NFS-e e lançamentos manuais classificados como receita.",
    });
  } catch (error) {
    return erroInterno(error, "api/financeiro GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "FINANCEIRO");
  if (erro || !user) return erro;

  try {
    const parsed = ExpenseSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Lançamento inválido", details: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;
    const dueDate = localDate(body.dueDate);
    const paidAt = body.paidAt ? localDate(body.paidAt) : null;
    if (!dueDate || (body.paidAt && !paidAt)) return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    if (body.status === "pago" && !paidAt) return NextResponse.json({ error: "Informe a data do pagamento" }, { status: 400 });

    let categoryId = body.categoryId || null;
    if (categoryId) {
      const category = await prisma.expenseCategory.findFirst({ where: { id: categoryId, active: true }, select: { id: true } });
      if (!category) return NextResponse.json({ error: "Categoria não encontrada ou inativa" }, { status: 422 });
    } else if (body.categoryName) {
      const category = await prisma.expenseCategory.findFirst({ where: { name: { equals: body.categoryName, mode: "insensitive" }, active: true } });
      if (!category) return NextResponse.json({ error: "Categoria informada não está cadastrada" }, { status: 422 });
      categoryId = category.id;
    }

    if (body.supplierId) {
      const supplier = await prisma.supplier.findFirst({ where: { id: body.supplierId, deletedAt: null, active: true }, select: { id: true } });
      if (!supplier) return NextResponse.json({ error: "Fornecedor não encontrado ou inativo" }, { status: 422 });
    }

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          description: body.description,
          amount: body.amount,
          dueDate,
          paidAt,
          status: body.status,
          categoryId,
          supplierId: body.supplierId || null,
          competence: body.competence || body.dueDate.slice(0, 7),
          receiptPath: body.receiptPath || null,
          notes: body.notes || null,
        },
        include: { category: true, supplier: true },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", module: "financeiro", entityType: "Expense", entityId: created.id, newValues: auditJson(created) },
      });
      return created;
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return erroInterno(error, "api/financeiro POST");
  }
}
