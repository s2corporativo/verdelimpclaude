// src/app/api/epi/route.ts
// Adaptado de: verdelimp-erp-prime-final/drizzle/schema.ts → epiInventory table
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Usar InventoryItem filtrado por isEpi=true
    const epis = await prisma.inventoryItem.findMany({
      where: { isEpi: true, active: true },
      orderBy: { description: "asc" },
      include: { category: { select: { name: true } } },
    });

    const entregas = await prisma.inventoryEpiDelivery.findMany({
      where: { status: { in: ["ativo", "a_vencer", "vencido"] } },
      include: {
        employee: { select: { name: true, role: true } },
        item: { select: { description: true, internalCode: true } },
      },
      orderBy: { deliveryDate: "desc" },
      take: 50,
    });

    if (!epis.length) return NextResponse.json({ epis: DEMO_EPI, entregas: DEMO_ENTREGA, _demo: true });
    return NextResponse.json({ epis, entregas });
  } catch {
    return NextResponse.json({ epis: DEMO_EPI, entregas: DEMO_ENTREGA, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    if (!b.itemId || !b.employeeId) return NextResponse.json({ error: "Item e funcionário obrigatórios" }, { status: 400 });

    const entrega = await prisma.inventoryEpiDelivery.create({
      data: {
        itemId: b.itemId,
        employeeId: b.employeeId,
        deliveryDate: b.deliveryDate ? new Date(b.deliveryDate) : new Date(),
        expectedReplacementDate: b.replacementDate ? new Date(b.replacementDate) : null,
        quantity: Number(b.quantity || 1),
        caNumber: b.caNumber || null,
        caExpirationDate: b.caExpirationDate ? new Date(b.caExpirationDate) : null,
        reason: b.reason || "Dotação periódica",
        status: "ativo",
      },
    });

    // Dar baixa no estoque
    await prisma.inventoryMovement.create({
      data: {
        itemId: b.itemId,
        movementType: "saida_funcionario",
        quantity: Number(b.quantity || 1),
        movementDate: new Date(),
        employeeId: b.employeeId,
        reason: `EPI entregue — ${b.reason || "Dotação periódica"}`,
      },
    });

    return NextResponse.json(entrega, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_EPI = [
  { id: "e1", internalCode: "EPI-001", description: "Luva Nitrílica Resistente (Par)", currentQuantity: 40, minimumStock: 20, category: { name: "EPI" } },
  { id: "e2", internalCode: "EPI-002", description: "Capacete de Segurança Classe A", currentQuantity: 8, minimumStock: 10, category: { name: "EPI" } },
  { id: "e3", internalCode: "EPI-003", description: "Bota de Segurança N°42", currentQuantity: 5, minimumStock: 8, category: { name: "EPI" } },
  { id: "e4", internalCode: "EPI-004", description: "Óculos de Proteção CA 39.010", currentQuantity: 15, minimumStock: 10, category: { name: "EPI" } },
  { id: "e5", internalCode: "EPI-005", description: "Protetor Auricular Plug", currentQuantity: 30, minimumStock: 20, category: { name: "EPI" } },
];
const DEMO_ENTREGA = [
  { id: "d1", employee: { name: "Abrão Felipe", role: "Op. Roçadeira" }, item: { description: "Luva Nitrílica", internalCode: "EPI-001" }, deliveryDate: "2026-04-01", quantity: 2, caNumber: "39.010", status: "ativo" },
  { id: "d2", employee: { name: "Gilberto Ferreira", role: "Op. Roçadeira" }, item: { description: "Capacete Classe A", internalCode: "EPI-002" }, deliveryDate: "2026-03-15", quantity: 1, caNumber: "25.028", status: "ativo" },
  { id: "d3", employee: { name: "José Antonio", role: "Op. Roçadeira" }, item: { description: "Bota Segurança", internalCode: "EPI-003" }, deliveryDate: "2026-01-10", quantity: 1, caNumber: "40.161", status: "a_vencer" },
];
