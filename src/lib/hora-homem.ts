/**
 * Verdelimp ERP — Inteligência de Custo Hora-Homem (HH)
 * Calcula o custo REAL de uma hora de trabalho de cada função
 * (salário + encargos CLT + benefícios ÷ horas efetivamente produtivas)
 * e precifica serviços por produtividade (m²/HH), evitando erro de preço.
 * Funções puras — usadas tanto no servidor quanto na página (recálculo instantâneo).
 */

// ── Parâmetros de encargos e jornada ────────────────────────────────
export interface ParametrosHH {
  fgtsPct: number;            // FGTS mensal (padrão 8)
  inssPatronalPct: number;    // INSS patronal (config da empresa; Simples: validar com contador)
  decimoTerceiroPct: number;  // provisão 13º (8,33)
  feriasPct: number;          // provisão férias + 1/3 (11,11)
  encargosSobreProvisoesPct: number; // FGTS+INSS sobre 13º/férias (~3)
  provisaoRescisaoPct: number;       // multa 40% FGTS + aviso (provisão ~4)
  beneficiosMensais: number;  // R$/mês: VT + alimentação + cesta etc.
  epiUniformeMensal: number;  // R$/mês: amortização de EPI + uniforme
  horasContratadasMes: number;   // CLT padrão 220 h/mês (com DSR)
  eficienciaPct: number;      // % de horas realmente produtivas (deslocamento, chuva, DDS...) padrão 75
}

export const PARAMETROS_PADRAO: ParametrosHH = {
  fgtsPct: 8,
  // Anexo IV do Simples (limpeza/conservação — caso Verdelimp): CPP 20% + RAT 3%
  // recolhida FORA do DAS. Ajustar se o enquadramento/FAP mudar (ver tabelas-fiscais.ts).
  inssPatronalPct: 23,
  decimoTerceiroPct: 8.33,
  feriasPct: 11.11,
  encargosSobreProvisoesPct: 3,
  provisaoRescisaoPct: 4,
  beneficiosMensais: 660,     // VT ~R$220 + alimentação ~R$440 (ajustar à realidade)
  epiUniformeMensal: 90,
  horasContratadasMes: 220,
  eficienciaPct: 75,
};

export interface CustoHH {
  salarioBase: number;
  encargosPct: number;        // % total de encargos sobre o salário
  encargosValor: number;
  beneficios: number;
  custoMensalTotal: number;
  horasProdutivas: number;
  custoHoraPaga: number;      // custo ÷ horas contratadas (o número "otimista")
  custoHoraProdutiva: number; // custo ÷ horas produtivas (o número REAL para precificar)
  detalhe: { nome: string; valor: number }[];
}

export function custoHoraHomem(salarioMensal: number, p: ParametrosHH = PARAMETROS_PADRAO): CustoHH {
  const encargosPct = p.fgtsPct + p.inssPatronalPct + p.decimoTerceiroPct + p.feriasPct
    + p.encargosSobreProvisoesPct + p.provisaoRescisaoPct;
  const encargosValor = salarioMensal * (encargosPct / 100);
  const beneficios = p.beneficiosMensais + p.epiUniformeMensal;
  const custoMensalTotal = salarioMensal + encargosValor + beneficios;
  const horasProdutivas = p.horasContratadasMes * (p.eficienciaPct / 100);
  return {
    salarioBase: salarioMensal,
    encargosPct,
    encargosValor,
    beneficios,
    custoMensalTotal,
    horasProdutivas,
    custoHoraPaga: p.horasContratadasMes > 0 ? custoMensalTotal / p.horasContratadasMes : 0,
    custoHoraProdutiva: horasProdutivas > 0 ? custoMensalTotal / horasProdutivas : 0,
    detalhe: [
      { nome: "Salário base", valor: salarioMensal },
      { nome: `FGTS (${p.fgtsPct}%)`, valor: salarioMensal * p.fgtsPct / 100 },
      { nome: `INSS patronal (${p.inssPatronalPct}%)`, valor: salarioMensal * p.inssPatronalPct / 100 },
      { nome: `Provisão 13º (${p.decimoTerceiroPct}%)`, valor: salarioMensal * p.decimoTerceiroPct / 100 },
      { nome: `Provisão férias + 1/3 (${p.feriasPct}%)`, valor: salarioMensal * p.feriasPct / 100 },
      { nome: `Encargos s/ provisões (${p.encargosSobreProvisoesPct}%)`, valor: salarioMensal * p.encargosSobreProvisoesPct / 100 },
      { nome: `Provisão rescisória (${p.provisaoRescisaoPct}%)`, valor: salarioMensal * p.provisaoRescisaoPct / 100 },
      { nome: "Benefícios (VT + alimentação)", valor: p.beneficiosMensais },
      { nome: "EPI + uniforme (amortização)", valor: p.epiUniformeMensal },
    ],
  };
}

// ── Produtividades de referência por serviço (unidades por hora-homem) ──
// Valores médios de mercado para MG — ajustáveis na tela; calibrar com o
// histórico real dos diários de obra.
export interface Produtividade {
  servico: string;
  unidade: string;      // m² | m | un | ha
  porHH: number;        // quantidade produzida por 1 hora-homem
  observacao: string;
}

export const PRODUTIVIDADES_PADRAO: Produtividade[] = [
  { servico: "Roçada Manual (roçadeira costal)", unidade: "m²", porHH: 90, observacao: "Vegetação média; terreno regular" },
  { servico: "Roçada Mecanizada (trator/giro zero)", unidade: "m²", porHH: 500, observacao: "Área aberta, sem obstáculos" },
  { servico: "Limpeza de Terreno", unidade: "m²", porHH: 60, observacao: "Inclui ajuntamento e remoção leve" },
  { servico: "Capina Química", unidade: "m²", porHH: 350, observacao: "Aplicação costal com herbicida" },
  { servico: "Capina Manual", unidade: "m²", porHH: 25, observacao: "Enxada; guias e sarjetas" },
  { servico: "Jardinagem / Manutenção de Jardins", unidade: "m²", porHH: 110, observacao: "Corte, bordadura e acabamento" },
  { servico: "Plantio de Grama (esmeralda em placas)", unidade: "m²", porHH: 15, observacao: "Inclui preparo leve do solo" },
  { servico: "Plantio de Mudas", unidade: "un", porHH: 4, observacao: "Cova, adubação e tutor" },
  { servico: "Poda de Árvores (porte médio)", unidade: "un", porHH: 0.5, observacao: "Equipe com motosserra; sem içamento" },
  { servico: "Limpeza Pós-Obra", unidade: "m²", porHH: 40, observacao: "Remoção de resíduos e lavagem" },
  { servico: "Varrição de Vias", unidade: "m", porHH: 250, observacao: "Varrição manual com ajuntamento" },
];

// ── Cálculo do serviço ──────────────────────────────────────────────
export interface EquipeItem {
  funcao: string;
  quantidade: number;
  custoHoraProdutiva: number;
}

export interface CalculoServicoInput {
  quantidade: number;        // m², un, m…
  produtividadePorHH: number;
  equipe: EquipeItem[];
  horasDia: number;          // jornada produtiva por dia (padrão 8)
  custosExtrasDia: number;   // equipamento+combustível+transporte por dia (R$)
  materiaisTotal: number;    // insumos totais (R$)
  bdiPct: number;            // administrativo+risco+financeiro (padrão 20)
  impostosPct: number;       // sobre o preço (padrão 8)
  margemPct: number;         // lucro desejado (padrão 20)
}

export interface CalculoServicoResultado {
  horasHomemNecessarias: number;
  pessoas: number;
  custoHHMedio: number;
  diasEstimados: number;
  custoMaoDeObra: number;
  custoExtras: number;
  custoMateriais: number;
  custoDireto: number;
  bdiValor: number;
  custoTotal: number;        // direto + BDI (sem imposto/margem)
  precoMinimo: number;       // cobre custo + impostos (margem zero)
  precoSugerido: number;     // custo + impostos + margem
  precoUnitarioMinimo: number;
  precoUnitarioSugerido: number;
  custoUnitario: number;
}

export function calcularServico(i: CalculoServicoInput): CalculoServicoResultado {
  const horasHomemNecessarias = i.produtividadePorHH > 0 ? i.quantidade / i.produtividadePorHH : 0;
  const pessoas = i.equipe.reduce((s, e) => s + e.quantidade, 0);
  const custoHHTotalEquipe = i.equipe.reduce((s, e) => s + e.quantidade * e.custoHoraProdutiva, 0);
  const custoHHMedio = pessoas > 0 ? custoHHTotalEquipe / pessoas : 0;

  const horasEquipeDia = pessoas * i.horasDia;
  const diasEstimados = horasEquipeDia > 0 ? Math.ceil(horasHomemNecessarias / horasEquipeDia) : 0;

  const custoMaoDeObra = horasHomemNecessarias * custoHHMedio;
  const custoExtras = diasEstimados * i.custosExtrasDia;
  const custoDireto = custoMaoDeObra + custoExtras + i.materiaisTotal;
  const bdiValor = custoDireto * (i.bdiPct / 100);
  const custoTotal = custoDireto + bdiValor;

  // impostos incidem sobre o preço: preço = custo / (1 - imposto% - ...)
  const impostoFator = 1 - i.impostosPct / 100;
  const precoMinimo = impostoFator > 0 ? custoTotal / impostoFator : custoTotal;
  const fatorSugerido = 1 - (i.impostosPct + i.margemPct) / 100;
  const precoSugerido = fatorSugerido > 0 ? custoTotal / fatorSugerido : custoTotal;

  return {
    horasHomemNecessarias,
    pessoas,
    custoHHMedio,
    diasEstimados,
    custoMaoDeObra,
    custoExtras,
    custoMateriais: i.materiaisTotal,
    custoDireto,
    bdiValor,
    custoTotal,
    precoMinimo,
    precoSugerido,
    precoUnitarioMinimo: i.quantidade > 0 ? precoMinimo / i.quantidade : 0,
    precoUnitarioSugerido: i.quantidade > 0 ? precoSugerido / i.quantidade : 0,
    custoUnitario: i.quantidade > 0 ? custoTotal / i.quantidade : 0,
  };
}
