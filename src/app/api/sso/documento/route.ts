// Documentação SSO — dossiê mensal por funcionário ou consolidado
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarHtmlSso, type SsoDocData, type FuncionarioSso } from "@/lib/sso-doc";

const fmtData = (d?: Date | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : undefined);

function statusValidade(expiresAt?: Date | null): "valido" | "a_vencer" | "vencido" {
  if (!expiresAt) return "vencido";
  const dias = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (dias < 0) return "vencido";
  if (dias <= 30) return "a_vencer";
  return "valido";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const funcionarioId = searchParams.get("funcionarioId") || undefined;
    const competenciaParam = searchParams.get("competencia"); // "2026-07"
    const atividade = searchParams.get("atividade") || "JARDINAGEM";
    const contratante = searchParams.get("contratante") || undefined;
    const contatoEmergencia = searchParams.get("contatoEmergencia") || undefined;
    const responsavelSesmt = searchParams.get("responsavelSesmt") || undefined;

    const indicadores = ["homensHora", "desvios", "incidentes", "tfsa", "tfca"].some((k) => searchParams.get(k))
      ? {
          homensHora: searchParams.get("homensHora") || undefined,
          desvios: searchParams.get("desvios") || undefined,
          incidentes: searchParams.get("incidentes") || undefined,
          tfsa: searchParams.get("tfsa") || undefined,
          tfca: searchParams.get("tfca") || undefined,
        }
      : undefined;

    const base = competenciaParam ? new Date(competenciaParam + "-01T12:00:00") : new Date();
    const competencia = base.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const competenciaLabel = competencia.charAt(0).toUpperCase() + competencia.slice(1);

    const funcionarios = await prisma.employee.findMany({
      where: funcionarioId ? { id: funcionarioId } : { active: true },
      orderBy: { name: "asc" },
      include: {
        trainings: { orderBy: { expiresAt: "desc" } },
        docs: { orderBy: { expiresAt: "desc" } },
        epiDeliveries: { orderBy: { deliveryDate: "desc" }, take: 20, include: { item: { select: { description: true } } } },
      },
    });

    if (funcionarios.length === 0) {
      return new NextResponse("Nenhum funcionário encontrado", { status: 404 });
    }

    const config = await prisma.companyConfig.findFirst();

    const dados: SsoDocData = {
      competencia: competenciaLabel,
      atividade: atividade.toUpperCase(),
      contratante,
      empresa: {
        razaoSocial: config?.razaoSocial || "VERDELIMP SERVICOS E TERCEIRIZACAO LTDA",
        cnpj: config?.cnpj || "30.198.776/0001-29",
        endereco: `${config?.logradouro || "R. Primeiro de Janeiro, 415"} – ${config?.bairro || "Amazonas"}, ${config?.municipio || "Betim"}/${config?.uf || "MG"}`,
        telefone: config?.telefone || "(31) 3591-4546",
        email: config?.email?.toLowerCase() || "adm@verdelimp.com.br",
      },
      contatoEmergencia,
      responsavelSesmt,
      indicadores,
      consolidado: !funcionarioId,
      funcionarios: funcionarios.map((f): FuncionarioSso => ({
        nome: f.name,
        cpf: f.cpf || undefined,
        funcao: f.role,
        admissao: fmtData(f.admissionDate),
        status: f.status,
        treinamentos: f.trainings.map((t) => ({
          tipo: t.trainingType,
          emissao: fmtData(t.issuedAt),
          validade: fmtData(t.expiresAt),
          instituicao: t.institution || undefined,
          status: statusValidade(t.expiresAt),
        })),
        documentos: f.docs.map((doc) => ({
          tipo: doc.docType,
          validade: fmtData(doc.expiresAt),
          status: statusValidade(doc.expiresAt),
        })),
        epis: f.epiDeliveries.map((e) => ({
          item: e.item?.description || "EPI",
          quantidade: e.quantity,
          dataEntrega: fmtData(e.deliveryDate) || "—",
          ca: e.caNumber || undefined,
          validadeCa: fmtData(e.caExpirationDate),
        })),
      })),
    };

    return new NextResponse(gerarHtmlSso(dados), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
