
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await prisma.measurement.findMany({ orderBy: { createdAt: "desc" }, include: { contract: { select: { number: true, object: true } }, items: true } });
    if (!data.length) return NextResponse.json({ data: DEMO, _demo: true });
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ data: DEMO, _demo: true }); }
}

export async function PATCH(req: NextRequest) {
  // Aprovar / atualizar status de uma medição → se aprovada, salva no GED
  try {
    const b = await req.json();
    const { id, status, approvedBy, notes } = b;
    if (!id || !status) return NextResponse.json({ error: "id e status obrigatórios" }, { status: 400 });

    const m = await prisma.measurement.update({
      where: { id },
      data: {
        status,
        approvedBy: approvedBy || null,
        approvedAt: status === "aprovada" ? new Date() : null,
        notes: notes || null,
      },
      include: { contract: { select: { number: true, object: true, clientId: true } } },
    });

    // Ao aprovar → salvar no GED automaticamente
    if (status === "aprovada") {
      try {
        const periodo = m.period || new Date(m.startDate).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
        const nomeDoc = `Medição Aprovada — ${m.contract?.number || ""} ${periodo} — R$ ${Number(m.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

        // Verificar se já existe (evitar duplicata). Inclui o período para não
        // confundir medições diferentes do mesmo contrato na mesma semana.
        const existente = await prisma.document.findFirst({
          where: {
            nome: { contains: `${m.contract?.number || ""} ${periodo}` },
            subcategoria: "Medição",
          },
        });

        if (!existente) {
          await prisma.document.create({
            data: {
              nome: nomeDoc,
              descricao: `Medição aprovada por ${approvedBy || "—"} em ${new Date().toLocaleDateString("pt-BR")}. Contrato: ${m.contract?.object || ""}`,
              categoria: "contrato",
              subcategoria: "Medição",
              tags: `medicao,${m.contract?.number?.toLowerCase() || ""},${new Date().getFullYear()},aprovada`,
              contratoId: b.contratoId || null,
              clienteId: m.contract?.clientId || null,
              estrategia: "url",
              urlArquivo: null, // sem arquivo físico — é um registro de controle
              validade: null,
              status: "ativo",
              versao: 1,
              confidencial: false,
              uploadBy: "Medição (automático)",
            },
          });
        }
      } catch { /* erro no GED não bloqueia a aprovação */ }
    }

    return NextResponse.json({ success: true, medicao: m });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();

    // Faturar a medição: gera a NFS-e (lançada), a receita no financeiro e
    // marca a medição como "faturada". Antes o botão "Emitir NFS-e" só navegava.
    if (b.action === "faturar") {
      if (!b.id) return NextResponse.json({ error: "id da medição obrigatório" }, { status: 400 });
      const med = await prisma.measurement.findUnique({
        where: { id: b.id },
        include: { contract: { include: { client: true } } },
      });
      if (!med) return NextResponse.json({ error: "Medição não encontrada" }, { status: 404 });
      if (med.status !== "aprovada") return NextResponse.json({ error: "Só é possível faturar medição aprovada" }, { status: 400 });

      const config = await prisma.companyConfig.findFirst();
      const issRate = config ? Number(config.aliqISS) : 5;
      const valor = Number(med.value);
      const issAmount = valor * (issRate / 100);
      const nfCount = await prisma.fiscalNfse.count();
      const number = `NFSE-${new Date().getFullYear()}-${String(nfCount + 1).padStart(4, "0")}`;
      const competence = med.period || new Date().toISOString().slice(0, 7);

      const cat = await prisma.expenseCategory.upsert({
        where: { name: "Receita Contratual" }, update: {},
        create: { name: "Receita Contratual", type: "receita", active: true },
      });

      const [nfse] = await prisma.$transaction([
        prisma.fiscalNfse.create({
          data: {
            number, municipality: config?.municipio || "Betim", providerCnpj: config?.cnpj || "",
            receiverName: med.contract?.client?.name || null, receiverCnpj: med.contract?.client?.cnpjCpf || null,
            clientId: med.contract?.clientId || null,
            description: `Medição ${competence} — ${med.contract?.object || med.contract?.number || ""}`,
            serviceValue: valor, calculationBase: valor, issRate, issAmount, netAmount: valor - issAmount,
            issueDate: new Date(), competence, status: "lancada",
          },
        }),
        prisma.expense.create({
          data: {
            description: `Receita — NFS-e ${number} (${med.contract?.number || ""})`,
            amount: valor, dueDate: new Date(), status: "previsto", categoryId: cat.id, competence,
            notes: `Faturamento da medição ${med.id}`,
          },
        }),
        prisma.measurement.update({ where: { id: b.id }, data: { status: "faturada" } }),
      ]);
      return NextResponse.json({ success: true, nfse, mensagem: `NFS-e ${number} lançada e receita registrada.` });
    }

    const m = await prisma.measurement.create({ data: { contractId: b.contractId, period: b.period, startDate: new Date(b.startDate), endDate: new Date(b.endDate), value: Number(b.value||0), status: "em_elaboracao", notes: b.notes, items: { create: (b.items||[]).map((i: any) => ({ description: i.description, unit: i.unit, quantity: Number(i.quantity), unitValue: Number(i.unitValue), totalValue: Number(i.quantity)*Number(i.unitValue) })) } }, include: { items: true } });
    return NextResponse.json(m, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

const DEMO = [
  { id:"m1", contract:{ number:"CONT-2026-001", object:"Roçada Canteiros Norte — PBH" }, period:"2026-04", startDate:"2026-03-21", endDate:"2026-04-20", value:38500, status:"aprovada", approvedBy:"João Silva / PBH", approvedAt:"2026-04-22", items:[ { id:"mi1", description:"Roçada manual canteiros", unit:"m²", quantity:22000, unitValue:1.75, totalValue:38500 } ] },
  { id:"m2", contract:{ number:"CONT-2026-002", object:"PRADA CEMIG" }, period:"2026-04", startDate:"2026-03-21", endDate:"2026-04-20", value:42000, status:"enviada", items:[ { id:"mi2", description:"PRADA — recuperação áreas degradadas", unit:"ha", quantity:6, unitValue:7000, totalValue:42000 } ] },
  { id:"m3", contract:{ number:"CONT-2026-001", object:"Roçada Canteiros Norte — PBH" }, period:"2026-05", startDate:"2026-04-21", endDate:"2026-05-20", value:38500, status:"em_elaboracao", items:[] },
];
