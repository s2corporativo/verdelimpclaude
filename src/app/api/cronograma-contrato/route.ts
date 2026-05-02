// src/app/api/cronograma-contrato/route.ts
// Gera o MELHOR cronograma de execução do contrato:
// - Distribui as OSs por meses, semanas e dias
// - Considera produtividade, equipe, clima sazonal de MG
// - Evita finais de semana e feriados
// - Otimiza por janelas climáticas favoráveis
import { NextRequest, NextResponse } from "next/server";

// Feriados nacionais 2026 (inclui movimentos)
const FERIADOS_2026 = [
  "2026-01-01","2026-02-16","2026-02-17","2026-02-18", // Carnaval
  "2026-04-03","2026-04-21","2026-05-01","2026-06-04", // Páscoa, Tiradentes, Trabalho, Corpus
  "2026-09-07","2026-10-12","2026-11-02","2026-11-15","2026-12-25",
];
const FERIADOS_BH_BETIM = ["2026-08-15","2026-12-08"]; // Assunção, Imaculada (BH/Betim)

// Padrão climático de MG por mês (boa janela para serviços ao ar livre)
const SAZONALIDADE: Record<number, { qualidade: number; obs: string }> = {
  1:  { qualidade: 0.6, obs: "Chuvas frequentes — evitar roçada manual em terra molhada" },
  2:  { qualidade: 0.55, obs: "Pico de chuvas em MG — priorizar serviços cobertos" },
  3:  { qualidade: 0.7, obs: "Chuvas diminuindo — ainda evitar dias de tempestade" },
  4:  { qualidade: 0.95, obs: "Excelente — outono ameno, vegetação em crescimento" },
  5:  { qualidade: 0.95, obs: "Excelente — sem chuva, ideal para todos os serviços" },
  6:  { qualidade: 0.9,  obs: "Inverno seco — boa janela, atenção a geadas no início da manhã" },
  7:  { qualidade: 0.9,  obs: "Inverno seco — produtividade alta" },
  8:  { qualidade: 0.85, obs: "Final do período seco — vegetação resseca, prevenir incêndios" },
  9:  { qualidade: 0.75, obs: "Início das chuvas — imprevisível" },
  10: { qualidade: 0.7,  obs: "Chuvas voltam — atenção ao planejamento" },
  11: { qualidade: 0.65, obs: "Chuvas regulares — janelas curtas de execução" },
  12: { qualidade: 0.6,  obs: "Chuvas + recesso de fim de ano" },
};

// Produtividade m²/dia/pessoa por tipo
const PRODUTIVIDADE: Record<string, number> = {
  "Roçada Manual": 800,
  "Roçada Mecanizada": 2500,
  "Jardinagem Mensal": 1200,
  "PRADA/PTRF": 600,
  "Limpeza": 1500,
  "Podação": 200,
  "Hidrossemeadura": 5000,
  "Controle de Formigas": 3000,
  "Outro": 1000,
};

function isFeriado(date: Date): boolean {
  const s = date.toISOString().slice(0, 10);
  return FERIADOS_2026.includes(s) || FERIADOS_BH_BETIM.includes(s);
}

function isFimDeSemana(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function proxDiaUtil(date: Date): Date {
  const d = new Date(date);
  while (isFimDeSemana(d) || isFeriado(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const c = body.contrato;
    const i = body.impacto;
    const usarIA = body.usarIA !== false; // default true

    if (!c || !c.dataInicio || !c.vigenciaMeses || !c.valorMensal) {
      return NextResponse.json({ error: "Dados incompletos do contrato" }, { status: 400 });
    }

    const tipoServico = c.tipoServico || "Outro";
    const prodDiaria = PRODUTIVIDADE[tipoServico] || 1000;
    const equipe = i?.rh?.equipeNecessaria || 3;
    const areaM2 = Number(c.areaM2) || 0;
    const diasMes = i?.logistica?.diasExecucaoMes || 4;
    const horasDia = 8;

    // Calcula dias necessários para fazer toda a área (se for área única)
    // ou ciclos para serviços recorrentes
    const ehRecorrente = ["Jardinagem Mensal","Roçada Manual","Roçada Mecanizada","Limpeza"].includes(tipoServico);

    // ── 1. GERAR CRONOGRAMA MENSAL DETALHADO ──────────────────────
    const dataInicio = new Date(c.dataInicio + "T07:00:00");
    const meses: any[] = [];

    for (let m = 0; m < c.vigenciaMeses && m < 36; m++) {
      const mesInicio = new Date(dataInicio);
      mesInicio.setMonth(mesInicio.getMonth() + m);
      const mesNumero = mesInicio.getMonth() + 1;
      const sazonalidade = SAZONALIDADE[mesNumero];

      // Distribuir as N execuções ao longo do mês — espaçadas
      const execucoes: any[] = [];
      const intervalo = Math.floor(30 / Math.max(diasMes, 1));

      for (let e = 0; e < diasMes; e++) {
        let dataExec = new Date(mesInicio);
        dataExec.setDate(1 + (e * intervalo));
        // Pular fim de semana e feriado
        dataExec = proxDiaUtil(dataExec);

        const horasNec = ehRecorrente ? horasDia : Math.min((areaM2 / equipe / prodDiaria) * horasDia, horasDia);

        execucoes.push({
          ordem: e + 1,
          data: dataExec.toISOString().slice(0, 10),
          diaSemana: ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][dataExec.getDay()],
          horarioInicio: "07:00",
          horarioFim: e === 0 ? "16:00" : "15:00",
          equipe,
          atividade: tipoServico,
          areaPrevista: ehRecorrente ? areaM2 : Math.floor(areaM2 / diasMes),
          horasEstimadas: Math.round(horasNec * 10) / 10,
          observacao: e === 0 ? "Início do ciclo mensal" : "",
        });
      }

      meses.push({
        mes: mesInicio.toISOString().slice(0, 7),
        nomeMes: mesInicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        qualidadeClimaPct: Math.round(sazonalidade.qualidade * 100),
        observacaoClima: sazonalidade.obs,
        execucoes,
        areaTotal: execucoes.reduce((s, e) => s + e.areaPrevista, 0),
        horasTotais: execucoes.reduce((s, e) => s + e.horasEstimadas * e.equipe, 0),
        custoEstimado: Math.round(c.valorMensal * 0.7), // estimativa custo executivo
      });
    }

    // ── 2. ENRIQUECER COM IA (recomendações estratégicas) ──────────
    let analiseIA = "";
    if (usarIA) {
      try {
        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            system: "Especialista em planejamento operacional para empresas de paisagismo e manutenção ambiental em MG.",
            messages: [{
              role: "user",
              content: `Analise este cronograma e dê recomendações ESTRATÉGICAS práticas em português:

CONTRATO: ${c.objeto || "N/A"}
- Cliente: ${c.clienteNome}
- Tipo: ${tipoServico}
- Área: ${areaM2 ? areaM2.toLocaleString("pt-BR") + " m²" : "N/A"}
- Vigência: ${c.vigenciaMeses} meses (de ${c.dataInicio})
- Local: ${c.municipio}/${c.uf}
- Equipe alocada: ${equipe} pessoas
- Frequência: ${diasMes}x por mês
- Produtividade esperada: ${prodDiaria} m²/dia/pessoa

ANÁLISE NECESSÁRIA (em formato de bullet points concisos, máx 8 itens):
1. Riscos sazonais específicos para o tipo de serviço
2. Sugestões de equipamentos e EPI específicos
3. Cuidados com prazos e janelas críticas
4. Otimizações para reduzir custos
5. Pontos críticos de fiscalização do contratante
6. Sugestão de ordem de prioridade entre os meses
7. Eventos previsíveis que afetam (chuvas, secas, festividades)

Responda em texto corrido com bullets, sem markdown. Seja prático e direto.`
            }],
          }),
        });
        if (r.ok) {
          const d = await r.json();
          analiseIA = d.content?.[0]?.text || "";
        }
      } catch { /* sem IA, continuar */ }
    }

    // ── 3. RESUMO GERAL ───────────────────────────────────────────
    const totalExecucoes = meses.reduce((s, m) => s + m.execucoes.length, 0);
    const totalHoras = meses.reduce((s, m) => s + m.horasTotais, 0);
    const mediaQualidade = Math.round(
      meses.reduce((s, m) => s + m.qualidadeClimaPct, 0) / Math.max(meses.length, 1)
    );

    // Mês mais crítico (menor qualidade climática)
    const mesCritico = meses.reduce((min, m) => m.qualidadeClimaPct < min.qualidadeClimaPct ? m : min, meses[0]);
    const mesIdeal = meses.reduce((max, m) => m.qualidadeClimaPct > max.qualidadeClimaPct ? m : max, meses[0]);

    // ── 4. ALERTAS DO CRONOGRAMA ──────────────────────────────────
    const alertas: string[] = [];
    if (meses.some(m => m.qualidadeClimaPct < 60)) {
      alertas.push(`⚠️ ${meses.filter(m => m.qualidadeClimaPct < 60).length} mes(es) com janela climática reduzida — prepare equipamento de proteção contra chuva`);
    }
    if (totalHoras > 2000) {
      alertas.push(`⚠️ Carga total alta: ${totalHoras.toFixed(0)}h — considere alocar equipe extra ou estender prazo`);
    }
    if (equipe > 6) {
      alertas.push(`⚠️ Equipe necessária (${equipe}) consome 75%+ da força de trabalho — outros contratos podem ficar sem equipe`);
    }
    if (tipoServico === "Roçada Manual" && [1,2,11,12].some(m => meses.find(x => new Date(x.mes+"-01").getMonth()+1 === m))) {
      alertas.push(`💡 Roçada manual em meses chuvosos: rendimento cai 30%. Programe reservas de horas extras.`);
    }

    return NextResponse.json({
      success: true,
      cronograma: {
        meses,
        resumo: {
          totalExecucoes,
          totalHoras: Math.round(totalHoras),
          totalDiasUteis: totalExecucoes,
          mediaQualidade,
          mesCritico: mesCritico?.nomeMes,
          mesIdeal: mesIdeal?.nomeMes,
        },
        alertas,
        analiseIA,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
