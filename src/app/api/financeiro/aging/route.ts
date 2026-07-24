import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const READ_ROLES = ["ADMIN", "GESTOR", "FINANCEIRO", "FISCAL", "COMERCIAL"];
const DAY_MS = 86_400_000;

type AgingRow = {
  id: string;
  client_id: string | null;
  contract_id: string | null;
  description: string;
  document_number: string | null;
  issue_date: Date;
  due_date: Date;
  gross_amount: Prisma.Decimal;
  net_amount: Prisma.Decimal;
  status: string;
  client_name: string | null;
  contract_number: string | null;
  paid_amount: Prisma.Decimal;
  balance: Prisma.Decimal;
};

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function emptyBucket() {
  return { qtd: 0, valor: 0, itens: [] as Array<Record<string, unknown>> };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...READ_ROLES);
  if (erro) return erro;

  try {
    const limitRaw = Number(req.nextUrl.searchParams.get("limit") || 1000);
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 2000) : 1000;
    const asOfRaw = req.nextUrl.searchParams.get("asOf");
    const asOf = asOfRaw ? new Date(`${asOfRaw}T12:00:00`) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      return NextResponse.json({ error: "Data-base inválida. Use AAAA-MM-DD." }, { status: 400 });
    }
    const reference = startOfDay(asOf);

    const rows = await prisma.$queryRaw<AgingRow[]>(Prisma.sql`
      SELECT
        r.id,
        r.client_id,
        r.contract_id,
        r.description,
        r.document_number,
        r.issue_date,
        r.due_date,
        r.gross_amount,
        r.net_amount,
        r.status,
        cl.name AS client_name,
        c.number AS contract_number,
        COALESCE(SUM(p.amount), 0) AS paid_amount,
        GREATEST(r.net_amount - COALESCE(SUM(p.amount), 0), 0) AS balance
      FROM erp_receivable r
      LEFT JOIN erp_receivable_payment p ON p.receivable_id = r.id
      LEFT JOIN "Client" cl ON cl.id = r.client_id
      LEFT JOIN "Contract" c ON c.id = r.contract_id
      WHERE r.status <> 'CANCELLED'
      GROUP BY r.id, cl.id, c.id
      HAVING GREATEST(r.net_amount - COALESCE(SUM(p.amount), 0), 0) > 0.009
      ORDER BY r.due_date ASC
      LIMIT ${limit}
    `);

    const buckets = {
      corrente: emptyBucket(),
      ate30: emptyBucket(),
      de31a60: emptyBucket(),
      de61a90: emptyBucket(),
      acima90: emptyBucket(),
    };

    for (const row of rows) {
      const due = startOfDay(new Date(row.due_date));
      const diasAtraso = Math.max(0, Math.floor((reference.getTime() - due.getTime()) / DAY_MS));
      const balance = Number(row.balance || 0);
      const item = {
        id: row.id,
        description: row.description,
        documentNumber: row.document_number,
        clientId: row.client_id,
        clientName: row.client_name,
        contractId: row.contract_id,
        contractNumber: row.contract_number,
        issueDate: row.issue_date,
        dueDate: row.due_date,
        grossAmount: Number(row.gross_amount || 0),
        netAmount: Number(row.net_amount || 0),
        paidAmount: Number(row.paid_amount || 0),
        balance,
        status: row.status,
        diasAtraso,
      };

      const bucket = due >= reference
        ? buckets.corrente
        : diasAtraso <= 30
          ? buckets.ate30
          : diasAtraso <= 60
            ? buckets.de31a60
            : diasAtraso <= 90
              ? buckets.de61a90
              : buckets.acima90;

      bucket.qtd += 1;
      bucket.valor += balance;
      if (bucket.itens.length < 50) bucket.itens.push(item);
    }

    const totalVencido = buckets.ate30.valor + buckets.de31a60.valor + buckets.de61a90.valor + buckets.acima90.valor;
    const totalGeral = totalVencido + buckets.corrente.valor;

    return NextResponse.json({
      aging: buckets,
      totalVencido,
      totalGeral,
      totalTitulos: rows.length,
      asOf: reference.toISOString().slice(0, 10),
      source: "erp_receivable",
    });
  } catch (error) {
    return erroInterno(error, "api/financeiro/aging GET");
  }
}
