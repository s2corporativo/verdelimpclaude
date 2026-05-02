// src/app/api/retro/route.ts
// Módulo Retroescavadeira — gestão de serviços, custos operacionais e viabilidade
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Configuração padrão de custos (se não houver RetroConfig no banco) ──
const CONFIG_DEFAULT = {
  custoHoraCombustivel: 45,  // diesel John Deere 3CX: ~8L/h × R$5,60
  custoHoraOperador: 32,     // operador CLT + encargos: R$3.200 / 220h × 1.7 encargos ≈ R$24,7... com acréscimo hora prod
  custoHoraDepreciacao: 28,  // R$280.000 / 10000h vida útil
  custoHoraManutencao: 15,   // média preventiva+corretiva
  custoHoraSeguro: 8,        // seguro anual ÷ horas
  custoKmTransporte: 8,      // caminhão plataforma baixa + motorista
  margemAlvo: 25,
};

// Produtividade m³/h ou m²/h por tipo de serviço
const PRODUTIVIDADE: Record<string, { unidade: string; taxa: number; descricao: string }> = {
  "Terraplanagem":            { unidade: "m³/h", taxa: 25,  descricao: "Corte e aterro de terra" },
  "Valetamento":              { unidade: "m/h",  taxa: 8,   descricao: "Abertura de valas 0,6x0,8m" },
  "Drenagem Superficial":     { unidade: "m/h",  taxa: 5,   descricao: "Sarjeta + tubulação" },
  "Limpeza de Terreno":       { unidade: "m²/h", taxa: 400, descricao: "Retirada de entulho/vegetação" },
  "Nivelamento":              { unidade: "m²/h", taxa: 300, descricao: "Platô, base para obras" },
  "Carregamento de Material": { unidade: "m³/h", taxa: 35,  descricao: "Carga em caminhão" },
  "Apoio PRADA/Recuperação":  { unidade: "m²/h", taxa: 180, descricao: "Modelagem de taludes" },
  "Demolição/Retirada":       { unidade: "h",    taxa: 1,   descricao: "Trabalho por hora" },
  "Outro":                    { unidade: "h",    taxa: 1,   descricao: "Trabalho por hora" },
};

function calcularCustos(cfg: any, horas: number, distanciaKm: number) {
  const horaTotal = cfg.custoHoraCombustivel + cfg.custoHoraOperador + cfg.custoHoraDepreciacao + cfg.custoHoraManutencao + cfg.custoHoraSeguro;
  const custoMaquina = horaTotal * horas;
  const custoTransporte = cfg.custoKmTransporte * distanciaKm * 2; // ida e volta
  const custoTotal = custoMaquina + custoTransporte;
  const precoMinimo = custoTotal;
  const precoIdeal = custoTotal * (1 + cfg.margemAlvo / 100);

  return {
    custoMaquinaHora: Number(horaTotal.toFixed(2)),
    custoMaquinaTotal: Number(custoMaquina.toFixed(2)),
    custoTransporte: Number(custoTransporte.toFixed(2)),
    custoTotal: Number(custoTotal.toFixed(2)),
    precoMinimo: Number(precoMinimo.toFixed(2)),
    precoIdeal: Number(precoIdeal.toFixed(2)),
    detalhamento: {
      combustivel: Number((cfg.custoHoraCombustivel * horas).toFixed(2)),
      operador: Number((cfg.custoHoraOperador * horas).toFixed(2)),
      depreciacao: Number((cfg.custoHoraDepreciacao * horas).toFixed(2)),
      manutencao: Number((cfg.custoHoraManutencao * horas).toFixed(2)),
      seguro: Number((cfg.custoHoraSeguro * horas).toFixed(2)),
      transporte: Number(custoTransporte.toFixed(2)),
    },
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "list";

  if (action === "config") {
    try {
      const cfg = await prisma.retroConfig.findFirst();
      return NextResponse.json({ config: cfg || CONFIG_DEFAULT });
    } catch {
      return NextResponse.json({ config: CONFIG_DEFAULT });
    }
  }

  if (action === "viabilidade") {
    const tipoServico = searchParams.get("tipo") || "Terraplanagem";
    const quantidade = Number(searchParams.get("qtd")) || 100;
    const distancia = Number(searchParams.get("dist")) || 30;
    const valorProposto = Number(searchParams.get("valor")) || 0;

    let cfg = CONFIG_DEFAULT;
    try {
      const dbCfg = await prisma.retroConfig.findFirst();
      if (dbCfg) cfg = { ...CONFIG_DEFAULT, ...dbCfg };
    } catch {}

    const prod = PRODUTIVIDADE[tipoServico] || PRODUTIVIDADE["Outro"];
    const horas = prod.taxa > 0 ? quantidade / prod.taxa : quantidade;
    const calculos = calcularCustos(cfg, horas, distancia);
    const margemReal = valorProposto > 0 ? ((valorProposto - calculos.custoTotal) / valorProposto) * 100 : 0;

    return NextResponse.json({
      tipoServico, quantidade, unidade: prod.unidade, horas: Number(horas.toFixed(1)),
      ...calculos,
      valorProposto,
      margemReal: Number(margemReal.toFixed(1)),
      viavel: valorProposto >= calculos.precoMinimo,
      recomendacao: valorProposto >= calculos.precoIdeal ? "✅ Lucrativo" : valorProposto >= calculos.precoMinimo ? "⚠️ Apertado" : valorProposto > 0 ? "⛔ Prejuízo" : "Informe o valor proposto",
    });
  }

  // Listar jobs
  try {
    const jobs = await prisma.retroJob.findMany({
      orderBy: { createdAt: "desc" },
      include: { despesas: true },
      take: 100,
    });
    if (!jobs.length) return NextResponse.json({ jobs: DEMO_JOBS, config: CONFIG_DEFAULT, _demo: true });
    return NextResponse.json({ jobs, config: CONFIG_DEFAULT });
  } catch {
    return NextResponse.json({ jobs: DEMO_JOBS, config: CONFIG_DEFAULT, _demo: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "update_config") {
      try {
        const existing = await prisma.retroConfig.findFirst();
        const cfg = existing
          ? await prisma.retroConfig.update({ where: { id: existing.id }, data: body.config })
          : await prisma.retroConfig.create({ data: body.config });
        return NextResponse.json({ success: true, config: cfg });
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
      }
    }

    if (action === "update_status") {
      const job = await prisma.retroJob.update({
        where: { id: body.id },
        data: { status: body.status, horasRealizadas: body.horasRealizadas || null, custoTotal: body.custoTotal || null, valorCobrado: body.valorCobrado || null },
      });
      return NextResponse.json({ success: true, job });
    }

    // Criar job
    let cfg = CONFIG_DEFAULT;
    try {
      const dbCfg = await prisma.retroConfig.findFirst();
      if (dbCfg) cfg = { ...CONFIG_DEFAULT, ...dbCfg };
    } catch {}

    const horas = Number(body.horasEstimadas) || 0;
    const dist = Number(body.distanciaKm) || 30;
    const calculos = calcularCustos(cfg, horas, dist);
    const valorProposto = Number(body.valorCobrado) || 0;

    const count = await prisma.retroJob.count();
    const numero = `RETRO-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const job = await prisma.retroJob.create({
      data: {
        numero,
        clienteNome: body.clienteNome,
        tipoServico: body.tipoServico,
        endereco: body.endereco || null,
        municipio: body.municipio || null,
        uf: body.uf || null,
        areaM2: body.areaM2 || null,
        volumeM3: body.volumeM3 || null,
        horasEstimadas: horas || null,
        distanciaKm: dist || null,
        dataInicio: body.dataInicio ? new Date(body.dataInicio) : null,
        status: body.status || "orcamento",
        precoMinimo: calculos.precoMinimo,
        precoIdeal: calculos.precoIdeal,
        valorCobrado: valorProposto || null,
        viavel: valorProposto >= calculos.precoMinimo || valorProposto === 0,
        observacoes: body.observacoes || null,
      },
    });

    // Criar despesas automáticas
    if (horas > 0) {
      const despesas = [
        { tipo: "combustivel", descricao: "Diesel", valor: calculos.detalhamento.combustivel, unidade: "h", quantidade: horas },
        { tipo: "operador", descricao: "Operador CLT + encargos", valor: calculos.detalhamento.operador, unidade: "h", quantidade: horas },
        { tipo: "depreciacao", descricao: "Depreciação da máquina", valor: calculos.detalhamento.depreciacao, unidade: "h", quantidade: horas },
        { tipo: "manutencao", descricao: "Manutenção preventiva/corretiva", valor: calculos.detalhamento.manutencao, unidade: "h", quantidade: horas },
        { tipo: "seguro", descricao: "Seguro da máquina", valor: calculos.detalhamento.seguro, unidade: "h", quantidade: horas },
        { tipo: "transporte", descricao: `Transporte da máquina (${dist}km × 2)`, valor: calculos.detalhamento.transporte, unidade: "km", quantidade: dist * 2 },
      ];
      for (const d of despesas) {
        await prisma.retroJobDespesa.create({ data: { retroJobId: job.id, ...d } });
      }
    }

    return NextResponse.json({ success: true, job, calculos });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_JOBS = [
  { id:"r1", numero:"RETRO-2026-001", clienteNome:"CEMIG", tipoServico:"Apoio PRADA/Recuperação", municipio:"Betim", uf:"MG", horasEstimadas:16, horasRealizadas:18, distanciaKm:25, status:"concluido", precoMinimo:3480, precoIdeal:4350, valorCobrado:5200, viavel:true, custoTotal:3480, margemReal:33, createdAt:"2026-04-10", despesas:[] },
  { id:"r2", numero:"RETRO-2026-002", clienteNome:"Prefeitura de Betim", tipoServico:"Terraplanagem", municipio:"Betim", uf:"MG", horasEstimadas:8, distanciaKm:8, status:"agendado", precoMinimo:1240, precoIdeal:1550, valorCobrado:1800, viavel:true, createdAt:"2026-04-20", despesas:[] },
  { id:"r3", numero:"RETRO-2026-003", clienteNome:"Condomínio Alphaville", tipoServico:"Drenagem Superficial", municipio:"Betim", uf:"MG", horasEstimadas:6, distanciaKm:15, status:"orcamento", precoMinimo:1040, precoIdeal:1300, valorCobrado:900, viavel:false, createdAt:"2026-04-25", despesas:[] },
];
