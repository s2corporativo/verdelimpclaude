import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAliqISS } from "@/lib/iss-betim";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const NfseSchema = z.object({
  number: z.string().trim().min(1, "Número obrigatório").max(100),
  municipality: z.string().trim().max(120).optional().nullable(),
  municipalityCode: z.string().trim().max(20).optional().nullable(),
  providerCnpj: z.string().trim().max(30).optional().nullable(),
  receiverName: z.string().trim().max(220).optional().nullable(),
  receiverCnpj: z.string().trim().max(30).optional().nullable(),
  clientId: z.string().trim().optional().nullable(),
  serviceCode: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().min(2, "Descrição obrigatória").max(3000),
  serviceValue: z.coerce.number().positive("Valor deve ser maior que zero").max(9999999999999.99),
  calculationBase: z.coerce.number().positive().optional(),
  issRate: z.coerce.number().min(0).max(20).optional(),
  issRetained: z.coerce.boolean().optional().default(false),
  issueDate: z.string().optional(),
  competence: z.string().regex(/^\d{4}-\d{2}$/, "Competência deve ser YYYY-MM").optional(),
  status: z.enum(["lancada", "confirmada_portal", "cancelada", "lancada_gerencial"]).optional().default("lancada"),
  accessKey: z.string().trim().max(100).optional().nullable(),
  pdfLink: z.string().trim().url("Link do PDF inválido").max(1500).optional().nullable().or(z.literal("")),
});

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function parseDate(value?: string) {
  if (!value) return new Date();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "GESTOR", "FINANCEIRO", "FISCAL");
  if (erro) return erro;

  try {
    const competence = req.nextUrl.searchParams.get("competencia")?.trim();
    const status = req.nextUrl.searchParams.get("status")?.trim();
    const clientId = req.nextUrl.searchParams.get("clientId")?.trim();
    const data = await prisma.fiscalNfse.findMany({
      where: {
        ...(competence ? { competence } : {}),
        ...(status ? { status } : {}),
        ...(clientId ? { clientId } : {}),
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: { client: { select: { id: true, name: true, cnpjCpf: true } } },
      take: 1000,
    });
    const validas = data.filter((item) => !["cancelada", "cancelado"].includes(item.status));
    return NextResponse.json({
      data,
      total: data.length,
      empty: data.length === 0,
      totalFaturado: validas.reduce((sum, item) => sum + Number(item.serviceValue), 0),
      totalLiquido: validas.reduce((sum, item) => sum + Number(item.netAmount), 0),
      gerenciais: data.filter((item) => item.status === "lancada_gerencial").length,
      confirmadasPortal: data.filter((item) => item.status === "confirmada_portal").length,
    });
  } catch (error) {
    return erroInterno(error, "api/fiscal/nfse GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "FINANCEIRO", "FISCAL");
  if (erro || !user) return erro;

  try {
    const parsed = NfseSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "NFS-e inválida", details: parsed.error.flatten() }, { status: 400 });
    const body = parsed.data;
    const issueDate = parseDate(body.issueDate);
    if (!issueDate) return NextResponse.json({ error: "Data de emissão inválida" }, { status: 400 });
    if (body.status === "confirmada_portal" && !body.accessKey) {
      return NextResponse.json({ error: "Chave de acesso obrigatória para confirmar emissão no portal" }, { status: 400 });
    }

    if (body.clientId) {
      const client = await prisma.client.findFirst({ where: { id: body.clientId, deletedAt: null }, select: { id: true } });
      if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 422 });
    }

    const company = await prisma.companyConfig.findFirst();
    const municipality = body.municipality || company?.municipio || "Betim";
    const providerCnpj = body.providerCnpj || company?.cnpj;
    if (!providerCnpj) return NextResponse.json({ error: "Configure o CNPJ da empresa antes de registrar NFS-e" }, { status: 422 });

    const issRate = body.issRate ?? getAliqISS(body.serviceCode || "7.11");
    const calculationBase = body.calculationBase ?? body.serviceValue;
    if (calculationBase > body.serviceValue) return NextResponse.json({ error: "Base de cálculo não pode superar o valor do serviço" }, { status: 400 });
    const issAmount = calculationBase * (issRate / 100);
    const netAmount = body.issRetained ? body.serviceValue - issAmount : body.serviceValue;
    const competence = body.competence || issueDate.toISOString().slice(0, 7);

    const nfse = await prisma.$transaction(async (tx) => {
      const created = await tx.fiscalNfse.create({
        data: {
          number: body.number,
          municipality,
          providerCnpj,
          receiverName: body.receiverName || null,
          receiverCnpj: body.receiverCnpj || null,
          clientId: body.clientId || null,
          serviceCode: body.serviceCode || null,
          description: body.description,
          serviceValue: body.serviceValue,
          calculationBase,
          issRate,
          issAmount,
          issRetained: body.issRetained,
          netAmount,
          issueDate,
          competence,
          status: body.status,
          accessKey: body.accessKey || null,
          pdfLink: body.pdfLink || null,
        },
        include: { client: { select: { id: true, name: true } } },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", module: "nfse", entityType: "FiscalNfse", entityId: created.id, newValues: auditJson(created) },
      });
      return created;
    });
    return NextResponse.json({
      data: nfse,
      aviso: nfse.status === "lancada_gerencial" ? "Registro gerencial: não comprova emissão fiscal oficial." : null,
    }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "NFS-e já cadastrada para este município e prestador" }, { status: 409 });
    return erroInterno(error, "api/fiscal/nfse POST");
  }
}
