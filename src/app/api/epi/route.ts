import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const dataOpcional = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  z.literal(""),
]).optional().nullable();

const EntregaSchema = z.object({
  itemId: z.string().trim().min(1, "EPI obrigatório"),
  employeeId: z.string().trim().min(1, "Funcionário obrigatório"),
  deliveryDate: dataOpcional,
  quantity: z.coerce.number().int().positive().max(1000),
  caNumber: z.string().trim().max(80).optional().nullable(),
  caExpirationDate: dataOpcional,
  replacementDate: dataOpcional,
  reason: z.string().trim().min(2).max(300).default("Dotação periódica"),
});

const DevolucaoSchema = z.object({
  action: z.literal("return"),
  deliveryId: z.string().trim().min(1, "Entrega obrigatória"),
  returnDate: dataOpcional,
  quantity: z.coerce.number().int().positive().max(1000),
  condition: z.enum(["NEW", "GOOD", "USED", "DAMAGED", "LOST"]).default("USED"),
  restocked: z.coerce.boolean().optional().default(false),
  reason: z.string().trim().max(300).optional().nullable(),
  signaturePath: z.string().trim().max(1000).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

function data(value?: string | null) {
  if (!value) return null;
  return parseDataOperacional(value);
}

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "ALMOXARIFADO", "OPERACIONAL");
  if (erro) return erro;

  try {
    const [epis, entregasBrutas, returns] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: { isEpi: true, active: true, deletedAt: null },
        orderBy: { description: "asc" },
        include: { category: { select: { name: true } } },
      }),
      prisma.inventoryEpiDelivery.findMany({
        include: {
          employee: { select: { id: true, name: true, role: true, active: true } },
          item: { select: { id: true, description: true, internalCode: true } },
        },
        orderBy: { deliveryDate: "desc" },
        take: 1000,
      }),
      prisma.$queryRaw<any[]>`SELECT * FROM erp_epi_return ORDER BY return_date DESC LIMIT 2000`,
    ]);

    const returnByDelivery = new Map<string, any[]>();
    for (const item of returns) {
      const atual = returnByDelivery.get(item.delivery_id) || [];
      atual.push(item);
      returnByDelivery.set(item.delivery_id, atual);
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em30 = new Date(hoje);
    em30.setDate(em30.getDate() + 30);

    const entregas = entregasBrutas.map((entrega) => {
      const datas = [entrega.expectedReplacementDate, entrega.caExpirationDate]
        .filter(Boolean)
        .map((valor) => new Date(valor as Date));
      const proxima = datas.length ? new Date(Math.min(...datas.map((valor) => valor.getTime()))) : null;
      const devolucoes = returnByDelivery.get(entrega.id) || [];
      const returnedQuantity = devolucoes.reduce((soma, item) => soma + Number(item.quantity), 0);
      let status = returnedQuantity >= entrega.quantity ? "devolvido" : "ativo";
      if (status === "ativo" && proxima) {
        status = proxima < hoje ? "vencido" : proxima <= em30 ? "a_vencer" : "ativo";
      }
      return { ...entrega, status, returnedQuantity, returns: devolucoes };
    });

    const estoqueCritico = epis.filter((item) => Number(item.currentQuantity) <= Number(item.minimumStock)).length;
    const aVencer = entregas.filter((item) => item.status === "a_vencer").length;
    const vencidos = entregas.filter((item) => item.status === "vencido").length;

    return NextResponse.json({
      epis,
      entregas,
      stats: {
        itens: epis.length,
        estoqueCritico,
        entregasAtivas: entregas.filter((item) => item.status === "ativo").length,
        aVencer,
        vencidos,
      },
      empty: epis.length === 0 && entregas.length === 0,
    });
  } catch (error) {
    return erroInterno(error, "api/epi GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "ALMOXARIFADO");
  if (erro || !user) return erro;

  try {
    const raw = await req.json();

    if (raw.action === "return") {
      const parsed = DevolucaoSchema.safeParse(raw);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message || "Devolução inválida" }, { status: 400 });
      }
      const body = parsed.data;
      const returnDate = data(body.returnDate) || new Date();
      if (!returnDate) return NextResponse.json({ error: "Data de devolução inválida" }, { status: 400 });

      const delivery = await prisma.inventoryEpiDelivery.findUnique({
        where: { id: body.deliveryId },
        include: { item: true },
      });
      if (!delivery) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });

      const already = await prisma.$queryRaw<any[]>`
        SELECT COALESCE(SUM(quantity), 0)::int AS total
        FROM erp_epi_return
        WHERE delivery_id=${delivery.id}
      `;
      const devolvido = Number(already[0]?.total || 0);
      if (devolvido + body.quantity > delivery.quantity) {
        return NextResponse.json({ error: "Quantidade devolvida supera o saldo da entrega" }, { status: 409 });
      }

      const restocked = Boolean(body.restocked && ["NEW", "GOOD"].includes(body.condition));
      const returnId = randomUUID();

      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO erp_epi_return
            (id, delivery_id, return_date, quantity, condition, restocked, reason, signature_path, received_by, notes)
          VALUES
            (${returnId}, ${delivery.id}, ${returnDate}, ${body.quantity}, ${body.condition}, ${restocked},
             ${body.reason || null}, ${body.signaturePath || null}, ${user.email || user.name || user.id}, ${body.notes || null})
        `;
        await tx.inventoryMovement.create({
          data: {
            itemId: delivery.itemId,
            movementType: restocked ? "devolucao_epi_estoque" : "devolucao_epi_baixa",
            quantity: body.quantity,
            movementDate: returnDate,
            employeeId: delivery.employeeId,
            reason: `Devolução de EPI — ${body.reason || body.condition}`,
            notes: body.notes || null,
          },
        });
        if (restocked) {
          await tx.inventoryItem.update({
            where: { id: delivery.itemId },
            data: { currentQuantity: { increment: body.quantity } },
          });
        }
        if (devolvido + body.quantity >= delivery.quantity) {
          await tx.inventoryEpiDelivery.update({ where: { id: delivery.id }, data: { status: "devolvido" } });
        }
      });

      await registrarAuditoria({
        userId: user.id,
        action: "DEVOLVER",
        module: "epi",
        entityType: "InventoryEpiDelivery",
        entityId: delivery.id,
        newValues: { returnId, quantity: body.quantity, condition: body.condition, restocked, returnDate },
      });
      return NextResponse.json({ success: true, returnId });
    }

    const parsed = EntregaSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Entrega inválida" }, { status: 400 });
    }
    const body = parsed.data;
    const deliveryDate = data(body.deliveryDate) || new Date();
    const replacementDate = data(body.replacementDate);
    const caExpirationDate = data(body.caExpirationDate);
    if (!deliveryDate || (body.replacementDate && !replacementDate) || (body.caExpirationDate && !caExpirationDate)) {
      return NextResponse.json({ error: "Uma das datas informadas é inválida" }, { status: 400 });
    }

    const [item, employee] = await Promise.all([
      prisma.inventoryItem.findUnique({ where: { id: body.itemId } }),
      prisma.employee.findUnique({ where: { id: body.employeeId }, select: { id: true, active: true } }),
    ]);
    if (!item || !item.active || item.deletedAt || !item.isEpi) return NextResponse.json({ error: "EPI inválido ou inativo" }, { status: 404 });
    if (!employee || !employee.active) return NextResponse.json({ error: "Funcionário inválido ou inativo" }, { status: 404 });

    const entrega = await prisma.$transaction(async (tx) => {
      const estoque = await tx.inventoryItem.updateMany({
        where: { id: body.itemId, active: true, deletedAt: null, isEpi: true, currentQuantity: { gte: body.quantity } },
        data: { currentQuantity: { decrement: body.quantity } },
      });
      if (!estoque.count) throw new Error("INSUFFICIENT_STOCK");

      const created = await tx.inventoryEpiDelivery.create({
        data: {
          itemId: body.itemId,
          employeeId: body.employeeId,
          deliveryDate,
          expectedReplacementDate: replacementDate,
          quantity: body.quantity,
          caNumber: body.caNumber || null,
          caExpirationDate,
          reason: body.reason,
          status: "ativo",
        },
      });
      await tx.inventoryMovement.create({
        data: {
          itemId: body.itemId,
          movementType: "saida_funcionario",
          quantity: body.quantity,
          movementDate: deliveryDate,
          employeeId: body.employeeId,
          reason: `EPI entregue — ${body.reason}`,
        },
      });
      return created;
    });

    await registrarAuditoria({
      userId: user.id,
      action: "CRIAR",
      module: "epi",
      entityType: "InventoryEpiDelivery",
      entityId: entrega.id,
      newValues: { itemId: body.itemId, employeeId: body.employeeId, quantity: body.quantity, caNumber: body.caNumber, deliveryDate },
    });
    return NextResponse.json(entrega, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "Estoque insuficiente para concluir a entrega" }, { status: 409 });
    }
    return erroInterno(error, "api/epi POST");
  }
}
