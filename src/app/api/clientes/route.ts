// src/app/api/clientes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clientes = await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    if (clientes.length === 0) return NextResponse.json({ data: DEMO_CLIENTES, _demo: true });
    return NextResponse.json({ data: clientes });
  } catch {
    return NextResponse.json({ data: DEMO_CLIENTES, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

    // Enriquecer com dados do CNPJ se não preenchido
    if (body.cnpjCpf && !body.municipio) {
      try {
        const clean = body.cnpjCpf.replace(/\D/g, "");
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const d = await res.json();
          if (!d.message) {
            body.municipio = body.municipio || d.municipio;
            body.uf = body.uf || d.uf;
            body.situacao = d.descricao_situacao_cadastral || d.situacao_cadastral;
          }
        }
      } catch { /* Continuar sem dados da API */ }
    }

    const cliente = await prisma.client.create({
      data: {
        name: body.name,
        cnpjCpf: body.cnpjCpf || null,
        type: body.type || "juridica",
        category: body.category || "Público",
        email: body.email,
        phone: body.phone,
        contact: body.contact,
        logradouro: body.logradouro,
        municipio: body.municipio,
        uf: body.uf,
        cep: body.cep,
        situacao: body.situacao,
        notes: body.notes,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_CLIENTES = [
  { id: "c1", name: "Prefeitura de Belo Horizonte", cnpjCpf: "17.317.344/0001-19", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA" },
  { id: "c2", name: "CEMIG", cnpjCpf: "17.038.582/0001-53", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA" },
  { id: "c3", name: "Copasa", cnpjCpf: "17.054.027/0001-78", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA" },
];
