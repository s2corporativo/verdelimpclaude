/**
 * Grupos de navegação (hubs) — módulos afins compartilham uma barra de abas
 * (SubNav) no topo da página. As URLs individuais são preservadas; o menu
 * lateral mostra apenas uma entrada por hub.
 */
export interface AbaNav { href: string; label: string }
export interface GrupoNav { key: string; titulo: string; abas: AbaNav[] }

export const GRUPOS_NAV: GrupoNav[] = [
  { key: "alertas", titulo: "Alertas & Notificações", abas: [
    { href: "/dashboard/alertas", label: "🚨 Central de Alertas" },
    { href: "/dashboard/email-analise", label: "📧 Cotações & Contratos (E-mail)" },
    { href: "/dashboard/email-integration", label: "📬 Integração de E-mail" },
  ]},
  { key: "licitacoes", titulo: "Licitações", abas: [
    { href: "/dashboard/pipeline", label: "🏆 Pipeline" },
    { href: "/dashboard/radar-licitacoes", label: "🏛️ Radar PNCP" },
    { href: "/dashboard/proposta-edital", label: "🧭 Dossiê Operacional" },
  ]},
  { key: "precificacao", titulo: "Precificação", abas: [
    { href: "/dashboard/precificacao-central", label: "🧮 Calculadora & BDI" },
    { href: "/dashboard/hora-homem", label: "👷 Custo Hora-Homem" },
    { href: "/dashboard/perfis-tributarios", label: "🧾 Perfis Tributários" },
  ]},
  { key: "contratos", titulo: "Contratos", abas: [
    { href: "/dashboard/contratos", label: "📋 Contratos" },
    { href: "/dashboard/novo-contrato", label: "⚡ Novo Contrato" },
    { href: "/dashboard/contratos-eventos", label: "🔄 Eventos & Renovações" },
    { href: "/dashboard/cronograma", label: "📅 Cronograma" },
    { href: "/dashboard/medicao", label: "📏 Medição" },
    { href: "/dashboard/alteracoes-escopo", label: "🔁 Alterações de Escopo" },
  ]},
  { key: "docs", titulo: "Documentos & Conformidade", abas: [
    { href: "/dashboard/documentos", label: "📁 Arquivos (GED)" },
    { href: "/dashboard/analise-juridica", label: "⚖️ Análise Jurídica (IA)" },
    { href: "/dashboard/checklist-docs", label: "📑 Checklist & Geração" },
    { href: "/dashboard/monitor-docs", label: "🚦 Monitor" },
    { href: "/dashboard/sso", label: "🛟 Dossiê SSO" },
    { href: "/dashboard/perfis-documentais", label: "🗂️ Perfis por Cliente" },
  ]},
  { key: "campo", titulo: "Operação de Campo", abas: [
    { href: "/dashboard/ordens-servico", label: "🧾 Ordens de Serviço" },
    { href: "/dashboard/logistica", label: "🚛 Logística" },
    { href: "/dashboard/diario-obras", label: "📝 Diário de Obras" },
  ]},
  { key: "frota", titulo: "Frota & Equipamentos", abas: [
    { href: "/dashboard/equipamentos", label: "🔧 Equipamentos" },
    { href: "/dashboard/combustivel", label: "⛽ Combustível" },
  ]},
  { key: "especiais", titulo: "Serviços Especiais", abas: [
    { href: "/dashboard/retro", label: "🚜 Retroescavadeira" },
    { href: "/dashboard/detetizacao", label: "🪲 Dedetização" },
  ]},
  { key: "estoque", titulo: "Estoque", abas: [
    { href: "/dashboard/almoxarifado", label: "🏭 Almoxarifado" },
    { href: "/dashboard/epi", label: "🦺 Controle de EPI" },
    { href: "/dashboard/nfe-import", label: "📥 Importar NF-e" },
  ]},
  { key: "financeiro", titulo: "Financeiro", abas: [
    { href: "/dashboard/financeiro", label: "💰 Contas a Pagar & Aging" },
    { href: "/dashboard/contas-receber", label: "📥 Contas a Receber" },
    { href: "/dashboard/financeiro-avancado", label: "🔁 Recorrências & Importação" },
    { href: "/dashboard/financeiro-anexos", label: "📎 Boletos & Comprovantes" },
    { href: "/dashboard/rentabilidade", label: "💹 Rentabilidade por Contrato" },
    { href: "/dashboard/dre", label: "📊 DRE" },
  ]},
  { key: "fiscal", titulo: "Fiscal & Contábil", abas: [
    { href: "/dashboard/fiscal", label: "💼 Central Fiscal" },
    { href: "/dashboard/dre", label: "📊 DRE" },
    { href: "/dashboard/relatorio-contador", label: "📤 Relatório Contador" },
    { href: "/dashboard/regularidade", label: "🔎 Regularidade" },
  ]},
  { key: "rh", titulo: "RH & SST", abas: [
    { href: "/dashboard/rh", label: "👷 RH & Folha" },
    { href: "/dashboard/rh-admissao", label: "🪪 Admissão & Desligamento" },
    { href: "/dashboard/rh-attendance", label: "📋 Controle de Ponto" },
    { href: "/dashboard/matriz-sst", label: "🛡️ Matriz PGR/PCMSO" },
    { href: "/dashboard/folha-competencias", label: "📆 Folha por Competência" },
    { href: "/dashboard/folha-detalhada", label: "📑 Simulação INSS/IRRF" },
    { href: "/dashboard/folha-13", label: "🎄 13º Salário" },
    { href: "/dashboard/folha-adiantamentos", label: "💸 Adiantamentos" },
    { href: "/dashboard/rh-ocorrencias", label: "🏖️ Férias & Ocorrências" },
    { href: "/dashboard/mobilizacoes", label: "📋 Mobilizações" },
    { href: "/dashboard/treinamentos", label: "🎓 Treinamentos NR" },
    { href: "/dashboard/aso", label: "🩺 ASO" },
  ]},
  { key: "assistente", titulo: "Assistente Administrativa", abas: [
    { href: "/dashboard/rotinas", label: "📋 Rotinas" },
    { href: "/dashboard/sada", label: "🚛 Controle SADA" },
    { href: "/dashboard/rh-attendance", label: "📋 Ponto & Attendance" },
    { href: "/dashboard/folha-adiantamentos", label: "💸 Adiantamentos" },
    { href: "/dashboard/folha-13", label: "🎄 13º Salário" },
    { href: "/dashboard/email-integration", label: "📬 E-mail Integration" },
  ]},
  { key: "ia", titulo: "Inteligência Artificial", abas: [
    { href: "/dashboard/ajuda", label: "🤖 Chat de Ajuda" },
    { href: "/dashboard/analise-juridica", label: "⚖️ Análise Jurídica" },
    { href: "/dashboard/ia-ler-boleto", label: "📄 Ler Boleto (IA)" },
    { href: "/dashboard/ia-resumir-contrato", label: "📋 Resumir Contrato (IA)" },
  ]},
];

export function grupoDe(pathname: string | null): GrupoNav | null {
  if (!pathname) return null;
  return GRUPOS_NAV.find((g) => g.abas.some((a) => pathname === a.href || pathname.startsWith(a.href + "/"))) ?? null;
}
