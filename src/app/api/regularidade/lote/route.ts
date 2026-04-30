// src/app/api/regularidade/lote/route.ts
// Verificação em lote de regularidade fiscal de clientes e fornecedores
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchWithCache } from "@/lib/api-cache";

export async function GET() {
  try {
    // Buscar todos os clientes e fornecedores com CNPJ
    const [clientes, fornecedores] = await Promise.all([
      prisma.client.findMany({ where: { deletedAt: null, cnpjCpf: { not: null } }, select: { id: true, name: true, cnpjCpf: true, situacao: true } }),
      prisma.supplier.findMany({ where: { deletedAt: null, cnpj: { not: null } }, select: { id: true, name: true, cnpj: true, situacao: true } }),
    ]);

    const total = clientes.length + fornecedores.length;

    // Consultar situação atual de cada um (com cache de 6h)
    const resultados: any[] = [];

    for (const c of clientes) {
      const cnpj = (c.cnpjCpf || "").replace(/\D/g, "");
      if (cnpj.length === 14) {
        try {
          const { data } = await fetchWithCache(
            `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
            `regularidade:cnpj:${cnpj}`,
            "brasilapi-cnpj",
            3_600_000 * 6
          ) as { data: any; cached: boolean };
          const situacao = (data.descricao_situacao_cadastral || data.situacao_cadastral || "DESCONHECIDA").toUpperCase();
          resultados.push({
            id: c.id, tipo: "cliente", nome: c.name, cnpj: c.cnpjCpf,
            situacao, regularidade: situacao === "ATIVA" ? "regular" : situacao === "SUSPENSA" ? "pendente" : "irregular",
          });
        } catch {
          resultados.push({ id: c.id, tipo: "cliente", nome: c.name, cnpj: c.cnpjCpf, situacao: c.situacao || "NÃO CONSULTADO", regularidade: "desconhecida" });
        }
      }
    }

    for (const f of fornecedores) {
      const cnpj = (f.cnpj || "").replace(/\D/g, "");
      if (cnpj.length === 14) {
        try {
          const { data } = await fetchWithCache(
            `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
            `regularidade:cnpj:${cnpj}`,
            "brasilapi-cnpj",
            3_600_000 * 6
          ) as { data: any; cached: boolean };
          const situacao = (data.descricao_situacao_cadastral || data.situacao_cadastral || "DESCONHECIDA").toUpperCase();
          resultados.push({
            id: f.id, tipo: "fornecedor", nome: f.name, cnpj: f.cnpj,
            situacao, regularidade: situacao === "ATIVA" ? "regular" : situacao === "SUSPENSA" ? "pendente" : "irregular",
          });
        } catch {
          resultados.push({ id: f.id, tipo: "fornecedor", nome: f.name, cnpj: f.cnpj, situacao: f.situacao || "NÃO CONSULTADO", regularidade: "desconhecida" });
        }
      }
    }

    return NextResponse.json({
      total, consultados: resultados.length,
      regulares: resultados.filter(r => r.regularidade === "regular").length,
      irregulares: resultados.filter(r => r.regularidade === "irregular").length,
      pendentes: resultados.filter(r => r.regularidade === "pendente").length,
      desconhecidos: resultados.filter(r => r.regularidade === "desconhecida").length,
      resultados,
    });
  } catch {
    return NextResponse.json({ ...DEMO_LOTE, _demo: true });
  }
}

const DEMO_LOTE = {
  total: 9, consultados: 9,
  regulares: 7, irregulares: 0, pendentes: 1, desconhecidos: 1,
  resultados: [
    { id: "c1", tipo: "cliente", nome: "Prefeitura de BH", cnpj: "17.317.344/0001-19", situacao: "ATIVA", regularidade: "regular" },
    { id: "c2", tipo: "cliente", nome: "CEMIG", cnpj: "17.038.582/0001-53", situacao: "ATIVA", regularidade: "regular" },
    { id: "c3", tipo: "cliente", nome: "Copasa", cnpj: "17.054.027/0001-78", situacao: "ATIVA", regularidade: "regular" },
    { id: "f1", tipo: "fornecedor", nome: "Fornecedor Demo", cnpj: "00.000.000/0001-00", situacao: "NÃO CONSULTADO", regularidade: "desconhecida" },
    { id: "f2", tipo: "fornecedor", nome: "Loja de EPI Exemplo", cnpj: "00.000.000/0001-01", situacao: "ATIVA", regularidade: "regular" },
  ],
};
