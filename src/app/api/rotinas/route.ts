import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RotinaItem {
  id: string;
  titulo: string;
  descricao: string;
  frequencia: "diaria" | "semanal" | "mensal";
  categoria: string;
  horario?: string;
  responsavel?: string;
  concluida?: boolean;
  dataConclusao?: string;
  observacao?: string;
}

const HOJE = new Date().toISOString().slice(0, 10);
const DIA_SEMANA = new Date().getDay();
const DIA_MES = new Date().getDate();
const SEMANA_DO_MES = Math.ceil(DIA_MES / 7);

function definirProximaExecucao(frequencia: string, diaSemana: number, diaMes: number): string {
  const hoje = new Date();
  if (frequencia === "diaria") {
    return hoje.toISOString().slice(0, 10);
  }
  if (frequencia === "semanal") {
    const proximoDomingo = new Date(hoje);
    proximoDomingo.setDate(hoje.getDate() + (7 - hoje.getDay()));
    return proximoDomingo.toISOString().slice(0, 10);
  }
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5);
  return proximoMes.toISOString().slice(0, 10);
}

const ROTINAS_BASE: Omit<RotinaItem, "concluida" | "dataConclusao" | "observacao">[] = [
  // ── DIÁRIAS ──
  { id: "d01", titulo: "Verificar e-mails recebidos", descricao: "Conferir caixa de entrada do e-mail corporativo e responder/encaminhar demandas", frequencia: "diaria", categoria: "Comunicação", horario: "08:00", responsavel: "Assistente" },
  { id: "d02", titulo: "Verificar WhatsApp da empresa", descricao: "Conferir mensagens do WhatsApp Business e responder ou encaminhar demandas", frequencia: "diaria", categoria: "Comunicação", horario: "08:00", responsavel: "Assistente" },
  { id: "d03", titulo: "Conferir pendências do dia", descricao: "Verificar tarefas pendentes, prazos do dia e prioridades", frequencia: "diaria", categoria: "Organização", horario: "08:30", responsavel: "Assistente" },
  { id: "d04", titulo: "Atualizar planilhas e controles", descricao: "Manter planilhas financeiras e de controle atualizadas com dados do dia", frequencia: "diaria", categoria: "Financeiro", horario: "17:00", responsavel: "Assistente" },
  { id: "d05", titulo: "Organizar documentos recebidos", descricao: "Classificar e arquivar documentos do dia conforme estrutura de pastas", frequencia: "diaria", categoria: "Documentos", horario: "17:00", responsavel: "Assistente" },
  { id: "d06", titulo: "Verificar notas fiscais e comprovantes", descricao: "Conferir NFS-e emitidas, boletos pagos e comprovantes pendentes", frequencia: "diaria", categoria: "Fiscal", horario: "09:00", responsavel: "Assistente" },
  { id: "d07", titulo: "Registrar informações importantes", descricao: "Anotar demandas, solicitações e comunicados relevantes do dia", frequencia: "diaria", categoria: "Organização", horario: "17:30", responsavel: "Assistente" },
  { id: "d08", titulo: "Informar Luiz Fernando sobre demandas", descricao: "Comunicar solicitações importantes para evitar perda de informações", frequencia: "diaria", categoria: "Comunicação", horario: "17:00", responsavel: "Assistente" },

  // ── SEMANAIS ──
  { id: "s01", titulo: "Revisar pendências da semana", descricao: "Conferir tarefas acumuladas e prazos que se aproximam", frequencia: "semanal", categoria: "Organização", responsavel: "Assistente" },
  { id: "s02", titulo: "Atualizar controle de contratos", descricao: "Verificar status dos contratos ativos, medições e renovações", frequencia: "semanal", categoria: "Contratos", responsavel: "Assistente" },
  { id: "s03", titulo: "Verificar documentos vencidos", descricao: "Conferir ASO, certificados NR, treinamentos e documentos de veículos próximos ao vencimento", frequencia: "semanal", categoria: "Documentos", responsavel: "Assistente" },
  { id: "s04", titulo: "Conferir contas a pagar e receber", descricao: "Revisar boletos pendentes, recebimentos e vencimentos da semana", frequencia: "semanal", categoria: "Financeiro", responsavel: "Assistente" },
  { id: "s05", titulo: "Organizar comprovantes financeiros", descricao: "Separar e arquivar comprovantes de pagamento e recebimento da semana", frequencia: "semanal", categoria: "Financeiro", responsavel: "Assistente" },
  { id: "s06", titulo: "Acompanhar propostas enviadas", descricao: "Verificar status das propostas pendentes e follow-up com clientes", frequencia: "semanal", categoria: "Comercial", responsavel: "Assistente" },
  { id: "s07", titulo: "Conferir relatórios de serviços", descricao: "Receber e organizar relatórios fotográficos das equipes de campo", frequencia: "semanal", categoria: "Operacional", responsavel: "Assistente" },
  { id: "s08", titulo: "Organizar pastas digitais", descricao: "Conferir organização dos arquivos conforme estrutura padrão", frequencia: "semanal", categoria: "Documentos", responsavel: "Assistente" },
  { id: "s09", titulo: "Verificar necessidade de compras", descricao: "Avaliar estoque de materiais, EPIs e ferramentas", frequencia: "semanal", categoria: "Estoque", responsavel: "Assistente" },
  { id: "s10", titulo: "Enviar resumo de pendências", descricao: "Relatório semanal para a diretoria com principais pendências", frequencia: "semanal", categoria: "Organização", responsavel: "Assistente" },
  { id: "s11", titulo: "Solicitar horas extras dos encarregados", descricao: "Pedir planilha de horas extras toda segunda-feira para pagamento no 5º dia útil", frequencia: "semanal", categoria: "RH", responsavel: "Assistente" },

  // ── MENSAIS ──
  { id: "m01", titulo: "Emitir NFS-e SADA Betim (R$ 66.000)", descricao: "Emitir nota fiscal de serviços para SADA Transportes Betim no valor de R$ 66.000,00", frequencia: "mensal", categoria: "Fiscal", horario: "Dia 01", responsavel: "Assistente" },
  { id: "m02", titulo: "Emitir NFS-e SADA Igarapé (R$ 12.000)", descricao: "Emitir nota fiscal de serviços para SADA Transportes Igarapé no valor de R$ 12.000,00", frequencia: "mensal", categoria: "Fiscal", horario: "Dia 01", responsavel: "Assistente" },
  { id: "m03", titulo: "Preparar documentação SADA", descricao: "Separar folha de ponto, contracheque assinado, comprovantes de quitação, VA e FGTS para envio", frequencia: "mensal", categoria: "SADA", horario: "Dia 05-10", responsavel: "Assistente" },
  { id: "m04", titulo: "Solicitar docs à Tatiana (Domínio)", descricao: "Entrar em contato com Tatiana para documentos contábeis e RH (admissão/rescisão)", frequencia: "mensal", categoria: "SADA", horario: "Dia 05", responsavel: "Assistente" },
  { id: "m05", titulo: "Enviar documentação SADA", descricao: "Enviar pasta documental completa para SADA Transportes (dia 05 até dia 10)", frequencia: "mensal", categoria: "SADA", horario: "Dia 05-10", responsavel: "Assistente" },
  { id: "m06", titulo: "Pagamento adiantamento (dia 20)", descricao: "Processar pagamento de adiantamento salarial dos funcionários", frequencia: "mensal", categoria: "RH", horario: "Dia 20", responsavel: "Assistente" },
  { id: "m07", titulo: "Pagamento salários (5º dia útil)", descricao: "Processar pagamento de salários + horas extras até o 5º dia útil do mês seguinte", frequencia: "mensal", categoria: "RH", horario: "5º dia útil", responsavel: "Assistente" },
  { id: "m08", titulo: "Pagar vale-alimentação VR", descricao: "Calcular valor proporcional aos dias trabalhados (R$ 600/mês) e processar no portal VR", frequencia: "mensal", categoria: "RH", horario: "Dia 20", responsavel: "Assistente" },
  { id: "m09", titulo: "Conferir notas fiscais do mês", descricao: "Verificar todas as NFS-e emitidas, pendentes e canceladas do mês", frequencia: "mensal", categoria: "Fiscal", responsavel: "Assistente" },
  { id: "m10", titulo: "Organizar comprovantes de pagamento", descricao: "Separar todos os comprovantes de envio de documentos do mês", frequencia: "mensal", categoria: "Documentos", responsavel: "Assistente" },
  { id: "m11", titulo: "Atualizar controle financeiro mensal", descricao: "Reconciliar receitas e despesas do mês, conferir DRE", frequencia: "mensal", categoria: "Financeiro", responsavel: "Assistente" },
  { id: "m12", titulo: "Verificar contratos ativos e vencimentos", descricao: "Conferir prazos de contratos, reajustes e renovações dos próximos 90 dias", frequencia: "mensal", categoria: "Contratos", responsavel: "Assistente" },
  { id: "m13", titulo: "Conferir documentos de funcionários", descricao: "Validar ASO, treinamentos NR, EPI e fichas cadastrais atualizados", frequencia: "mensal", categoria: "RH", responsavel: "Assistente" },
  { id: "m14", titulo: "Separar documentos para contabilidade", descricao: "Preparar pacote documental para envio ao escritório contábil", frequencia: "mensal", categoria: "Fiscal", responsavel: "Assistente" },
  { id: "m15", titulo: "Controlar despesas fixas e variáveis", descricao: "Atualizar planilha de despesas recorrentes e variáveis do mês", frequencia: "mensal", categoria: "Financeiro", responsavel: "Assistente" },
  { id: "m16", titulo: "Atualizar cadastros", descricao: "Revisar cadastros de clientes, fornecedores e contratos", frequencia: "mensal", categoria: "Organização", responsavel: "Assistente" },
  { id: "m17", titulo: "Apoiar fechamento administrativo", descricao: "Auxiliar na organização do fechamento mensal com a diretoria", frequencia: "mensal", categoria: "Organização", responsavel: "Assistente" },
  { id: "m18", titulo: "Agendar ASO (Samara/Gecontrol)", descricao: "Entrar em contato com Samara para agendamento e retirada de ASOs no portal SOC", frequencia: "mensal", categoria: "SST", horario: "Início do mês", responsavel: "Assistente" },
  { id: "m19", titulo: "Notificar Luiz sobre vencimentos", descricao: "Relatório de contratos, prazos e pendências relevantes para o mês", frequencia: "mensal", categoria: "Organização", responsavel: "Assistente" },
];

function getRotinasDoPeriodo(periodo: string, diaSemana: number, diaMes: number): RotinaItem[] {
  const hoje = new Date();
  return ROTINAS_BASE.map((r) => {
    let ativa = false;
    if (periodo === "diaria" && r.frequencia === "diaria") ativa = true;
    if (periodo === "semanal" && (r.frequencia === "semanal" || r.frequencia === "diaria")) ativa = true;
    if (periodo === "mensal") ativa = true;
    return { ...r, concluida: false };
  }).filter((r) => {
    if (periodo === "diaria") return r.frequencia === "diaria";
    if (periodo === "semanal") return r.frequencia === "diaria" || r.frequencia === "semanal";
    return true;
  });
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const periodo = req.nextUrl.searchParams.get("periodo") || "diaria";
    const rotinas = getRotinasDoPeriodo(periodo, DIA_SEMANA, DIA_MES);

    const resumo = {
      total: rotinas.length,
      concluidas: rotinas.filter((r) => r.concluida).length,
      pendentes: rotinas.filter((r) => !r.concluida).length,
      porCategoria: {} as Record<string, number>,
    };

    rotinas.forEach((r) => {
      resumo.porCategoria[r.categoria] = (resumo.porCategoria[r.categoria] || 0) + 1;
    });

    const contatos = [
      { nome: "Tatiana", empresa: "Domínio Contábil", funcao: "RH / Admissão / Rescisão", telefone: "(31) 9734-4941" },
      { nome: "Matheus", empresa: "Domínio Contábil", funcao: "Notas Fiscais / Fiscal", telefone: "(31) 3323-8268" },
      { nome: "Samara", empresa: "Gecontrol", funcao: "Agendamento ASO / Portal SOC", telefone: "(31) 97141-7004" },
    ];

    return NextResponse.json({ rotinas, resumo, contatos, data: HOJE });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, concluida, observacao } = body;

    return NextResponse.json({ success: true, rotina: { id, concluida, observacao, dataConclusao: new Date().toISOString() } });
  } catch (e: any) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
