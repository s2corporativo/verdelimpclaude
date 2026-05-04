// src/app/api/documentos/route.ts
// GED — Gerenciador Eletrônico de Documentos Verdelimp
// Estratégias de armazenamento:
//   "base64" — arquivo codificado em base64 direto no PostgreSQL (até 2MB)
//   "url"    — link externo: Google Drive, OneDrive, Dropbox, qualquer URL
//   "gdrive" — link Google Drive com metadados
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Categorias e subcategorias do GED
export const CATEGORIAS: Record<string, { label: string; icon: string; subs: string[] }> = {
  contrato:   { label: "Contratos",          icon: "📋", subs: ["Contrato Assinado","Aditivo","Ata de Reunião","Ordem de Serviço","Medição","Proposta"] },
  fiscal:     { label: "Fiscal & Tributário", icon: "💸", subs: ["NFS-e","DAS","Certidão CND","Certidão FGTS","Certidão INSS","Certidão Municipal","Certidão Trabalhista"] },
  rh:         { label: "RH & Funcionários",   icon: "👷", subs: ["Contrato de Trabalho","ASO","CTPS","Ficha EPI","Certificado NR","Holerite","Afastamento"] },
  juridico:   { label: "Jurídico",            icon: "⚖️",  subs: ["Contrato Social","Procuração","Certidão Junta Comercial","Ata de Assembleia","Declaração"] },
  licitacao:  { label: "Licitações",          icon: "🏛️", subs: ["Edital","Proposta Enviada","Habilitação","Ata de Julgamento","Impugnação","Recurso"] },
  tecnico:    { label: "Técnico/Operacional", icon: "🔧", subs: ["ART","POP","PCMSO","PPRA/PGR","Laudo","Plano de Trabalho","Certificado de Dedetização","Foto de Serviço"] },
  outro:      { label: "Outros",              icon: "📁", subs: ["Correspondência","Nota Fiscal Entrada","Orçamento Fornecedor","Comprovante Pagamento"] },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria");
  const busca = searchParams.get("busca");
  const contratoId = searchParams.get("contratoId");
  const clienteId = searchParams.get("clienteId");
  const vencendo = searchParams.get("vencendo"); // dias
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 50);

  // Retornar categorias disponíveis
  if (searchParams.get("action") === "categorias") {
    return NextResponse.json({ categorias: CATEGORIAS });
  }

  try {
    const where: any = {};
    if (categoria) where.categoria = categoria;
    if (contratoId) where.contratoId = contratoId;
    if (clienteId) where.clienteId = clienteId;
    if (busca) where.OR = [
      { nome: { contains: busca, mode: "insensitive" } },
      { descricao: { contains: busca, mode: "insensitive" } },
      { tags: { contains: busca, mode: "insensitive" } },
    ];
    if (vencendo) {
      const ate = new Date(Date.now() + Number(vencendo) * 86400000);
      where.validade = { lte: ate, gte: new Date() };
    }

    const [docs, total] = await Promise.all([
      prisma.document.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, nome: true, descricao: true, categoria: true,
          subcategoria: true, tags: true, clienteId: true, contratoId: true,
          funcionarioId: true, estrategia: true, urlArquivo: true,
          mimeType: true, tamanhoKb: true, validade: true, status: true,
          versao: true, confidencial: true, uploadBy: true,
          createdAt: true, updatedAt: true,
          // base64Data NUNCA incluído no listagem (payload)
        },
      }),
      prisma.document.count({ where }),
    ]);

    // Alertas de vencimento
    const hoje = new Date();
    const em30 = new Date(Date.now() + 30 * 86400000);
    const vencidos = await prisma.document.count({ where: { validade: { lt: hoje }, status: "ativo" } });
    const vencendo30 = await prisma.document.count({ where: { validade: { gte: hoje, lte: em30 }, status: "ativo" } });

    // Stats por categoria
    const statsCat = await prisma.document.groupBy({
      by: ["categoria"],
      _count: { id: true },
      where: { status: "ativo" },
    });

    if (!docs.length && total === 0) {
      return NextResponse.json({ docs: DEMO_DOCS, total: DEMO_DOCS.length, page, vencidos: 2, vencendo30: 3, statsCat: DEMO_STATS, categorias: CATEGORIAS, _demo: true });
    }

    return NextResponse.json({ docs, total, page, vencidos, vencendo30, statsCat, categorias: CATEGORIAS });
  } catch {
    return NextResponse.json({ docs: DEMO_DOCS, total: DEMO_DOCS.length, page: 1, vencidos: 2, vencendo30: 3, statsCat: DEMO_STATS, categorias: CATEGORIAS, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Buscar base64 de um documento (download)
    if (action === "download") {
      const doc = await prisma.document.findUnique({
        where: { id: body.id },
        select: { id: true, nome: true, mimeType: true, base64Data: true, urlArquivo: true, estrategia: true },
      });
      if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
      return NextResponse.json({ doc });
    }

    // Atualizar status / mover para arquivo
    if (action === "update_status") {
      const doc = await prisma.document.update({
        where: { id: body.id },
        data: { status: body.status },
      });
      return NextResponse.json({ success: true, doc });
    }

    // Criar nova versão de um documento
    if (action === "nova_versao") {
      // Arquivar versão anterior
      await prisma.document.update({
        where: { id: body.documentoPaiId },
        data: { status: "substituido" },
      });
      const ant = await prisma.document.findUnique({ where: { id: body.documentoPaiId } });
      const doc = await prisma.document.create({
        data: {
          nome: body.nome || ant?.nome || "",
          descricao: body.descricao || ant?.descricao || null,
          categoria: body.categoria || ant?.categoria || "outro",
          subcategoria: body.subcategoria || ant?.subcategoria || null,
          tags: body.tags || ant?.tags || null,
          clienteId: body.clienteId || ant?.clienteId || null,
          contratoId: body.contratoId || ant?.contratoId || null,
          funcionarioId: body.funcionarioId || ant?.funcionarioId || null,
          estrategia: body.estrategia || "url",
          urlArquivo: body.urlArquivo || null,
          base64Data: body.base64Data || null,
          mimeType: body.mimeType || null,
          tamanhoKb: body.tamanhoKb || null,
          validade: body.validade ? new Date(body.validade) : null,
          versao: (ant?.versao || 1) + 1,
          documentoPaiId: body.documentoPaiId,
          uploadBy: body.uploadBy || null,
          confidencial: body.confidencial || false,
        },
      });
      return NextResponse.json({ success: true, doc });
    }

    // Deletar (soft — muda para arquivado)
    if (action === "arquivar") {
      const doc = await prisma.document.update({
        where: { id: body.id },
        data: { status: "arquivado" },
      });
      return NextResponse.json({ success: true, doc });
    }

    // Criar novo documento
    if (!body.nome || !body.categoria) {
      return NextResponse.json({ error: "Nome e categoria obrigatórios" }, { status: 400 });
    }

    // Validar tamanho base64 (máx 2MB)
    if (body.base64Data && body.base64Data.length > 2_800_000) {
      return NextResponse.json({ error: "Arquivo muito grande para armazenamento direto. Use um link externo (Google Drive, etc.)" }, { status: 413 });
    }

    const doc = await prisma.document.create({
      data: {
        nome: body.nome,
        descricao: body.descricao || null,
        categoria: body.categoria,
        subcategoria: body.subcategoria || null,
        tags: body.tags || null,
        clienteId: body.clienteId || null,
        contratoId: body.contratoId || null,
        funcionarioId: body.funcionarioId || null,
        estrategia: body.estrategia || "url",
        urlArquivo: body.urlArquivo || null,
        base64Data: body.base64Data || null,
        mimeType: body.mimeType || null,
        tamanhoKb: body.tamanhoKb || null,
        validade: body.validade ? new Date(body.validade) : null,
        versao: 1,
        confidencial: body.confidencial || false,
        uploadBy: body.uploadBy || null,
      },
    });

    return NextResponse.json({ success: true, doc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── Dados demo ────────────────────────────────────────────────────
const DEMO_DOCS = [
  { id:"d1", nome:"Contrato CEMIG PRADA 2026 — Assinado", categoria:"contrato", subcategoria:"Contrato Assinado", tags:"cemig,prada,2026", clienteId:"cli-cemig", estrategia:"url", urlArquivo:"https://drive.google.com/...", mimeType:"application/pdf", tamanhoKb:380, validade:"2027-03-01", status:"ativo", versao:1, confidencial:true, createdAt:"2026-01-15" },
  { id:"d2", nome:"CND Federal — Jan/2026", categoria:"fiscal", subcategoria:"Certidão CND", tags:"receita,certidao", estrategia:"url", urlArquivo:"https://...", mimeType:"application/pdf", tamanhoKb:42, validade:"2026-07-15", status:"ativo", versao:1, confidencial:false, createdAt:"2026-01-10" },
  { id:"d3", nome:"Certidão FGTS — Fev/2026", categoria:"fiscal", subcategoria:"Certidão FGTS", tags:"caixa,fgts", estrategia:"url", mimeType:"application/pdf", tamanhoKb:38, validade:"2026-04-30", status:"ativo", versao:1, confidencial:false, createdAt:"2026-02-05" },
  { id:"d4", nome:"ASO Abrão Felipe — 2026", categoria:"rh", subcategoria:"ASO", tags:"aso,admissional", funcionarioId:"emp-1", estrategia:"url", mimeType:"application/pdf", tamanhoKb:120, validade:"2027-01-20", status:"ativo", versao:1, confidencial:true, createdAt:"2026-01-20" },
  { id:"d5", nome:"Edital PBH Canteiros Norte 2026", categoria:"licitacao", subcategoria:"Edital", tags:"pbh,canteiros,pregao", clienteId:"cli-pbh", estrategia:"url", urlArquivo:"https://pncp.gov.br/...", mimeType:"application/pdf", tamanhoKb:850, validade:null, status:"ativo", versao:1, confidencial:false, createdAt:"2026-03-10" },
  { id:"d6", nome:"ART CREA-MG — Contrato CEMIG 2026", categoria:"tecnico", subcategoria:"ART", tags:"crea,art,cemig", contratoId:"c1", estrategia:"url", mimeType:"application/pdf", tamanhoKb:95, validade:"2027-01-14", status:"ativo", versao:2, confidencial:false, createdAt:"2026-01-16" },
  { id:"d7", nome:"Contrato Social — Última Alteração", categoria:"juridico", subcategoria:"Contrato Social", tags:"junta,constitutivo", estrategia:"url", mimeType:"application/pdf", tamanhoKb:620, validade:null, status:"ativo", versao:3, confidencial:true, createdAt:"2025-06-01" },
  { id:"d8", nome:"Certidão Municipal Betim — Vencida", categoria:"fiscal", subcategoria:"Certidão Municipal", tags:"betim,iss,municipal", estrategia:"url", mimeType:"application/pdf", tamanhoKb:35, validade:"2026-03-30", status:"vencido", versao:1, confidencial:false, createdAt:"2025-10-01" },
];

const DEMO_STATS = [
  { categoria:"contrato",  _count:{ id:12 }},
  { categoria:"fiscal",    _count:{ id:24 }},
  { categoria:"rh",        _count:{ id:31 }},
  { categoria:"juridico",  _count:{ id:5  }},
  { categoria:"licitacao", _count:{ id:8  }},
  { categoria:"tecnico",   _count:{ id:15 }},
  { categoria:"outro",     _count:{ id:3  }},
];
