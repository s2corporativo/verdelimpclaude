# 🗺️ Mapa do Sistema — Verdelimp ERP

> Gerado no pente-fino de consolidação. Números: **52 páginas · 84 APIs · 61 tabelas · 17 bibliotecas**.
> Stack: Next.js 14 (App Router) · PostgreSQL 16 + Prisma · NextAuth (JWT, 8 papéis × 44 permissões) · GROQ IA · Docker na VPS Contabo (porta interna configurável, padrão 3010/3011).

## Visão geral dos domínios

```mermaid
flowchart TB
  subgraph COMERCIAL
    CRM[🎯 Oportunidades CRM]
    LIC[🏆 Licitações\nPipeline · Radar PNCP · Proposta IA]
    PROP[📄 Propostas + PDF Vallourec]
    PRECO[🧮 Precificação\nCalculadora · BDI · Hora-Homem]
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
  LIC -->|edital| PROP
  PRECO -->|preço mín/sugerido| PROP
  PROP -->|aprovar = 1 clique| CTR
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
  A[Lead/Edital] --> B[Proposta com\npreço Hora-Homem]
  B --> C[✅ Aprovar =\nContrato automático]
  C --> D[Monitor de Docs\nSADA SST + cl. 6.12]
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
| 🏆 Licitações | Pipeline · Radar PNCP · Proposta por Edital IA |
| 🧮 Precificação | Calculadora & BDI · Custo Hora-Homem |
| 📋 Contratos | Contratos · ⚡ Novo Contrato · Cronograma · Medição |
| 🚦 Docs & Conformidade | Arquivos (GED) · Checklist & Geração · Monitor · Dossiê SSO |
| 🚛 Operação de Campo | Logística · Diário de Obras |
| 🔧 Frota & Equipamentos | Equipamentos · Combustível |
| 🚜 Serviços Especiais | Retroescavadeira · Dedetização |
| 🏭 Almoxarifado & EPI | Almoxarifado · Controle de EPI · Importar NF-e |
| 💼 Fiscal & Contábil | Central Fiscal · DRE · Relatório Contador · Regularidade |
| 👷 RH & Pessoas | RH & Folha · Folha INSS/IRRF · Férias & Ocorrências · Mobilizações · Treinamentos NR · ASO |

Definição central em `src/lib/nav-grupos.ts`; a barra de abas (`src/components/SubNav.tsx`) é renderizada automaticamente pelo layout quando a rota pertence a um hub.

## Automações entre módulos

- **Proposta aprovada** → contrato numerado + 19 requisitos SST no Monitor + 1º item do cronograma + centro de custos (`/api/proposta-contrato`)
- **ASO / Treinamento NR / entrega de EPI** cadastrados → preenchem automaticamente a matriz do Monitor de Docs (`autoSource`)
- **Combustível lançado com contrato** → entra sozinho na Rentabilidade
- **Tudo que vence** (contrato, ASO, NR, CNH, EPI/CA, licença ambiental, certidão, férias CLT) → agregado na Central de Alertas
- **Medição aprovada/faturada** → receita da Rentabilidade
- **Backup do banco** → cron diário 02h20 na VPS (retenção 14 dias)

## Regras de segurança (imutáveis)

- Fiscal é **apoio gerencial**: sem transmissão oficial SEFAZ/eSocial/NFS-e sem certificado + homologação + contador
- Nunca commitar: `.env.production`, certificados, XMLs reais, documentos de funcionários, contratos reais, chaves de API
- Login obrigatório (middleware em `src/middleware.ts`), papéis/permissões no banco, auditoria de ações críticas
