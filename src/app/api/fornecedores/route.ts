import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const PAPEIS = ["ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO", "FISCAL", "ALMOXARIFADO"];
const OptionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const SupplierSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório").max(200),
  cnpj: OptionalText(30),
  type: OptionalText(100),
  email: z.union([z.string().trim().email("E-mail inválido").max(200), z.literal("")]).optional().nullable(),
  phone: OptionalText(40),
  municipio: OptionalText(120),
  uf: z.union([z.string().trim().length(2, "UF deve ter 2 caracteres"), z.literal("")]).optional().nullable(),
  situacao: OptionalText(80),
});
const SupplierUpdateSchema = SupplierSchema.partial().extend({ id: z.string().trim().min(1, "id obrigatório") });

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function enriquecerCnpj(body: z.infer<typeof SupplierSchema>) {
  const documento = String(body.cnpj || "").replace(/\D/g, "");
  if (documento.length !== 14 || body.municipio) return;
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
    // Cadastro manual continua disponível quando a fonte pública não responde.
  }
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS);
  if (erro) return erro;

  try {
    const search = req.nextUrl.searchParams.get("q")?.trim();
    const data = await prisma.supplier.findMany({
      where: {
        deletedAt: null,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { cnpj: { contains: search } },
            { municipio: { contains: search, mode: "insensitive" } },
            { type: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { name: "asc" },
      take: 1000,
    });
    return NextResponse.json({ data, total: data.length, empty: data.length === 0 });
  } catch (error) {
    return erroInterno(error, "api/fornecedores GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO", "ALMOXARIFADO");
  if (erro || !user) return erro;

  try {
    const parsed = SupplierSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    const body = parsed.data;
    await enriquecerCnpj(body);

    const supplier = await prisma.$transaction(async (tx) => {
      const created = await tx.supplier.create({
        data: {
          name: body.name,
          cnpj: body.cnpj || null,
          type: body.type || null,
          email: body.email || null,
          phone: body.phone || null,
          municipio: body.municipio || null,
          uf: body.uf || null,
          situacao: body.situacao || null,
        },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", module: "fornecedores", entityType: "Supplier", entityId: created.id, newValues: auditJson(created) },
      });
      return created;
    });
    return NextResponse.json(supplier, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 });
    return erroInterno(error, "api/fornecedores POST");
  }
}

export async function PUT(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO", "ALMOXARIFADO");
  if (erro || !user) return erro;

  try {
    const parsed = SupplierUpdateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    const body = parsed.data;
    const current = await prisma.supplier.findFirst({ where: { id: body.id, deletedAt: null } });
    if (!current) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });

    const fields = ["name", "cnpj", "type", "email", "phone", "municipio", "uf", "situacao"] as const;
    const data: Record<string, unknown> = {};
    for (const field of fields) if (body[field] !== undefined) data[field] = body[field] || null;
    if (body.name !== undefined) data.name = body.name;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.supplier.update({ where: { id: body.id }, data });
      await tx.auditLog.create({
        data: { userId: user.id, action: "UPDATE", module: "fornecedores", entityType: "Supplier", entityId: body.id, oldValues: auditJson(current), newValues: auditJson(result) },
      });
      return result;
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "CNPJ já cadastrado em outro fornecedor" }, { status: 409 });
    if (error?.code === "P2025") return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });
    return erroInterno(error, "api/fornecedores PUT");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "GESTOR");
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const current = await prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!current) return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });

    const [expenses, nfes] = await Promise.all([
      prisma.expense.count({ where: { supplierId: id, deletedAt: null } }),
      prisma.fiscalNfe.count({ where: { supplierId: id } }),
    ]);
    if (expenses + nfes > 0) {
      return NextResponse.json({ error: `Fornecedor possui ${expenses + nfes} lançamento(s) vinculado(s). Desative o cadastro em vez de excluí-lo.` }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), active: false } }),
      prisma.auditLog.create({
        data: { userId: user.id, action: "ARCHIVE", module: "fornecedores", entityType: "Supplier", entityId: id, oldValues: auditJson(current), newValues: auditJson({ active: false, deletedAt: new Date().toISOString() }) },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return erroInterno(error, "api/fornecedores DELETE");
  }
}
