import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const criticos = searchParams.get("criticos") === "true";
  try {
    const items = await prisma.inventoryItem.findMany({
      where: {
        active: true,
        ...(q ? { OR: [{ description: { contains: q, mode: "insensitive" } }, { internalCode: { contains: q } }] } : {}),
      },
      orderBy: { description: "asc" },
      include: { category: { select: { name: true, icon: true } } },
    });
    const criticosList = items.filter(i => Number(i.currentQuantity) <= Number(i.minimumStock));
    if (items.length === 0) return NextResponse.json({ data: DEMO_ITEMS, total: 5, criticos: 2, valorEstoque: 12500, _demo: true });
    return NextResponse.json({
      data: criticos ? criticosList : items,
      total: items.length,
      criticos: criticosList.length,
      valorEstoque: items.reduce((s, i) => s + Number(i.currentQuantity) * Number(i.averageCost), 0),
    });
  } catch { return NextResponse.json({ data: DEMO_ITEMS, total: 5, criticos: 2, valorEstoque: 12500, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Movimentação de estoque (entrada/saída) — cria o movimento e atualiza o
    // saldo do item numa transação. Antes este ramo não existia: a movimentação
    // caía na validação de "criar item", retornava 400 e nada persistia.
    if (body.action === "movimentar") {
      const qtd = Number(body.quantidade);
      if (!body.itemId || !qtd || qtd <= 0) {
        return NextResponse.json({ error: "Item e quantidade (> 0) obrigatórios" }, { status: 400 });
      }
      const item = await prisma.inventoryItem.findUnique({ where: { id: body.itemId } });
      if (!item) return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });

      const entrada = body.tipo !== "saida";
      const saldoAtual = Number(item.currentQuantity);
      const novoSaldo = entrada ? saldoAtual + qtd : saldoAtual - qtd;
      if (novoSaldo < 0) {
        return NextResponse.json({ error: `Estoque insuficiente: saldo ${saldoAtual}, saída ${qtd}` }, { status: 400 });
      }

      const [mov] = await prisma.$transaction([
        prisma.inventoryMovement.create({
          data: {
            itemId: body.itemId,
            movementType: entrada ? "entrada_manual" : "saida_manual",
            quantity: qtd,
            unitCost: Number(item.averageCost),
            reason: body.motivo || (entrada ? "Entrada manual" : "Saída manual"),
          },
        }),
        prisma.inventoryItem.update({ where: { id: body.itemId }, data: { currentQuantity: novoSaldo } }),
      ]);
      return NextResponse.json({ success: true, movimento: mov, novoSaldo }, { status: 201 });
    }

    if (!body.description || !body.unit || !body.categoryId) {
      return NextResponse.json({ error: "Descrição, unidade e categoria obrigatórios" }, { status: 400 });
    }
    if (Number(body.currentQuantity) < 0) return NextResponse.json({ error: "Quantidade não pode ser negativa" }, { status: 400 });

    const count = await prisma.inventoryItem.count();
    const internalCode = body.internalCode || `ITEM-${String(count + 1).padStart(3, "0")}`;

    const item = await prisma.inventoryItem.create({
      data: {
        internalCode,
        description: body.description,
        categoryId: body.categoryId,
        itemType: body.itemType || "consumivel",
        brand: body.brand,
        unit: body.unit,
        currentQuantity: Number(body.currentQuantity || 0),
        minimumStock: Number(body.minimumStock || 0),
        location: body.location,
        averageCost: Number(body.averageCost || 0),
        isEpi: Boolean(body.isEpi),
        isTool: Boolean(body.isTool),
        isPatrimony: Boolean(body.isPatrimony),
        patrimonyNumber: body.patrimonyNumber || null,
        serialNumber: body.serialNumber || null,
      },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "Código interno já existe" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_ITEMS = [
  { id: "i1", internalCode: "LIM-001", description: "Detergente Profissional 5L", currentQuantity: 48, minimumStock: 20, status: "regular", category: { name: "Material de Limpeza", icon: "🧴" } },
  { id: "i2", internalCode: "EPI-001", description: "Luva Nitrílica Resistente", currentQuantity: 40, minimumStock: 20, status: "regular", category: { name: "EPI", icon: "🦺" } },
  { id: "i3", internalCode: "EPI-002", description: "Capacete Segurança Classe A", currentQuantity: 8, minimumStock: 10, status: "atencao", category: { name: "EPI", icon: "🦺" } },
  { id: "i4", internalCode: "FER-001", description: "Roçadeira a Gasolina 52cc", currentQuantity: 3, minimumStock: 2, status: "em_uso", category: { name: "Ferramentas", icon: "🔧" } },
  { id: "i5", internalCode: "FER-002", description: "Motosserra 40cm 50cc", currentQuantity: 2, minimumStock: 1, status: "manutencao", category: { name: "Ferramentas", icon: "🔧" } },
];
