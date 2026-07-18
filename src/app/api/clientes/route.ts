// src/app/api/clientes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { erroInterno } from "@/lib/authz";
import { validar, ClienteSchema, ClienteUpdateSchema } from "@/lib/validacao";

export const dynamic = "force-dynamic";

async function userId() {
  const s = await getServerSession(authOptions);
  return (s?.user as any)?.id || null;
}

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
    const bruto = await req.json();
    const { data: body, erro } = validar(ClienteSchema, bruto);
    if (erro) return erro;

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
    await registrarAuditoria({ userId: await userId(), action: "CRIAR", module: "clientes", entityType: "Client", entityId: cliente.id, newValues: { name: cliente.name } });
    return NextResponse.json(cliente, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 409 });
    return erroInterno(e, "api/clientes POST");
  }
}

// Editar cliente
export async function PUT(req: NextRequest) {
  try {
    const bruto = await req.json();
    const { data: b, erro } = validar(ClienteUpdateSchema, bruto);
    if (erro) return erro;
    if (b.name !== undefined && !String(b.name).trim()) return NextResponse.json({ error: "Nome não pode ficar vazio" }, { status: 400 });
    const campos = ["name", "cnpjCpf", "type", "category", "email", "phone", "contact", "logradouro", "municipio", "uf", "cep", "situacao", "notes"] as const;
    const data: any = {};
    for (const k of campos) if ((b as any)[k] !== undefined) data[k] = (b as any)[k] || null;
    const cliente = await prisma.client.update({ where: { id: b.id }, data });
    await registrarAuditoria({ userId: await userId(), action: "EDITAR", module: "clientes", entityType: "Client", entityId: b.id, newValues: data });
    return NextResponse.json(cliente);
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "CNPJ já cadastrado em outro cliente" }, { status: 409 });
    if (e?.code === "P2025") return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return erroInterno(e, "api/clientes PUT");
  }
}

// Excluir (soft delete) — preserva histórico de contratos/propostas vinculados
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const vinculos = await prisma.contract.count({ where: { clientId: id } });
    if (vinculos > 0) return NextResponse.json({ error: `Cliente tem ${vinculos} contrato(s) vinculado(s) — não pode ser excluído.` }, { status: 409 });
    await prisma.client.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    await registrarAuditoria({ userId: await userId(), action: "EXCLUIR", module: "clientes", entityType: "Client", entityId: id });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === "P2025") return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return erroInterno(e, "api/clientes DELETE");
  }
}

const DEMO_CLIENTES = [
  { id: "c1", name: "Prefeitura de Belo Horizonte", cnpjCpf: "17.317.344/0001-19", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA" },
  { id: "c2", name: "CEMIG", cnpjCpf: "17.038.582/0001-53", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA" },
  { id: "c3", name: "Copasa", cnpjCpf: "17.054.027/0001-78", category: "Público", municipio: "Belo Horizonte", uf: "MG", situacao: "ATIVA" },
];
