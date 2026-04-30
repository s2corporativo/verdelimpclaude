// src/app/api/alertas/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { enviarWhatsApp, verificarAlertas } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

// GET — listar alertas pendentes
export async function GET() {
  try {
    const alertas = await verificarAlertas(prisma);
    return NextResponse.json({
      total: alertas.length,
      alertas,
      provider: process.env.WHATSAPP_PROVIDER || "disabled",
      configured: process.env.WHATSAPP_PROVIDER !== "disabled" && !!process.env.EVOLUTION_API_URL,
    });
  } catch (e: any) {
    return NextResponse.json({ total: 0, alertas: [], provider: "disabled", configured: false, error: e.message });
  }
}

// POST — enviar alerta específico ou todos
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Enviar alerta específico
    if (body.tipo && body.destinatario && body.dados) {
      const result = await enviarWhatsApp({ tipo: body.tipo, destinatario: body.destinatario, dados: body.dados });
      return NextResponse.json(result);
    }

    // Enviar todos os alertas pendentes
    if (body.enviarTodos) {
      const alertas = await verificarAlertas(prisma);
      const resultados = [];
      for (const alerta of alertas) {
        const r = await enviarWhatsApp(alerta);
        resultados.push({ ...alerta, resultado: r });
        // Rate limit: 1 mensagem por segundo
        await new Promise(res => setTimeout(res, 1000));
      }
      return NextResponse.json({ enviados: resultados.length, resultados });
    }

    // Testar conexão
    if (body.testar) {
      const r = await enviarWhatsApp({
        tipo: "proposta_aprovada",
        destinatario: body.numero || process.env.WHATSAPP_ADMIN_NUMBER || "5531999990000",
        dados: { numero: "TESTE", cliente: "Verdelimp ERP", valor: "0,00" },
      });
      return NextResponse.json(r);
    }

    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
