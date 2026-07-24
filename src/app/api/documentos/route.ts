import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/admin";
import { validar, DocumentoSchema } from "@/lib/validacao";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const PAPEIS_GED = ["ADMIN", "GESTOR", "COMERCIAL", "RH", "FINANCEIRO", "FISCAL"];
const STATUS_DOCUMENTO = ["ativo", "vencido", "substituido", "arquivado"] as const;

const CATEGORIAS: Record<string, { label: string; icon: string; subs: string[] }> = {
  contrato: { label: "Contratos", icon: "📋", subs: ["Contrato Assinado", "Aditivo", "Ata de Reunião", "Ordem de Serviço", "Medição", "Proposta"] },
  fiscal: { label: "Fiscal & Tributário", icon: "💸", subs: ["NFS-e", "DAS", "Certidão CND", "Certidão FGTS", "Certidão INSS", "Certidão Municipal", "Certidão Trabalhista"] },
  rh: { label: "RH & Funcionários", icon: "👷", subs: ["Contrato de Trabalho", "ASO", "CTPS", "Ficha EPI", "Certificado NR", "Holerite", "Afastamento"] },
  juridico: { label: "Jurídico", icon: "⚖️", subs: ["Contrato Social", "Procuração", "Certidão Junta Comercial", "Ata de Assembleia", "Declaração"] },
  licitacao: { label: "Licitações", icon: "🏛️", subs: ["Edital", "Proposta Enviada", "Habilitação", "Ata de Julgamento", "Impugnação", "Recurso"] },
  tecnico: { label: "Técnico/Operacional", icon: "🔧", subs: ["ART", "POP", "PCMSO", "PPRA/PGR", "Laudo", "Plano de Trabalho", "Certificado de Dedetização", "Foto de Serviço"] },
  outro: { label: "Outros", icon: "📁", subs: ["Correspondência", "Nota Fiscal Entrada", "Orçamento Fornecedor", "Comprovante Pagamento"] },
};

const DownloadSchema = z.object({ action: z.literal("download"), id: z.string().trim().min(1) });
const StatusSchema = z.object({ action: z.literal("update_status"), id: z.string().trim().min(1), status: z.enum(STATUS_DOCUMENTO) });
const ArquivarSchema = z.object({ action: z.literal("arquivar"), id: z.string().trim().min(1), motivo: z.string().trim().min(3).max(1000).optional().nullable() });
const NovaVersaoSchema = z.object({
  action: z.literal("nova_versao"),
  documentoPaiId: z.string().trim().min(1),
  nome: z.string().trim().min(1).max(300).optional(),
  descricao: z.string().trim().max(2000).optional().nullable(),
  categoria: z.enum(["contrato", "fiscal", "rh", "juridico", "licitacao", "tecnico", "outro"]).optional(),
  subcategoria: z.string().trim().max(120).optional().nullable(),
  tags: z.string().trim().max(500).optional().nullable(),
  clienteId: z.string().trim().optional().nullable(),
  contratoId: z.string().trim().optional().nullable(),
  funcionarioId: z.string().trim().optional().nullable(),
  estrategia: z.enum(["base64", "url", "gdrive"]).default("url"),
  urlArquivo: z.string().trim().max(1000).optional().nullable(),
  base64Data: z.string().max(2_800_000).optional().nullable(),
  mimeType: z.string().trim().max(120).optional().nullable(),
  tamanhoKb: z.coerce.number().int().nonnegative().max(2_100).optional().nullable(),
  validade: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional().nullable(),
  confidencial: z.coerce.boolean().optional(),
  changeReason: z.string().trim().min(3).max(1000),
});

function podeVerConfidencial(roles: string[], categoria: string | null | undefined) {
  if (roles.includes("ADMIN") || roles.includes("GESTOR")) return true;
  if (categoria === "rh") return roles.includes("RH");
  if (categoria === "fiscal") return roles.includes("FISCAL") || roles.includes("FINANCEIRO");
  if (categoria === "contrato" || categoria === "licitacao") return roles.includes("COMERCIAL");
  return false;
}

function podeGerenciarCategoria(roles: string[], categoria: string) {
  if (roles.includes("ADMIN") || roles.includes("GESTOR")) return true;
  if (categoria === "rh") return roles.includes("RH");
  if (categoria === "fiscal") return roles.includes("FISCAL") || roles.includes("FINANCEIRO");
  if (["contrato", "licitacao"].includes(categoria)) return roles.includes("COMERCIAL");
  return false;
}

function whereAcesso(roles: string[]) {
  if (roles.includes("ADMIN") || roles.includes("GESTOR")) return {};
  const categoriasPermitidas = Object.keys(CATEGORIAS).filter((categoria) => podeVerConfidencial(roles, categoria));
  return { AND: [{ OR: [{ confidencial: false }, { categoria: { in: categoriasPermitidas } }] }] };
}

async function validarVinculos(input: { clienteId?: string | null; contratoId?: string | null; funcionarioId?: string | null }) {
  const [cliente, contrato, funcionario] = await Promise.all([
    input.clienteId ? prisma.client.findUnique({ where: { id: input.clienteId }, select: { id: true, active: true } }) : null,
    input.contratoId ? prisma.contract.findUnique({ where: { id: input.contratoId }, select: { id: true, clientId: true } }) : null,
    input.funcionarioId ? prisma.employee.findUnique({ where: { id: input.funcionarioId }, select: { id: true } }) : null,
  ]);
  if (input.clienteId && (!cliente || !cliente.active)) return "Cliente inválido ou inativo";
  if (input.contratoId && !contrato) return "Contrato não encontrado";
  if (input.funcionarioId && !funcionario) return "Funcionário não encontrado";
  if (input.clienteId && contrato?.clientId && input.clienteId !== contrato.clientId) return "O contrato não pertence ao cliente informado";
  return null;
}

function validarArmazenamento(input: { estrategia?: string; urlArquivo?: string | null; base64Data?: string | null; tamanhoKb?: number | null }) {
  const estrategia = input.estrategia || "url";
  if (estrategia === "base64" && !input.base64Data) return "Arquivo base64 obrigatório";
  if (["url", "gdrive"].includes(estrategia) && !input.urlArquivo) return "Link do arquivo obrigatório";
  if (estrategia === "base64" && Number(input.tamanhoKb || 0) > 2_100) return "Arquivo excede o limite de 2 MB";
  return null;
}

export async function GET(req: NextRequest) {
  const { user, erro } = await exigirPapel(...PAPEIS_GED);
  if (erro || !user) return erro;
  const roles = user.roles || [];

  const searchParams = req.nextUrl.searchParams;
  if (searchParams.get("action") === "categorias") return NextResponse.json({ categorias: CATEGORIAS });

  const categoria = searchParams.get("categoria") || undefined;
  const busca = searchParams.get("busca")?.trim() || undefined;
  const contratoId = searchParams.get("contratoId") || undefined;
  const clienteId = searchParams.get("clienteId") || undefined;
  const funcionarioId = searchParams.get("funcionarioId") || undefined;
  const status = searchParams.get("status") || undefined;
  const vencendo = Math.max(0, Math.min(3650, Number(searchParams.get("vencendo") || 0)));
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 50)));

  if (categoria && !CATEGORIAS[categoria]) return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
  if (status && !STATUS_DOCUMENTO.includes(status as any)) return NextResponse.json({ error: "Status inválido" }, { status: 400 });

  try {
    const where: any = { ...whereAcesso(roles) };
    if (categoria) where.categoria = categoria;
    if (contratoId) where.contratoId = contratoId;
    if (clienteId) where.clienteId = clienteId;
    if (funcionarioId) where.funcionarioId = funcionarioId;
    if (status) where.status = status;
    if (busca) {
      const clause = { OR: [{ nome: { contains: busca, mode: "insensitive" } }, { descricao: { contains: busca, mode: "insensitive" } }, { tags: { contains: busca, mode: "insensitive" } }] };
      where.AND = [...(where.AND || []), clause];
    }
    if (vencendo > 0) {
      const hoje = new Date();
      const ate = new Date(Date.now() + vencendo * 86_400_000);
      where.validade = { gte: hoje, lte: ate };
    }

    const visibility = whereAcesso(roles);
    const hoje = new Date();
    const em30 = new Date(Date.now() + 30 * 86_400_000);
    const [docs, total, vencidos, vencendo30, statsCat] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, nome: true, descricao: true, categoria: true, subcategoria: true, tags: true,
          clienteId: true, contratoId: true, funcionarioId: true, estrategia: true, urlArquivo: true,
          mimeType: true, tamanhoKb: true, validade: true, status: true, versao: true,
          documentoPaiId: true, confidencial: true, uploadBy: true, createdAt: true, updatedAt: true,
        },
      }),
      prisma.document.count({ where }),
      prisma.document.count({ where: { ...visibility, validade: { lt: hoje }, status: "ativo" } }),
      prisma.document.count({ where: { ...visibility, validade: { gte: hoje, lte: em30 }, status: "ativo" } }),
      prisma.document.groupBy({ by: ["categoria"], _count: { id: true }, where: { ...visibility, status: "ativo" } }),
    ]);

    return NextResponse.json({
      docs,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
      limit,
      vencidos,
      vencendo30,
      statsCat,
      categorias: CATEGORIAS,
      empty: total === 0,
    });
  } catch (error) {
    return erroInterno(error, "api/documentos GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel(...PAPEIS_GED);
  if (erro || !user) return erro;
  const roles = user.roles || [];

  try {
    const body = await req.json();

    if (body.action === "download") {
      const parsed = DownloadSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Documento inválido" }, { status: 400 });
      const document = await prisma.document.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, nome: true, mimeType: true, base64Data: true, urlArquivo: true, estrategia: true, confidencial: true, categoria: true, status: true },
      });
      if (!document || document.status === "arquivado") return NextResponse.json({ error: "Documento não encontrado ou arquivado" }, { status: 404 });
      if (document.confidencial && !podeVerConfidencial(roles, document.categoria)) return NextResponse.json({ error: "Documento confidencial — acesso restrito" }, { status: 403 });
      await registrarAuditoria({ userId: user.id, action: "DOWNLOAD", module: "documentos", entityType: "Document", entityId: document.id });
      const { confidencial: _, categoria: __, ...publicDocument } = document;
      return NextResponse.json({ doc: publicDocument });
    }

    if (body.action === "update_status") {
      const parsed = StatusSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Status inválido" }, { status: 400 });
      const current = await prisma.document.findUnique({ where: { id: parsed.data.id } });
      if (!current) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
      if (!podeGerenciarCategoria(roles, current.categoria)) return NextResponse.json({ error: "Seu perfil não pode alterar este documento" }, { status: 403 });
      if (current.status === "substituido" && parsed.data.status === "ativo") return NextResponse.json({ error: "Versão substituída não pode ser reativada" }, { status: 409 });
      const document = await prisma.document.update({ where: { id: current.id }, data: { status: parsed.data.status } });
      await registrarAuditoria({ userId: user.id, action: "STATUS_CHANGE", module: "documentos", entityType: "Document", entityId: document.id, oldValues: { status: current.status }, newValues: { status: document.status } });
      return NextResponse.json({ success: true, doc: document });
    }

    if (body.action === "arquivar") {
      const parsed = ArquivarSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Arquivamento inválido" }, { status: 400 });
      const current = await prisma.document.findUnique({ where: { id: parsed.data.id } });
      if (!current) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
      if (!podeGerenciarCategoria(roles, current.categoria)) return NextResponse.json({ error: "Seu perfil não pode arquivar este documento" }, { status: 403 });
      const document = await prisma.document.update({ where: { id: current.id }, data: { status: "arquivado" } });
      await registrarAuditoria({ userId: user.id, action: "ARQUIVAR", module: "documentos", entityType: "Document", entityId: document.id, oldValues: { status: current.status }, newValues: { status: "arquivado", motivo: parsed.data.motivo || null } });
      return NextResponse.json({ success: true, doc: document });
    }

    if (body.action === "nova_versao") {
      const parsed = NovaVersaoSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Nova versão inválida" }, { status: 400 });
      const input = parsed.data;
      const current = await prisma.document.findUnique({ where: { id: input.documentoPaiId } });
      if (!current) return NextResponse.json({ error: "Documento original não encontrado" }, { status: 404 });
      const categoria = input.categoria || current.categoria;
      if (!podeGerenciarCategoria(roles, categoria)) return NextResponse.json({ error: "Seu perfil não pode versionar este documento" }, { status: 403 });
      const storageError = validarArmazenamento({ estrategia: input.estrategia, urlArquivo: input.urlArquivo, base64Data: input.base64Data, tamanhoKb: input.tamanhoKb });
      if (storageError) return NextResponse.json({ error: storageError }, { status: 400 });
      const linkError = await validarVinculos({ clienteId: input.clienteId ?? current.clienteId, contratoId: input.contratoId ?? current.contratoId, funcionarioId: input.funcionarioId ?? current.funcionarioId });
      if (linkError) return NextResponse.json({ error: linkError }, { status: 409 });
      const validade = input.validade ? parseDataOperacional(input.validade) : null;
      if (input.validade && !validade) return NextResponse.json({ error: "Validade inválida" }, { status: 400 });

      const document = await prisma.$transaction(async (tx) => {
        await tx.document.update({ where: { id: current.id }, data: { status: "substituido" } });
        return tx.document.create({
          data: {
            nome: input.nome || current.nome,
            descricao: input.descricao ?? current.descricao,
            categoria,
            subcategoria: input.subcategoria ?? current.subcategoria,
            tags: input.tags ?? current.tags,
            clienteId: input.clienteId ?? current.clienteId,
            contratoId: input.contratoId ?? current.contratoId,
            funcionarioId: input.funcionarioId ?? current.funcionarioId,
            estrategia: input.estrategia,
            urlArquivo: input.urlArquivo || null,
            base64Data: input.base64Data || null,
            mimeType: input.mimeType || null,
            tamanhoKb: input.tamanhoKb ?? null,
            validade,
            status: "ativo",
            versao: current.versao + 1,
            documentoPaiId: current.id,
            uploadBy: user.name || user.email || user.id,
            confidencial: input.confidencial ?? current.confidencial,
          },
        });
      });
      await registrarAuditoria({ userId: user.id, action: "NOVA_VERSAO", module: "documentos", entityType: "Document", entityId: document.id, oldValues: { id: current.id, versao: current.versao, status: current.status }, newValues: { id: document.id, versao: document.versao, changeReason: input.changeReason } });
      return NextResponse.json({ success: true, doc: document }, { status: 201 });
    }

    const { data: validDocument, erro: validationError } = validar(DocumentoSchema, body);
    if (validationError) return validationError;
    if (!podeGerenciarCategoria(roles, validDocument.categoria)) return NextResponse.json({ error: "Seu perfil não pode cadastrar documento nesta categoria" }, { status: 403 });
    const storageError = validarArmazenamento(validDocument);
    if (storageError) return NextResponse.json({ error: storageError }, { status: 400 });
    const linkError = await validarVinculos(validDocument);
    if (linkError) return NextResponse.json({ error: linkError }, { status: 409 });
    const validade = validDocument.validade ? parseDataOperacional(validDocument.validade) : null;
    if (validDocument.validade && !validade) return NextResponse.json({ error: "Validade inválida" }, { status: 400 });

    const document = await prisma.document.create({
      data: {
        nome: validDocument.nome,
        descricao: validDocument.descricao || null,
        categoria: validDocument.categoria,
        subcategoria: validDocument.subcategoria || null,
        tags: validDocument.tags || null,
        clienteId: validDocument.clienteId || null,
        contratoId: validDocument.contratoId || null,
        funcionarioId: validDocument.funcionarioId || null,
        estrategia: validDocument.estrategia || "url",
        urlArquivo: validDocument.urlArquivo || null,
        base64Data: validDocument.base64Data || null,
        mimeType: validDocument.mimeType || null,
        tamanhoKb: validDocument.tamanhoKb || null,
        validade,
        status: "ativo",
        versao: 1,
        confidencial: validDocument.confidencial || false,
        uploadBy: user.name || user.email || user.id,
      },
    });
    await registrarAuditoria({ userId: user.id, action: "CRIAR", module: "documentos", entityType: "Document", entityId: document.id, newValues: { nome: document.nome, categoria: document.categoria, subcategoria: document.subcategoria, versao: document.versao, confidencial: document.confidencial } });
    return NextResponse.json({ success: true, doc: document }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2025") return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    return erroInterno(error, "api/documentos POST");
  }
}
