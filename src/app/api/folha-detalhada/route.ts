// Folha gerencial calculada exclusivamente com colaboradores ativos cadastrados.
// A lógica de cálculo vive em src/lib/folha.ts e deve ser validada pela contabilidade.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { linhaFolha, totaisDe, AVISO_FOLHA } from "@/lib/folha";
import { exigirPapel, erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

const HorasExtrasSchema = z.object({
  extras: z.record(z.object({
    he50: z.coerce.number().min(0).max(744).optional(),
    he100: z.coerce.number().min(0).max(744).optional(),
  })).default({}),
});

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;

  try {
    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    const folha = funcionarios.map((funcionario) => linhaFolha(funcionario as any));

    return NextResponse.json({
      folha,
      totais: totaisDe(folha),
      aviso: AVISO_FOLHA,
      fonte: "cadastro_de_colaboradores",
      geradoEm: new Date().toISOString(),
    });
  } catch (e) {
    return erroInterno(e, "api/folha-detalhada GET");
  }
}

// Recalcula a projeção aplicando horas extras informadas apenas nesta requisição.
// As horas não são persistidas como evento de folha.
export async function POST(req: Request) {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;

  try {
    const validacao = HorasExtrasSchema.safeParse(await req.json().catch(() => ({})));
    if (!validacao.success) {
      return NextResponse.json({
        error: validacao.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "),
      }, { status: 400 });
    }

    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    const idsAtivos = new Set(funcionarios.map((funcionario) => funcionario.id));
    const idsInvalidos = Object.keys(validacao.data.extras).filter((id) => !idsAtivos.has(id));
    if (idsInvalidos.length) {
      return NextResponse.json({
        error: "Há horas extras vinculadas a colaborador inexistente ou inativo.",
        idsInvalidos,
      }, { status: 400 });
    }

    const folha = funcionarios.map((funcionario) =>
      linhaFolha(funcionario as any, validacao.data.extras[funcionario.id]),
    );

    return NextResponse.json({
      folha,
      totais: totaisDe(folha),
      aviso: AVISO_FOLHA,
      fonte: "cadastro_de_colaboradores",
      horasExtrasPersistidas: false,
      geradoEm: new Date().toISOString(),
    });
  } catch (e) {
    return erroInterno(e, "api/folha-detalhada POST");
  }
}
