// src/app/api/epi/route.ts
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "ALMOXARIFADO", "OPERACIONAL");
  if (erro) return erro;
  try {
    const epis = await prisma.inventoryItem.findMany({
      where: { isEpi: true, active: true }, orderBy: { description: "asc" },
      include: { category: { select: { name: true } } },
    });
    const entregasBrutas = await prisma.inventoryEpiDelivery.findMany({
      include: { employee: { select: { name: true, role: true } }, item: { select: { description: true, internalCode: true } } },
      orderBy: { deliveryDate: "desc" }, take: 500,
    });
    const returns = await prisma.$queryRaw<any[]>`SELECT * FROM erp_epi_return ORDER BY return_date DESC LIMIT 1000`;
    const returnByDelivery = new Map<string, any[]>();
    for (const item of returns) returnByDelivery.set(item.delivery_id, [...(returnByDelivery.get(item.delivery_id) || []), item]);

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const em30 = new Date(hoje); em30.setDate(em30.getDate() + 30);
    const entregas = entregasBrutas.map((e) => {
      const datas = [e.expectedReplacementDate, e.caExpirationDate].filter(Boolean).map((x) => new Date(x as Date));
      const proxima = datas.length ? new Date(Math.min(...datas.map((x) => x.getTime()))) : null;
      const returned = (returnByDelivery.get(e.id) || []).reduce((s, x) => s + Number(x.quantity), 0);
      let status = returned >= e.quantity ? "devolvido" : "ativo";
      if (status === "ativo" && proxima) status = proxima < hoje ? "vencido" : proxima <= em30 ? "a_vencer" : "ativo";
      return { ...e, status, returnedQuantity: returned, returns: returnByDelivery.get(e.id) || [] };
    });
    if (!epis.length) return NextResponse.json({ epis: DEMO_EPI, entregas: DEMO_ENTREGA, _demo: true });
    return NextResponse.json({ epis, entregas });
  } catch (e) { return erroInterno(e, "api/epi GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "ALMOXARIFADO");
  if (erro) return erro;
  try {
    const b = await req.json();
    if (b.action === "return") {
      if (!b.deliveryId || !Number(b.quantity)) return NextResponse.json({ error: "Entrega e quantidade são obrigatórias" }, { status: 400 });
      const delivery = await prisma.inventoryEpiDelivery.findUnique({ where: { id: b.deliveryId }, include: { item: true } });
      if (!delivery) return NextResponse.json({ error: "Entrega não encontrada" }, { status: 404 });
      const already = await prisma.$queryRaw<any[]>`SELECT COALESCE(SUM(quantity),0)::int AS total FROM erp_epi_return WHERE delivery_id=${delivery.id}`;
      const quantity = Number(b.quantity);
      if (quantity + Number(already[0]?.total || 0) > delivery.quantity) return NextResponse.json({ error: "Quantidade devolvida supera a quantidade entregue" }, { status: 409 });
      const restocked = Boolean(b.restocked && ["NEW", "GOOD"].includes(String(b.condition || "").toUpperCase()));
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`INSERT INTO erp_epi_return (id, delivery_id, return_date, quantity, condition, restocked, reason, signature_path, received_by, notes)
          VALUES (${randomUUID()}, ${delivery.id}, ${b.returnDate ? new Date(b.returnDate) : new Date()}, ${quantity}, ${b.condition || "USED"}, ${restocked}, ${b.reason || null}, ${b.signaturePath || null}, ${user?.email || user?.name || user?.id}, ${b.notes || null})`;
        await tx.inventoryMovement.create({ data: { itemId: delivery.itemId, movementType: restocked ? "devolucao_epi_estoque" : "devolucao_epi_baixa", quantity, movementDate: new Date(), employeeId: delivery.employeeId, reason: `Devolução EPI — ${b.reason || b.condition || "sem observação"}` } });
        if (restocked) await tx.inventoryItem.update({ where: { id: delivery.itemId }, data: { currentQuantity: { increment: quantity } } });
        if (quantity + Number(already[0]?.total || 0) >= delivery.quantity) await tx.inventoryEpiDelivery.update({ where: { id: delivery.id }, data: { status: "devolvido" } });
      });
      await registrarAuditoria({ userId: user!.id, action: "DEVOLVER", module: "sst", entityType: "InventoryEpiDelivery", entityId: delivery.id, newValues: { quantity, restocked, condition: b.condition } });
      return NextResponse.json({ success: true });
    }

    if (!b.itemId || !b.employeeId) return NextResponse.json({ error: "Item e funcionário obrigatórios" }, { status: 400 });
    const quantity = Number(b.quantity || 1);
    const item = await prisma.inventoryItem.findUnique({ where: { id: b.itemId } });
    if (!item || !item.active || !item.isEpi) return NextResponse.json({ error: "EPI inválido" }, { status: 404 });
    if (Number(item.currentQuantity) < quantity) return NextResponse.json({ error: `Estoque insuficiente. Disponível: ${Number(item.currentQuantity)}` }, { status: 409 });

    const entrega = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryEpiDelivery.create({ data: {
        itemId: b.itemId, employeeId: b.employeeId,
        deliveryDate: b.deliveryDate ? new Date(b.deliveryDate) : new Date(),
        expectedReplacementDate: b.replacementDate ? new Date(b.replacementDate) : null,
        quantity, caNumber: b.caNumber || null,
        caExpirationDate: b.caExpirationDate ? new Date(b.caExpirationDate) : null,
        reason: b.reason || "Dotação periódica", status: "ativo",
      }});
      await tx.inventoryMovement.create({ data: { itemId: b.itemId, movementType: "saida_funcionario", quantity, movementDate: new Date(), employeeId: b.employeeId, reason: `EPI entregue — ${b.reason || "Dotação periódica"}` } });
      await tx.inventoryItem.update({ where: { id: b.itemId }, data: { currentQuantity: { decrement: quantity } } });
      return created;
    });
    await registrarAuditoria({ userId: user!.id, action: "CRIAR", module: "sst", entityType: "InventoryEpiDelivery", entityId: entrega.id, newValues: { itemId: b.itemId, employeeId: b.employeeId, quantity, caNumber: b.caNumber } });
    return NextResponse.json(entrega, { status: 201 });
  } catch (e) { return erroInterno(e, "api/epi POST"); }
}

const DEMO_EPI = [
  { id: "e1", internalCode: "EPI-001", description: "Luva Nitrílica Resistente (Par)", currentQuantity: 40, minimumStock: 20, category: { name: "EPI" } },
  { id: "e2", internalCode: "EPI-002", description: "Capacete de Segurança Classe A", currentQuantity: 8, minimumStock: 10, category: { name: "EPI" } },
];
const DEMO_ENTREGA = [
  { id: "d1", employee: { name: "Abrão Felipe", role: "Op. Roçadeira" }, item: { description: "Luva Nitrílica", internalCode: "EPI-001" }, deliveryDate: "2026-04-01", quantity: 2, caNumber: "39.010", status: "ativo", returnedQuantity: 0 },
];
