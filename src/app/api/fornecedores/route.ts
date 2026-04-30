import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const data = await prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
    if (data.length === 0) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ data: DEMO, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    // Auto-enriquecer CNPJ via Receita Federal se município não preenchido
    if (body.cnpj && !body.municipio) {
      try {
        const clean = body.cnpj.replace(/\D/g, "");
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const d = await res.json();
          if (!d.message) { body.municipio = body.municipio || d.municipio; body.uf = body.uf || d.uf; body.situacao = d.descricao_situacao_cadastral; }
        }
      } catch { /* continuar sem API */ }
    }

    const fornecedor = await prisma.supplier.create({
      data: { name: body.name, cnpj: body.cnpj || null, type: body.type, email: body.email, phone: body.phone, municipio: body.municipio, uf: body.uf, situacao: body.situacao },
    });
    return NextResponse.json(fornecedor, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO = [
  { id: "f1", name: "Fornecedor Demonstração Ltda", cnpj: "00.000.000/0001-00", type: "Material", municipio: "Betim", uf: "MG", situacao: "ATIVA" },
  { id: "f2", name: "Loja de EPI Exemplo ME", cnpj: "00.000.000/0001-01", type: "EPI", municipio: "Betim", uf: "MG", situacao: "ATIVA" },
  { id: "f3", name: "Ferramentas Alfa Comércio", cnpj: "00.000.000/0001-02", type: "Ferramentas", municipio: "Betim", uf: "MG", situacao: "ATIVA" },
];
