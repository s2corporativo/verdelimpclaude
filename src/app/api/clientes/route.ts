import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { validar, ClienteSchema, ClienteUpdateSchema } from "@/lib/validacao";

export const dynamic = "force-dynamic";

const PAPEIS = ["ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO", "FISCAL"];

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function limparDocumento(value?: string | null) {
  return value ? value.replace(/\D/g, "") : "";
}

async function enriquecerCnpj(body: any) {
  const documento = limparDocumento(body.cnpjCpf);
  if (!documento || documento.length !== 14 || body.municipio) return;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${documento}`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.message) return;
    body.municipio = body.municipio || data.municipio || null;
    body.uf = body.uf || data.uf || null;
    body.situacao = data.descricao_situacao_cadastral || data.situacao_cadastral || body.situacao || null;
  } catch {
    // A indisponibilidade da fonte externa não impede o cadastro manual.
  }
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  try {
    const search = req.nextUrl.searchParams.get("q")?.trim();
    const active = req.nextUrl.searchParams.get("active");
    const where: Prisma.ClientWhereInput = {
      deletedAt: null,
      ...(active === "true" ? { active: true } : active === "false" ? { active: false } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { cnpjCpf: { contains: search } },
          { contact: { contains: search, mode: "insensitive" } },
          { municipio: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    };
    const data = await prisma.client.findMany({ where, orderBy: { name: "asc" }, take: 1000 });
    return NextResponse.json({ data, total: data.length, empty: data.length === 0 });
  } catch (error) {
    return erroInterno(error, "api/clientes GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro: authError } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (authError || !user) return authError;

  try {
    const raw = await req.json();
    const { data: body, erro } = validar(ClienteSchema, raw);
    if (erro) return erro;
    await enriquecerCnpj(body);

    const cliente = await prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          name: body.name,
          cnpjCpf: body.cnpjCpf || null,
          type: body.type || "juridica",
          category: body.category || "Público",
          email: body.email || null,
          phone: body.phone || null,
          contact: body.contact || null,
          logradouro: body.logradouro || null,
          municipio: body.municipio || null,
          uf: body.uf || null,
          cep: body.cep || null,
          situacao: body.situacao || null,
          notes: body.notes || null,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          module: "clientes",
          entityType: "Client",
          entityId: created.id,
          newValues: auditJson(created),
        },
      });
      return created;
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "CNPJ/CPF já cadastrado" }, { status: 409 });
    return erroInterno(error, "api/clientes POST");
  }
}

export async function PUT(req: NextRequest) {
  const { user, erro: authError } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL");
  if (authError || !user) return authError;

  try {
    const raw = await req.json();
    const { data: body, erro } = validar(ClienteUpdateSchema, raw);
    if (erro) return erro;
    const current = await prisma.client.findFirst({ where: { id: body.id, deletedAt: null } });
    if (!current) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    const fields = ["name", "cnpjCpf", "type", "category", "email", "phone", "contact", "logradouro", "municipio", "uf", "cep", "situacao", "notes"] as const;
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      if (body[field] !== undefined) data[field] = body[field] || null;
    }
    if (body.name !== undefined) data.name = body.name;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.client.update({ where: { id: body.id }, data });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE",
          module: "clientes",
          entityType: "Client",
          entityId: body.id,
          oldValues: auditJson(current),
          newValues: auditJson(result),
        },
      });
      return result;
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "CNPJ/CPF já cadastrado em outro cliente" }, { status: 409 });
    if (error?.code === "P2025") return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return erroInterno(error, "api/clientes PUT");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR");
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const current = await prisma.client.findFirst({ where: { id, deletedAt: null } });
    if (!current) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

    const [contracts, proposals, dossiers, receivables] = await Promise.all([
      prisma.contract.count({ where: { clientId: id } }),
      prisma.proposal.count({ where: { clientId: id, deletedAt: null } }),
      prisma.serviceDossier.count({ where: { clientId: id } }),
      prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM erp_receivable WHERE client_id=${id}`,
    ]);
    const links = contracts + proposals + dossiers + Number(receivables[0]?.count || 0);
    if (links > 0) {
      return NextResponse.json({ error: `Cliente possui ${links} vínculo(s) operacional(is) ou financeiro(s). Desative o cadastro em vez de excluí-lo.` }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.client.update({ where: { id }, data: { deletedAt: new Date(), active: false } }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "ARCHIVE",
          module: "clientes",
          entityType: "Client",
          entityId: id,
          oldValues: auditJson(current),
          newValues: auditJson({ active: false, deletedAt: new Date().toISOString() }),
        },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return erroInterno(error, "api/clientes DELETE");
  }
}
