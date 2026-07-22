// Monitor de Documentação — matriz funcionário × requisito por contrato.
// Requisitos com autoSource buscam o documento mais recente nos módulos
// ASO, Treinamentos e EPI quando não há registro manual.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MODELOS, statusPorValidade } from "@/lib/monitor-docs";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const contractId = req.nextUrl.searchParams.get("contractId");

    const contratos = await prisma.contract.findMany({
      where: { status: "Ativo" },
      select: { id: true, number: true, object: true, client: { select: { name: true } } },
      orderBy: { number: "asc" },
    });

    if (!contractId) return NextResponse.json({ contratos });

    const [requisitos, mobilizacoes, mobilizacoesBloqueadas, reservasEquipamentos] = await Promise.all([
      prisma.contractDocRequirement.findMany({
        where: { contractId },
        orderBy: [{ scope: "desc" }, { itemRef: "asc" }],
        include: { records: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.mobilization.findMany({
        where: { contractId, status: { in: ["ativa", "suspensa"] } },
        include: { employee: { select: { id: true, name: true, role: true } } },
      }),
      prisma.mobilization.findMany({
        where: { contractId, complianceStatus: "bloqueada" },
        include: { employee: { select: { id: true, name: true, role: true } } },
      }),
      prisma.resourceReservation.findMany({
        where: { contractId, status: "confirmada", equipmentId: { not: null } },
        include: { equipment: { include: { documents: { orderBy: { createdAt: "desc" } } } } },
        orderBy: { startDate: "asc" },
      }),
    ]);

    const funcionarios = mobilizacoes.map((m) => m.employee).filter((employee, index, all) => all.findIndex((item) => item.id === employee.id) === index);
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
    const normalizar = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const matriz = funcionarios.map((f) => ({
      funcionario: f,
      celulas: reqFunc.map((r) => {
        if (r.role && !normalizar(f.role).includes(normalizar(r.role)) && !normalizar(r.role).includes(normalizar(f.role))) {
          return { requirementId: r.id, recordId: null, status: "nao_aplicavel", origem: "Não se aplica à função", notes: null, blocking: r.blocking };
        }
        const registro = r.records.find((rec) => rec.employeeId === f.id);
        if (registro) {
          const aprovado = registro.status === "aprovado";
          return {
            requirementId: r.id, recordId: registro.id,
            expiresAt: registro.expiresAt, issuedAt: registro.issuedAt,
            status: aprovado ? statusPorValidade(registro.expiresAt, true) : "faltante",
            reviewStatus: registro.status, rejectionReason: registro.rejectionReason,
            origem: "manual", notes: registro.notes, filePath: registro.filePath, blocking: r.blocking,
          };
        }
        const auto = autoDoc(r, f.id);
        if (auto) return { requirementId: r.id, recordId: null, expiresAt: auto.expiresAt, issuedAt: null, status: statusPorValidade(auto.expiresAt, true), origem: auto.origem, notes: null, blocking: r.blocking };
        return { requirementId: r.id, recordId: null, expiresAt: null, issuedAt: null, status: statusPorValidade(null, false), origem: null, notes: null, blocking: r.blocking };
      }),
    }));

    const reqEquipamento = requisitos.filter((r) => r.scope === "EQUIPAMENTO");
    const equipamentos = reservasEquipamentos
      .filter((reservation) => reservation.equipment)
      .filter((reservation, index, all) => all.findIndex((item) => item.equipmentId === reservation.equipmentId) === index)
      .map((reservation) => ({
        equipamento: reservation.equipment,
        reserva: { startDate: reservation.startDate, endDate: reservation.endDate },
        documentos: reqEquipamento
          .filter((requirement) => !requirement.equipmentType || normalizar(reservation.equipment!.tipo).includes(normalizar(requirement.equipmentType)))
          .map((requirement) => {
            const document = reservation.equipment!.documents.find((item) => {
              const required = normalizar(requirement.name);
              const current = normalizar(item.docType);
              return required.includes(current) || current.includes(required);
            });
            return {
              requirementId: requirement.id,
              name: requirement.name,
              blocking: requirement.blocking,
              status: document?.status === "aprovado" ? statusPorValidade(document.expiresAt, true) : "faltante",
              reviewStatus: document?.status || null,
              expiresAt: document?.expiresAt || null,
              filePath: document?.filePath || null,
            };
          }),
      }));

    // Documentos de escopo EMPRESA (um registro por requisito, employeeId null)
    const reqEmpresa = requisitos.filter((r) => r.scope === "EMPRESA").map((r) => {
      const registro = r.records.find((rec) => !rec.employeeId);
      return {
        id: r.id, name: r.name, itemRef: r.itemRef, validityDays: r.validityDays, blocking: r.blocking,
        recordId: registro?.id ?? null, issuedAt: registro?.issuedAt ?? null, expiresAt: registro?.expiresAt ?? null,
        status: registro?.status === "aprovado" ? statusPorValidade(registro.expiresAt, true) : statusPorValidade(null, false),
        reviewStatus: registro?.status ?? null,
        rejectionReason: registro?.rejectionReason ?? null,
        notes: registro?.notes ?? null, filePath: registro?.filePath ?? null,
      };
    });

    // Resumo de pendências
    let vencidos = 0, aVencer = 0, faltantes = 0;
    for (const linha of matriz) for (const c of linha.celulas) {
      if (c.blocking === false) continue;
      if (c.status === "vencido") vencidos++;
      else if (c.status === "a_vencer") aVencer++;
      else if (c.status === "faltante") faltantes++;
    }
    for (const equipamento of equipamentos) for (const documento of equipamento.documentos) {
      if (!documento.blocking) continue;
      if (documento.status === "vencido") vencidos++;
      else if (documento.status === "a_vencer") aVencer++;
      else if (documento.status === "faltante") faltantes++;
    }
    for (const r of reqEmpresa) {
      if (r.blocking === false) continue;
      if (r.status === "vencido") vencidos++;
      else if (r.status === "a_vencer") aVencer++;
      else if (r.status === "faltante") faltantes++;
    }

    return NextResponse.json({
      contratos,
      requisitosFuncionario: reqFunc.map((r) => ({ id: r.id, name: r.name, itemRef: r.itemRef, validityDays: r.validityDays, autoSource: r.autoSource, role: r.role, blocking: r.blocking })),
      requisitosEmpresa: reqEmpresa,
      matriz,
      equipamentos,
      mobilizacoesBloqueadas,
      resumo: { vencidos, aVencer, faltantes, funcionarios: funcionarios.length },
    });
  } catch (e: any) {
    return erroInterno(e, "api/monitor-docs");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "DIRETORIA", "OPERACIONAL", "COMERCIAL");
  if (erro) return erro;
  try {
    const body = await req.json();
    const canManageRequirements = ["ADMIN", "RH", "DIRETORIA"].some((role) => user!.roles.includes(role));
    if (["aplicarModelo", "aplicarPerfilCliente", "requisito", "revisar"].includes(body.action) && !canManageRequirements) {
      return NextResponse.json({ error: "Seu perfil pode enviar documentos, mas não alterar requisitos nem aprová-los" }, { status: 403 });
    }

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

    if (body.action === "aplicarPerfilCliente") {
      const [profile, contract] = await Promise.all([
        prisma.clientRequirementProfile.findUnique({ where: { id: body.profileId } }),
        prisma.contract.findUnique({ where: { id: body.contractId }, select: { clientId: true } }),
      ]);
      if (!profile || !profile.active) return NextResponse.json({ error: "Perfil documental ativo não encontrado" }, { status: 404 });
      if (!contract || profile.clientId !== contract.clientId) return NextResponse.json({ error: "O perfil não pertence ao cliente deste contrato" }, { status: 422 });
      const requirements = Array.isArray(profile.requirements) ? profile.requirements as any[] : [];
      const existing = await prisma.contractDocRequirement.findMany({ where: { contractId: body.contractId }, select: { name: true } });
      const names = new Set(existing.map((item) => item.name));
      const pending = requirements.filter((item) => item.name && !names.has(item.name));
      await prisma.contractDocRequirement.createMany({
        data: pending.map((item) => ({
          contractId: body.contractId,
          name: item.name,
          scope: item.scope || "FUNCIONARIO",
          validityDays: item.validityDays == null ? null : Number(item.validityDays),
          origin: "CLIENTE",
          activity: item.activity || null,
          role: item.role || null,
          equipmentType: item.equipmentType || null,
          blocking: item.blocking !== false,
          leadTimeDays: Number(item.leadTimeDays || 0),
        })),
      });
      return NextResponse.json({ ok: true, criados: pending.length, profileVersion: profile.version });
    }

    if (body.action === "requisito") {
      const r = await prisma.contractDocRequirement.create({
        data: {
          contractId: body.contractId, name: body.name, scope: body.scope || "FUNCIONARIO",
          itemRef: body.itemRef || null, validityDays: body.validityDays ? Number(body.validityDays) : null,
          origin: body.origin || "CONTRATO", activity: body.activity || null, role: body.role || null,
          equipmentType: body.equipmentType || null, blocking: body.blocking !== false,
          leadTimeDays: Number(body.leadTimeDays || 0),
        },
      });
      return NextResponse.json({ ok: true, id: r.id });
    }

    if (body.action === "registro") {
      if (!body.recordId && !body.requirementId) return NextResponse.json({ error: "Requisito obrigatório" }, { status: 400 });
      const issuedAt = parseDataOperacional(body.issuedAt);
      const expiresAt = parseDataOperacional(body.expiresAt);
      if ((body.issuedAt && !issuedAt) || (body.expiresAt && !expiresAt)) return NextResponse.json({ error: "Data de emissão ou validade inválida" }, { status: 400 });
      const data = {
        issuedAt,
        expiresAt,
        notes: body.notes || null,
        filePath: body.filePath || null,
        status: "pendente",
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
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

    if (body.action === "revisar") {
      if (!body.recordId || !["aprovado", "rejeitado"].includes(body.status)) {
        return NextResponse.json({ error: "Registro e decisão válidos são obrigatórios" }, { status: 400 });
      }
      if (body.status === "rejeitado" && !body.rejectionReason) {
        return NextResponse.json({ error: "Informe o motivo da rejeição" }, { status: 400 });
      }
      const current = await prisma.contractDocRecord.findUnique({ where: { id: body.recordId }, select: { filePath: true } });
      if (!current) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
      if (body.status === "aprovado" && !current.filePath) {
        return NextResponse.json({ error: "Anexe o arquivo antes de aprovar o documento manual" }, { status: 422 });
      }
      const record = await prisma.contractDocRecord.update({
        where: { id: body.recordId },
        data: {
          status: body.status,
          reviewedBy: user?.email || user?.name || user?.id,
          reviewedAt: new Date(),
          rejectionReason: body.status === "rejeitado" ? body.rejectionReason : null,
        },
      });
      return NextResponse.json({ ok: true, record });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (e: any) {
    return erroInterno(e, "api/monitor-docs");
  }
}

export async function DELETE(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "DIRETORIA");
  if (erro) return erro;
  try {
    const requisitoId = req.nextUrl.searchParams.get("requisitoId");
    if (!requisitoId) return NextResponse.json({ error: "requisitoId obrigatório" }, { status: 400 });
    await prisma.contractDocRecord.deleteMany({ where: { requirementId: requisitoId } });
    await prisma.contractDocRequirement.delete({ where: { id: requisitoId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return erroInterno(e, "api/monitor-docs");
  }
}
