import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dataLocal } from "@/lib/fiscal-calc";
import { validar, MedicaoSchema } from "@/lib/validacao";
import { erroInterno, exigirPapel, type SessaoUsuario } from "@/lib/authz";

export const dynamic = "force-dynamic";

const PAPEIS_LEITURA = ["ADMIN", "GESTOR", "COMERCIAL", "OPERACIONAL", "FINANCEIRO", "FISCAL"];
const STATUS = ["em_elaboracao", "enviada", "aprovada", "glosada", "faturada"] as const;

const PeriodoSchema = z.object({
  contractId: z.string().trim().min(1, "Contrato obrigatório"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Período deve ser YYYY-MM"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inicial inválida"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data final inválida"),
});

const PreviewSchema = PeriodoSchema.extend({
  action: z.literal("preview_from_diaries"),
});

const CreateFromDiariesSchema = PeriodoSchema.extend({
  action: z.literal("create_from_diaries"),
  billingMode: z.enum(["fixed", "production"]),
  fixedValue: z.coerce.number().positive().optional().nullable(),
  unitValues: z.record(z.string(), z.coerce.number().nonnegative()).optional().default({}),
  allowPending: z.coerce.boolean().optional().default(false),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const BillingSchema = z.object({
  action: z.literal("faturar"),
  id: z.string().trim().min(1, "Medição obrigatória"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Vencimento inválido"),
  retentionAmount: z.coerce.number().min(0).default(0),
  issRetained: z.coerce.boolean().optional().default(false),
  serviceCode: z.string().trim().max(40).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
});

const StatusSchema = z.object({
  id: z.string().trim().min(1, "Medição obrigatória"),
  status: z.enum(STATUS),
  approvedBy: z.string().trim().max(180).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

type DiaryGroup = {
  key: string;
  compositionId: string | null;
  description: string;
  unit: string;
  quantity: number;
  laborHours: number;
  diaryCount: number;
};

function temPapel(user: SessaoUsuario, papeis: string[]) {
  return papeis.some((papel) => user.roles.includes(papel));
}

function parseDate(value: string, endOfDay = false) {
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function auditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function normalizeKey(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function groupDiaries(diaries: any[]): DiaryGroup[] {
  const groups = new Map<string, DiaryGroup>();

  for (const diary of diaries) {
    const unit = String(diary.quantityUnit || diary.composition?.unit || "un").trim() || "un";
    const description = String(diary.composition?.activity || diary.activitiesDone || "Produção executada").trim();
    const key = diary.compositionId
      ? `composition:${diary.compositionId}`
      : `activity:${normalizeKey(description)}:${normalizeKey(unit)}`;
    const current = groups.get(key) || {
      key,
      compositionId: diary.compositionId || null,
      description,
      unit,
      quantity: 0,
      laborHours: 0,
      diaryCount: 0,
    };
    current.quantity += Number(diary.quantityDone || 0);
    current.laborHours += Number(diary.laborHours || 0);
    current.diaryCount += 1;
    groups.set(key, current);
  }

  return [...groups.values()].sort((a, b) => a.description.localeCompare(b.description, "pt-BR"));
}

async function loadPeriod(contractId: string, startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate, true);
  if (!start || !end || end < start) throw new Error("INVALID_PERIOD");

  const [contract, diaries] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        client: { select: { id: true, name: true, cnpjCpf: true } },
        dossier: { include: { compositions: { orderBy: { order: "asc" } } } },
      },
    }),
    prisma.workDiary.findMany({
      where: { contractId, date: { gte: start, lte: end } },
      include: { composition: true },
      orderBy: { date: "asc" },
    }),
  ]);

  if (!contract) throw new Error("CONTRACT_NOT_FOUND");
  if (contract.status !== "Ativo") throw new Error("CONTRACT_INACTIVE");

  const accepted = diaries.filter((diary) => diary.clientAccepted);
  const pending = diaries.filter((diary) => !diary.clientAccepted);
  return { contract, accepted, pending, groups: groupDiaries(accepted), start, end };
}

async function billingLinks(measurementIds: string[]) {
  if (!measurementIds.length) return new Map<string, any>();
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      r.measurement_id,
      r.id AS receivable_id,
      r.nfse_id,
      r.gross_amount,
      r.retention_amount,
      r.net_amount,
      r.status AS receivable_status,
      r.due_date,
      COALESCE(SUM(p.amount), 0) AS paid_amount,
      n.number AS nfse_number,
      n.status AS nfse_status,
      n.pdf_link
    FROM erp_receivable r
    LEFT JOIN erp_receivable_payment p ON p.receivable_id = r.id
    LEFT JOIN "FiscalNfse" n ON n.id = r.nfse_id
    WHERE r.measurement_id IN (${Prisma.join(measurementIds)})
    GROUP BY r.id, n.id
  `);
  return new Map(rows.map((row) => [row.measurement_id, row]));
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel(...PAPEIS_LEITURA);
  if (erro) return erro;

  try {
    const contractId = req.nextUrl.searchParams.get("contractId") || undefined;
    const period = req.nextUrl.searchParams.get("period") || undefined;
    const where: Prisma.MeasurementWhereInput = {};
    if (contractId) where.contractId = contractId;
    if (period) where.period = period;

    const [measurements, contracts] = await Promise.all([
      prisma.measurement.findMany({
        where,
        orderBy: [{ period: "desc" }, { createdAt: "desc" }],
        take: 300,
        include: {
          contract: { select: { id: true, number: true, object: true, clientId: true, client: { select: { name: true } } } },
          items: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.contract.findMany({
        where: { status: "Ativo" },
        select: { id: true, number: true, object: true, monthlyValue: true, client: { select: { name: true } } },
        orderBy: { number: "asc" },
      }),
    ]);

    const links = await billingLinks(measurements.map((measurement) => measurement.id));
    const data = measurements.map((measurement) => ({
      ...measurement,
      billing: links.get(measurement.id) || null,
    }));

    return NextResponse.json({
      data,
      contracts,
      summary: {
        total: data.length,
        emElaboracao: data.filter((item) => item.status === "em_elaboracao").length,
        aguardandoAprovacao: data.filter((item) => item.status === "enviada").length,
        aprovadas: data.filter((item) => item.status === "aprovada").length,
        faturadas: data.filter((item) => item.status === "faturada").length,
        valorAprovado: data.filter((item) => ["aprovada", "faturada"].includes(item.status)).reduce((sum, item) => sum + Number(item.value), 0),
      },
    });
  } catch (error) {
    return erroInterno(error, "api/medicao GET");
  }
}

export async function PATCH(req: NextRequest) {
  const { user, erro } = await exigirPapel(...PAPEIS_LEITURA);
  if (erro || !user) return erro;

  try {
    const parsed = StatusSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    const body = parsed.data;

    const current = await prisma.measurement.findUnique({
      where: { id: body.id },
      include: { contract: { select: { id: true, number: true, object: true, clientId: true } }, items: true },
    });
    if (!current) return NextResponse.json({ error: "Medição não encontrada" }, { status: 404 });

    const transitions: Record<string, string[]> = {
      em_elaboracao: ["enviada"],
      enviada: ["aprovada", "glosada", "em_elaboracao"],
      glosada: ["em_elaboracao", "enviada"],
      aprovada: [],
      faturada: [],
    };
    if (!transitions[current.status]?.includes(body.status)) {
      return NextResponse.json({ error: `Transição inválida: ${current.status} → ${body.status}` }, { status: 409 });
    }

    if (body.status === "enviada") {
      if (!temPapel(user, ["ADMIN", "GESTOR", "COMERCIAL", "OPERACIONAL"])) return NextResponse.json({ error: "Seu perfil não pode enviar medições" }, { status: 403 });
      if (!current.items.length || Number(current.value) <= 0) return NextResponse.json({ error: "Inclua itens e valor antes de enviar" }, { status: 422 });
    }
    if (["aprovada", "glosada"].includes(body.status) && !temPapel(user, ["ADMIN", "GESTOR", "COMERCIAL"])) {
      return NextResponse.json({ error: "Aprovação ou glosa exige perfil gestor ou comercial" }, { status: 403 });
    }
    if (body.status === "aprovada" && !body.approvedBy) return NextResponse.json({ error: "Informe o representante do cliente que aprovou" }, { status: 400 });
    if (body.status === "glosada" && !body.notes) return NextResponse.json({ error: "Informe o motivo da glosa" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      const measurement = await tx.measurement.update({
        where: { id: current.id },
        data: {
          status: body.status,
          approvedBy: body.status === "aprovada" ? body.approvedBy : body.status === "em_elaboracao" ? null : current.approvedBy,
          approvedAt: body.status === "aprovada" ? new Date() : body.status === "em_elaboracao" ? null : current.approvedAt,
          notes: body.notes ?? current.notes,
        },
        include: { items: true, contract: { select: { id: true, number: true, object: true, clientId: true } } },
      });

      if (body.status === "aprovada") {
        const existingDocument = await tx.document.findFirst({
          where: { contratoId: current.contractId, subcategoria: "Medição", tags: { contains: `measurement:${current.id}` } },
          select: { id: true },
        });
        if (!existingDocument) {
          await tx.document.create({
            data: {
              nome: `Medição aprovada — ${current.contract.number} — ${current.period}`,
              descricao: `Medição aprovada por ${body.approvedBy}. Valor: R$ ${Number(current.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
              categoria: "contrato",
              subcategoria: "Medição",
              tags: `medicao,aprovada,measurement:${current.id},${current.period}`,
              contratoId: current.contractId,
              clienteId: current.contract.clientId,
              estrategia: current.pdfPath ? "url" : "url",
              urlArquivo: current.pdfPath || null,
              status: "ativo",
              uploadBy: user.email || user.name || user.id,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "STATUS_CHANGE",
          module: "medicao",
          entityType: "Measurement",
          entityId: current.id,
          oldValues: auditJson({ status: current.status, approvedBy: current.approvedBy, approvedAt: current.approvedAt, notes: current.notes }),
          newValues: auditJson({ status: body.status, approvedBy: body.approvedBy || null, notes: body.notes || null }),
        },
      });
      return measurement;
    });

    return NextResponse.json({ success: true, medicao: updated });
  } catch (error) {
    return erroInterno(error, "api/medicao PATCH");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel(...PAPEIS_LEITURA);
  if (erro || !user) return erro;

  try {
    const raw = await req.json();

    if (raw.action === "preview_from_diaries") {
      const parsed = PreviewSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
      const period = await loadPeriod(parsed.data.contractId, parsed.data.startDate, parsed.data.endDate);
      const existing = await prisma.measurement.findUnique({ where: { contractId_period: { contractId: parsed.data.contractId, period: parsed.data.period } }, select: { id: true, status: true } });
      return NextResponse.json({
        contract: period.contract,
        existing,
        acceptedCount: period.accepted.length,
        pendingCount: period.pending.length,
        acceptedLaborHours: period.accepted.reduce((sum, item) => sum + Number(item.laborHours || 0), 0),
        groups: period.groups,
        diaries: period.accepted.map((item) => ({
          id: item.id,
          date: item.date,
          description: item.composition?.activity || item.activitiesDone,
          quantity: Number(item.quantityDone || 0),
          unit: item.quantityUnit || item.composition?.unit || null,
          laborHours: Number(item.laborHours || 0),
          acceptedBy: item.acceptedBy,
        })),
      });
    }

    if (raw.action === "create_from_diaries") {
      if (!temPapel(user, ["ADMIN", "GESTOR", "COMERCIAL", "OPERACIONAL"])) return NextResponse.json({ error: "Seu perfil não pode criar medições" }, { status: 403 });
      const parsed = CreateFromDiariesSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
      const body = parsed.data;
      const period = await loadPeriod(body.contractId, body.startDate, body.endDate);
      if (!period.accepted.length) return NextResponse.json({ error: "Nenhum diário aceito pelo cliente no período" }, { status: 422 });
      if (period.pending.length && !body.allowPending) {
        return NextResponse.json({ error: `${period.pending.length} diário(s) ainda aguardam aceite do cliente. Aceite-os ou confirme o fechamento parcial.` }, { status: 422 });
      }

      const existing = await prisma.measurement.findUnique({ where: { contractId_period: { contractId: body.contractId, period: body.period } }, select: { id: true } });
      if (existing) return NextResponse.json({ error: "Já existe medição para este contrato e período", id: existing.id }, { status: 409 });

      let items: Array<{ description: string; unit: string; quantity: number; unitValue: number; totalValue: number }> = [];
      if (body.billingMode === "fixed") {
        const value = Number(body.fixedValue || period.contract.monthlyValue || 0);
        if (value <= 0) return NextResponse.json({ error: "Informe o valor fixo da medição" }, { status: 400 });
        items = [{ description: `Medição mensal — ${period.contract.object}`, unit: "vb", quantity: 1, unitValue: value, totalValue: value }];
      } else {
        const measurable = period.groups.filter((group) => group.quantity > 0);
        if (!measurable.length) return NextResponse.json({ error: "Os diários aceitos não possuem quantidades mensuráveis" }, { status: 422 });
        const missing = measurable.filter((group) => Number(body.unitValues[group.key] || 0) <= 0);
        if (missing.length) return NextResponse.json({ error: `Informe o valor unitário de: ${missing.map((item) => item.description).join(", ")}` }, { status: 400 });
        items = measurable.map((group) => {
          const unitValue = Number(body.unitValues[group.key]);
          return { description: group.description, unit: group.unit, quantity: group.quantity, unitValue, totalValue: group.quantity * unitValue };
        });
      }
      const value = items.reduce((sum, item) => sum + item.totalValue, 0);

      const measurement = await prisma.$transaction(async (tx) => {
        const created = await tx.measurement.create({
          data: {
            contractId: body.contractId,
            period: body.period,
            startDate: period.start,
            endDate: period.end,
            value,
            status: "em_elaboracao",
            notes: [body.notes, `Gerada de ${period.accepted.length} diário(s) aceito(s).`, period.pending.length ? `${period.pending.length} diário(s) pendente(s) foram excluídos do fechamento.` : null].filter(Boolean).join("\n"),
            items: { create: items.map((item) => ({ description: item.description, unit: item.unit, quantity: item.quantity, unitValue: item.unitValue, totalValue: item.totalValue })) },
          },
          include: { items: true },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "CREATE_FROM_DIARIES",
            module: "medicao",
            entityType: "Measurement",
            entityId: created.id,
            newValues: auditJson({ contractId: body.contractId, period: body.period, value, billingMode: body.billingMode, acceptedDiaryIds: period.accepted.map((item) => item.id), pendingExcluded: period.pending.map((item) => item.id) }),
          },
        });
        return created;
      }, { isolationLevel: "Serializable" });

      return NextResponse.json({ success: true, data: measurement }, { status: 201 });
    }

    if (raw.action === "faturar") {
      if (!temPapel(user, ["ADMIN", "FINANCEIRO", "FISCAL"])) return NextResponse.json({ error: "Faturamento exige perfil financeiro ou fiscal" }, { status: 403 });
      const parsed = BillingSchema.safeParse(raw);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
      const body = parsed.data;
      const dueDate = parseDate(body.dueDate);
      if (!dueDate) return NextResponse.json({ error: "Vencimento inválido" }, { status: 400 });

      const measurement = await prisma.measurement.findUnique({
        where: { id: body.id },
        include: { contract: { include: { client: true } } },
      });
      if (!measurement) return NextResponse.json({ error: "Medição não encontrada" }, { status: 404 });
      if (measurement.status === "faturada") {
        const existing = await prisma.$queryRaw<any[]>`SELECT id,nfse_id FROM erp_receivable WHERE measurement_id=${measurement.id} LIMIT 1`;
        return NextResponse.json({ success: true, reused: true, receivableId: existing[0]?.id || null, nfseId: existing[0]?.nfse_id || null, mensagem: "Medição já faturada." });
      }
      if (measurement.status !== "aprovada") return NextResponse.json({ error: "Somente medição aprovada pode ser faturada" }, { status: 422 });

      const gross = Number(measurement.value);
      if (body.retentionAmount > gross) return NextResponse.json({ error: "Retenções não podem superar o valor bruto" }, { status: 400 });
      const config = await prisma.companyConfig.findFirst();
      if (!config?.cnpj) return NextResponse.json({ error: "Configure o CNPJ da empresa antes de faturar" }, { status: 422 });
      const issRate = Number(config.aliqISS || 0);
      const issAmount = gross * (issRate / 100);
      const receivableId = randomUUID();

      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.$queryRaw<any[]>`SELECT id,nfse_id FROM erp_receivable WHERE measurement_id=${measurement.id} LIMIT 1`;
        if (existing[0]) return { reused: true, receivableId: existing[0].id, nfseId: existing[0].nfse_id };

        const sequence = await tx.fiscalNfse.count({ where: { issueDate: { gte: new Date(new Date().getFullYear(), 0, 1) } } });
        const nfseNumber = `GER-${new Date().getFullYear()}-${String(sequence + 1).padStart(5, "0")}`;
        const nfse = await tx.fiscalNfse.create({
          data: {
            number: nfseNumber,
            municipality: config.municipio || "Betim",
            providerCnpj: config.cnpj,
            receiverName: measurement.contract.client?.name || null,
            receiverCnpj: measurement.contract.client?.cnpjCpf || null,
            clientId: measurement.contract.clientId || null,
            serviceCode: body.serviceCode || null,
            description: body.description || `Registro gerencial de faturamento da medição ${measurement.period} — ${measurement.contract.object}`,
            serviceValue: gross,
            calculationBase: gross,
            issRate,
            issAmount,
            issRetained: body.issRetained,
            netAmount: body.issRetained ? gross - issAmount : gross,
            issueDate: new Date(),
            competence: measurement.period,
            status: "lancada_gerencial",
          },
        });

        await tx.$executeRaw`
          INSERT INTO erp_receivable(
            id,client_id,contract_id,measurement_id,nfse_id,description,document_number,
            installment_number,installment_total,issue_date,due_date,gross_amount,
            retention_amount,net_amount,status,cost_center,notes,updated_at
          ) VALUES (
            ${receivableId},${measurement.contract.clientId || null},${measurement.contractId},${measurement.id},${nfse.id},
            ${`Medição ${measurement.period} — ${measurement.contract.number}`},${nfse.number},1,1,CURRENT_DATE,${dueDate},
            ${gross},${body.retentionAmount},${gross - body.retentionAmount},'OPEN',${measurement.contract.number},
            ${`Título gerado automaticamente da medição ${measurement.id}. A NFS-e é registro gerencial até confirmação no portal oficial.`},NOW()
          )
        `;

        await tx.measurement.update({ where: { id: measurement.id }, data: { status: "faturada" } });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: "BILL",
            module: "medicao",
            entityType: "Measurement",
            entityId: measurement.id,
            oldValues: auditJson({ status: measurement.status }),
            newValues: auditJson({ status: "faturada", nfseId: nfse.id, nfseNumber: nfse.number, receivableId, gross, retentionAmount: body.retentionAmount, dueDate: body.dueDate }),
          },
        });
        return { reused: false, receivableId, nfseId: nfse.id, nfseNumber: nfse.number };
      }, { isolationLevel: "Serializable" });

      return NextResponse.json({
        success: true,
        ...result,
        mensagem: result.reused ? "Medição já possuía faturamento." : `Faturamento gerencial ${result.nfseNumber} criado e título a receber registrado.`,
        aviso: "A emissão fiscal oficial depende da confirmação no portal competente e da validação contábil.",
      });
    }

    if (!temPapel(user, ["ADMIN", "GESTOR", "COMERCIAL", "OPERACIONAL"])) return NextResponse.json({ error: "Seu perfil não pode criar medições" }, { status: 403 });
    const { data: measurementData, erro: validationError } = validar(MedicaoSchema, raw);
    if (validationError) return validationError;
    const existing = await prisma.measurement.findUnique({ where: { contractId_period: { contractId: measurementData.contractId, period: measurementData.period } }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Já existe medição para este contrato e período", id: existing.id }, { status: 409 });

    const contract = await prisma.contract.findUnique({ where: { id: measurementData.contractId }, select: { status: true } });
    if (!contract) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });
    if (contract.status !== "Ativo") return NextResponse.json({ error: "Somente contrato ativo aceita nova medição" }, { status: 422 });

    const measurement = await prisma.$transaction(async (tx) => {
      const created = await tx.measurement.create({
        data: {
          contractId: measurementData.contractId,
          period: measurementData.period,
          startDate: dataLocal(measurementData.startDate),
          endDate: dataLocal(measurementData.endDate),
          value: measurementData.value ?? 0,
          status: "em_elaboracao",
          notes: measurementData.notes,
          items: {
            create: (measurementData.items || []).map((item) => ({
              description: item.description,
              unit: item.unit || "",
              quantity: item.quantity,
              unitValue: item.unitValue,
              totalValue: item.quantity * item.unitValue,
            })),
          },
        },
        include: { items: true },
      });
      await tx.auditLog.create({
        data: { userId: user.id, action: "CREATE", module: "medicao", entityType: "Measurement", entityId: created.id, newValues: auditJson(created) },
      });
      return created;
    });
    return NextResponse.json({ success: true, data: measurement }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, [string, number]> = {
        INVALID_PERIOD: ["Período de datas inválido", 400],
        CONTRACT_NOT_FOUND: ["Contrato não encontrado", 404],
        CONTRACT_INACTIVE: ["Somente contrato ativo pode ser medido", 422],
      };
      if (messages[error.message]) return NextResponse.json({ error: messages[error.message][0] }, { status: messages[error.message][1] });
    }
    if (["P2002", "P2034"].includes((error as { code?: string })?.code || "")) {
      return NextResponse.json({ error: "O fechamento sofreu concorrência. Atualize a página e tente novamente." }, { status: 409 });
    }
    return erroInterno(error, "api/medicao POST");
  }
}
