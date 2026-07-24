import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const ConsultaSchema = z.object({
  q: z.string().trim().max(120).optional(),
  criticos: z.enum(["true", "false"]).optional(),
});

const MovimentoSchema = z.object({
  action: z.literal("movimentar"),
  itemId: z.string().trim().min(1),
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.coerce.number().positive().max(1_000_000),
  motivo: z.string().trim().min(3).max(300),
  unitCost: z.coerce.number().nonnegative().max(10_000_000).optional(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

const ItemSchema = z.object({
  description: z.string().trim().min(2).max(250),
  unit: z.string().trim().min(1).max(30),
  categoryId: z.string().trim().min(1),
  internalCode: z.string().trim().min(2).max(60).optional().nullable(),
  itemType: z.string().trim().max(60).optional(),
  brand: z.string().trim().max(120).optional().nullable(),
  currentQuantity: z.coerce.number().nonnegative().max(1_000_000).default(0),
  minimumStock: z.coerce.number().nonnegative().max(1_000_000).default(0),
  location: z.string().trim().max(200).optional().nullable(),
  averageCost: z.coerce.number().nonnegative().max(10_000_000).default(0),
  isEpi: z.coerce.boolean().default(false),
  isTool: z.coerce.boolean().default(false),
  isPatrimony: z.coerce.boolean().default(false),
  patrimonyNumber: z.string().trim().max(80).optional().nullable(),
  serialNumber: z.string().trim().max(120).optional().nullable(),
});

function statusEstoque(saldo: number, minimo: number) {
  if (saldo <= 0 && minimo > 0) return "critico";
  if (saldo <= minimo) return "atencao";
  return "regular";
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "ALMOXARIFADO", "OPERACAO", "GESTOR", "FINANCEIRO");
  if (erro) return erro;

  try {
    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const validacao = ConsultaSchema.safeParse(params);
    if (!validacao.success) {
      return NextResponse.json({ error: "Filtros inválidos." }, { status: 400 });
    }

    const items = await prisma.inventoryItem.findMany({
      where: {
        active: true,
        deletedAt: null,
        ...(validacao.data.q ? {
          OR: [
            { description: { contains: validacao.data.q, mode: "insensitive" } },
            { internalCode: { contains: validacao.data.q, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { description: "asc" },
      include: { category: { select: { name: true, icon: true } } },
    });

    const normalizados = items.map((item) => ({
      ...item,
      status: statusEstoque(Number(item.currentQuantity), Number(item.minimumStock)),
    }));
    const listaCritica = normalizados.filter((item) => Number(item.currentQuantity) <= Number(item.minimumStock));

    return NextResponse.json({
      data: validacao.data.criticos === "true" ? listaCritica : normalizados,
      total: normalizados.length,
      criticos: listaCritica.length,
      valorEstoque: Number(normalizados.reduce(
        (total, item) => total + Number(item.currentQuantity) * Number(item.averageCost),
        0,
      ).toFixed(2)),
      fonte: "estoque_transacional",
    });
  } catch (e) {
    return erroInterno(e, "api/almoxarifado GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "ALMOXARIFADO", "GESTOR");
  if (erro) return erro;

  try {
    const body = await req.json();

    if (body?.action === "movimentar") {
      const validacao = MovimentoSchema.safeParse(body);
      if (!validacao.success) {
        return NextResponse.json({
          error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
        }, { status: 400 });
      }
      const dados = validacao.data;

      const resultado = await prisma.$transaction(async (tx) => {
        const item = await tx.inventoryItem.findFirst({
          where: { id: dados.itemId, active: true, deletedAt: null },
        });
        if (!item) throw new Error("ITEM_NAO_ENCONTRADO");

        const saldoAnterior = Number(item.currentQuantity);
        const entrada = dados.tipo === "entrada";
        const saldoNovo = entrada ? saldoAnterior + dados.quantidade : saldoAnterior - dados.quantidade;
        if (saldoNovo < 0) throw new Error("ESTOQUE_INSUFICIENTE");

        const custoAnterior = Number(item.averageCost);
        const custoMovimento = entrada && dados.unitCost !== undefined ? dados.unitCost : custoAnterior;
        const custoMedioNovo = entrada && dados.unitCost !== undefined && saldoNovo > 0
          ? ((saldoAnterior * custoAnterior) + (dados.quantidade * dados.unitCost)) / saldoNovo
          : custoAnterior;

        const atualizado = await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentQuantity: saldoNovo,
            averageCost: Number(custoMedioNovo.toFixed(2)),
            status: statusEstoque(saldoNovo, Number(item.minimumStock)),
          },
        });
        const movimento = await tx.inventoryMovement.create({
          data: {
            itemId: item.id,
            movementType: entrada ? "entrada_manual" : "saida_manual",
            quantity: dados.quantidade,
            unitCost: custoMovimento,
            reason: dados.motivo,
            notes: dados.notes || null,
          },
        });

        return { itemAnterior: item, item: atualizado, movimento };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      await registrarAuditoria({
        userId: user!.id,
        action: dados.tipo === "entrada" ? "ENTRADA_ESTOQUE" : "SAIDA_ESTOQUE",
        module: "almoxarifado",
        entityType: "InventoryItem",
        entityId: dados.itemId,
        oldValues: { saldo: Number(resultado.itemAnterior.currentQuantity), custoMedio: Number(resultado.itemAnterior.averageCost) },
        newValues: { saldo: Number(resultado.item.currentQuantity), custoMedio: Number(resultado.item.averageCost), quantidade: dados.quantidade, motivo: dados.motivo },
      });

      return NextResponse.json({
        success: true,
        movimento: resultado.movimento,
        novoSaldo: Number(resultado.item.currentQuantity),
        custoMedio: Number(resultado.item.averageCost),
      }, { status: 201 });
    }

    const validacao = ItemSchema.safeParse(body);
    if (!validacao.success) {
      return NextResponse.json({
        error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      }, { status: 400 });
    }
    const dados = validacao.data;

    const categoria = await prisma.inventoryCategory.findFirst({
      where: { id: dados.categoryId, active: true },
      select: { id: true },
    });
    if (!categoria) {
      return NextResponse.json({ error: "Categoria inexistente ou inativa." }, { status: 400 });
    }

    const internalCode = dados.internalCode || `ITEM-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const item = await prisma.$transaction(async (tx) => {
      const criado = await tx.inventoryItem.create({
        data: {
          internalCode,
          description: dados.description,
          categoryId: dados.categoryId,
          itemType: dados.itemType || "consumivel",
          brand: dados.brand || null,
          unit: dados.unit,
          currentQuantity: dados.currentQuantity,
          minimumStock: dados.minimumStock,
          location: dados.location || null,
          averageCost: dados.averageCost,
          isEpi: dados.isEpi,
          isTool: dados.isTool,
          isPatrimony: dados.isPatrimony,
          patrimonyNumber: dados.patrimonyNumber || null,
          serialNumber: dados.serialNumber || null,
          status: statusEstoque(dados.currentQuantity, dados.minimumStock),
        },
      });

      if (dados.currentQuantity > 0) {
        await tx.inventoryMovement.create({
          data: {
            itemId: criado.id,
            movementType: "entrada_inicial",
            quantity: dados.currentQuantity,
            unitCost: dados.averageCost,
            reason: "Saldo inicial do cadastro",
          },
        });
      }
      return criado;
    });

    await registrarAuditoria({
      userId: user!.id,
      action: "CRIAR",
      module: "almoxarifado",
      entityType: "InventoryItem",
      entityId: item.id,
      newValues: { internalCode, description: item.description, currentQuantity: Number(item.currentQuantity) },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    if (e?.message === "ITEM_NAO_ENCONTRADO") return NextResponse.json({ error: "Item não encontrado ou inativo." }, { status: 404 });
    if (e?.message === "ESTOQUE_INSUFICIENTE") return NextResponse.json({ error: "Estoque insuficiente para a saída solicitada." }, { status: 409 });
    if (e?.code === "P2002") return NextResponse.json({ error: "Código interno ou patrimônio já cadastrado." }, { status: 409 });
    return erroInterno(e, "api/almoxarifado POST");
  }
}
