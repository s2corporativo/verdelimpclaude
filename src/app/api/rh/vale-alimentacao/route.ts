// Vale-Alimentação VR — cálculo mensal proporcional
// GET: calcula VR para todos os funcionários ativos do mês informado
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirPapel, erroInterno } from "@/lib/authz";

export const dynamic = "force-dynamic";

const VR_MENSAL = 600;

/** Conta dias úteis (seg–sex) no mês */
function diasUteisMes(ano: number, mes: number): number {
  let count = 0;
  const daysInMonth = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(ano, mes - 1, d).getDay();
    if (day >= 1 && day <= 5) count++;
  }
  return count;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "FINANCEIRO");
  if (erro) return erro;
  try {
    const month = req.nextUrl.searchParams.get("month");
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Parâmetro 'month' obrigatório (YYYY-MM)" }, { status: 400 });
    }

    const [anoStr, mesStr] = month.split("-");
    const ano = Number(anoStr);
    const mes = Number(mesStr);
    const totalDiasUteis = diasUteisMes(ano, mes);

    // Funcionários ativos
    const employees: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, name, role, salary FROM "Employee" WHERE active = true ORDER BY name`
    );

    // Faltas do mês (type = 'falta')
    const faltas: any[] = await prisma.$queryRawUnsafe(
      `SELECT employee_id, COUNT(*)::int AS qtd
       FROM erp_attendance
       WHERE type = 'falta' AND TO_CHAR(date, 'YYYY-MM') = $1
       GROUP BY employee_id`,
      month
    );
    const faltaMap = new Map<string, number>(faltas.map((f: any) => [f.employee_id, f.qtd]));

    const data = employees.map((e: any) => {
      const faltasFunc = faltaMap.get(e.id) || 0;
      const diasTrabalhados = Math.max(0, totalDiasUteis - faltasFunc);
      const valorVR = totalDiasUteis > 0
        ? Math.round(VR_MENSAL * (diasTrabalhados / totalDiasUteis) * 100) / 100
        : 0;
      return {
        employeeId: e.id,
        name: e.name,
        role: e.role,
        salary: Number(e.salary),
        diasUteis: totalDiasUteis,
        diasTrabalhados,
        valorVR,
      };
    });

    const valorTotal = data.reduce((sum: number, d: any) => sum + d.valorVR, 0);

    return NextResponse.json({
      data,
      totais: {
        valorTotal: Math.round(valorTotal * 100) / 100,
        funcionarios: data.length,
        mes,
        vrMensal: VR_MENSAL,
      },
    });
  } catch (e: any) {
    return erroInterno(e, "api/rh/vale-alimentacao GET");
  }
}
