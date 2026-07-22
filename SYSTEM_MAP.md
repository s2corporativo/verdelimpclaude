# 🗺️ Mapa do Sistema — Verdelimp ERP

> Gerado no pente-fino de consolidação. Números: **58 páginas de dashboard · 102 rotas de API · 70 modelos de dados**.
> Stack: Next.js 14 (App Router) · PostgreSQL 16 + Prisma · NextAuth (JWT, 8 papéis × 44 permissões) · GROQ IA · Docker na VPS Contabo (porta interna configurável, padrão 3010/3011).

## Visão geral dos domínios

```mermaid
flowchart TB
  subgraph COMERCIAL
    CRM[🎯 Oportunidades CRM]
    LIC[🏆 Licitações\nPipeline · Radar PNCP · Dossiê]
    PROP[📄 Propostas versionadas\n3 alçadas + PDF]
    PRECO[🧮 Precificação\nComposição · cenários · tributos]
  end
  subgraph CONTRATOS
    CTR[📋 Contratos\nLista · Wizard IA · Cronograma · Medição]
    DOCS[🚦 Docs & Conformidade\nGED · Checklist · Monitor · SSO]
    CLI[🤝 Clientes]
  end
  subgraph OPERACAO[CAMPO & ESTOQUE]
    CAMPO[🚛 Operação\nLogística · Diário de Obras]
    FROTA[🔧 Frota\nEquipamentos · Combustível]
    ESP[🚜 Serviços Especiais\nRetro · Dedetização]
    ESTQ[🏭 Almoxarifado · EPI · NF-e]
  end
  subgraph FINANCEIRO
    FIN[💰 Financeiro + Aging]
    RENT[💹 Rentabilidade por contrato]
    FISC[💼 Fiscal & Contábil\nCentral · DRE · Contador · Regularidade]
  end
  subgraph RH_SST[RH & SST]
    RH[👷 RH & Pessoas\nFolha · Férias · Mobilizações · NRs · ASO]
    AMB[🌱 Ambiental]
  end
  ALERTAS[🚨 Central de Alertas]

  CRM -->|ganho| PROP
  LIC -->|fatos + evidências| PRECO
  PRECO -->|mínimo/recomendado/comercial| PROP
  PROP -->|3 alçadas aprovadas| CTR
  CTR -->|requisitos SADA| DOCS
  CTR -->|centro de custos| RENT
  CTR -->|mobilização| RH
  RH -->|ASO · NR · EPI automáticos| DOCS
  CAMPO -->|combustível| RENT
  CTR -->|medições = receita| RENT
  DOCS --> ALERTAS
  RH --> ALERTAS
  AMB --> ALERTAS
  CTR --> ALERTAS
```

## Fluxo principal (do lead ao lucro)

```mermaid
flowchart LR
  A[Lead/Edital] --> B[Dossiê\nvalidado]
  B --> C[Dimensionamento\n+ cenários]
  C --> D[Proposta\n3 alçadas]
  D --> E[Contrato + docs\n+ cronograma]
  E --> F[Mobilização\ncom bloqueios]
  F --> G[Diário + produção\n+ alteração de escopo]
```

<!-- Fluxo legado detalhado preservado abaixo para referência operacional. -->
```mermaid
flowchart LR
  C[Contrato] --> D[Monitor de Docs\nSST + perfil do cliente]
  C --> E[Cronograma\nsemanal]
  C --> F[Mobilizar\nequipe]
  E --> G[Execução +\nDiário de Obras]
  G --> H[Medição\nmensal]
  H --> I[Rentabilidade:\nreceita × custos]
  D -.alerta vencimentos.-> J[🚨 Central\nde Alertas]
  F -.ASO/NR/EPI.-> D
```

## Hubs de navegação (menu consolidado — 24 entradas)

| Hub (menu) | Abas (URLs preservadas) |
|---|---|
| 🚨 Central de Alertas | Alertas · WhatsApp |
| 🏆 Licitações | Pipeline · Radar PNCP · Dossiê Operacional |
| 🧮 Precificação | Calculadora & BDI · Custo Hora-Homem · Perfis tributários |
| 📋 Contratos | Contratos · Novo Contrato · Cronograma · Medição · Alterações de escopo |
| 🚦 Docs & Conformidade | Arquivos (GED) · Checklist · Monitor · Dossiê SSO · Perfis por cliente |
| 🚛 Operação de Campo | Logística · Diário de Obras |
| 🔧 Frota & Equipamentos | Equipamentos · Combustível |
| 🚜 Serviços Especiais | Retroescavadeira · Dedetização |
| 🏭 Almoxarifado & EPI | Almoxarifado · Controle de EPI · Importar NF-e |
| 💼 Fiscal & Contábil | Central Fiscal · DRE · Relatório Contador · Regularidade |
| 👷 RH & Pessoas | RH & Folha · Folha INSS/IRRF · Férias & Ocorrências · Mobilizações · Treinamentos NR · ASO |

Definição central em `src/lib/nav-grupos.ts`; a barra de abas (`src/components/SubNav.tsx`) é renderizada automaticamente pelo layout quando a rota pertence a um hub.

## Automações entre módulos

- **Dossiê validado e calculado** → proposta versionada com preço mínimo, recomendado e comercial
- **Versão aprovada nas três alçadas** → contrato + matriz documental dinâmica + cronograma + reservas confirmadas, em uma transação (`/api/proposta-contrato`)
- **Mobilização** → bloqueada se faltar documento aprovado com arquivo, houver validade insuficiente ou conflito de recurso; pode ser reavaliada após a correção
- **Diário de obras** → produção e HH reais comparados ao planejamento; desvio pode abrir alteração de escopo
- **ASO / Treinamento NR / entrega de EPI** cadastrados → preenchem automaticamente a matriz do Monitor de Docs (`autoSource`)
- **Combustível lançado com contrato** → entra sozinho na Rentabilidade
- **Tudo que vence** (contrato, ASO, NR, CNH, EPI/CA, licença ambiental, certidão, férias CLT) → agregado na Central de Alertas
- **Medição aprovada/faturada** → receita da Rentabilidade
- **Backup do banco** → cron diário 02h20 na VPS (retenção 14 dias)

## Regras de segurança (imutáveis)

- Fiscal é **apoio gerencial**: sem transmissão oficial SEFAZ/eSocial/NFS-e sem certificado + homologação + contador
- Nunca commitar: `.env.production`, certificados, XMLs reais, documentos de funcionários, contratos reais, chaves de API
- Login obrigatório (middleware em `src/middleware.ts`), papéis/permissões no banco, auditoria de ações críticas
