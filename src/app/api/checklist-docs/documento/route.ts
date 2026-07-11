// Gera automaticamente os documentos marcados no checklist,
// um por página, para cada funcionário selecionado
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarPacoteDocs, type FuncionarioDoc } from "@/lib/docs-funcionario";

export const dynamic = "force-dynamic";

const fmtData = (d?: Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : undefined);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itens = (searchParams.get("itens") || "").split(",").filter(Boolean);
    const funcionarioIds = (searchParams.get("funcionarios") || "").split(",").filter(Boolean);
    const contratoId = searchParams.get("contratoId") || undefined;
    let tipoServico = searchParams.get("tipoServico") || "";
    let contratante = searchParams.get("contratante") || undefined;
    let local = searchParams.get("local") || undefined;

    if (itens.length === 0) return new NextResponse("Nenhum documento selecionado no checklist", { status: 400 });
    if (funcionarioIds.length === 0) return new NextResponse("Nenhum funcionário selecionado", { status: 400 });

    let contratoNumero: string | undefined;
    let objeto: string | undefined;
    if (contratoId) {
      const contrato = await prisma.contract.findUnique({ where: { id: contratoId }, include: { client: { select: { name: true } } } });
      if (contrato) {
        contratoNumero = contrato.number;
        objeto = contrato.object;
        if (!tipoServico) tipoServico = contrato.object;
        if (!contratante) contratante = contrato.client?.name || undefined;
      }
    }
    if (!tipoServico) tipoServico = "Serviços de conservação e limpeza";

    const [config, funcionarios] = await Promise.all([
      prisma.companyConfig.findFirst(),
      prisma.employee.findMany({
        where: { id: { in: funcionarioIds } },
        orderBy: { name: "asc" },
        include: {
          trainings: { orderBy: { expiresAt: "desc" } },
          epiDeliveries: { orderBy: { deliveryDate: "desc" }, take: 15, include: { item: { select: { description: true } } } },
        },
      }),
    ]);

    if (funcionarios.length === 0) return new NextResponse("Funcionários não encontrados", { status: 404 });

    const html = gerarPacoteDocs({
      empresa: {
        razaoSocial: config?.razaoSocial || "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
        cnpj: config?.cnpj || "30.198.776/0001-29",
        endereco: `${config?.logradouro || "R. Primeiro de Janeiro, 415"} – ${config?.bairro || "Amazonas"}, ${config?.municipio || "Betim"}/${config?.uf || "MG"}`,
        telefone: config?.telefone || "(31) 3591-4546",
        email: config?.email?.toLowerCase() || "adm@verdelimp.com.br",
      },
      escopo: { tipoServico, contratante, objeto, local, contratoNumero },
      itens,
      contatoEmergencia: searchParams.get("contatoEmergencia") || undefined,
      responsavelSesmt: searchParams.get("responsavelSesmt") || undefined,
      funcionarios: funcionarios.map((f): FuncionarioDoc => ({
        nome: f.name,
        cpf: f.cpf || undefined,
        funcao: f.role,
        admissao: fmtData(f.admissionDate),
        treinamentos: f.trainings.map((t) => ({ tipo: t.trainingType, validade: fmtData(t.expiresAt) })),
        epis: f.epiDeliveries.map((e) => ({
          item: e.item?.description || "EPI",
          quantidade: e.quantity,
          dataEntrega: fmtData(e.deliveryDate) || "—",
          ca: e.caNumber || undefined,
          validadeCa: fmtData(e.caExpirationDate),
        })),
      })),
    });

    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
