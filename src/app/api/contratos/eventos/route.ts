import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";
const Schema = z.object({
  id: z.string().optional(), contractId: z.string(),
  eventType: z.enum(["RENEWAL", "AMENDMENT", "OBLIGATION", "PENALTY", "GUARANTEE", "ADJUSTMENT", "CLOSURE", "OTHER"]),
  title: z.string().trim().min(2).max(250), eventDate: z.string(), dueDate: z.string().optional().nullable(),
  amount: z.coerce.number().optional().nullable(), adjustIndex: z.string().trim().max(40).optional().nullable(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"]).default("OPEN"),
  responsible: z.string().trim().max(180).optional().nullable(), documentPath: z.string().max(1000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(), metadata: z.record(z.any()).default({}),
});
const asDate = (v?: string | null) => v ? new Date(`${v}T12:00:00`) : null;

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "CONTRATOS", "FINANCEIRO", "OPERACIONAL");
  if (erro) return erro;
  try {
    const contractId = req.nextUrl.searchParams.get("contractId");
    const rows = contractId
      ? await prisma.$queryRaw<any[]>`SELECT * FROM erp_contract_event WHERE contract_id=${contractId} ORDER BY event_date DESC, created_at DESC`
      : await prisma.$queryRaw<any[]>`SELECT ce.*, c.number AS contract_number, c.object AS contract_object
          FROM erp_contract_event ce JOIN "Contract" c ON c.id=ce.contract_id
          ORDER BY COALESCE(ce.due_date, ce.event_date), ce.created_at DESC LIMIT 1000`;
    return NextResponse.json({ data: rows });
  } catch (e) { return erroInterno(e, "api/contratos/eventos GET"); }
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "CONTRATOS");
  if (erro) return erro;
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Evento inválido", details: parsed.error.flatten() }, { status: 400 });
    const b = parsed.data; const id = b.id || randomUUID();
    await prisma.$executeRaw`
      INSERT INTO erp_contract_event (id, contract_id, event_type, title, event_date, due_date, amount, adjust_index,
        status, responsible, document_path, description, metadata, updated_at)
      VALUES (${id}, ${b.contractId}, ${b.eventType}, ${b.title}, ${asDate(b.eventDate)!}, ${asDate(b.dueDate)},
        ${b.amount ?? null}, ${b.adjustIndex || null}, ${b.status}, ${b.responsible || null}, ${b.documentPath || null},
        ${b.description || null}, ${JSON.stringify(b.metadata)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET event_type=EXCLUDED.event_type, title=EXCLUDED.title,
        event_date=EXCLUDED.event_date, due_date=EXCLUDED.due_date, amount=EXCLUDED.amount,
        adjust_index=EXCLUDED.adjust_index, status=EXCLUDED.status, responsible=EXCLUDED.responsible,
        document_path=EXCLUDED.document_path, description=EXCLUDED.description, metadata=EXCLUDED.metadata, updated_at=NOW()`;

    if (b.eventType === "RENEWAL" && b.status === "COMPLETED" && b.dueDate) {
      await prisma.contract.update({ where: { id: b.contractId }, data: { endDate: asDate(b.dueDate)!, status: "Ativo", adjustIndex: b.adjustIndex || undefined } });
    }
    if (b.eventType === "CLOSURE" && b.status === "COMPLETED") {
      await prisma.contract.update({ where: { id: b.contractId }, data: { status: "Encerrado" } });
    }
    return NextResponse.json({ success: true, id });
  } catch (e) { return erroInterno(e, "api/contratos/eventos POST"); }
}
