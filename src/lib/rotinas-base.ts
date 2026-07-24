export type FrequenciaRotina = "diaria" | "semanal" | "mensal";

export interface RotinaTemplate {
  id: string;
  titulo: string;
  descricao: string;
  frequencia: FrequenciaRotina;
  categoria: string;
  horario?: string;
  responsavel?: string;
  prioridade?: "normal" | "alta" | "critica";
  link?: string;
  ativa?: boolean;
  personalizada?: boolean;
}

export const ROTINAS_BASE: RotinaTemplate[] = [
  { id: "d01", titulo: "Verificar e-mails recebidos", descricao: "Conferir a caixa de entrada corporativa e responder ou encaminhar as demandas", frequencia: "diaria", categoria: "Comunicação", horario: "08:00", responsavel: "Assistente", link: "/dashboard/email-analise" },
  { id: "d02", titulo: "Verificar WhatsApp da empresa", descricao: "Conferir mensagens recebidas e registrar solicitações que exijam acompanhamento", frequencia: "diaria", categoria: "Comunicação", horario: "08:00", responsavel: "Assistente" },
  { id: "d03", titulo: "Conferir pendências do dia", descricao: "Revisar tarefas, prazos, alertas críticos e prioridades operacionais", frequencia: "diaria", categoria: "Organização", horario: "08:30", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/atividades" },
  { id: "d04", titulo: "Atualizar controles financeiros", descricao: "Registrar as movimentações do dia e manter contas a pagar e receber atualizadas", frequencia: "diaria", categoria: "Financeiro", horario: "17:00", responsavel: "Assistente", link: "/dashboard/financeiro" },
  { id: "d05", titulo: "Organizar documentos recebidos", descricao: "Classificar e arquivar documentos no GED conforme o padrão da empresa", frequencia: "diaria", categoria: "Documentos", horario: "17:00", responsavel: "Assistente", link: "/dashboard/documentos" },
  { id: "d06", titulo: "Verificar notas fiscais e comprovantes", descricao: "Conferir NFS-e emitidas, boletos pagos e comprovantes ainda pendentes", frequencia: "diaria", categoria: "Fiscal", horario: "09:00", responsavel: "Assistente", link: "/dashboard/fiscal" },
  { id: "d07", titulo: "Registrar informações importantes", descricao: "Registrar recados, solicitações, ocorrências e decisões relevantes do dia", frequencia: "diaria", categoria: "Organização", horario: "17:30", responsavel: "Assistente" },
  { id: "d08", titulo: "Enviar resumo de demandas relevantes", descricao: "Comunicar à gestão as demandas que exigem decisão, prazo ou providência", frequencia: "diaria", categoria: "Comunicação", horario: "17:00", responsavel: "Assistente" },

  { id: "s01", titulo: "Revisar pendências da semana", descricao: "Conferir tarefas acumuladas e prazos que se aproximam", frequencia: "semanal", categoria: "Organização", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/atividades" },
  { id: "s02", titulo: "Atualizar controle de contratos", descricao: "Verificar contratos ativos, medições, obrigações, reajustes e renovações", frequencia: "semanal", categoria: "Contratos", responsavel: "Assistente", link: "/dashboard/contratos-eventos" },
  { id: "s03", titulo: "Verificar documentos vencidos", descricao: "Conferir ASO, treinamentos, documentos de funcionários, empresa e equipamentos", frequencia: "semanal", categoria: "Documentos", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/alertas" },
  { id: "s04", titulo: "Conferir contas a pagar e receber", descricao: "Revisar boletos, recebimentos e vencimentos dos próximos dias", frequencia: "semanal", categoria: "Financeiro", responsavel: "Assistente", link: "/dashboard/financeiro" },
  { id: "s05", titulo: "Organizar comprovantes financeiros", descricao: "Arquivar comprovantes de pagamento e recebimento vinculados aos lançamentos", frequencia: "semanal", categoria: "Financeiro", responsavel: "Assistente", link: "/dashboard/financeiro-anexos" },
  { id: "s06", titulo: "Acompanhar propostas enviadas", descricao: "Realizar follow-up e registrar a próxima ação de cada proposta", frequencia: "semanal", categoria: "Comercial", responsavel: "Assistente", link: "/dashboard/oportunidades" },
  { id: "s07", titulo: "Conferir relatórios de serviços", descricao: "Receber, validar e organizar relatórios fotográficos e diários de campo", frequencia: "semanal", categoria: "Operacional", responsavel: "Assistente", link: "/dashboard/diario-obras" },
  { id: "s08", titulo: "Revisar organização das pastas digitais", descricao: "Conferir nomes, estrutura, duplicidades e localização dos arquivos", frequencia: "semanal", categoria: "Documentos", responsavel: "Assistente", link: "/dashboard/pastas-digitais" },
  { id: "s09", titulo: "Verificar necessidade de compras", descricao: "Avaliar estoque de materiais, EPIs, ferramentas e itens críticos", frequencia: "semanal", categoria: "Estoque", responsavel: "Assistente", link: "/dashboard/almoxarifado" },
  { id: "s10", titulo: "Enviar resumo semanal de pendências", descricao: "Preparar relatório executivo para a gestão com riscos, prazos e decisões necessárias", frequencia: "semanal", categoria: "Organização", responsavel: "Assistente" },
  { id: "s11", titulo: "Solicitar horas extras dos encarregados", descricao: "Solicitar e conferir as horas extras para processamento da folha", frequencia: "semanal", categoria: "RH", horario: "Segunda-feira", responsavel: "Assistente", link: "/dashboard/rh-attendance" },

  { id: "m01", titulo: "Emitir NFS-e SADA Betim", descricao: "Emitir a nota fiscal mensal conforme contrato e medição aprovada", frequencia: "mensal", categoria: "Fiscal", horario: "Dia 01", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/nfse" },
  { id: "m02", titulo: "Emitir NFS-e SADA Igarapé", descricao: "Emitir a nota fiscal mensal conforme contrato e medição aprovada", frequencia: "mensal", categoria: "Fiscal", horario: "Dia 01", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/nfse" },
  { id: "m03", titulo: "Preparar documentação SADA", descricao: "Separar folha de ponto, contracheques, comprovantes, benefícios e FGTS", frequencia: "mensal", categoria: "SADA", horario: "Dias 05 a 10", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/sada" },
  { id: "m04", titulo: "Solicitar documentos à contabilidade", descricao: "Solicitar documentos contábeis, fiscais, admissionais e rescisórios necessários", frequencia: "mensal", categoria: "SADA", horario: "Dia 05", responsavel: "Assistente" },
  { id: "m05", titulo: "Enviar documentação SADA", descricao: "Enviar e registrar a entrega do dossiê documental mensal", frequencia: "mensal", categoria: "SADA", horario: "Dias 05 a 10", responsavel: "Assistente", prioridade: "critica", link: "/dashboard/sada" },
  { id: "m06", titulo: "Processar adiantamento salarial", descricao: "Conferir e processar os adiantamentos dos funcionários", frequencia: "mensal", categoria: "RH", horario: "Dia 20", responsavel: "Assistente", link: "/dashboard/folha-adiantamentos" },
  { id: "m07", titulo: "Processar pagamento de salários", descricao: "Conferir folha, horas extras e pagamentos até o quinto dia útil", frequencia: "mensal", categoria: "RH", horario: "5º dia útil", responsavel: "Assistente", prioridade: "critica", link: "/dashboard/folha-competencias" },
  { id: "m08", titulo: "Processar vale-alimentação", descricao: "Calcular o benefício proporcional e processar o crédito mensal", frequencia: "mensal", categoria: "RH", horario: "Dia 20", responsavel: "Assistente", link: "/dashboard/rh-vale-alimentacao" },
  { id: "m09", titulo: "Conferir notas fiscais do mês", descricao: "Verificar todas as NFS-e emitidas, pendentes e canceladas", frequencia: "mensal", categoria: "Fiscal", responsavel: "Assistente", link: "/dashboard/nfse" },
  { id: "m10", titulo: "Organizar comprovantes do mês", descricao: "Vincular os comprovantes aos lançamentos e arquivar o fechamento mensal", frequencia: "mensal", categoria: "Documentos", responsavel: "Assistente", link: "/dashboard/financeiro-anexos" },
  { id: "m11", titulo: "Fechar controle financeiro mensal", descricao: "Reconciliar receitas e despesas e conferir o resultado gerencial", frequencia: "mensal", categoria: "Financeiro", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/dre" },
  { id: "m12", titulo: "Revisar contratos ativos e vencimentos", descricao: "Conferir reajustes, renovações, aditivos e vencimentos dos próximos 90 dias", frequencia: "mensal", categoria: "Contratos", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/contratos-eventos" },
  { id: "m13", titulo: "Conferir documentos de funcionários", descricao: "Validar ASO, treinamentos, EPI e documentos pessoais e trabalhistas", frequencia: "mensal", categoria: "RH", responsavel: "Assistente", link: "/dashboard/monitor-docs" },
  { id: "m14", titulo: "Separar documentos para a contabilidade", descricao: "Preparar o pacote documental do fechamento para envio ao escritório contábil", frequencia: "mensal", categoria: "Fiscal", responsavel: "Assistente", link: "/dashboard/relatorio-contador" },
  { id: "m15", titulo: "Revisar despesas fixas e variáveis", descricao: "Conferir recorrências, alterações de valores e despesas não previstas", frequencia: "mensal", categoria: "Financeiro", responsavel: "Assistente", link: "/dashboard/financeiro-avancado" },
  { id: "m16", titulo: "Revisar cadastros principais", descricao: "Conferir clientes, fornecedores, funcionários, equipamentos e contratos", frequencia: "mensal", categoria: "Organização", responsavel: "Assistente" },
  { id: "m17", titulo: "Apoiar fechamento administrativo", descricao: "Consolidar as pendências e evidências do fechamento mensal para a gestão", frequencia: "mensal", categoria: "Organização", responsavel: "Assistente" },
  { id: "m18", titulo: "Agendar e conferir ASOs", descricao: "Agendar exames, acompanhar vencimentos e anexar os ASOs recebidos", frequencia: "mensal", categoria: "SST", horario: "Início do mês", responsavel: "Assistente", link: "/dashboard/aso" },
  { id: "m19", titulo: "Notificar gestão sobre vencimentos", descricao: "Apresentar contratos, documentos e obrigações relevantes para o mês", frequencia: "mensal", categoria: "Organização", responsavel: "Assistente", prioridade: "alta", link: "/dashboard/alertas" },
];

export const CONTATOS_OPERACIONAIS = [
  { nome: "Tatiana", empresa: "Domínio Contábil", funcao: "RH / Admissão / Rescisão", telefone: "(31) 9734-4941" },
  { nome: "Matheus", empresa: "Domínio Contábil", funcao: "Notas fiscais / Fiscal", telefone: "(31) 3323-8268" },
  { nome: "Samara", empresa: "Gecontrol", funcao: "Agendamento de ASO / Portal SOC", telefone: "(31) 97141-7004" },
];
