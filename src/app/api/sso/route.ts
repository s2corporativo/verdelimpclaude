// Painel SSO — situação de cada funcionário (ASO, treinamentos NR, EPI)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function statusValidade(expiresAt?: Date | null): "valido" | "a_vencer" | "vencido" | "ausente" {
  if (!expiresAt) return "ausente";
  const dias = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "a_vencer";
  return "valido";
}

export async function GET() {
  try {
    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: {
        trainings: { orderBy: { expiresAt: "desc" } },
        docs: { orderBy: { expiresAt: "desc" } },
        epiDeliveries: { orderBy: { deliveryDate: "desc" }, take: 1 },
        asoExams: { orderBy: { examDate: "desc" } },
      },
    });

    const data = funcionarios.map((f) => {
      // ASO real vem da tabela AsoExam (módulo ASO). Fallback para treinamento/doc
      // rotulado "ASO" apenas por compatibilidade com cadastros antigos.
      const asoExame = f.asoExams[0];
      const asoTraining = f.trainings.find((t) => t.trainingType.toUpperCase().includes("ASO"));
      const asoDoc = f.docs.find((d) => d.docType.toUpperCase().includes("ASO"));
      const aso = asoExame?.expiresAt || asoTraining?.expiresAt || asoDoc?.expiresAt || null;
      const nrs = f.trainings.filter((t) => t.trainingType.toUpperCase().startsWith("NR"));
      const piorNr = nrs.length === 0 ? "ausente"
        : nrs.some((t) => statusValidade(t.expiresAt) === "vencido") ? "vencido"
        : nrs.some((t) => statusValidade(t.expiresAt) === "a_vencer") ? "a_vencer" : "valido";
      const ultimaEpi = f.epiDeliveries[0]?.deliveryDate || null;

      return {
        id: f.id,
        nome: f.name,
        funcao: f.role,
        cpf: f.cpf,
        aso: { status: statusValidade(aso), validade: aso },
        nrs: { status: piorNr, total: nrs.length },
        epi: { ultimaEntrega: ultimaEpi },
      };
    });

    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, data: [] }, { status: 500 });
  }
}
