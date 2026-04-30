// src/app/api/nfe/importar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { parseNFe } from "@/lib/nfe-parser";
import { prisma } from "@/lib/prisma";
import { fetchWithCache } from "@/lib/api-cache";

export const config = { api: { bodyParser: false } };

// POST — importar XML de NF-e
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let xmlContent = "";

    if (contentType.includes("application/xml") || contentType.includes("text/xml")) {
      xmlContent = await req.text();
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      xmlContent = body.xml || body.content || "";
    } else {
      // Tentar ler como texto de qualquer forma
      xmlContent = await req.text();
    }

    if (!xmlContent || !xmlContent.includes("<NFe")) {
      return NextResponse.json(
        { error: "XML inválido — não parece ser uma NF-e. O arquivo deve conter a tag <NFe>." },
        { status: 400 }
      );
    }

    // Parsear o XML
    const nfe = parseNFe(xmlContent);

    if (!nfe.valido && nfe.erros.some(e => e.includes("XML inválido"))) {
      return NextResponse.json({ error: nfe.erros[0], erros: nfe.erros }, { status: 400 });
    }

    // Enriquecer dados do emitente via BrasilAPI se CNPJ disponível
    let dadosFornecedor: any = null;
    if (nfe.emitente.cnpj?.length === 14) {
      try {
        const { data } = await fetchWithCache(
          `https://brasilapi.com.br/api/cnpj/v1/${nfe.emitente.cnpj}`,
          `cnpj:${nfe.emitente.cnpj}`,
          "brasilapi-cnpj",
          86_400_000
        ) as { data: any; cached: boolean };
        if (!data.message) dadosFornecedor = data;
      } catch { /* continuar sem enriquecimento */ }
    }

    // Verificar se NF-e já foi importada (chave de acesso única)
    let existente = null;
    try {
      existente = await prisma.fiscalNfe.findUnique({ where: { accessKey: nfe.chaveAcesso } });
    } catch { /* banco não disponível */ }

    if (existente) {
      return NextResponse.json({
        aviso: "NF-e já importada anteriormente",
        nfe: existente,
        parsed: nfe,
      }, { status: 200 });
    }

    // Buscar ou criar fornecedor
    let fornecedorId: string | undefined;
    if (nfe.emitente.cnpj) {
      try {
        const cnpjFormatado = nfe.emitente.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        const fornecedorExistente = await prisma.supplier.findFirst({ where: { cnpj: { in: [cnpjFormatado, nfe.emitente.cnpj] } } });
        if (fornecedorExistente) {
          fornecedorId = fornecedorExistente.id;
        } else {
          // Criar fornecedor automaticamente
          const novoForn = await prisma.supplier.create({
            data: {
              name: dadosFornecedor?.razao_social || nfe.emitente.razaoSocial,
              cnpj: cnpjFormatado,
              municipio: dadosFornecedor?.municipio || nfe.emitente.municipio,
              uf: dadosFornecedor?.uf || nfe.emitente.uf,
              phone: nfe.emitente.telefone,
              situacao: dadosFornecedor?.descricao_situacao_cadastral || "ATIVA",
            },
          });
          fornecedorId = novoForn.id;
        }
      } catch { /* continuar sem fornecedor */ }
    }

    // Salvar NF-e no banco
    let nfeSalva: any = null;
    try {
      nfeSalva = await prisma.fiscalNfe.create({
        data: {
          accessKey: nfe.chaveAcesso,
          number: nfe.numero,
          series: nfe.serie,
          issueDate: nfe.dataEmissao ? new Date(nfe.dataEmissao) : new Date(),
          entryDate: nfe.dataEntrada ? new Date(nfe.dataEntrada) : new Date(),
          supplierId: fornecedorId || null,
          supplierName: nfe.emitente.razaoSocial,
          supplierCnpj: nfe.emitente.cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"),
          totalAmount: nfe.totais.vNF,
          pisAmount: nfe.totais.vPIS || 0,
          cofinsAmount: nfe.totais.vCOFINS || 0,
          status: "importada",
          notes: nfe.infAdic?.substring(0, 500),
        },
      });
    } catch { /* continuar sem salvar se banco indisponível */ }

    // Sugestões de vinculação com almoxarifado
    const sugestoesAlmoxarifado: any[] = [];
    try {
      for (const item of nfe.itens) {
        const existing = await prisma.inventoryItem.findFirst({
          where: {
            OR: [
              { description: { contains: item.xProd.split(" ")[0], mode: "insensitive" } },
              ...(item.cEAN ? [{ internalCode: item.cEAN }] : []),
            ],
          },
          select: { id: true, internalCode: true, description: true, currentQuantity: true, unit: true },
        });
        sugestoesAlmoxarifado.push({ itemNFe: item, itemAlmox: existing || null, vinculado: !!existing });
      }
    } catch { /* continuar sem sugestões */ }

    return NextResponse.json({
      success: true,
      nfe: nfeSalva,
      parsed: nfe,
      fornecedorId,
      fornecedorCriado: !!(fornecedorId && !existente),
      dadosFornecedorRF: dadosFornecedor ? {
        razaoSocial: dadosFornecedor.razao_social,
        situacao: dadosFornecedor.descricao_situacao_cadastral,
        cnae: dadosFornecedor.cnae_fiscal_descricao,
      } : null,
      sugestoesAlmoxarifado,
      avisos: nfe.erros,
      instrucoes: {
        proximosPasso: [
          "Revisar itens e quantidades importados",
          "Vincular itens da NF-e com itens do almoxarifado",
          "Confirmar entrada no estoque",
          "Lançar despesa correspondente no financeiro",
        ],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro interno" }, { status: 500 });
  }
}
