// Confirmar entrada da NF-e: dá entrada no estoque dos itens vinculados e lança
// a despesa correspondente no financeiro. Antes o botão "Confirmar entrada" era
// apenas visual (setTimeout) e nada era registrado.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const accessKey: string | undefined = b.accessKey;
    if (!accessKey) return NextResponse.json({ error: "Chave de acesso da NF-e obrigatória" }, { status: 400 });

    const nfe = await prisma.fiscalNfe.findUnique({ where: { accessKey } });
    if (!nfe) return NextResponse.json({ error: "NF-e não encontrada — importe o XML primeiro." }, { status: 404 });

    const itens: { itemAlmoxId: string; quantidade: number; custoUnit?: number }[] = Array.isArray(b.itens) ? b.itens : [];
    const ops: any[] = [];
    const movimentados: string[] = [];

    for (const it of itens) {
      if (!it.itemAlmoxId || !Number(it.quantidade)) continue;
      const item = await prisma.inventoryItem.findUnique({ where: { id: it.itemAlmoxId } });
      if (!item) continue;
      const qtd = Number(it.quantidade);
      ops.push(prisma.inventoryMovement.create({
        data: {
          itemId: item.id, movementType: "entrada_nfe", quantity: qtd,
          unitCost: Number(it.custoUnit ?? item.averageCost),
          reason: `Entrada por NF-e ${nfe.number}`, notes: accessKey,
        },
      }));
      ops.push(prisma.inventoryItem.update({
        where: { id: item.id }, data: { currentQuantity: Number(item.currentQuantity) + qtd },
      }));
      movimentados.push(item.id);
    }

    // Lançar a despesa (contas a pagar) referente à nota
    let despesa: any = null;
    if (b.lancarFinanceiro !== false) {
      const hoje = new Date();
      const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      ops.push(
        prisma.expense.create({
          data: {
            description: `NF-e ${nfe.number} — ${nfe.supplierName || "fornecedor"}`,
            amount: nfe.totalAmount,
            dueDate: nfe.entryDate || hoje,
            status: "em_aberto",
            supplierId: nfe.supplierId,
            competence: competencia,
            notes: `Entrada automática da NF-e (chave ${accessKey})`,
          },
        }).then((d) => { despesa = d; return d; }),
      );
    }

    ops.push(prisma.fiscalNfe.update({ where: { accessKey }, data: { status: "conferida" } }));
    await prisma.$transaction(ops);

    return NextResponse.json({
      success: true,
      itensMovimentados: movimentados.length,
      despesaLancada: !!despesa,
      mensagem: `Entrada confirmada: ${movimentados.length} item(ns) no estoque${despesa ? " e despesa lançada no financeiro" : ""}.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao confirmar entrada." }, { status: 500 });
  }
}
