/**
 * Navegação contextual do Verdelimp v3.
 *
 * O menu lateral apresenta somente as áreas essenciais. As funcionalidades
 * detalhadas continuam acessíveis por esta barra contextual, preservando as
 * URLs existentes e evitando que o usuário precise memorizar onde cada tela
 * está localizada.
 */
export interface AbaNav {
  href: string;
  label: string;
  roles?: string[];
}

export interface GrupoNav {
  key: string;
  titulo: string;
  abas: AbaNav[];
}

export const GRUPOS_NAV: GrupoNav[] = [
  {
    key: "comercial",
    titulo: "Comercial",
    abas: [
      { href: "/dashboard/oportunidades", label: "📥 Demandas" },
      { href: "/dashboard/clientes", label: "🤝 Clientes" },
      { href: "/dashboard/propostas", label: "📄 Propostas" },
      { href: "/dashboard/precificacao-central", label: "🧮 Formação de preço" },
      { href: "/dashboard/hora-homem", label: "👷 Custo hora-homem" },
      { href: "/dashboard/perfis-tributarios", label: "🧾 Perfis tributários" },
      { href: "/dashboard/pipeline", label: "🏆 Licitações" },
      { href: "/dashboard/radar-licitacoes", label: "🏛️ Radar PNCP" },
      { href: "/dashboard/proposta-edital", label: "🧭 Dossiê operacional" },
    ],
  },
  {
    key: "contratos-servicos",
    titulo: "Contratos e serviços",
    abas: [
      { href: "/dashboard/contratos", label: "📋 Contratos" },
      { href: "/dashboard/novo-contrato", label: "➕ Novo contrato" },
      { href: "/dashboard/contratos-eventos", label: "🔄 Obrigações e eventos" },
      { href: "/dashboard/cronograma", label: "📅 Cronograma" },
      { href: "/dashboard/mobilizacoes", label: "🚦 Mobilizações" },
      { href: "/dashboard/ordens-servico", label: "🧾 Ordens de serviço" },
      { href: "/dashboard/logistica", label: "🚛 Logística" },
      { href: "/dashboard/diario-obras", label: "📝 Diário de campo" },
      { href: "/dashboard/medicao", label: "📏 Medições" },
      { href: "/dashboard/alteracoes-escopo", label: "🔁 Alterações de escopo" },
      { href: "/dashboard/monitor-docs", label: "🔎 Conformidade documental" },
    ],
  },
  {
    key: "pessoas-sst",
    titulo: "Pessoas e SST",
    abas: [
      { href: "/dashboard/rh", label: "👷 Pessoas" },
      { href: "/dashboard/rh-admissao", label: "🪪 Admissão e desligamento" },
      { href: "/dashboard/rh-attendance", label: "🕒 Ponto e presença" },
      { href: "/dashboard/matriz-sst", label: "🛡️ Matriz PGR/PCMSO" },
      { href: "/dashboard/aso", label: "🩺 ASO" },
      { href: "/dashboard/treinamentos", label: "🎓 NRs e treinamentos" },
      { href: "/dashboard/epi", label: "🦺 EPI" },
      { href: "/dashboard/folha-competencias", label: "📆 Folha por competência" },
      { href: "/dashboard/folha-detalhada", label: "📑 Cálculos da folha" },
      { href: "/dashboard/folha-adiantamentos", label: "💸 Adiantamentos" },
      { href: "/dashboard/folha-13", label: "🎄 13º salário" },
      { href: "/dashboard/rh-vale-alimentacao", label: "🍽️ Vale-alimentação" },
      { href: "/dashboard/rh-ocorrencias", label: "🏖️ Férias e ocorrências" },
    ],
  },
  {
    key: "financeiro-fiscal",
    titulo: "Financeiro e fiscal",
    abas: [
      { href: "/dashboard/financeiro", label: "💰 Contas a pagar" },
      { href: "/dashboard/contas-receber", label: "📥 Contas a receber" },
      { href: "/dashboard/financeiro-avancado", label: "🔁 Recorrências e importação" },
      { href: "/dashboard/financeiro-anexos", label: "📎 Boletos e comprovantes" },
      { href: "/dashboard/rentabilidade", label: "💹 Rentabilidade" },
      { href: "/dashboard/dre", label: "📊 DRE" },
      { href: "/dashboard/fiscal", label: "💼 Central fiscal" },
      { href: "/dashboard/nfse", label: "🧾 NFS-e" },
      { href: "/dashboard/tributario", label: "⚖️ Tributário" },
      { href: "/dashboard/relatorio-contador", label: "📤 Contabilidade" },
      { href: "/dashboard/regularidade", label: "✅ Regularidade" },
    ],
  },
  {
    key: "recursos",
    titulo: "Recursos",
    abas: [
      { href: "/dashboard/almoxarifado", label: "🏭 Almoxarifado" },
      { href: "/dashboard/equipamentos", label: "🔧 Equipamentos e frota" },
      { href: "/dashboard/combustivel", label: "⛽ Combustível" },
      { href: "/dashboard/nfe-import", label: "📥 Importar NF-e" },
      { href: "/dashboard/fornecedores", label: "📦 Fornecedores" },
      { href: "/dashboard/retro", label: "🚜 Retroescavadeira" },
      { href: "/dashboard/detetizacao", label: "🪲 Dedetização" },
      { href: "/dashboard/ambiental", label: "🌱 Ambiental" },
    ],
  },
  {
    key: "administracao",
    titulo: "Administração",
    abas: [
      { href: "/dashboard/rotinas", label: "📋 Rotinas e obrigações" },
      { href: "/dashboard/sada", label: "🚛 Obrigações SADA" },
      { href: "/dashboard/documentos", label: "📁 Documentos" },
      { href: "/dashboard/pastas-digitais", label: "📂 Organização digital" },
      { href: "/dashboard/checklist-docs", label: "📑 Checklists e modelos" },
      { href: "/dashboard/email-analise", label: "📧 E-mails recebidos", roles: ["ADMIN", "GESTOR", "COMERCIAL", "FINANCEIRO"] },
      { href: "/dashboard/email-integration", label: "📬 Integração de e-mail", roles: ["ADMIN", "GESTOR"] },
      { href: "/dashboard/manual", label: "📖 Manual" },
      { href: "/dashboard/integracoes", label: "🔌 Integrações", roles: ["ADMIN", "GESTOR"] },
      { href: "/dashboard/configuracoes", label: "⚙️ Configurações", roles: ["ADMIN", "GESTOR"] },
      { href: "/dashboard/diagnostico", label: "🩺 Diagnóstico", roles: ["ADMIN"] },
      { href: "/dashboard/credenciais", label: "🔑 Credenciais e APIs", roles: ["ADMIN"] },
      { href: "/dashboard/admin", label: "🛡️ Usuários e permissões", roles: ["ADMIN"] },
    ],
  },
  {
    key: "ia",
    titulo: "Assistente de IA",
    abas: [
      { href: "/dashboard/ajuda", label: "🤖 Ajuda operacional" },
      { href: "/dashboard/analise-juridica", label: "⚖️ Análise jurídica" },
      { href: "/dashboard/ia-ler-boleto", label: "📄 Ler boleto" },
      { href: "/dashboard/ia-resumir-contrato", label: "📋 Resumir contrato" },
    ],
  },
];

export function grupoDe(pathname: string | null): GrupoNav | null {
  if (!pathname) return null;
  return (
    GRUPOS_NAV.find((grupo) =>
      grupo.abas.some(
        (aba) => pathname === aba.href || pathname.startsWith(`${aba.href}/`),
      ),
    ) ?? null
  );
}
