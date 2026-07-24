// Alertas internos gerados a partir de dados reais, com estado de leitura por usuário.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const MarcarSchema = z.object({
  action: z.enum(["mark_read", "mark_unread"]),
  ids: z.array(z.string().trim().min(1).max(200)).min(1).max(200),
});

function diasAte(data: Date, hoje: Date) {
  return Math.ceil((data.getTime() - hoje.getTime()) / 86_400_000);
}

async function gerarNotificacoes() {
  const hoje = new Date();
  const em30 = new Date(hoje.getTime() + 30 * 86_400_000);
  const em7 = new Date(hoje.getTime() + 7 * 86_400_000);
  const ha365 = new Date(hoje.getTime() - 365 * 86_400_000);
  const notifs: any[] = [];

  const [treinamentos, tributos, itens, contratos] = await Promise.all([
    prisma.training.findMany({
      where: { expiresAt: { gte: ha365, lte: em30 } },
      include: { employee: { select: { name: true, active: true } } },
      orderBy: { expiresAt: "asc" },
      take: 500,
    }),
    prisma.fiscalTaxExpense.findMany({
      where: { status: "em_aberto", dueDate: { gte: ha365, lte: em7 } },
      orderBy: { dueDate: "asc" },
      take: 500,
    }),
    prisma.inventoryItem.findMany({
      where: { active: true },
      orderBy: { description: "asc" },
      take: 1000,
    }),
    prisma.contract.findMany({
      where: { endDate: { gte: ha365, lte: em30 }, status: "Ativo" },
      orderBy: { endDate: "asc" },
      take: 500,
    }),
  ]);

  for (const training of treinamentos) {
    if (!training.employee.active) continue;
    const dias = diasAte(new Date(training.expiresAt), hoje);
    notifs.push({
      id: `sst-${training.id}`,
      type: "sst_vencendo",
      title: dias < 0 ? "Treinamento vencido" : "Treinamento a vencer",
      message: `${training.employee.name} — ${training.trainingType} ${dias < 0 ? `venceu há ${Math.abs(dias)} dia(s)` : `vence em ${dias} dia(s)`}`,
      urgency: dias < 0 ? "critica" : dias <= 7 ? "alta" : "media",
      createdAt: training.expiresAt,
      href: "/dashboard/treinamentos",
    });
  }

  for (const tax of tributos) {
    const dias = diasAte(new Date(tax.dueDate), hoje);
    notifs.push({
      id: `trib-${tax.id}`,
      type: "tributo_vencendo",
      title: dias < 0 ? `${tax.taxType} vencido` : `${tax.taxType} a vencer`,
      message: `${tax.taxType} ${tax.competence} — R$ ${Number(tax.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${dias < 0 ? `venceu há ${Math.abs(dias)} dia(s)` : `vence em ${dias} dia(s)`}`,
      urgency: dias < 0 ? "critica" : "alta",
      createdAt: tax.dueDate,
      href: "/dashboard/fiscal",
    });
  }

  for (const item of itens) {
    if (Number(item.currentQuantity) > Number(item.minimumStock)) continue;
    notifs.push({
      id: `stock-${item.id}`,
      type: "estoque_critico",
      title: "Estoque crítico",
      message: `${item.description} — ${Number(item.currentQuantity).toFixed(0)} unid. (mínimo: ${Number(item.minimumStock).toFixed(0)})`,
      urgency: Number(item.currentQuantity) <= 0 ? "alta" : "media",
      createdAt: item.updatedAt,
      href: "/dashboard/almoxarifado",
    });
  }

  for (const contract of contratos) {
    if (!contract.endDate) continue;
    const dias = diasAte(new Date(contract.endDate), hoje);
    const objeto = String(contract.object || contract.number || "Contrato").slice(0, 80);
    notifs.push({
      id: `cont-${contract.id}`,
      type: "contrato_vencendo",
      title: dias < 0 ? "Contrato vencido" : "Contrato a vencer",
      message: `${objeto} — ${dias < 0 ? `venceu há ${Math.abs(dias)} dia(s)` : `vence em ${dias} dia(s)`}`,
      urgency: dias < 0 ? "critica" : dias <= 15 ? "alta" : "media",
      createdAt: contract.endDate,
      href: "/dashboard/contratos",
    });
  }

  const ordem: Record<string, number> = { critica: 0, alta: 1, media: 2 };
  return notifs.sort((a, b) => {
    const porUrgencia = (ordem[a.urgency] ?? 9) - (ordem[b.urgency] ?? 9);
    if (porUrgencia !== 0) return porUrgencia;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export async function GET(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro) return erro;

  try {
    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
    const [notificacoes, leituras] = await Promise.all([
      gerarNotificacoes(),
      prisma.$queryRaw<{ notification_key: string }[]>`
        SELECT notification_key
        FROM erp_notification_read
        WHERE user_id = ${user!.id}
      `,
    ]);
    const lidas = new Set(leituras.map((item) => item.notification_key));
    const data = notificacoes.map((item) => ({ ...item, read: lidas.has(item.id) }));
    const filtradas = unreadOnly ? data.filter((item) => !item.read) : data;

    return NextResponse.json({
      data: filtradas,
      total: data.length,
      naoLidas: data.filter((item) => !item.read).length,
      empty: data.length === 0,
    });
  } catch (e) {
    return erroInterno(e, "api/notificacoes GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel();
  if (erro) return erro;

  try {
    const parsed = MarcarSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const ids = [...new Set(parsed.data.ids)];
    if (parsed.data.action === "mark_read") {
      await prisma.$transaction(
        ids.map((id) => prisma.$executeRaw`
          INSERT INTO erp_notification_read (user_id, notification_key, read_at)
          VALUES (${user!.id}, ${id}, NOW())
          ON CONFLICT (user_id, notification_key) DO UPDATE SET read_at = EXCLUDED.read_at
        `),
      );
    } else {
      await prisma.$executeRaw`
        DELETE FROM erp_notification_read
        WHERE user_id = ${user!.id}
          AND notification_key = ANY(${ids}::text[])
      `;
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch (e) {
    return erroInterno(e, "api/notificacoes POST");
  }
}
