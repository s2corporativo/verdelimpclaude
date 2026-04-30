/**
 * Verdelimp ERP — Integração WhatsApp
 * Suporta Evolution API (self-hosted, gratuita) e Z-API (pago)
 * Configurar via variáveis de ambiente
 */

export type AlertaTipo =
  | "sst_vencendo"
  | "sst_vencida"
  | "das_vencendo"
  | "das_vencida"
  | "estoque_critico"
  | "proposta_aprovada"
  | "cnd_vencendo"
  | "tributo_vencendo"
  | "doc_vencendo";

export interface WhatsAppConfig {
  provider: "evolution" | "zapi" | "disabled";
  evolutionUrl?: string;
  evolutionApiKey?: string;
  evolutionInstance?: string;
  zapiUrl?: string;
  zapiToken?: string;
  zapiClientToken?: string;
  defaultNumber?: string; // número admin
}

export interface AlertaPayload {
  tipo: AlertaTipo;
  destinatario: string; // número com código do país: 5531999990000
  dados: Record<string, string | number>;
}

function getConfig(): WhatsAppConfig {
  return {
    provider: (process.env.WHATSAPP_PROVIDER || "disabled") as WhatsAppConfig["provider"],
    evolutionUrl: process.env.EVOLUTION_API_URL,
    evolutionApiKey: process.env.EVOLUTION_API_KEY,
    evolutionInstance: process.env.EVOLUTION_INSTANCE || "verdelimp",
    zapiUrl: process.env.ZAPI_URL,
    zapiToken: process.env.ZAPI_TOKEN,
    zapiClientToken: process.env.ZAPI_CLIENT_TOKEN,
    defaultNumber: process.env.WHATSAPP_ADMIN_NUMBER,
  };
}

function gerarMensagem(tipo: AlertaTipo, dados: Record<string, string | number>): string {
  const templates: Record<AlertaTipo, string> = {
    sst_vencendo:
      `🦺 *VERDELIMP ERP — Alerta SST*\n\n` +
      `⚠️ Documento SST próximo do vencimento:\n\n` +
      `👷 Funcionário: *${dados.funcionario}*\n` +
      `📋 Documento: *${dados.documento}*\n` +
      `📅 Vencimento: *${dados.vencimento}*\n` +
      `⏰ Dias restantes: *${dados.dias} dias*\n\n` +
      `Providencie a renovação para evitar autuação.\n` +
      `_Verdelimp ERP — Módulo RH_`,

    sst_vencida:
      `🚨 *VERDELIMP ERP — URGENTE: SST VENCIDA*\n\n` +
      `⛔ Documento SST VENCIDO:\n\n` +
      `👷 Funcionário: *${dados.funcionario}*\n` +
      `📋 Documento: *${dados.documento}*\n` +
      `📅 Venceu em: *${dados.vencimento}*\n\n` +
      `Colaborador NÃO pode trabalhar em campo até renovação!\n` +
      `_Verdelimp ERP — Módulo RH_`,

    das_vencendo:
      `💼 *VERDELIMP ERP — Alerta Fiscal*\n\n` +
      `⚠️ DAS Simples Nacional vencendo:\n\n` +
      `📆 Competência: *${dados.competencia}*\n` +
      `📅 Vencimento: *${dados.vencimento}*\n` +
      `💰 Valor estimado: *R$ ${dados.valor}*\n` +
      `⏰ Dias restantes: *${dados.dias} dias*\n\n` +
      `Acesse o PGDAS-D para apuração e pagamento.\n` +
      `_Verdelimp ERP — Central Fiscal_`,

    das_vencida:
      `🚨 *VERDELIMP ERP — URGENTE: DAS VENCIDO*\n\n` +
      `⛔ DAS Simples Nacional VENCIDO:\n\n` +
      `📆 Competência: *${dados.competencia}*\n` +
      `📅 Venceu em: *${dados.vencimento}*\n` +
      `💰 Valor: *R$ ${dados.valor}*\n\n` +
      `Há multa e juros acumulando. Regularize urgente!\n` +
      `_Verdelimp ERP — Central Fiscal_`,

    estoque_critico:
      `🏭 *VERDELIMP ERP — Estoque Crítico*\n\n` +
      `⚠️ Item abaixo do estoque mínimo:\n\n` +
      `📦 Item: *${dados.item}*\n` +
      `📊 Quantidade atual: *${dados.atual}*\n` +
      `📉 Estoque mínimo: *${dados.minimo}*\n\n` +
      `Realize uma solicitação de compra.\n` +
      `_Verdelimp ERP — Almoxarifado_`,

    proposta_aprovada:
      `✅ *VERDELIMP ERP — Proposta Aprovada!*\n\n` +
      `🎉 Uma proposta foi aprovada:\n\n` +
      `📄 Proposta: *${dados.numero}*\n` +
      `🤝 Cliente: *${dados.cliente}*\n` +
      `💰 Valor: *R$ ${dados.valor}*\n\n` +
      `Avance para formalização do contrato.\n` +
      `_Verdelimp ERP — Módulo Comercial_`,

    cnd_vencendo:
      `📋 *VERDELIMP ERP — Certidão Vencendo*\n\n` +
      `⚠️ Certidão próxima do vencimento:\n\n` +
      `📋 Certidão: *${dados.certidao}*\n` +
      `📅 Vencimento: *${dados.vencimento}*\n` +
      `⏰ Dias restantes: *${dados.dias} dias*\n\n` +
      `Renove para não perder habilitação em licitações.\n` +
      `_Verdelimp ERP — Regularidade Fiscal_`,

    tributo_vencendo:
      `💸 *VERDELIMP ERP — Tributo Vencendo*\n\n` +
      `⚠️ Obrigação fiscal próxima:\n\n` +
      `🏛️ Tributo: *${dados.tributo}*\n` +
      `📆 Competência: *${dados.competencia}*\n` +
      `📅 Vencimento: *${dados.vencimento}*\n` +
      `💰 Valor: *R$ ${dados.valor}*\n` +
      `⏰ Dias restantes: *${dados.dias} dias*\n\n` +
      `_Verdelimp ERP — Central Fiscal_`,

    doc_vencendo:
      `📄 *VERDELIMP ERP — Documento Vencendo*\n\n` +
      `⚠️ Documento próximo do vencimento:\n\n` +
      `📋 Documento: *${dados.documento}*\n` +
      `🏛️ Órgão: *${dados.orgao}*\n` +
      `📅 Vencimento: *${dados.vencimento}*\n` +
      `⏰ Dias restantes: *${dados.dias} dias*\n\n` +
      `_Verdelimp ERP — Módulo Fiscal_`,
  };

  return templates[tipo] || `Alerta Verdelimp ERP: ${JSON.stringify(dados)}`;
}

export async function enviarWhatsApp(payload: AlertaPayload): Promise<{ ok: boolean; message: string; demo?: boolean }> {
  const config = getConfig();

  if (config.provider === "disabled") {
    console.log(`[WhatsApp DEMO] ${payload.tipo} → ${payload.destinatario}`);
    return { ok: true, message: "WhatsApp não configurado — modo demonstrativo", demo: true };
  }

  const mensagem = gerarMensagem(payload.tipo, payload.dados);
  const numero = payload.destinatario.replace(/\D/g, "");

  try {
    if (config.provider === "evolution") {
      // Evolution API — gratuita e self-hosted
      const url = `${config.evolutionUrl}/message/sendText/${config.evolutionInstance}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": config.evolutionApiKey || "",
        },
        body: JSON.stringify({ number: numero, text: mensagem }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Evolution API: HTTP ${res.status}`);
      return { ok: true, message: "Enviado via Evolution API" };
    }

    if (config.provider === "zapi") {
      // Z-API — pago (https://www.z-api.io)
      const url = `${config.zapiUrl}/send-text`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": config.zapiClientToken || "",
        },
        body: JSON.stringify({ phone: numero, message: mensagem }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Z-API: HTTP ${res.status}`);
      return { ok: true, message: "Enviado via Z-API" };
    }

    return { ok: false, message: "Provedor não reconhecido" };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

// Verificar alertas pendentes e retornar lista
export async function verificarAlertas(prismaClient: any): Promise<AlertaPayload[]> {
  const alertas: AlertaPayload[] = [];
  const config = getConfig();
  const numero = config.defaultNumber || "";
  const hoje = new Date();
  const em30dias = new Date(hoje.getTime() + 30 * 86400000);
  const em7dias = new Date(hoje.getTime() + 7 * 86400000);

  try {
    // SST vencendo em 30 dias
    const docsVencendo = await prismaClient.employeeDoc.findMany({
      where: { expiresAt: { gte: hoje, lte: em30dias } },
      include: { employee: { select: { name: true } } },
    });
    for (const doc of docsVencendo) {
      const dias = Math.ceil((doc.expiresAt.getTime() - hoje.getTime()) / 86400000);
      alertas.push({
        tipo: dias <= 0 ? "sst_vencida" : "sst_vencendo",
        destinatario: numero,
        dados: { funcionario: doc.employee.name, documento: doc.docType, vencimento: doc.expiresAt.toLocaleDateString("pt-BR"), dias },
      });
    }

    // Tributos vencendo em 7 dias
    const tributos = await prismaClient.fiscalTaxExpense.findMany({
      where: { status: "em_aberto", dueDate: { gte: hoje, lte: em7dias } },
    });
    for (const t of tributos) {
      const dias = Math.ceil((t.dueDate.getTime() - hoje.getTime()) / 86400000);
      alertas.push({
        tipo: t.taxType === "DAS" ? "das_vencendo" : "tributo_vencendo",
        destinatario: numero,
        dados: { tributo: t.taxType, competencia: t.competence, vencimento: t.dueDate.toLocaleDateString("pt-BR"), valor: Number(t.totalAmount).toFixed(2), dias },
      });
    }

    // Estoque crítico
    const itensCriticos = await prismaClient.inventoryItem.findMany({
      where: { active: true },
    });
    for (const item of itensCriticos) {
      if (Number(item.currentQuantity) <= Number(item.minimumStock)) {
        alertas.push({
          tipo: "estoque_critico",
          destinatario: numero,
          dados: { item: item.description, atual: Number(item.currentQuantity).toFixed(0), minimo: Number(item.minimumStock).toFixed(0) },
        });
      }
    }

    // Documentos fiscais vencendo
    const docsFiscais = await prismaClient.fiscalDocument.findMany({
      where: { dueDate: { gte: hoje, lte: em30dias } },
    });
    for (const doc of docsFiscais) {
      const dias = Math.ceil((doc.dueDate.getTime() - hoje.getTime()) / 86400000);
      alertas.push({
        tipo: "doc_vencendo",
        destinatario: numero,
        dados: { documento: doc.documentType, orgao: doc.issuer || "Órgão", vencimento: doc.dueDate.toLocaleDateString("pt-BR"), dias },
      });
    }
  } catch { /* banco não disponível */ }

  return alertas;
}
