// Envia o relatório mensal do contador por e-mail (SMTP)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarEmail, emailConfigurado } from "@/lib/email";
import { erroInterno } from "@/lib/authz";

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const competencia = body.competencia || new Date().toISOString().slice(0, 7);

    if (!emailConfigurado()) {
      return NextResponse.json({ error: "SMTP não configurado. Defina SMTP_HOST, SMTP_USER, SMTP_PASS e EMAIL_FROM no .env.production da VPS." }, { status: 400 });
    }

    const config = await prisma.companyConfig.findFirst();
    const destinatario = body.para || config?.emailContador;
    if (!destinatario) {
      return NextResponse.json({ error: "E-mail do contador não cadastrado — preencha em Configurações" }, { status: 400 });
    }

    const [nfses, tributos, folha, despesas] = await Promise.all([
      prisma.fiscalNfse.findMany({ where: { competence: competencia } }),
      prisma.fiscalTaxExpense.findMany({ where: { competence: competencia } }),
      prisma.employee.findMany({ where: { active: true }, select: { name: true, role: true, salary: true } }),
      prisma.expense.findMany({ where: { competence: competencia, deletedAt: null } }),
    ]);
    const faturamento = nfses.reduce((s, n) => s + Number(n.serviceValue), 0);
    const totalTributos = tributos.reduce((s, t) => s + Number(t.totalAmount), 0);
    const totalFolha = folha.reduce((s, f) => s + Number(f.salary), 0);
    const totalDesp = despesas.reduce((s, d) => s + Number(d.amount), 0);
    const margem = faturamento - totalTributos - totalFolha - totalDesp;

    const linha = (l: string, v: string) => `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${l}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right"><b>${v}</b></td></tr>`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px">
        <h2 style="color:#334532">🌿 ${config?.razaoSocial || "VERDELIMP"} — Relatório Mensal</h2>
        <p style="color:#374151">Competência <b>${competencia}</b> — resumo gerencial para conferência contábil.</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          ${linha("Faturamento (NFS-e emitidas: " + nfses.length + ")", "R$ " + fmt(faturamento))}
          ${linha("Tributos apurados (" + tributos.length + " guias)", "R$ " + fmt(totalTributos))}
          ${linha("Folha de pagamento (" + folha.length + " colaboradores)", "R$ " + fmt(totalFolha))}
          ${linha("Despesas da competência", "R$ " + fmt(totalDesp))}
          ${linha("Margem estimada", "R$ " + fmt(margem))}
        </table>
        ${tributos.length ? `
        <h3 style="color:#334532;margin-top:18px">Tributos da competência</h3>
        <table style="border-collapse:collapse;width:100%;font-size:13px">
          ${tributos.map((t) => linha(`${t.taxType} — venc. ${new Date(t.dueDate).toLocaleDateString("pt-BR")} (${t.status})`, "R$ " + fmt(Number(t.totalAmount)))).join("")}
        </table>` : ""}
        <p style="color:#92400e;background:#fef9c3;padding:8px 12px;border-radius:6px;font-size:12px;margin-top:16px">
          ⚠️ Documento de apoio gerencial gerado pelo Verdelimp ERP — validar antes de qualquer recolhimento oficial.
        </p>
      </div>`;

    const resultado = await enviarEmail({
      para: destinatario,
      assunto: `Relatório mensal Verdelimp — competência ${competencia}`,
      html,
      texto: `Relatório ${competencia}: faturamento R$ ${fmt(faturamento)}, tributos R$ ${fmt(totalTributos)}, folha R$ ${fmt(totalFolha)}, despesas R$ ${fmt(totalDesp)}, margem R$ ${fmt(margem)}.`,
    });

    if (!resultado.ok) return NextResponse.json({ error: resultado.erro }, { status: 502 });
    return NextResponse.json({ ok: true, para: destinatario });
  } catch (e: any) {
    return erroInterno(e, "api/relatorio/email");
  }
}
