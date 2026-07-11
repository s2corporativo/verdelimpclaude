// Configurações da empresa (CompanyConfig) — restrito a ADMIN
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, registrarAuditoria } from "@/lib/admin";

export async function GET() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const config = await prisma.companyConfig.findFirst();
    return NextResponse.json({ data: config });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req: NextRequest) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const body = await req.json();
    if (!body.razaoSocial || !body.cnpj) {
      return NextResponse.json({ error: "Razão social e CNPJ são obrigatórios" }, { status: 400 });
    }

    const dados = {
      razaoSocial: body.razaoSocial,
      nomeFantasia: body.nomeFantasia || null,
      cnpj: body.cnpj,
      porte: body.porte || null,
      regimeTributario: body.regimeTributario || "Simples Nacional",
      cnaePrincipal: body.cnaePrincipal || null,
      inscMunicipal: body.inscMunicipal || null,
      logradouro: body.logradouro || null,
      bairro: body.bairro || null,
      municipio: body.municipio || null,
      uf: body.uf || null,
      cep: body.cep || null,
      email: body.email || null,
      telefone: body.telefone || null,
      aliqISS: Number(body.aliqISS ?? 5),
      aliqINSS: Number(body.aliqINSS ?? 7),
      aliqIRRF: Number(body.aliqIRRF ?? 1.5),
      aliqFGTS: Number(body.aliqFGTS ?? 8),
      aliqDAS: Number(body.aliqDAS ?? 6.72),
      nomeContador: body.nomeContador || null,
      emailContador: body.emailContador || null,
    };

    const existente = await prisma.companyConfig.findFirst();
    const config = existente
      ? await prisma.companyConfig.update({ where: { id: existente.id }, data: dados })
      : await prisma.companyConfig.create({ data: dados });

    await registrarAuditoria({
      userId: user.id, action: "editar_configuracoes", module: "admin",
      entityType: "CompanyConfig", entityId: config.id,
      oldValues: existente ? { razaoSocial: existente.razaoSocial, email: existente.email, aliqDAS: existente.aliqDAS } : undefined,
      newValues: { razaoSocial: config.razaoSocial, email: config.email, aliqDAS: config.aliqDAS },
    });

    return NextResponse.json({ ok: true, data: config });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "CNPJ já cadastrado em outra configuração" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
