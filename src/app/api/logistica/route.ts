// src/app/api/logistica/route.ts
// Módulo de Logística Operacional — Verdelimp ERP v2.2
// Gera plano de atendimento com equipes, datas, ordem e tempo estimado
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Tipos ─────────────────────────────────────────────────────────
export interface OsLogistica {
  id: string;
  titulo: string;
  clienteNome: string;
  endereco: string;
  municipio: string;
  uf: string;
  lat?: number;
  lng?: number;
  tipoServico: string;
  areaM2?: number;
  prazo?: string; // data limite
  prioridade: "urgente" | "normal" | "pode_agendar";
  tempoEstimadoH?: number;
  funcionariosNecessarios?: number;
  contratoId?: string;
  status: "pendente" | "agendado" | "em_execucao" | "concluido";
  equipeAlocada?: string[];
  dataAgendada?: string;
  observacoes?: string;
}

// ── GET — listar OS de logística ────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const semana = searchParams.get("semana"); // AAAA-WNN
  const status = searchParams.get("status");

  try {
    // Buscar contratos ativos como base das OS
    const contratos = await prisma.contract.findMany({
      where: { status: "Ativo" },
      include: { client: { select: { name: true, municipio: true, uf: true } } },
      take: 50,
    });

    // Buscar ordens de serviço do diário
    const diarios = await prisma.workDiary.findMany({
      where: status === "pendente" ? { weather: { not: "Suspensão" } } : {},
      orderBy: { date: "desc" },
      take: 30,
    });

    // Buscar funcionários disponíveis
    const funcionarios = await prisma.employee.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
    });

    // Montar lista de OS a partir dos contratos
    const osLista: OsLogistica[] = contratos.map((c, i) => ({
      id: c.id,
      titulo: c.object.substring(0, 60),
      clienteNome: c.client?.name || "Cliente",
      endereco: "",
      municipio: c.client?.municipio || "Betim",
      uf: c.client?.uf || "MG",
      tipoServico: c.object.split("—")[0].trim(),
      prazo: c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : undefined,
      prioridade: i === 0 ? "urgente" : "normal",
      tempoEstimadoH: 8,
      funcionariosNecessarios: 3,
      contratoId: c.id,
      status: "pendente",
    }));

    return NextResponse.json({
      os: osLista.length ? osLista : DEMO_OS,
      funcionarios: funcionarios.length ? funcionarios : DEMO_FUNC,
      totalOs: osLista.length || DEMO_OS.length,
      _demo: !osLista.length,
    });
  } catch {
    return NextResponse.json({
      os: DEMO_OS, funcionarios: DEMO_FUNC,
      totalOs: DEMO_OS.length, _demo: true,
    });
  }
}

// ── POST — gerar plano com IA ────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { os, funcionarios, semana, criterio = "balanceado" } = body;

    if (!os?.length) {
      return NextResponse.json({ error: "Nenhuma OS informada" }, { status: 400 });
    }

    // ── Chamar Claude para gerar o plano otimizado ────────────────
    const prompt = `Você é especialista em logística operacional para empresa de paisagismo/manutenção ambiental.

DADOS DA SEMANA: ${semana || "próxima semana"}
CRITÉRIO DE OTIMIZAÇÃO: ${criterio} (urgencia | menor_deslocamento | balanceado | menor_custo)

ORDENS DE SERVIÇO (${os.length}):
${os.map((o: OsLogistica, i: number) => `
OS ${i+1}: ${o.titulo}
- Cliente: ${o.clienteNome}
- Local: ${o.endereco ? o.endereco + ', ' : ''}${o.municipio}/${o.uf}
- Serviço: ${o.tipoServico}
- Área: ${o.areaM2 ? o.areaM2.toLocaleString('pt-BR') + ' m²' : 'a definir'}
- Prazo: ${o.prazo || 'sem prazo fixo'}
- Prioridade: ${o.prioridade}
- Tempo estimado: ${o.tempoEstimadoH || '?'}h
- Funcionários necessários: ${o.funcionariosNecessarios || 2}
- Obs: ${o.observacoes || '-'}
`).join('')}

EQUIPE DISPONÍVEL (${funcionarios.length} pessoas):
${funcionarios.map((f: any) => `- ${f.name} (${f.role})`).join('\n')}

BASE OPERACIONAL: Betim/MG (saída às 7h, retorno até 17h)
VEÍCULOS DISPONÍVEIS: 1 Hilux 4x4, 1 Iveco Carroceria, 1 Gol (uso administrativo)

GERE UM PLANO SEMANAL DETALHADO em JSON com esta estrutura exata:
{
  "semana": "string",
  "resumo": "string — resumo executivo em 2 linhas",
  "alertas": ["array de alertas importantes"],
  "dias": [
    {
      "diaSemana": "Segunda-feira",
      "data": "AAAA-MM-DD",
      "os": [
        {
          "osId": "string",
          "ordem": 1,
          "horarioSaida": "07:00",
          "horarioChegada": "08:30",
          "horarioConclusao": "12:00",
          "horarioRetorno": "13:30",
          "equipe": ["Nome1", "Nome2"],
          "veiculo": "Hilux QWE-1234",
          "tempoDeslocamentoMin": 90,
          "tempoExecucaoH": 3.5,
          "observacoes": "string",
          "custoEstimado": 850
        }
      ],
      "kmTotal": 120,
      "horasEquipe": 32,
      "observacoesDia": "string"
    }
  ],
  "totais": {
    "osAtendidas": 5,
    "kmSemana": 450,
    "horasTotais": 120,
    "custoEstimadoTotal": 4200,
    "eficiencia": "85%"
  },
  "recomendacoes": ["lista de recomendações para melhorar logística"]
}

Responda SOMENTE com JSON válido, sem markdown ou explicações.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        system: "Especialista em logística operacional para serviços ambientais e paisagismo em MG. Responda sempre em JSON válido.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!r.ok) throw new Error(`Claude API: ${r.status}`);
    const d = await r.json();
    const raw = d.content?.[0]?.text || "{}";

    let plano;
    try {
      plano = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      throw new Error("Resposta da IA não é JSON válido");
    }

    return NextResponse.json({ success: true, plano, geradoEm: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── Dados demo ────────────────────────────────────────────────────
const DEMO_OS: OsLogistica[] = [
  { id: "os1", titulo: "Roçada Canteiros Norte", clienteNome: "Prefeitura de BH", endereco: "Av. Vilarinho, s/n — Canteiros Norte", municipio: "Belo Horizonte", uf: "MG", tipoServico: "Roçada Manual", areaM2: 22000, prazo: "2026-05-10", prioridade: "urgente", tempoEstimadoH: 8, funcionariosNecessarios: 4, status: "pendente", observacoes: "Supervisor: Ana Luiza. Levar 2 roçadeiras + soprador" },
  { id: "os2", titulo: "PRADA Linha Betim-Igarapé", clienteNome: "CEMIG", endereco: "Rodovia MG-050, km 18", municipio: "Betim", uf: "MG", tipoServico: "PRADA/PTRF", areaM2: 35000, prazo: "2026-05-15", prioridade: "normal", tempoEstimadoH: 10, funcionariosNecessarios: 5, status: "pendente", observacoes: "Acesso restrito — solicitar permissão CEMIG" },
  { id: "os3", titulo: "Jardinagem HQ Mensal", clienteNome: "Sanesul", endereco: "R. Floriano Peixoto, 2100", municipio: "Betim", uf: "MG", tipoServico: "Jardinagem Mensal", areaM2: 1200, prazo: "2026-05-07", prioridade: "urgente", tempoEstimadoH: 4, funcionariosNecessarios: 2, status: "pendente", observacoes: "Todo primeiro dia útil do mês" },
  { id: "os4", titulo: "Controle Formigas Linhas de Transmissão", clienteNome: "CEMIG", endereco: "Subestação Contagem Norte", municipio: "Contagem", uf: "MG", tipoServico: "Controle de Formigas", prazo: "2026-05-20", prioridade: "normal", tempoEstimadoH: 6, funcionariosNecessarios: 2, status: "pendente", observacoes: "Levar formicida Mirex 0,3% — 10kg" },
  { id: "os5", titulo: "Poda e Limpeza Praça Central", clienteNome: "Prefeitura de BH", endereco: "Praça da Liberdade, s/n", municipio: "Belo Horizonte", uf: "MG", tipoServico: "Podação de Árvores", prazo: "2026-05-25", prioridade: "pode_agendar", tempoEstimadoH: 6, funcionariosNecessarios: 3, status: "pendente", observacoes: "Solicitar licença prefeitura para uso de motosserra" },
];
const DEMO_FUNC = [
  { id: "e1", name: "Abrão Felipe", role: "Operador de Roçadeira" },
  { id: "e2", name: "Ana Luiza Ribeiro", role: "Supervisora" },
  { id: "e3", name: "Gilberto Ferreira", role: "Operador de Roçadeira" },
  { id: "e4", name: "José Antonio", role: "Operador de Roçadeira" },
  { id: "e5", name: "Leomar Souza", role: "Operador de Retroescavadeira" },
  { id: "e6", name: "Uanderson Nunes", role: "Auxiliar de Jardinagem" },
  { id: "e7", name: "Leonardo Souza", role: "Motorista" },
];
