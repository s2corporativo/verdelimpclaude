// 13º Salário — cálculo, projeção e pagamento por funcionário
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { calcINSS, calcIRRF, FGTS_RATE, calcAdicionais, salarioMinimo } from "@/lib/folha";

export const dynamic = "force-dynamic";

// GET — Situação do 13º para todos os funcionários ativos
export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const funcionarios = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });

    // Buscar lançamentos de 13º já registrados via JSONB events
    const lancamentos = await prisma.$queryRaw<any[]>`
      SELECT pe.employee_id, pp.competence, pe.gross_amount, pe.paid_at, pe.events
      FROM erp_payroll_entry pe
      JOIN erp_payroll_period pp ON pp.id = pe.period_id
      WHERE pe.events @> '{"tipo":"decimo_terceiro"}'::jsonb
        AND pp.competence LIKE ${anoAtual + "%"}
    `;
    const lancMap = new Map(lancamentos.map(l => [`${l.employee_id}:${l.competence}`, l]));

    const folha13 = funcionarios.map(f => {
      const salarioBase = Number(f.salary);
      const adicionais = calcAdicionais(salarioBase, f.insalubridadeGrau || 0, f.periculosidade || false, anoAtual);
      const brutoMensal = salarioBase + adicionais;
      const bruto13 = brutoMensal;

      const dataAdmissao = new Date(f.admissionDate);
      const mesesTrabalhados = Math.min(12, Math.max(1, ((hoje.getFullYear() - dataAdmissao.getFullYear()) * 12) + hoje.getMonth() - dataAdmissao.getMonth() + 1));
      const valor13Proporcional = (bruto13 / 12) * mesesTrabalhados;

      const inss1Parcela = calcINSS(valor13Proporcional * 0.5, anoAtual);
      const valor1Parcela = (valor13Proporcional * 0.5) - inss1Parcela;

      const irrf13 = calcIRRF(valor13Proporcional, inss1Parcela, Number(f.dependentes || 0), anoAtual);
      const valor2Parcela = valor13Proporcional - (valor13Proporcional * 0.5) - irrf13;

      const fgts13 = valor13Proporcional * FGTS_RATE;

      const lanc1 = lancMap.get(`${f.id}:${anoAtual}-11`);
      const lanc2 = lancMap.get(`${f.id}:${anoAtual}-12`);

      return {
        id: f.id,
        nome: f.name,
        funcao: f.role,
        salarioBase,
        mesesTrabalhados,
        valor13Bruto: Number(valor13Proporcional.toFixed(2)),
        parcela1: {
          valor: Number(valor1Parcela.toFixed(2)),
          status: lanc1?.paid_at ? "pago" : "prevista",
          pagamento: lanc1?.paid_at || null,
        },
        parcela2: {
          valor: Number(Math.max(0, valor2Parcela).toFixed(2)),
          status: lanc2?.paid_at ? "pago" : "prevista",
          pagamento: lanc2?.paid_at || null,
        },
        inssTotal: Number(inss1Parcela.toFixed(2)),
        irrfTotal: Number(irrf13.toFixed(2)),
        fgtsEmpresa: Number(fgts13.toFixed(2)),
      };
    });

    const totais = folha13.reduce((acc, f) => ({
      bruto: acc.bruto + f.valor13Bruto,
      inss: acc.inss + f.inssTotal,
      irrf: acc.irrf + f.irrfTotal,
      fgts: acc.fgts + f.fgtsEmpresa,
      liquido: acc.liquido + f.parcela1.valor + f.parcela2.valor,
    }), { bruto: 0, inss: 0, irrf: 0, fgts: 0, liquido: 0 });

    return NextResponse.json({ folha13, totais, ano: anoAtual });
  } catch (e) {
    return erroInterno(e, "api/folha/decimo-terceiro GET");
  }
}
