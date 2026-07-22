import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MODELOS } from "@/lib/monitor-docs";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "DIRETORIA");
  if (erro) return erro;
  try {
    const { proposalId } = await req.json();
    if (!proposalId) return NextResponse.json({ error: "proposalId obrigatório" }, { status: 400 });

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        client: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
        dossier: { include: { compositions: { orderBy: { order: "asc" } }, reservations: true } },
      },
    });
    if (!proposal) return NextResponse.json({ error: "Proposta não encontrada" }, { status: 404 });
    if (proposal.dossier?.contractId) return NextResponse.json({ error: "Esta proposta já foi convertida em contrato" }, { status: 409 });
    const version = proposal.versions[0];
    const approvalsOk = version && version.technicalStatus === "aprovado" && version.financialStatus === "aprovado" && version.directorStatus === "aprovado";
    if (!approvalsOk || proposal.status !== "Aprovada") {
      return NextResponse.json({ error: "Aprovações técnica, financeira e da diretoria são obrigatórias na versão atual" }, { status: 422 });
    }
    const approvedPrice = Number(version.price);
    const proposalPrice = Number(proposal.totalValue);
    if (!Number.isFinite(approvedPrice) || approvedPrice <= 0 || Math.abs(approvedPrice - proposalPrice) > 0.009) {
      return NextResponse.json({ error: "O valor atual não corresponde à versão aprovada; crie e aprove uma nova versão" }, { status: 409 });
    }
    if (proposal.dossier && approvedPrice < Number(proposal.dossier.minimumPrice)) {
      return NextResponse.json({ error: "O preço aprovado ficou abaixo do mínimo atual do dossiê; revise a proposta" }, { status: 422 });
    }

    const year = new Date().getFullYear();
    const startDate = proposal.dossier?.startDate || new Date();
    const months = proposal.vigenciaMeses || 12;
    const endDate = new Date(startDate); endDate.setMonth(endDate.getMonth() + months);

    const result = await prisma.$transaction(async (tx) => {
      const clientProfile = proposal.dossier?.requirementProfileId ? await tx.clientRequirementProfile.findFirst({
        where: { id: proposal.dossier.requirementProfileId, clientId: proposal.clientId || undefined, active: true },
      }) : null;
      if (proposal.dossier?.requirementProfileId && !clientProfile) {
        throw new Error("DOCUMENT_PROFILE_INVALID");
      }
      const profileRequirements = clientProfile && Array.isArray(clientProfile.requirements) ? clientProfile.requirements as any[] : [];
      const defaults = MODELOS.SST.itens.map((item) => ({ ...item, origin: "SERVICO" }));
      const merged = [...defaults, ...profileRequirements.map((item) => ({ ...item, origin: "CLIENTE" }))]
        .filter((item, index, all) => item.name && all.findIndex((candidate) => candidate.name === item.name) === index);

      for (const reservation of proposal.dossier?.reservations.filter((item) => item.status === "provisoria") || []) {
        const overlap = { startDate: { lte: reservation.endDate }, endDate: { gte: reservation.startDate } };
        const conflictingReservation = await tx.resourceReservation.findFirst({
          where: {
            id: { not: reservation.id },
            status: { in: ["provisoria", "confirmada"] },
            ...overlap,
            ...(reservation.employeeId ? { employeeId: reservation.employeeId } : { equipmentId: reservation.equipmentId }),
          },
          select: { id: true },
        });
        if (conflictingReservation) throw new Error("RESERVATION_BLOCKED:Há conflito de agenda em uma reserva provisória.");

        if (reservation.employeeId) {
          const [employee, mobilization] = await Promise.all([
            tx.employee.findUnique({ where: { id: reservation.employeeId }, select: { name: true, active: true, status: true } }),
            tx.mobilization.findFirst({
              where: { employeeId: reservation.employeeId, status: "ativa", startDate: { lte: reservation.endDate }, OR: [{ endDate: null }, { endDate: { gte: reservation.startDate } }] },
              select: { id: true },
            }),
          ]);
          if (!employee?.active || employee.status !== "ativo") throw new Error("RESERVATION_BLOCKED:Um funcionário reservado está inativo.");
          if (mobilization) throw new Error(`RESERVATION_BLOCKED:${employee.name} já está mobilizado no período reservado.`);
        }

        if (reservation.equipmentId) {
          const [equipment, maintenance, documents] = await Promise.all([
            tx.equipment.findUnique({ where: { id: reservation.equipmentId }, select: { descricao: true, tipo: true, ativo: true, status: true } }),
            tx.equipmentMaintenance.findFirst({ where: { equipmentId: reservation.equipmentId, status: "agendada", dataAgendada: { gte: reservation.startDate, lte: reservation.endDate } }, select: { id: true } }),
            tx.equipmentDoc.findMany({ where: { equipmentId: reservation.equipmentId }, orderBy: { createdAt: "desc" } }),
          ]);
          if (!equipment?.ativo || equipment.status !== "operacional") throw new Error("RESERVATION_BLOCKED:Um equipamento reservado não está operacional.");
          if (maintenance) throw new Error(`RESERVATION_BLOCKED:${equipment.descricao} possui manutenção agendada no período.`);
          const normalize = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const requirements = merged.filter((item) => item.scope === "EQUIPAMENTO" && (!item.equipmentType || normalize(equipment.tipo).includes(normalize(item.equipmentType))));
          for (const requirement of requirements) {
            const document = documents.find((item) => {
              const required = normalize(requirement.name);
              const current = normalize(item.docType);
              return required.includes(current) || current.includes(required);
            });
            const requiredUntil = new Date(reservation.startDate);
            requiredUntil.setDate(requiredUntil.getDate() + Number(requirement.leadTimeDays || 0));
            if (!document || document.status !== "aprovado" || (document.expiresAt && document.expiresAt < requiredUntil)) {
              throw new Error(`RESERVATION_BLOCKED:${equipment.descricao} não possui ${requirement.name} aprovado e válido.`);
            }
          }
        }
      }

      const count = await tx.contract.count({ where: { number: { startsWith: `CT-${year}-` } } });
      const number = `CT-${year}-${String(count + 1).padStart(4, "0")}`;
      const totalValue = Number(proposal.totalValue) || 0;
      const contract = await tx.contract.create({
        data: {
          number,
          clientId: proposal.clientId,
          object: proposal.object || proposal.serviceType || "Prestação de serviços",
          value: totalValue,
          monthlyValue: months > 0 ? totalValue / months : totalValue,
          startDate,
          endDate,
          status: "Ativo",
          notes: `Gerado da proposta ${proposal.number}, versão ${version.version}, com três alçadas aprovadas.`,
        },
      });

      if (merged.length) await tx.contractDocRequirement.createMany({
        data: merged.map((item) => ({
          contractId: contract.id,
          name: item.name,
          scope: item.scope || "FUNCIONARIO",
          itemRef: item.itemRef || null,
          validityDays: item.validityDays ?? null,
          autoSource: item.autoSource || null,
          sourceHint: item.sourceHint || null,
          origin: item.origin,
          activity: item.activity || null,
          role: item.role || null,
          equipmentType: item.equipmentType || null,
          blocking: item.blocking !== false,
          leadTimeDays: Number(item.leadTimeDays || 0),
        })),
      });

      const compositions = proposal.dossier?.compositions || [];
      if (compositions.length) {
        let offset = 0;
        for (const composition of compositions) {
          const date = new Date(startDate); date.setDate(date.getDate() + offset);
          await tx.scheduleItem.create({
            data: {
              contractId: contract.id,
              date,
              activity: composition.activity,
              location: proposal.location || null,
              team: `${composition.plannedWorkers || composition.teamSize} trabalhador(es)`,
              status: "planejado",
              notes: `${Number(composition.plannedLaborHours)} HH · ${Number(composition.quantity)} ${composition.unit}`,
            },
          });
          offset += Math.max(1, Math.ceil(Number(composition.plannedDays)));
        }
      } else {
        await tx.scheduleItem.create({ data: { contractId: contract.id, date: startDate, activity: "Mobilização da equipe e integração", location: proposal.location || null, status: "planejado" } });
      }

      if (proposal.dossier) {
        await tx.resourceReservation.updateMany({
          where: { dossierId: proposal.dossier.id, status: "provisoria" },
          data: { contractId: contract.id, status: "confirmada" },
        });
        await tx.serviceDossier.update({ where: { id: proposal.dossier.id }, data: { contractId: contract.id, status: "convertido" } });
      }
      await tx.proposal.update({ where: { id: proposal.id }, data: { status: "Convertida", approvedAt: proposal.approvedAt || new Date() } });
      return { contract, requirementCount: merged.length, scheduleCount: Math.max(1, compositions.length), profile: clientProfile ? `${clientProfile.name} v${clientProfile.version}` : null };
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      ok: true,
      contractId: result.contract.id,
      numero: result.contract.number,
      gerado: { requisitosDocs: result.requirementCount, cronograma: result.scheduleCount, perfilDocumental: result.profile },
      proximosPassos: [
        "Revisar a matriz documental e aprovar os registros manuais",
        "Mobilizar apenas funcionários liberados pelo compliance",
        "Confirmar recursos e cronograma com a operação",
        "Registrar produção e HH no diário de obras",
      ],
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "DOCUMENT_PROFILE_INVALID") {
      return NextResponse.json({ error: "O perfil documental selecionado não está mais ativo ou não pertence ao cliente" }, { status: 409 });
    }
    if (error instanceof Error && error.message.startsWith("RESERVATION_BLOCKED:")) {
      return NextResponse.json({ error: error.message.slice("RESERVATION_BLOCKED:".length) }, { status: 409 });
    }
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) {
      return NextResponse.json({ error: "A conversão sofreu concorrência com outra operação. Atualize a página e tente novamente." }, { status: 409 });
    }
    return erroInterno(error, "api/proposta-contrato");
  }
}
