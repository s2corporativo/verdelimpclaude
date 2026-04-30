
"use client";
import { useState, useRef, useEffect, useCallback } from "react";

/* ─── CONTEXTO COMPLETO DO SISTEMA ─────────────────────────────── */
const SYSTEM_CONTEXT = `Você é o assistente de ajuda do Verdelimp ERP, sistema de gestão para a empresa VERDELIMP SERVICOS E TERCEIRIZACAO LTDA, CNPJ 30.198.776/0001-29, Betim/MG, regime Simples Nacional, CNAE 81.30-3-00 (Paisagismo).

MÓDULOS DO SISTEMA:

1. DASHBOARD — Visão geral com KPIs de faturamento, tributos em aberto, funcionários ativos, NFS-e emitidas, alertas de vencimento e APIs conectadas (IBGE, Feriados, etc.).

2. CLIENTES — Cadastro com preenchimento automático via CNPJ (Receita Federal/BrasilAPI) e CEP (ViaCEP). Campos: razão social, CNPJ, tipo (Público/Privado), telefone, e-mail, endereço. Botão "Atualizar CNPJ" consulta situação cadastral.

3. FORNECEDORES — Cadastro igual a clientes. CNPJ preenche razão social e situação automaticamente.

4. PROPOSTAS — Geração de proposta com cálculo de BDI: custo MO, encargos (70%), administrativo (10%), risco (5%), impostos (8%), margem (30%). Botão PDF gera documento profissional para impressão/download.

5. CENTRAL FISCAL — 3 abas:
   - Despesas Tributárias: lançamento de DAS, FGTS, INSS, ISS, IRRF, CSRF, etc.
   - NFS-e Emitidas: registro com ISS automático pela tabela da LC 33/2003 de Betim (5% para CNAE 81.30).
   - Apuração Automática (✨): informa faturamento + competência → sistema calcula e gera lançamentos de DAS (6,72%), FGTS (8%), INSS Patronal (7%), ISS Betim e CSRF automaticamente.

6. FINANCEIRO — Lançamentos de receitas e despesas. Categorias: Contrato, Operacional, RH, Tributário, etc.

7. RH & FOLHA — Lista de funcionários com salários reais (8 colaboradores). Calcula automaticamente FGTS 8% e INSS Patronal 7% por colaborador. Aviso: validar com contador.

8. ALMOXARIFADO — Controle de estoque com código interno, categoria, quantidade atual vs mínima. Alerta vermelho quando abaixo do mínimo. Filtro por código/descrição.

9. REGULARIDADE FISCAL — Consulta CNPJ na Receita Federal e retorna situação cadastral, alertas e links diretos para CND Federal, CRF/FGTS, Certidão Trabalhista TST, SINTEGRA/MG e CND Municipal Betim. Verificação em lote de todos os clientes e fornecedores.

10. WHATSAPP ALERTAS — Alertas automáticos por WhatsApp para: SST vencendo (30 dias), DAS vencendo (7 dias), estoque crítico, certidões vencendo. Suporta Evolution API (gratuita) e Z-API (pago).

11. IMPORTAR NF-e XML — Arrasta arquivo XML da NF-e → extrai fornecedor, itens, NCM, CFOP, quantidades, valores e impostos. Consulta CNPJ na Receita Federal automaticamente. Sugere vinculação com almoxarifado. Cria fornecedor automaticamente se não cadastrado.

12. INTEGRAÇÕES — Central de APIs: ViaCEP, BrasilAPI CNPJ, IBGE, Feriados, ISS Betim LC33/2003, PNCP Licitações, Claude IA. Log de chamadas em tempo real.

13. CONFIGURAÇÕES — Dados da empresa, alíquotas fiscais de referência, política de certificado digital.

APIS INTEGRADAS (funcionam sem token):
- ViaCEP: preenchimento de endereço por CEP
- BrasilAPI CNPJ: dados da Receita Federal
- IBGE: municípios e UFs
- Feriados 2026: calendário fiscal
- ISS Betim LC33/2003: alíquotas automáticas
- PNCP: licitações públicas

IMPORTANTE: Todos os cálculos fiscais são apoio gerencial — validar com contador antes de pagamentos.

Responda em português, seja prático e direto. Se o usuário tiver dúvidas sobre cadastro, explique o passo a passo do módulo correto. Para questões fiscais, sempre lembre de validar com contador.`;

/* ─── GUIAS POR MÓDULO ──────────────────────────────────────────── */
const MODULOS = [
  {
    id: "dashboard", icon: "📊", nome: "Dashboard", cor: "#1a7a4a",
    descricao: "Visão geral do negócio em tempo real",
    passos: [
      "Ao abrir, o sistema consulta automaticamente IBGE (Betim) e feriados de 2026",
      "KPIs mostram: receitas, despesas, tributos em aberto, NFS-e e alertas",
      "Vencimentos fiscais aparecem em ordem de urgência — os mais próximos primeiro",
      "Painel de APIs indica quais integrações estão ativas",
      "Tributos vencidos aparecem em vermelho com alerta de urgência",
    ],
    dicas: ["Acesse o dashboard toda manhã para verificar vencimentos do dia", "Tributos em vermelho precisam de ação imediata"],
    perguntas: ["O que significa o alerta vermelho no dashboard?", "Por que aparecem feriados no painel?", "Como atualizar os dados do dashboard?"],
  },
  {
    id: "clientes", icon: "🤝", nome: "Clientes", cor: "#1d4ed8",
    descricao: "Cadastro automático com dados da Receita Federal",
    passos: [
      "Clique em '+ Novo Cliente'",
      "Digite o CNPJ e clique em '🔍 CNPJ' — razão social e município preenchidos automaticamente",
      "Se precisar do endereço completo, informe o CEP e clique em '🔍 CEP'",
      "Confirme ou ajuste os dados e clique em '+ Cadastrar'",
      "Para atualizar a situação cadastral de um cliente já salvo, clique em '🔄 Atualizar CNPJ'",
    ],
    dicas: ["Sempre use o botão CNPJ antes de digitar manualmente — evita erros", "O sistema verifica se o CNPJ é ativo ou inapto na Receita Federal"],
    perguntas: ["Como cadastrar um novo cliente público?", "O CNPJ não está preenchendo automaticamente, o que fazer?", "Como verificar se o CNPJ de um cliente está ativo?"],
  },
  {
    id: "fornecedores", icon: "📦", nome: "Fornecedores", cor: "#7c3aed",
    descricao: "Gestão de fornecedores com dados automáticos",
    passos: [
      "Clique em '+ Novo Fornecedor'",
      "Digite o CNPJ e clique em '🔍 CNPJ' para preencher automaticamente",
      "Selecione o tipo: Material, EPI, Ferramentas, Combustível, Serviços ou Outro",
      "Adicione telefone e e-mail para contato",
      "Salve — o fornecedor ficará disponível nas NF-e e despesas",
    ],
    dicas: ["Fornecedores cadastrados aparecem automaticamente ao importar XML de NF-e", "O botão 🔄 atualiza a situação cadastral na Receita Federal"],
    perguntas: ["Como vincular um fornecedor a uma NF-e?", "Por que o CNPJ do fornecedor aparece como 'inapto'?"],
  },
  {
    id: "propostas", icon: "📄", nome: "Propostas + PDF", cor: "#0891b2",
    descricao: "Proposta comercial com BDI e exportação PDF",
    passos: [
      "Acesse Propostas → clique em '+ Nova Proposta'",
      "Vincule um cliente cadastrado — dados preenchidos automaticamente",
      "Informe: objeto do serviço, local, área (m²), dias e número de funcionários",
      "Ajuste os parâmetros de BDI: encargos (padrão 70%), administrativo, risco, impostos e margem",
      "O sistema calcula o valor total automaticamente",
      "Salve a proposta — após isso, clique em '📄 PDF' para gerar o documento",
      "Na tela de PDF, pressione Ctrl+P → Salvar como PDF",
    ],
    dicas: ["BDI padrão (encargos 70%): adequado para serviços com CLT", "Margem mínima recomendada para licitações públicas: 20-25%", "O PDF inclui espaço para assinatura das duas partes"],
    perguntas: ["Como calcular o preço de roçada por m²?", "Qual margem usar numa proposta para licitação?", "Como gerar o PDF da proposta?", "O que é BDI e como configurar?"],
  },
  {
    id: "fiscal", icon: "💼", nome: "Central Fiscal", cor: "#dc2626",
    descricao: "Controle tributário com apuração automática",
    passos: [
      "Aba 'Despesas Tributárias': lançamentos manuais de DAS, FGTS, ISS, etc.",
      "Aba 'NFS-e Emitidas': registre notas com ISS automático (LC 33/2003 Betim)",
      "Aba '✨ Apuração Automática': informe faturamento + competência → clique em 'Gerar Lançamentos'",
      "O sistema calcula: DAS (6,72%), FGTS (8%), INSS (7%), ISS e CSRF",
      "Lançamentos gerados automaticamente aparecem com ícone '🤖 AUTO'",
      "Marque como 'Pago' após quitar cada tributo",
    ],
    dicas: [
      "DAS: SEMPRE apurar oficialmente no PGDAS-D — o sistema faz estimativa",
      "ISS Betim: CNAE 81.30-3-00 → lista 7.11 → 5% (confirmado na LC 33/2003)",
      "Faturamento mensal Verdelimp: verificar NFS-e emitidas na aba correspondente",
    ],
    perguntas: ["Quando vence o DAS do Simples Nacional?", "Qual a alíquota de ISS em Betim para jardinagem?", "Como registrar uma NFS-e com ISS retido na fonte?", "O que é CSRF e preciso pagar?"],
  },
  {
    id: "rh", icon: "👷", nome: "RH & Folha", cor: "#7c3aed",
    descricao: "Gestão de colaboradores e cálculo de encargos",
    passos: [
      "A tela mostra automaticamente os 8 colaboradores cadastrados",
      "Para cada funcionário: nome, função, salário, FGTS calculado (8%) e INSS (7%)",
      "Totais da folha aparecem no rodapé da tabela",
      "KPIs mostram folha bruta, FGTS total e INSS total do mês",
      "Documentos SST (ASO, NR-06, etc.) são monitorados — alertas via WhatsApp quando vencerem",
    ],
    dicas: [
      "Custo total por funcionário ≈ salário × 1,7 (inclui encargos, benefícios e EPI)",
      "FGTS vence todo dia 7 do mês seguinte",
      "ASO (Atestado de Saúde Ocupacional): renovar anualmente",
    ],
    perguntas: ["Como calcular o custo real de um funcionário?", "Quando vence o FGTS?", "Quais documentos SST são obrigatórios?", "O que acontece se o ASO vencer?"],
  },
  {
    id: "almoxarifado", icon: "🏭", nome: "Almoxarifado", cor: "#d97706",
    descricao: "Controle de estoque com alertas de mínimo",
    passos: [
      "A tela mostra todos os itens com código, categoria, quantidade atual e mínima",
      "Itens com quantidade ≤ mínimo aparecem em VERMELHO — estoque crítico",
      "Use o campo de busca para filtrar por código (ex: EPI-001) ou descrição",
      "Para importar produtos de uma NF-e: use o módulo 'Importar NF-e XML'",
      "Ao importar XML, o sistema sugere vinculação automática de cada item da nota com o estoque",
    ],
    dicas: [
      "EPI-002 (Capacete) e EPI-003 (Bota) frequentemente ficam críticos — monitorar",
      "FER-002 (Motosserra) está em manutenção — acompanhar retorno",
      "Estoque mínimo: calcule com base no consumo médio × tempo de reposição",
    ],
    perguntas: ["Como dar entrada de material no estoque?", "O que fazer quando o estoque estiver crítico?", "Como importar itens de uma NF-e para o estoque?"],
  },
  {
    id: "regularidade", icon: "🔎", nome: "Regularidade Fiscal", cor: "#059669",
    descricao: "Sintegra e CND — consulta automática na Receita Federal",
    passos: [
      "Aba 'Consulta Individual': informe o CNPJ e clique em 'Consultar'",
      "O sistema retorna: situação cadastral, CNAE, porte, município e alertas de risco",
      "Aba 'Verificação em Lote': clique em '🔄 Verificar todos' para checar todos os CNPJs",
      "Aba 'Links Oficiais': acesso direto à CND Federal, CRF/FGTS, TST, SINTEGRA/MG e CND Betim",
      "Para contratos públicos: baixar certidões originais nos links da aba 'Links Oficiais'",
    ],
    dicas: [
      "Verificar regularidade de clientes antes de emitir NFS-e de alto valor",
      "Fornecedores inaptos: não contratar sem regularização",
      "Certidões para licitações: CND Federal + CRF/FGTS + TST + Estadual + Municipal",
    ],
    perguntas: ["Quais certidões são obrigatórias numa licitação?", "O que significa CNPJ 'inapto'?", "Como verificar a regularidade de um fornecedor?"],
  },
  {
    id: "whatsapp", icon: "📱", nome: "WhatsApp Alertas", cor: "#16a34a",
    descricao: "Alertas automáticos por mensagem",
    passos: [
      "Configure o provedor nas variáveis de ambiente (Evolution API gratuita ou Z-API pago)",
      "Informe o número do administrador: WHATSAPP_ADMIN_NUMBER=5531999990000",
      "Na tela, informe seu número e clique em 'Testar' para verificar a conexão",
      "Clique em 'Enviar todos' para disparar todos os alertas pendentes de uma vez",
      "O sistema verifica automaticamente: SST vencendo (30 dias), DAS (7 dias), estoque crítico",
    ],
    dicas: [
      "Evolution API: instale no seu servidor ou VPS (gratuita e open source)",
      "Z-API: pago, mas funciona via WhatsApp Web sem servidor próprio",
      "Número deve ter código do país: 55 + DDD + número (ex: 5531999990000)",
    ],
    perguntas: ["Como instalar a Evolution API?", "Qual a diferença entre Evolution API e Z-API?", "Como testar se o WhatsApp está funcionando?"],
  },
  {
    id: "nfe-import", icon: "📥", nome: "Importar NF-e XML", cor: "#6d28d9",
    descricao: "Entrada automática de estoque via XML",
    passos: [
      "Acesse 'Importar NF-e XML' no menu",
      "Arraste o arquivo .xml da NF-e ou clique para selecionar",
      "O sistema extrai: dados do fornecedor, itens, NCM, CFOP, quantidades e impostos",
      "O CNPJ do emitente é consultado na Receita Federal automaticamente",
      "Revise os itens e a sugestão de vinculação com o almoxarifado",
      "Clique em '✅ Confirmar Entrada' para dar baixa no estoque",
    ],
    dicas: [
      "Arquivos XML: baixar no portal do fornecedor ou SEFAZ após manifestação",
      "Se o fornecedor não estiver cadastrado, o sistema o cria automaticamente",
      "Itens não vinculados ao almoxarifado aparecem como 'Novo item' — vincular manualmente",
    ],
    perguntas: ["Onde baixar o XML da NF-e?", "O que fazer se o item da nota não existir no estoque?", "Como funciona a vinculação automática com o almoxarifado?"],
  },
  {
    id: "integracoes", icon: "🔌", nome: "Integrações & APIs", cor: "#0891b2",
    descricao: "Central de APIs conectadas ao sistema",
    passos: [
      "A tela mostra todas as APIs com status (ativa/pendente)",
      "APIs públicas (verde): funcionam imediatamente sem configuração",
      "APIs com certificado (rosa 🔐): requerem certificado digital A1/A3",
      "Log em tempo real: exibe todas as chamadas com horário e resultado",
      "Para ativar NF-e SEFAZ: configurar SEFAZ_CERTIFICATE_ENABLED=true no Render",
    ],
    dicas: [
      "ViaCEP e BrasilAPI CNPJ: gratuitas, sem limite de uso no sistema",
      "PNCP: consultar editais de licitação — atualizado diariamente",
      "Certificado digital: nunca armazenar em disco sem cofre seguro",
    ],
    perguntas: ["Quais APIs funcionam sem configuração?", "Como ativar a NF-e SEFAZ?", "O que é a Evolution API?"],
  },
];

/* ─── COMPONENTE PRINCIPAL ──────────────────────────────────────── */
export default function AjudaPage() {
  const [moduloAtivo, setModuloAtivo] = useState<string | null>(null);
  const [chat, setChat] = useState<{role:string;content:string;mod?:string}[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat, loading]);

  const modulo = MODULOS.find(m => m.id === moduloAtivo);

  const enviar = useCallback(async (msgOverride?: string) => {
    const msg = (msgOverride || input).trim();
    if (!msg || loading) return;
    setInput("");
    const novoChat = [...chat, { role: "user", content: msg, mod: moduloAtivo || undefined }];
    setChat(novoChat);
    setLoading(true);

    const contextoModulo = modulo
      ? `\n\nO usuário está na tela: ${modulo.nome}. Contexto adicional:\n${JSON.stringify({ passos: modulo.passos, dicas: modulo.dicas }, null, 2)}`
      : "";

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_CONTEXT + contextoModulo,
          messages: novoChat.slice(-10).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const d = await r.json();
      const resp = d.content?.[0]?.text || "Erro ao obter resposta.";
      setChat(c => [...c, { role: "assistant", content: resp }]);
    } catch {
      setChat(c => [...c, { role: "assistant", content: "Erro de conexão. Verifique sua internet e tente novamente." }]);
    }
    setLoading(false);
  }, [chat, input, loading, modulo, moduloAtivo]);

  const perguntaRapida = (p: string) => {
    setInput(p);
    setTimeout(() => enviar(p), 50);
  };

  const modulosFiltrados = MODULOS.filter(m =>
    !busca || m.nome.toLowerCase().includes(busca.toLowerCase()) || m.descricao.toLowerCase().includes(busca.toLowerCase())
  );

  /* ── ESTILOS ── */
  const IS: any = { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, outline: "none" };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 48px)", gap: 0, background: "#f8fafc" }}>

      {/* ── PAINEL ESQUERDO: MÓDULOS ── */}
      <div style={{ width: 280, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #f3f4f6" }}>
          <h2 style={{ color: "#0f5233", fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>📖 Como usar o ERP</h2>
          <input
            style={{ ...IS, fontSize: 12 }}
            placeholder="🔍 Buscar módulo..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          <button
            onClick={() => { setModuloAtivo(null); }}
            style={{ width: "100%", textAlign: "left", padding: "9px 10px", border: "none", borderRadius: 8, marginBottom: 2, cursor: "pointer", background: !moduloAtivo ? "#e8f5ee" : "transparent", color: !moduloAtivo ? "#0f5233" : "#374151", fontWeight: !moduloAtivo ? 700 : 400, fontSize: 13 }}>
            🤖 Assistente Geral
          </button>
          {modulosFiltrados.map(m => (
            <button key={m.id}
              onClick={() => { setModuloAtivo(m.id); }}
              style={{ width: "100%", textAlign: "left", padding: "9px 10px", border: "none", borderRadius: 8, marginBottom: 2, cursor: "pointer", background: moduloAtivo === m.id ? m.cor + "18" : "transparent", color: moduloAtivo === m.id ? m.cor : "#374151", fontWeight: moduloAtivo === m.id ? 700 : 400, fontSize: 13, display: "flex", alignItems: "center", gap: 8, borderLeft: moduloAtivo === m.id ? `3px solid ${m.cor}` : "3px solid transparent" }}>
              <span style={{ fontSize: 15 }}>{m.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{m.nome}</div>
                <div style={{ fontSize: 10, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.descricao}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #f3f4f6", fontSize: 10, color: "#9ca3af" }}>
          IA gratuita · Claude Sonnet · Contexto do sistema
        </div>
      </div>

      {/* ── PAINEL CENTRAL: GUIA DO MÓDULO ── */}
      <div style={{ width: 340, background: "#f8fafc", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        {modulo ? (
          <div style={{ padding: 16 }}>
            {/* Header */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 14, borderTop: `4px solid ${modulo.cor}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{modulo.icon}</span>
                <div>
                  <h3 style={{ color: modulo.cor, fontSize: 15, fontWeight: 700, margin: 0 }}>{modulo.nome}</h3>
                  <p style={{ color: "#6b7280", fontSize: 11, margin: 0 }}>{modulo.descricao}</p>
                </div>
              </div>
            </div>

            {/* Passo a passo */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <h4 style={{ color: "#374151", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 10 }}>📋 Passo a passo</h4>
              {modulo.passos.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < modulo.passos.length - 1 ? "1px solid #f9fafb" : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: modulo.cor, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.5 }}>{p}</p>
                </div>
              ))}
            </div>

            {/* Dicas */}
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <h4 style={{ color: "#92400e", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>💡 Dicas importantes</h4>
              {modulo.dicas.map((d, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 12, color: "#78350f" }}>
                  <span style={{ flexShrink: 0 }}>→</span><span>{d}</span>
                </div>
              ))}
            </div>

            {/* Perguntas rápidas */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 14 }}>
              <h4 style={{ color: "#374151", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>❓ Perguntas frequentes</h4>
              {modulo.perguntas.map((p, i) => (
                <button key={i} onClick={() => perguntaRapida(p)}
                  style={{ width: "100%", textAlign: "left", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 11px", marginBottom: 6, cursor: "pointer", fontSize: 12, color: modulo.cor, fontWeight: 500, lineHeight: 1.4 }}>
                  {p} →
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: 16 }}>
            <div style={{ background: "linear-gradient(135deg, #0f5233, #1a7a4a)", borderRadius: 14, padding: 20, marginBottom: 14, color: "#fff" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>Assistente Verdelimp ERP</h3>
              <p style={{ fontSize: 12, opacity: .85, margin: 0, lineHeight: 1.5 }}>
                Faço parte do sistema e conheço todos os módulos, APIs, tributos e processos. Pergunte qualquer coisa.
              </p>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <h4 style={{ color: "#374151", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>🚀 Por onde começar?</h4>
              {[
                ["Clique em um módulo à esquerda", "Ver guia passo a passo de qualquer tela"],
                ["Use as perguntas frequentes", "Dúvidas comuns com um clique"],
                ["Digite sua dúvida no chat", "Resposta personalizada com IA"],
                ["Apuração automática", "Central Fiscal → ✨ Apuração"],
              ].map(([titulo, desc]) => (
                <div key={titulo} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #f9fafb" }}>
                  <span style={{ color: "#1a7a4a", fontWeight: 700, flexShrink: 0 }}>→</span>
                  <div><div style={{ fontSize: 12, fontWeight: 600 }}>{titulo}</div><div style={{ fontSize: 11, color: "#9ca3af" }}>{desc}</div></div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: 12, padding: 14 }}>
              <h4 style={{ color: "#374151", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>💬 Experimente perguntar:</h4>
              {[
                "Como fazer a apuração tributária automática?",
                "Qual alíquota de ISS para paisagismo em Betim?",
                "Como gerar o PDF de uma proposta?",
                "Como importar XML de NF-e no estoque?",
                "Como configurar alertas de WhatsApp?",
                "Quais certidões preciso para uma licitação?",
              ].map(p => (
                <button key={p} onClick={() => perguntaRapida(p)}
                  style={{ width: "100%", textAlign: "left", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "7px 11px", marginBottom: 5, cursor: "pointer", fontSize: 12, color: "#1a7a4a", fontWeight: 500 }}>
                  {p} →
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── PAINEL DIREITO: CHAT IA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header chat */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#0f5233,#1a7a4a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f5233" }}>
              Assistente Verdelimp{modulo ? ` — ${modulo.nome}` : ""}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {modulo ? `Contexto ativo: ${modulo.nome} · ` : ""}IA com conhecimento completo do sistema
            </div>
          </div>
          {chat.length > 0 && (
            <button onClick={() => setChat([])}
              style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "5px 11px", cursor: "pointer", fontSize: 11, color: "#6b7280" }}>
              Limpar
            </button>
          )}
        </div>

        {/* Mensagens */}
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
          {chat.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#9ca3af" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 6px" }}>Como posso ajudar?</p>
              <p style={{ fontSize: 12 }}>
                {modulo ? `Estou pronto para responder dúvidas sobre ${modulo.nome}. Use as perguntas frequentes ao lado ou escreva sua dúvida.` : "Selecione um módulo à esquerda para ver o guia, ou escreva sua dúvida diretamente aqui."}
              </p>
            </div>
          )}

          {chat.map((m, i) => (
            <div key={i} style={{ display: "flex", flexDirection: m.role === "user" ? "row-reverse" : "row", gap: 8, alignItems: "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#0f5233,#1a7a4a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, marginTop: 2 }}>🤖</div>
              )}
              <div style={{
                maxWidth: "78%",
                background: m.role === "user" ? "#0f5233" : "#fff",
                color: m.role === "user" ? "#fff" : "#1a1a1a",
                padding: "10px 14px",
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                fontSize: 13,
                lineHeight: 1.6,
                border: m.role === "assistant" ? "1px solid #e5e7eb" : "none",
                whiteSpace: "pre-wrap",
                boxShadow: "0 1px 3px rgba(0,0,0,.06)",
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#0f5233,#1a7a4a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "14px 14px 14px 4px", padding: "10px 16px", display: "flex", gap: 6, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#1a7a4a", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ background: "#fff", borderTop: "1px solid #e5e7eb", padding: "12px 16px" }}>
          {modulo && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {modulo.perguntas.slice(0, 3).map((p, i) => (
                <button key={i} onClick={() => perguntaRapida(p)}
                  style={{ background: modulo.cor + "14", border: `1px solid ${modulo.cor}44`, borderRadius: 20, padding: "3px 10px", fontSize: 11, color: modulo.cor, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {p.substring(0, 32)}{p.length > 32 ? "..." : ""}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              ref={inputRef}
              style={{ ...IS, flex: 1, background: "#f8fafc" }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder={modulo ? `Dúvida sobre ${modulo.nome}...` : "Digite sua dúvida sobre o sistema..."}
              disabled={loading}
            />
            <button
              onClick={() => enviar()}
              disabled={loading || !input.trim()}
              style={{ background: loading || !input.trim() ? "#e5e7eb" : "#0f5233", color: loading || !input.trim() ? "#9ca3af" : "#fff", border: "none", padding: "8px 20px", borderRadius: 8, cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {loading ? "..." : "Enviar"}
            </button>
          </div>
          <p style={{ fontSize: 10, color: "#c3c9d0", margin: "6px 0 0", textAlign: "center" }}>
            Enter para enviar · IA com contexto completo do Verdelimp ERP
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.7); opacity: .5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
