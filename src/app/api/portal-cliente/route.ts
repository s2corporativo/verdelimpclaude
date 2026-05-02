// src/app/api/portal-cliente/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET — valida token e retorna dados do cliente
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const clientId = searchParams.get("clientId");

  // Gerar token para um cliente
  if (clientId && !token) {
    try {
      const expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 dias
      const pt = await prisma.clientPortalToken.create({
        data: { clientId, expiresAt: expires },
      });
      return NextResponse.json({ success: true, token: pt.token, expiresAt: pt.expiresAt });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  if (!token) return NextResponse.json({ error: "Token obrigatório" }, { status: 400 });

  try {
    // Verificar token
    let portalToken: any;
    try {
      portalToken = await prisma.clientPortalToken.findUnique({
        where: { token },
        include: { client: true },
      });
    } catch { return NextResponse.json({ demo: true, ...DEMO_PORTAL }); }

    if (!portalToken || !portalToken.active || new Date(portalToken.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Token inválido ou expirado" }, { status: 401 });
    }

    const cId = portalToken.clientId;

    // Buscar dados do cliente
    const [contratos, medicoes, diarios] = await Promise.all([
      prisma.contract.findMany({ where: { clientId: cId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.measurement.findMany({ where: { contract: { clientId: cId } }, orderBy: { createdAt: "desc" }, take: 20, include: { contract: { select: { number: true } } } }),
      prisma.workDiary.findMany({ where: { contract: { clientId: cId } }, orderBy: { date: "desc" }, take: 30, include: { contract: { select: { number: true } } } }),
    ]);

    return NextResponse.json({
      cliente: portalToken.client,
      contratos,
      medicoes,
      diarios,
      expiresAt: portalToken.expiresAt,
    });
  } catch {
    return NextResponse.json({ demo: true, ...DEMO_PORTAL });
  }
}

// POST — aprovar medição pelo portal
export async function POST(req: NextRequest) {
  try {
    const { token, medicaoId, acao, observacao } = await req.json();
    if (!token || !medicaoId || !acao) {
      return NextResponse.json({ error: "Parâmetros obrigatórios ausentes" }, { status: 400 });
    }

    // Verificar token
    const pt = await prisma.clientPortalToken.findUnique({ where: { token } });
    if (!pt?.active || new Date(pt.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const novoStatus = acao === "aprovar" ? "aprovada" : "contestada";
    const med = await prisma.measurement.update({
      where: { id: medicaoId },
      data: { status: novoStatus, notes: observacao || null, approvedAt: acao === "aprovar" ? new Date() : null },
    });

    return NextResponse.json({ success: true, medicao: med, mensagem: acao === "aprovar" ? "Medição aprovada com sucesso!" : "Contestação registrada. A equipe entrará em contato." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_PORTAL = {
  cliente: { name: "Prefeitura de Belo Horizonte", cnpjCpf: "17.317.344/0001-19", municipio: "Belo Horizonte", uf: "MG" },
  contratos: [
    { id:"c1", number:"CONT-2026-001", object:"Roçada e Manutenção de Canteiros — Cicloviário Norte", value:4560000, monthlyValue:380000, startDate:"2026-01-15", endDate:"2027-01-14", status:"Ativo" },
  ],
  medicoes: [
    { id:"m1", period:"ABR/2026", value:380000, status:"em_elaboracao", startDate:"2026-04-01", endDate:"2026-04-30", contract:{ number:"CONT-2026-001" } },
    { id:"m2", period:"MAR/2026", value:380000, status:"aprovada", startDate:"2026-03-01", endDate:"2026-03-31", contract:{ number:"CONT-2026-001" }, approvedAt:"2026-04-05" },
  ],
  diarios: [
    { id:"d1", date:"2026-04-28", location:"Av. Vilarinho — Canteiros Norte", activitiesDone:"Roçada manual canteiros km 0-5", teamSize:4, weather:"Bom", contract:{ number:"CONT-2026-001" } },
    { id:"d2", date:"2026-04-21", location:"Av. Vilarinho — Canteiros Norte", activitiesDone:"Roçada manual canteiros km 5-10", teamSize:4, weather:"Nublado", contract:{ number:"CONT-2026-001" } },
  ],
};
