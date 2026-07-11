// Checklist de Documentos — reconhece os documentos exigidos pelo escopo
// (tipo de serviço ou contrato) e lista os funcionários disponíveis
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checklistDoEscopo } from "@/lib/docs-funcionario";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get("contratoId") || undefined;
    let tipoServico = searchParams.get("tipoServico") || "";
    let contrato: any = null;

    if (contratoId) {
      contrato = await prisma.contract.findUnique({
        where: { id: contratoId },
        include: {
          client: { select: { name: true } },
          mobilizations: { where: { status: "ativa" }, select: { employeeId: true } },
        },
      });
      if (contrato && !tipoServico) tipoServico = contrato.object;
    }
    if (!tipoServico) tipoServico = "Serviços de conservação e limpeza";

    const idsMobilizados = new Set<string>((contrato?.mobilizations || []).map((m: any) => m.employeeId));

    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, cpf: true },
    });

    const contratos = await prisma.contract.findMany({
      where: { status: "Ativo" },
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true, object: true, client: { select: { name: true } } },
      take: 50,
    });

    return NextResponse.json({
      checklist: checklistDoEscopo(tipoServico),
      tipoServico,
      contrato: contrato ? { id: contrato.id, numero: contrato.number, objeto: contrato.object, contratante: contrato.client?.name, local: contrato.notes } : null,
      funcionarios: funcionarios.map((f) => ({ ...f, mobilizado: idsMobilizados.has(f.id) })),
      contratos: contratos.map((c) => ({ id: c.id, numero: c.number, objeto: c.object, contratante: c.client?.name })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, checklist: [], funcionarios: [], contratos: [] }, { status: 500 });
  }
}
