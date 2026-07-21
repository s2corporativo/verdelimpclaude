# 🌿 Verdelimp ERP — Sistema Simplificado com IA

## Visão Geral

Este é o **Verdelimp ERP v2.2**, um sistema simplificado focado no essencial para gestão de contratos e serviços de jardinagem/limpeza, com **Inteligência Artificial integrada** para análise automática de documentos.

---

## ✨ Nova Funcionalidade: Análise Rápida com IA

### O que faz?

A IA lê contratos, cotações, editais ou termos de referência e extrai automaticamente:

1. **Dados do contrato**: cliente, objeto, local, área, prazo
2. **Equipe necessária**: quantas pessoas e quais funções (com salários sugeridos)
3. **Materiais e insumos**: lista do que será necessário
4. **Mobilização e desmobilização**: itens e custos estimados
5. **Documentação exigida da EMPRESA**: certidões, seguros, alvarás
6. **Documentação exigida dos FUNCIONÁRIOS**: ASO, NRs, EPIs, CNH

### Como usar?

1. No menu lateral, clique em **COMERCIAL → Análise Rápida com IA**
2. Selecione o tipo de documento (Contrato, Cotação, Edital, Termo de Referência)
3. Copie o texto do documento (PDF, Word, etc.) e cole na área de texto
4. Clique em **"✨ Analisar com IA"**
5. Aguarde alguns segundos enquanto a IA processa
6. Revise os resultados e use os botões para:
   - **Criar Contrato** a partir da análise
   - **Verificar Documentação Pendente** no Monitor de Documentação

---

## 🚦 Monitor de Documentação

Já existente no sistema, esta tela mostra:

- **Documentos da empresa**: situação de certidões, seguros, alvarás
- **Matriz por funcionário**: quais documentos cada funcionário tem/vencidos/faltantes

**Como acessar**: Menu lateral → CONTRATOS → Docs & Conformidade

A IA da "Análise Rápida" identifica quais documentos são exigidos no contrato, e você pode verificar no Monitor quais estão pendentes.

---

## 📋 Módulos Principais do Sistema

### COMERCIAL
- **Oportunidades CRM**: registre leads e negociações
- **Análise Rápida com IA**: novo! leia documentos automaticamente
- **Licitações**: acompanhe editais e propostas
- **Propostas + PDF**: gere propostas comerciais
- **Precificação**: calcule preços com BDI, encargos, impostos

### CONTRATOS
- **Contratos**: cadastre e gerencie contratos ativos
- **Docs & Conformidade**: monitor de documentação (empresa + funcionários)
- **Clientes**: cadastro completo de clientes
- **Fornecedores**: cadastro de fornecedores

### CAMPO
- **Operação de Campo**: logística, equipes, escalas
- **Frota & Equipamentos**: veículos, máquinas, manutenções
- **Serviços Especiais**: retroescavadeira, caminhões, etc.

### ESTOQUE & SEGURANÇA
- **Almoxarifado & EPI**: controle de estoque e entrega de EPIs
- **Ambiental**: licenças, DOFs, condicionantes

### FINANCEIRO & FISCAL
- **Financeiro + Aging**: contas a pagar/receber, fluxo de caixa
- **Rentabilidade**: custo x receita por contrato
- **Fiscal & Contábil**: obrigações fiscais
- **Inteligência Tributária**: cálculo de impostos
- **NFS-e Nacional**: emissão de notas fiscais

### RH
- **RH & Pessoas**: cadastro de funcionários, admissões, documentos

---

## 🔑 Configuração da IA (Groq)

Para usar a análise com IA, você precisa configurar a chave da API Groq:

1. Vá em **SISTEMA → Credenciais & APIs**
2. Cadastre uma nova credencial:
   - Nome: `GROQ_API_KEY`
   - Valor: sua chave da API Groq (pegue em https://groq.com)
3. Salve

**Importante**: Sem essa chave, a funcionalidade de análise com IA não funcionará.

---

## 📊 Fluxo Ideal de Trabalho

1. **Recebeu uma oportunidade?** → Registre em "Oportunidades CRM"
2. **Cliente enviou edital/cotação?** → Use "Análise Rápida com IA"
3. **Vai fazer proposta?** → Vá em "Propostas + PDF"
4. **Proposta aprovada?** → Crie o contrato em "Contratos"
5. **Antes de começar:** → Verifique docs em "Docs & Conformidade"
6. **Durante execução:** → Acompanhe em "Rentabilidade"
7. **Faturamento:** → Emita NFS-e em "NFS-e Nacional"

---

## 💡 Dicas Rápidas

| O que você quer fazer? | Onde ir no sistema |
|------------------------|-------------------|
| Ler um contrato/cotação automaticamente | COMERCIAL → Análise Rápida com IA |
| Ver documentos vencidos | CONTRATOS → Docs & Conformidade |
| Cadastrar novo contrato | CONTRATOS → Contratos → Novo |
| Gerar proposta comercial | COMERCIAL → Propostas + PDF |
| Ver quanto está lucrando | FINANCEIRO → Rentabilidade |
| Cadastrar funcionário | RH → RH & Pessoas |
| Entregar EPI | ESTOQUE → Almoxarifado & EPI |
| Emitir nota fiscal | FINANCEIRO → NFS-e Nacional |

---

## 🎯 Status dos Documentos

No Monitor de Documentação:

- 🔴 **Vermelho** = Vencido (URGENTE!)
- 🟡 **Amarelo** = Vence em 30 dias (atenção)
- 🟢 **Verde** = Válido (OK)
- ⚪ **Branco** = Faltante (não registrado)

---

🌿 **Verdelimp ERP v2.2** — Betim/MG
