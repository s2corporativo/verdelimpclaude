// src/app/api/contrato-propagar/route.ts
// Salva o contrato e CRIA registros automaticamente em todos os módulos:
// - Contrato (módulo Contratos)
// - Receitas mensais previstas (Financeiro)  
// - DAS e ISS projetados (Fiscal)
// - OSs cronograma (Logística)
// - Cliente (se não existir)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const c = body.contrato;
    const i = body.impacto;

    if (!c || !i) {
      return NextResponse.json({ error: "Contrato e impacto obrigatórios" }, { status: 400 });
    }

    const propagacao = {
      contratoCriado: false,
      clienteCriado: false,
      tributosProjetados: 0,
      receitasProjetadas: 0,
      osProjetadas: 0,
      contratoId: "",
      avisos: [] as string[],
    };

    // ── 1. CRIAR/ENCONTRAR CLIENTE ────────────────────────────────
    let clientId: string | null = null;
    if (c.clienteCnpj || c.clienteNome) {
      try {
        const existing = c.clienteCnpj
          ? await prisma.client.findFirst({ where: { cnpjCpf: c.clienteCnpj } })
          : await prisma.client.findFirst({ where: { name: c.clienteNome } });
        
        if (existing) {
          clientId = existing.id;
        } else {
          const newClient = await prisma.client.create({
            data: {
              name: c.clienteNome || "Cliente sem nome",
              cnpjCpf: c.clienteCnpj || null,
              type: "juridica",
              category: c.modalidadeLicitacao ? "Público" : "Privado",
              municipio: c.municipio || null,
              uf: c.uf || null,
              situacao: "ATIVA",
              active: true,
            },
          });
          clientId = newClient.id;
          propagacao.clienteCriado = true;
        }
      } catch (e: any) {
        propagacao.avisos.push(`Cliente: ${e.message}`);
      }
    }

    // ── 2. CRIAR CONTRATO ────────────────────────────────────────
    let contratoCriado: any = null;
    try {
      const count = await prisma.contract.count();
      const number = `CONT-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
      contratoCriado = await prisma.contract.create({
        data: {
          number,
          clientId: clientId || null,
          object: c.objeto || "Contrato sem descrição",
          value: c.valorTotal || (c.valorMensal * c.vigenciaMeses),
          monthlyValue: c.valorMensal || 0,
          startDate: new Date(c.dataInicio),
          endDate: new Date(c.dataFim || new Date(new Date(c.dataInicio).setMonth(new Date(c.dataInicio).getMonth() + c.vigenciaMeses))),
          status: "Ativo",
          renewalAlertDays: 90,
          adjustIndex: c.indiceReajuste || "INPC",
          notes: c.observacoes || null,
        },
      });
      propagacao.contratoCriado = true;
      propagacao.contratoId = contratoCriado.id;
    } catch (e: any) {
      propagacao.avisos.push(`Contrato: ${e.message}`);
      return NextResponse.json({ error: `Falha ao criar contrato: ${e.message}` }, { status: 500 });
    }

    // ── 3. PROJETAR TRIBUTOS (DAS + ISS) por mês ──────────────────
    try {
      const dataInicio = new Date(c.dataInicio);
      for (let mes = 0; mes < c.vigenciaMeses && mes < 24; mes++) {
        const dataMes = new Date(dataInicio);
        dataMes.setMonth(dataMes.getMonth() + mes);
        const competence = dataMes.toISOString().slice(0, 7); // YYYY-MM
        
        // DAS — vencimento dia 20 do mês seguinte
        const dueDateDas = new Date(dataMes);
        dueDateDas.setMonth(dueDateDas.getMonth() + 1);
        dueDateDas.setDate(20);

        await prisma.fiscalTaxExpense.create({
          data: {
            taxType: "DAS",
            description: `DAS ${competence} — projetado por contrato ${contratoCriado.number}`,
            competence,
            dueDate: dueDateDas,
            principalAmount: i.tributario.dasMensal,
            totalAmount: i.tributario.dasMensal,
            status: "projetado",
            generatedAuto: true,
            accountantReviewed: false,
            notes: `Projeção automática vinculada ao contrato ${contratoCriado.number}`,
          },
        });

        // ISS — vencimento dia 10 do mês seguinte
        const dueDateIss = new Date(dataMes);
        dueDateIss.setMonth(dueDateIss.getMonth() + 1);
        dueDateIss.setDate(10);

        await prisma.fiscalTaxExpense.create({
          data: {
            taxType: "ISS",
            description: `ISS ${competence} — projetado por contrato ${contratoCriado.number}`,
            competence,
            dueDate: dueDateIss,
            principalAmount: i.tributario.issMensal,
            totalAmount: i.tributario.issMensal,
            status: "projetado",
            generatedAuto: true,
            accountantReviewed: false,
            notes: `Projeção automática vinculada ao contrato ${contratoCriado.number}`,
          },
        });

        propagacao.tributosProjetados += 2;
      }
    } catch (e: any) {
      propagacao.avisos.push(`Tributos: ${e.message}`);
    }

    // ── 4. PROJETAR RECEITAS no Financeiro ─────────────────────────
    // (Despesas projetadas como recebimentos previstos)
    try {
      const catReceita = await prisma.expenseCategory.upsert({
        where: { name: "Receita Contratual" },
        update: {},
        create: { name: "Receita Contratual", type: "receita", active: true },
      });

      const dataInicio = new Date(c.dataInicio);
      for (let mes = 0; mes < c.vigenciaMeses && mes < 24; mes++) {
        const dataMes = new Date(dataInicio);
        dataMes.setMonth(dataMes.getMonth() + mes);
        dataMes.setDate(10); // dia padrão de recebimento
        const competence = dataMes.toISOString().slice(0, 7);

        await prisma.expense.create({
          data: {
            description: `Receita ${competence} — ${contratoCriado.number}`,
            amount: c.valorMensal,
            dueDate: dataMes,
            status: "previsto",
            categoryId: catReceita.id,
            competence,
            notes: `Receita projetada do contrato ${contratoCriado.number}`,
          },
        });
        propagacao.receitasProjetadas += 1;
      }
    } catch (e: any) {
      propagacao.avisos.push(`Financeiro: ${e.message}`);
    }

    // ── 5. CRIAR OSs PROJETADAS NA LOGÍSTICA (via WorkDiary) ──────
    // O módulo de logística usa Contract como base, então as OSs já aparecem
    // automaticamente lá. Aqui criamos registros placeholder no diário.
    try {
      const dataInicio = new Date(c.dataInicio);
      const diasMes = i.logistica.diasExecucaoMes || 4;
      const equipe = i.rh.equipeNecessaria || 2;

      // Criar apenas as OSs do PRIMEIRO mês (para não poluir o banco)
      for (let d = 0; d < diasMes; d++) {
        const dataOs = new Date(dataInicio);
        dataOs.setDate(dataOs.getDate() + (d * Math.floor(30 / diasMes)));

        await prisma.workDiary.create({
          data: {
            date: dataOs,
            contractId: contratoCriado.id,
            location: c.enderecos?.[0] || `${c.municipio}/${c.uf}`,
            supervisor: "A alocar",
            teamSize: equipe,
            weather: "Bom",
            activitiesDone: `[PROJETADO] ${c.tipoServico} — ${contratoCriado.number}`,
            areasWorked: c.areaM2 ? `${c.areaM2.toLocaleString("pt-BR")} m²` : null,
            occurrences: "OS gerada automaticamente do contrato — aguardando execução",
          },
        });
        propagacao.osProjetadas += 1;
      }
    } catch (e: any) {
      propagacao.avisos.push(`Logística: ${e.message}`);
    }

    // ── 6. AUDITORIA ─────────────────────────────────────────────
    try {
      await prisma.auditLog.create({
        data: {
          action: "CONTRATO_PROPAGADO",
          module: "contratos",
          entityType: "Contract",
          entityId: contratoCriado.id,
          newValues: {
            contrato: contratoCriado.number,
            valorTotal: c.valorTotal,
            propagacao,
          } as any,
        },
      });
    } catch { /* ignorar erro de audit */ }

    return NextResponse.json({
      success: true,
      contratoNumero: contratoCriado.number,
      contratoId: contratoCriado.id,
      propagacao,
      mensagem: `✅ Contrato ${contratoCriado.number} criado e propagado em todos os módulos!`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
