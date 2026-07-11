// Monitor de Documentação — matriz funcionário × requisito por contrato.
// Requisitos com autoSource buscam o documento mais recente nos módulos
// ASO, Treinamentos e EPI quando não há registro manual.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MODELOS, statusPorValidade } from "@/lib/monitor-docs";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const contractId = req.nextUrl.searchParams.get("contractId");

    const contratos = await prisma.contract.findMany({
      where: { status: "Ativo" },
      select: { id: true, number: true, object: true, client: { select: { name: true } } },
      orderBy: { number: "asc" },
    });

    if (!contractId) return NextResponse.json({ contratos });

    const [requisitos, mobilizacoes] = await Promise.all([
      prisma.contractDocRequirement.findMany({
        where: { contractId },
        orderBy: [{ scope: "desc" }, { itemRef: "asc" }],
        include: { records: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.mobilization.findMany({
        where: { contractId, status: "ativa" },
        include: { employee: { select: { id: true, name: true, role: true } } },
      }),
    ]);

    const funcionarios = mobilizacoes.map((m) => m.employee);
    const funcIds = funcionarios.map((f) => f.id);

    // Fontes automáticas (documento mais recente por funcionário)
    const [asos, treinamentos, epis] = await Promise.all([
      prisma.asoExam.findMany({ where: { employeeId: { in: funcIds } }, orderBy: { examDate: "desc" } }),
      prisma.training.findMany({ where: { employeeId: { in: funcIds } }, orderBy: { issuedAt: "desc" } }),
      prisma.inventoryEpiDelivery.findMany({ where: { employeeId: { in: funcIds }, status: "ativo" }, orderBy: { deliveryDate: "desc" } }),
    ]);

    const autoDoc = (req_: any, funcId: string): { expiresAt: Date | null; origem: string } | null => {
      if (req_.autoSource === "ASO") {
        const a = asos.find((x) => x.employeeId === funcId);
        return a ? { expiresAt: a.expiresAt, origem: `ASO ${a.examType} de ${a.examDate.toISOString().slice(0, 10)}` } : null;
      }
      if (req_.autoSource === "TREINAMENTO" && req_.sourceHint) {
        const t = treinamentos.find((x) => x.employeeId === funcId && x.trainingType.toUpperCase().includes(req_.sourceHint.toUpperCase()));
        return t ? { expiresAt: t.expiresAt, origem: `Treinamento ${t.trainingType}` } : null;
      }
      if (req_.autoSource === "EPI") {
        const e = epis.find((x) => x.employeeId === funcId);
        return e ? { expiresAt: e.expectedReplacementDate ?? null, origem: "Entrega de EPI registrada" } : null;
      }
      return null;
    };

    // Matriz funcionário × requisito (escopo FUNCIONARIO)
    const reqFunc = requisitos.filter((r) => r.scope === "FUNCIONARIO");
    const matriz = funcionarios.map((f) => ({
      funcionario: f,
      celulas: reqFunc.map((r) => {
        const registro = r.records.find((rec) => rec.employeeId === f.id);
        if (registro) {
          return {
            requirementId: r.id, recordId: registro.id,
            expiresAt: registro.expiresAt, issuedAt: registro.issuedAt,
            status: statusPorValidade(registro.expiresAt, true), origem: "manual", notes: registro.notes,
          };
        }
        const auto = autoDoc(r, f.id);
        if (auto) return { requirementId: r.id, recordId: null, expiresAt: auto.expiresAt, issuedAt: null, status: statusPorValidade(auto.expiresAt, true), origem: auto.origem, notes: null };
        return { requirementId: r.id, recordId: null, expiresAt: null, issuedAt: null, status: statusPorValidade(null, false), origem: null, notes: null };
      }),
    }));

    // Documentos de escopo EMPRESA (um registro por requisito, employeeId null)
    const reqEmpresa = requisitos.filter((r) => r.scope === "EMPRESA").map((r) => {
      const registro = r.records.find((rec) => !rec.employeeId);
      return {
        id: r.id, name: r.name, itemRef: r.itemRef, validityDays: r.validityDays,
        recordId: registro?.id ?? null, issuedAt: registro?.issuedAt ?? null, expiresAt: registro?.expiresAt ?? null,
        status: registro ? statusPorValidade(registro.expiresAt, true) : statusPorValidade(null, false),
        notes: registro?.notes ?? null,
      };
    });

    // Resumo de pendências
    let vencidos = 0, aVencer = 0, faltantes = 0;
    for (const linha of matriz) for (const c of linha.celulas) {
      if (c.status === "vencido") vencidos++;
      else if (c.status === "a_vencer") aVencer++;
      else if (c.status === "faltante") faltantes++;
    }
    for (const r of reqEmpresa) {
      if (r.status === "vencido") vencidos++;
      else if (r.status === "a_vencer") aVencer++;
      else if (r.status === "faltante") faltantes++;
    }

    return NextResponse.json({
      contratos,
      requisitosFuncionario: reqFunc.map((r) => ({ id: r.id, name: r.name, itemRef: r.itemRef, validityDays: r.validityDays, autoSource: r.autoSource })),
      requisitosEmpresa: reqEmpresa,
      matriz,
      resumo: { vencidos, aVencer, faltantes, funcionarios: funcionarios.length },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === "aplicarModelo") {
      const modelo = MODELOS[body.modelo || "SST"];
      if (!modelo) return NextResponse.json({ error: "Modelo desconhecido" }, { status: 400 });
      const existentes = await prisma.contractDocRequirement.findMany({ where: { contractId: body.contractId }, select: { name: true } });
      const nomes = new Set(existentes.map((e) => e.name));
      const novos = modelo.itens.filter((m) => !nomes.has(m.name));
      await prisma.contractDocRequirement.createMany({
        data: novos.map((m) => ({
          contractId: body.contractId, name: m.name, scope: m.scope, itemRef: m.itemRef ?? null,
          validityDays: m.validityDays ?? null, autoSource: m.autoSource ?? null, sourceHint: m.sourceHint ?? null,
        })),
      });
      return NextResponse.json({ ok: true, criados: novos.length });
    }

    if (body.action === "requisito") {
      const r = await prisma.contractDocRequirement.create({
        data: {
          contractId: body.contractId, name: body.name, scope: body.scope || "FUNCIONARIO",
          itemRef: body.itemRef || null, validityDays: body.validityDays ? Number(body.validityDays) : null,
        },
      });
      return NextResponse.json({ ok: true, id: r.id });
    }

    if (body.action === "registro") {
      const data = {
        issuedAt: body.issuedAt ? new Date(body.issuedAt) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        notes: body.notes || null,
      };
      if (body.recordId) {
        await prisma.contractDocRecord.update({ where: { id: body.recordId }, data });
      } else {
        await prisma.contractDocRecord.create({
          data: { requirementId: body.requirementId, employeeId: body.employeeId || null, ...data },
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const requisitoId = req.nextUrl.searchParams.get("requisitoId");
    if (!requisitoId) return NextResponse.json({ error: "requisitoId obrigatório" }, { status: 400 });
    await prisma.contractDocRecord.deleteMany({ where: { requirementId: requisitoId } });
    await prisma.contractDocRequirement.delete({ where: { id: requisitoId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
