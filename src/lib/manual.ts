/**
 * Manual do Sistema — conteúdo do guia intuitivo exibido em /dashboard/manual.
 * Cada entrada explica: o que é, para que serve, como usar (passo a passo) e dicas.
 * Organizado por seção do menu; usado também pelo assistente de ajuda.
 */
export interface PassoManual { texto: string }
export interface FerramentaManual {
  href: string;
  titulo: string;
  icone: string;
  oQueE: string;      // 1 frase: o que é
  paraQue: string;    // para que serve no dia a dia
  passos: string[];   // como usar, passo a passo
  dicas?: string[];   // dicas e cuidados
}
export interface SecaoManual { secao: string; ferramentas: FerramentaManual[] }

export const MANUAL: SecaoManual[] = [
  {
    secao: "🏁 Começando",
    ferramentas: [
      {
        href: "/dashboard", titulo: "Dashboard", icone: "📊",
        oQueE: "A tela inicial com os números-chave da empresa.",
        paraQue: "Ter, em segundos, uma visão geral: clientes, funcionários, propostas, contratos ativos e a situação dos tributos.",
        passos: [
          "Ao entrar no sistema, o Dashboard abre automaticamente.",
          "Os cartões coloridos (KPIs) mostram os totais atuais — atualizam sozinhos conforme você usa o sistema.",
          "Use os botões de exportação para gerar o backup (JSON) ou a planilha financeira (CSV) para o contador.",
        ],
        dicas: ["Se um número parecer errado, cadastre os dados no módulo correspondente — o Dashboard só reflete o que existe no banco."],
      },
      {
        href: "/dashboard/alertas", titulo: "Central de Alertas", icone: "🚨",
        oQueE: "Um painel único que junta tudo que está vencido ou vence em breve.",
        paraQue: "Nunca deixar passar um vencimento: contratos, ASO, treinamentos, CNH, EPI, licenças ambientais, certidões e férias (CLT).",
        passos: [
          "Abra 'Central de Alertas' na seção Visão Geral.",
          "Os cartões no topo mostram quantos itens estão CRÍTICOS (vencidos) e em ATENÇÃO (a vencer).",
          "Use os filtros por categoria (ASO, EPI, Contratos…) para focar num tipo.",
          "Clique em qualquer alerta para ir direto ao módulo onde ele é resolvido.",
        ],
        dicas: ["Comece o dia por aqui. Vermelho = já venceu (resolva primeiro); amarelo = vence em até 30/90 dias."],
      },
      {
        href: "/dashboard/ajuda", titulo: "Ajuda com IA", icone: "🤖",
        oQueE: "Um assistente que responde dúvidas sobre o sistema em linguagem natural.",
        paraQue: "Tirar dúvidas rápidas sem procurar no manual — pergunte como se fala com uma pessoa.",
        passos: [
          "Abra 'Ajuda com IA'.",
          "Digite a pergunta (ex.: 'como calculo o preço de uma roçada?') e envie.",
          "Ou clique numa das perguntas frequentes listadas abaixo do chat.",
        ],
        dicas: ["Precisa da chave GROQ configurada no servidor. Sem ela, use as perguntas frequentes e este Manual."],
      },
    ],
  },
  {
    secao: "💼 Comercial",
    ferramentas: [
      {
        href: "/dashboard/oportunidades", titulo: "Oportunidades (CRM)", icone: "🎯",
        oQueE: "Um funil de vendas para clientes privados (condomínios, indústrias…).",
        paraQue: "Acompanhar cada oportunidade do primeiro contato até fechar (ou perder), sem esquecer de dar retorno.",
        passos: [
          "Clique em '+ Nova oportunidade' e preencha cliente, serviço, valor estimado e a próxima ação.",
          "O cartão aparece na coluna 'Lead'. Arraste-o entre as colunas (Qualificado → Proposta → Negociação → Ganho) mudando o status no seletor.",
          "O valor total 'em aberto' aparece no topo — é o seu funil somado.",
        ],
        dicas: ["Sempre preencha 'Próxima ação' e a data — vira seu lembrete de follow-up."],
      },
      {
        href: "/dashboard/pipeline", titulo: "Licitações", icone: "🏆",
        oQueE: "O hub de licitações públicas, com três abas.",
        paraQue: "Encontrar editais no PNCP, acompanhá-los num quadro e gerar propostas por IA.",
        passos: [
          "Aba 'Radar PNCP': busque por palavras-chave (roçada, limpeza…) e clique '→ Pipeline' num edital interessante.",
          "Aba 'Pipeline': acompanhe cada licitação por estágio (analisando → proposta → enviada → resultado).",
          "Aba 'Proposta por Edital IA': cole o texto do edital e a IA extrai os dados e monta um rascunho de proposta.",
        ],
        dicas: ["Os portais BLL/BBM/Licitar não têm API pública — cadastre esses editais manualmente no Pipeline."],
      },
      {
        href: "/dashboard/propostas", titulo: "Propostas + PDF", icone: "📄",
        oQueE: "A lista de propostas comerciais com geração de PDF.",
        paraQue: "Emitir propostas profissionais (modelo Vallourec) e transformá-las em contrato com um clique.",
        passos: [
          "Clique em '📄 PDF' numa proposta para abrir a versão formatada — use Ctrl+P → Salvar como PDF.",
          "Numa proposta 'Aberta', clique em '✅ → Contrato' para aprová-la: o sistema cria o contrato, os requisitos de documentação, o cronograma inicial e o centro de custos automaticamente.",
        ],
        dicas: ["A conversão em contrato é o atalho mais poderoso do sistema — evita recadastrar tudo à mão."],
      },
      {
        href: "/dashboard/precificacao-central", titulo: "Precificação", icone: "🧮",
        oQueE: "A central de cálculo de preços, com calculadora, BDI e Custo Hora-Homem.",
        paraQue: "Definir o preço certo de cada serviço sem errar — cobrindo custo, impostos e margem.",
        passos: [
          "Aba 'Calculadora & BDI': informe serviço, área e custos unitários; a IA analisa a competitividade.",
          "Aba 'Custo Hora-Homem': veja o custo real de uma hora de cada função (salário + encargos ÷ horas produtivas) e monte o preço de um serviço por produtividade (m²/HH).",
        ],
        dicas: ["No Hora-Homem, calibre o campo 'Eficiência %' comparando com seus diários de obra — é o que aproxima o cálculo da realidade."],
      },
    ],
  },
  {
    secao: "📋 Contratos & Documentos",
    ferramentas: [
      {
        href: "/dashboard/contratos", titulo: "Contratos", icone: "📋",
        oQueE: "O hub de contratos: lista, novo contrato (com IA), cronograma e medição.",
        paraQue: "Controlar tudo do contrato: valor, vigência, reajuste, medições mensais e programação das equipes.",
        passos: [
          "Aba 'Contratos': veja e cadastre contratos (agora com seletor de cliente).",
          "Aba '⚡ Novo Contrato': cole o edital e a IA extrai dados, sugere equipe e gera cronograma.",
          "Aba 'Cronograma': programe as atividades da semana por contrato (planejado → em execução → concluído).",
          "Aba 'Medição': registre as medições mensais aprovadas — viram receita na Rentabilidade.",
        ],
        dicas: ["Contratos vencendo em 90 dias aparecem sozinhos na Central de Alertas para você negociar a renovação."],
      },
      {
        href: "/dashboard/monitor-docs", titulo: "Docs & Conformidade", icone: "🚦",
        oQueE: "O coração do controle documental: GED, checklist, monitor e dossiê SSO.",
        paraQue: "Garantir que cada funcionário tem toda a documentação que a contratante (SADA, Vallourec…) exige — o motivo principal do sistema.",
        passos: [
          "Aba 'Monitor': selecione o contrato e clique nos botões de modelo (SST 19 itens e/ou Contratual SADA cl. 6.12). A matriz funcionário × documento aparece com semáforo.",
          "As células com '⚙ auto' (ASO, treinamentos NR, EPI) se preenchem sozinhas dos outros módulos.",
          "Clique numa célula para registrar/atualizar a emissão e a validade de um documento.",
          "Aba 'Arquivos (GED)': guarde os PDFs; aba 'Checklist & Geração': gere os documentos por escopo; aba 'Dossiê SSO': gere o dossiê mensal por funcionário.",
        ],
        dicas: ["🟢 válido · 🟡 vence em 30 dias · 🔴 vencido · ⚪ faltante. O objetivo é deixar a matriz toda verde antes de mobilizar a equipe."],
      },
      {
        href: "/dashboard/clientes", titulo: "Clientes", icone: "🤝",
        oQueE: "O cadastro de clientes (órgãos públicos e empresas privadas).",
        paraQue: "Vincular contratos, propostas e o portal do cliente a cada um.",
        passos: ["Cadastre o cliente com CNPJ, contato e endereço.", "Depois vincule-o nos contratos e propostas."],
      },
    ],
  },
  {
    secao: "🚛 Campo & Estoque",
    ferramentas: [
      {
        href: "/dashboard/logistica", titulo: "Operação de Campo", icone: "🚛",
        oQueE: "O hub de operação: ordens de serviço, plano logístico e diário de obras.",
        paraQue: "Organizar quem faz o quê no campo e registrar o que foi executado (com fotos).",
        passos: [
          "Aba 'Logística': crie as Ordens de Serviço e gere um plano logístico com apoio da IA.",
          "Aba 'Diário de Obras': registre a atividade do dia — local, equipe, clima, o que foi feito e fotos da câmera.",
        ],
        dicas: ["O diário de obras é a sua prova de execução para a medição e para o cliente."],
      },
      {
        href: "/dashboard/equipamentos", titulo: "Frota & Equipamentos", icone: "🔧",
        oQueE: "O cadastro de equipamentos/veículos e o controle de combustível.",
        paraQue: "Saber o custo operacional de cada máquina e o consumo de combustível por veículo.",
        passos: [
          "Aba 'Equipamentos': cadastre roçadeiras, veículos etc. e registre manutenções.",
          "Aba 'Combustível': lance cada abastecimento — se vincular a um contrato, entra sozinho na Rentabilidade.",
        ],
      },
      {
        href: "/dashboard/almoxarifado", titulo: "Almoxarifado & EPI", icone: "🏭",
        oQueE: "O controle de estoque, o controle de EPI e a importação de NF-e de entrada.",
        paraQue: "Saber o que tem em estoque, controlar a entrega de EPI (com CA e validade) e importar notas de compra.",
        passos: [
          "Aba 'Almoxarifado': use '± Mover' para registrar entrada, saída ou ajuste de cada item.",
          "Aba 'Controle de EPI': registre a entrega de EPI a cada funcionário — alimenta a matriz de documentos.",
          "Aba 'Importar NF-e': envie o XML da nota do fornecedor para dar entrada automática no estoque.",
        ],
        dicas: ["A ficha de EPI e o CA vencendo aparecem na Central de Alertas — o EPI é exigido pela contratante."],
      },
    ],
  },
  {
    secao: "💰 Financeiro & Fiscal",
    ferramentas: [
      {
        href: "/dashboard/financeiro", titulo: "Financeiro + Aging", icone: "💰",
        oQueE: "Contas a pagar, a receber e o fluxo de caixa, com aging.",
        paraQue: "Saber o que entra, o que sai e o que está atrasado a receber (em faixas de dias).",
        passos: ["Lance contas a pagar e a receber.", "Na aba Aging, veja o que vence e o que já venceu, agrupado por faixa."],
      },
      {
        href: "/dashboard/rentabilidade", titulo: "Rentabilidade", icone: "💹",
        oQueE: "A margem real de cada contrato: receita das medições × custos lançados.",
        paraQue: "Descobrir quais contratos dão lucro e quais estão no prejuízo.",
        passos: [
          "Clique num contrato para expandir.",
          "Lance os custos por categoria (mão de obra, material, terceiros…). O combustível vinculado entra sozinho.",
          "A margem em R$ e % aparece na hora (verde = saudável, vermelho = prejuízo).",
        ],
        dicas: ["Este era o 'gargalo' que você citou: aqui você vê, contrato a contrato, se o preço fechou."],
      },
      {
        href: "/dashboard/fiscal", titulo: "Fiscal & Contábil", icone: "💼",
        oQueE: "Central fiscal, DRE, relatório do contador e regularidade (certidões).",
        paraQue: "Apurar tributos, ver o resultado (DRE), exportar para o contador e acompanhar certidões.",
        passos: [
          "Aba 'Central Fiscal': apure os tributos do mês (DAS, FGTS, INSS, ISS) e marque despesas como pagas com '✓ Pagar'.",
          "Aba 'DRE': veja o resultado gerencial; aba 'Relatório Contador': exporte tudo; aba 'Regularidade': controle CNDs e certidões.",
        ],
        dicas: ["Módulo é apoio gerencial. A transmissão oficial de NFS-e/eSocial exige certificado digital e o seu contador."],
      },
    ],
  },
  {
    secao: "👷 RH & Segurança",
    ferramentas: [
      {
        href: "/dashboard/rh", titulo: "RH & Pessoas", icone: "👷",
        oQueE: "O hub de pessoas: folha, INSS/IRRF, férias & ocorrências, mobilizações, treinamentos e ASO.",
        paraQue: "Gerir todo o funcionário: cadastro, folha, férias (com alerta de dobro), advertências, NRs e exames.",
        passos: [
          "Aba 'RH & Folha': cadastre os funcionários (nome, função, salário, admissão).",
          "Aba 'Férias & Ocorrências': acompanhe o período aquisitivo (alerta antes de virar pagamento em dobro), agende férias e registre advertências/suspensões.",
          "Aba 'Mobilizações': aloque funcionários aos contratos.",
          "Aba 'Treinamentos NR' e 'ASO': registre certificados e exames — alimentam a matriz de documentos automaticamente.",
        ],
        dicas: ["Cadastre os funcionários reais primeiro — quase tudo (docs, alertas, hora-homem) depende deles."],
      },
      {
        href: "/dashboard/ambiental", titulo: "Ambiental", icone: "🌱",
        oQueE: "O controle de licenças, DOF, autorizações de poda e descartes.",
        paraQue: "Manter em dia as exigências ambientais da roçada/poda/supressão, com alerta de vencimento.",
        passos: ["Registre cada licença/autorização com órgão emissor e validade.", "Os vencimentos aparecem na Central de Alertas."],
      },
    ],
  },
  {
    secao: "⚙️ Sistema",
    ferramentas: [
      {
        href: "/dashboard/diagnostico", titulo: "Central de Diagnóstico", icone: "🩺",
        oQueE: "A central eletrônica que testa o sistema e aponta problemas.",
        paraQue: "Verificar a saúde do sistema (banco, configuração, integrações, dados inconsistentes) e receber instruções de correção.",
        passos: [
          "Abra 'Central de Diagnóstico' e clique em 'Rodar diagnóstico'.",
          "Cada verificação mostra ✅ ok, ⚠️ atenção ou ❌ falha, com a explicação e a correção sugerida.",
          "Se houver falha e a IA estiver ligada, clique em 'Explicar com IA' para orientação passo a passo.",
        ],
        dicas: ["Rode sempre que algo parecer estranho — antes de mexer no servidor, veja aqui o que o sistema já detectou."],
      },
      {
        href: "/dashboard/configuracoes", titulo: "Configurações", icone: "⚙️",
        oQueE: "Os dados da empresa e as alíquotas usadas nos cálculos.",
        paraQue: "Manter CNPJ, endereço, contador e as alíquotas (ISS, INSS, FGTS…) corretos — tudo depende disso.",
        passos: ["Preencha os dados da empresa e as alíquotas.", "Salve — os módulos fiscal e de precificação passam a usar esses valores."],
        dicas: ["Confira as alíquotas com o seu contador antes de emitir propostas e apurações."],
      },
      {
        href: "/dashboard/admin", titulo: "Administração", icone: "🛡️",
        oQueE: "Gestão de usuários, papéis, permissões e auditoria (só ADMIN).",
        paraQue: "Criar acessos para a equipe, definir o que cada um pode ver/fazer e auditar ações.",
        passos: ["Crie usuários e atribua papéis.", "Ajuste as permissões por módulo.", "Consulte a auditoria das ações críticas."],
        dicas: ["Sempre haverá pelo menos um ADMIN — o sistema impede remover o último."],
      },
    ],
  },
];
