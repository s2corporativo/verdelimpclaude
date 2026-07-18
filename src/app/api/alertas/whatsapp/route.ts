// src/app/api/alertas/whatsapp/route.ts
// Módulo WhatsApp DESATIVADO por decisão operacional (jul/2026).
// A rota permanece para não quebrar clientes antigos, mas não lista nem envia
// nada. Os alertas seguem na Central de Alertas (/api/alertas) e a análise de
// cotações/contratos migrou para /api/email-analise.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DESATIVADO = {
  desativado: true,
  message: "Módulo WhatsApp desativado. Use a Central de Alertas e o módulo de E-mail (Cotações & Contratos).",
};

export async function GET() {
  return NextResponse.json({ ...DESATIVADO, total: 0, alertas: [], provider: "disabled", configured: false }, { status: 410 });
}

export async function POST() {
  return NextResponse.json(DESATIVADO, { status: 410 });
}
