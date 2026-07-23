import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";
const nullable = z.string().trim().max(1000).optional().nullable();
const SaveSchema = z.object({
  action: z.literal("save").default("save"), id: z.string().optional(), number: z.string().trim().max(80).optional(),
  contractId: z.string().optional().nullable(), clientId: z.string().optional().nullable(),
  title: z.string().trim().min(2).max(250), serviceType: z.string().trim().min(2).max(180), description: nullable,
  location: z.string().trim().min(2).max(500), city: nullable, state: z.string().trim().max(2).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(), longitude: z.coerce.number().optional().nullable(),
  scheduledStart: z.string().optional().nullable(), scheduledEnd: z.string().optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  status: z.enum(["OPEN", "SCHEDULED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]).default("OPEN"),
  supervisor: nullable, notes: nullable,
  employeeIds: z.array(z.string()).default([]), equipmentIds: z.array(z.string()).default([]),
  requiredEpis: z.array(z.any()).optional(), requiredDocuments: z.array(z.any()).optional(),
  checklist: z.array(z.object({ category: z.string(), item: z.string(), required: z.boolean().default(true), sortOrder: z.coerce.number().int().default(0) })).optional(),
});
const ChecklistSchema = z.object({ action: z.literal("checklist"), itemId: z.string(), completed: z.boolean(), notes: nullable, evidencePath: nullable });
const PhotoSchema = z.object({ action: z.literal("photo"), workOrderId: z.string(), photoType: z.enum(["BEFORE", "AFTER", "OCCURRENCE", "TEAM", "CHECKLIST"]), filePath: z.string().min(1).max(1000), caption: nullable, latitude: z.coerce.number().optional().nullable(), longitude: z.coerce.number().optional().nullable() });
const SignatureSchema = z.object({ action: z.literal("signature"), workOrderId: z.string(), signerType: z.enum(["EMPLOYEE", "SUPERVISOR", "CLIENT"]), signerName: z.string().trim().min(2).max(180), signerDocument: nullable, signaturePath: z.string().min(1).max(1000), latitude: z.coerce.number().optional().nullable(), longitude: z.coerce.number().optional().nullable(), consentText: z.string().min(10).max(2000) });
const StatusSchema = z.object({ action: z.literal("status"), workOrderId: z.string(), status: z.enum(["OPEN", "SCHEDULED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]) });
const date = (v?: string | null) => v ? new Date(v) : null;

async function details(id: string) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT wo.*, c.number AS contract_number, c.object AS contract_object, cl.name AS client_name
    FROM erp_work_order wo LEFT JOIN "Contract" c ON c.id=wo.contract_id LEFT JOIN "Client" cl ON cl.id=wo.client_id
    WHERE wo.id=${id} LIMIT 1`;
  if (!rows[0]) return null;
  const [employees, equipment, checklist, photos, signatures] = await Promise.all([
    prisma.$queryRaw<any[]>`SELECT woe.*, e.name, e.role FROM erp_work_order_employee woe JOIN "Employee" e ON e.id=woe.employee_id WHERE woe.work_order_id=${id} ORDER BY e.name`,
    prisma.$queryRaw<any[]>`SELECT wq.*, e.codigo, e.descricao, e.tipo FROM erp_work_order_equipment wq JOIN "Equipment" e ON e.id=wq.equipment_id WHERE wq.work_order_id=${id} ORDER BY e.descricao`,
    prisma.$queryRaw<any[]>`SELECT * FROM erp_work_order_checklist WHERE work_order_id=${id} ORDER BY category, sort_order, item`,
    prisma.$queryRaw<any[]>`SELECT * FROM erp_work_order_photo WHERE work_order_id=${id} ORDER BY captured_at`,
    prisma.$queryRaw<any[]>`SELECT * FROM erp_work_order_signature WHERE work_order_id=${id} ORDER BY signed_at`,
  ]);
  return { ...rows[0], employees, equipment, checklist, photos, signatures };
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel();
  if (erro) return erro;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const item = await details(id);
      return item ? NextResponse.json({ item }) : NextResponse.json({ error: "OS não encontrada" }, { status: 404 });
    }
    const status = req.nextUrl.searchParams.get("status");
    const rows = status
      ? await prisma.$queryRaw<any[]>`SELECT wo.*, c.number AS contract_number, cl.name AS client_name,
          (SELECT COUNT(*)::int FROM erp_work_order_employee x WHERE x.work_order_id=wo.id) AS employee_count,
          (SELECT COUNT(*)::int FROM erp_work_order_checklist x WHERE x.work_order_id=wo.id AND x.required=TRUE AND x.completed=FALSE) AS pending_checklist
        FROM erp_work_order wo LEFT JOIN "Contract" c ON c.id=wo.contract_id LEFT JOIN "Client" cl ON cl.id=wo.client_id
        WHERE wo.status=${status} ORDER BY COALESCE(wo.scheduled_start, wo.created_at) DESC LIMIT 1000`
      : await prisma.$queryRaw<any[]>`SELECT wo.*, c.number AS contract_number, cl.name AS client_name,
          (SELECT COUNT(*)::int FROM erp_work_order_employee x WHERE x.work_order_id=wo.id) AS employee_count,
          (SELECT COUNT(*)::int FROM erp_work_order_checklist x WHERE x.work_order_id=wo.id AND x.required=TRUE AND x.completed=FALSE) AS pending_checklist
        FROM erp_work_order wo LEFT JOIN "Contract" c ON c.id=wo.contract_id LEFT JOIN "Client" cl ON cl.id=wo.client_id
        ORDER BY COALESCE(wo.scheduled_start, wo.created_at) DESC LIMIT 1000`;
    return NextResponse.json({ data: rows });
  } catch (e) { return erroInterno(e, "api/ordens-servico GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "OPERACIONAL", "CONTRATOS", "RH");
  if (erro) return erro;
  try {
    const raw = await req.json();
    if (raw.action === "checklist") {
      const p = ChecklistSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Checklist inválido" }, { status: 400 });
      await prisma.$executeRaw`UPDATE erp_work_order_checklist SET completed=${p.data.completed}, completed_by=${user?.email || user?.name || user?.id}, completed_at=${p.data.completed ? new Date() : null}, evidence_path=${p.data.evidencePath || null}, notes=${p.data.notes || null} WHERE id=${p.data.itemId}`;
      return NextResponse.json({ success: true });
    }
    if (raw.action === "photo") {
      const p = PhotoSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Foto inválida", details: p.error.flatten() }, { status: 400 });
      const id = randomUUID(); const b = p.data;
      await prisma.$executeRaw`INSERT INTO erp_work_order_photo (id, work_order_id, photo_type, file_path, caption, latitude, longitude, uploaded_by)
        VALUES (${id}, ${b.workOrderId}, ${b.photoType}, ${b.filePath}, ${b.caption || null}, ${b.latitude ?? null}, ${b.longitude ?? null}, ${user?.email || user?.name || user?.id})`;
      return NextResponse.json({ success: true, id });
    }
    if (raw.action === "signature") {
      const p = SignatureSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Assinatura inválida", details: p.error.flatten() }, { status: 400 });
      const id = randomUUID(); const b = p.data;
      await prisma.$executeRaw`INSERT INTO erp_work_order_signature (id, work_order_id, signer_type, signer_name, signer_document, signature_path, latitude, longitude, consent_text)
        VALUES (${id}, ${b.workOrderId}, ${b.signerType}, ${b.signerName}, ${b.signerDocument || null}, ${b.signaturePath}, ${b.latitude ?? null}, ${b.longitude ?? null}, ${b.consentText})`;
      return NextResponse.json({ success: true, id });
    }
    if (raw.action === "status") {
      const p = StatusSchema.safeParse(raw);
      if (!p.success) return NextResponse.json({ error: "Status inválido" }, { status: 400 });
      if (p.data.status === "COMPLETED") {
        const checks = await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int AS total FROM erp_work_order_checklist WHERE work_order_id=${p.data.workOrderId} AND required=TRUE AND completed=FALSE`;
        const photos = await prisma.$queryRaw<any[]>`SELECT photo_type, COUNT(*)::int AS total FROM erp_work_order_photo WHERE work_order_id=${p.data.workOrderId} GROUP BY photo_type`;
        const signatures = await prisma.$queryRaw<any[]>`SELECT signer_type, COUNT(*)::int AS total FROM erp_work_order_signature WHERE work_order_id=${p.data.workOrderId} GROUP BY signer_type`;
        const photoTypes = new Set(photos.map((x) => x.photo_type));
        const signerTypes = new Set(signatures.map((x) => x.signer_type));
        const blockers: string[] = [];
        if (Number(checks[0]?.total || 0) > 0) blockers.push("checklist obrigatório incompleto");
        if (!photoTypes.has("BEFORE")) blockers.push("foto antes ausente");
        if (!photoTypes.has("AFTER")) blockers.push("foto depois ausente");
        if (!signerTypes.has("SUPERVISOR")) blockers.push("assinatura do responsável ausente");
        if (!signerTypes.has("CLIENT")) blockers.push("assinatura/aceite do cliente ausente");
        if (blockers.length) return NextResponse.json({ error: "OS não pode ser encerrada", blockers }, { status: 409 });
      }
      await prisma.$executeRaw`UPDATE erp_work_order SET status=${p.data.status}, actual_start=CASE WHEN ${p.data.status}='IN_PROGRESS' AND actual_start IS NULL THEN NOW() ELSE actual_start END, actual_end=CASE WHEN ${p.data.status}='COMPLETED' THEN NOW() ELSE actual_end END, updated_at=NOW() WHERE id=${p.data.workOrderId}`;
      return NextResponse.json({ success: true, item: await details(p.data.workOrderId) });
    }

    const parsed = SaveSchema.safeParse({ ...raw, action: "save" });
    if (!parsed.success) return NextResponse.json({ error: "OS inválida", details: parsed.error.flatten() }, { status: 400 });
    const b = parsed.data; const id = b.id || randomUUID();
    const number = b.number || `OS-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const employees = b.employeeIds.length ? await prisma.employee.findMany({ where: { id: { in: b.employeeIds }, active: true }, select: { id: true, role: true } }) : [];
    const roles = [...new Set(employees.map((e) => e.role))];
    const matrices = roles.length ? await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM erp_role_sst_matrix WHERE active=TRUE AND role_name = ANY($1::text[])`, roles) : [];
    const mergeByName = (items: any[][]) => [...new Map(items.flat().map((x: any) => [String(x.name || x.item || JSON.stringify(x)), x])).values()];
    const epis = b.requiredEpis || mergeByName(matrices.map((m) => Array.isArray(m.epis) ? m.epis : []));
    const docs = b.requiredDocuments || mergeByName(matrices.flatMap((m) => [Array.isArray(m.exams) ? m.exams : [], Array.isArray(m.trainings) ? m.trainings : [], Array.isArray(m.mandatory_documents) ? m.mandatory_documents : []]));
    const defaultChecklist = [
      { category: "SEGURANCA", item: "DDS realizado e equipe orientada", required: true, sortOrder: 10 },
      { category: "SEGURANCA", item: "EPIs conferidos antes do início", required: true, sortOrder: 20 },
      { category: "EQUIPAMENTOS", item: "Equipamentos inspecionados e liberados", required: true, sortOrder: 30 },
      { category: "OPERACAO", item: "Área sinalizada e isolada", required: true, sortOrder: 40 },
      { category: "ENCERRAMENTO", item: "Resíduos recolhidos e área liberada", required: true, sortOrder: 50 },
    ];

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO erp_work_order (id, number, contract_id, client_id, title, service_type, description, location, city, state,
          latitude, longitude, scheduled_start, scheduled_end, priority, status, supervisor, required_epis, required_documents, notes, created_by, updated_at)
        VALUES (${id}, ${number}, ${b.contractId || null}, ${b.clientId || null}, ${b.title}, ${b.serviceType}, ${b.description || null},
          ${b.location}, ${b.city || null}, ${b.state || null}, ${b.latitude ?? null}, ${b.longitude ?? null}, ${date(b.scheduledStart)},
          ${date(b.scheduledEnd)}, ${b.priority}, ${b.status}, ${b.supervisor || null}, ${JSON.stringify(epis)}::jsonb,
          ${JSON.stringify(docs)}::jsonb, ${b.notes || null}, ${user?.email || user?.name || user?.id}, NOW())
        ON CONFLICT (id) DO UPDATE SET contract_id=EXCLUDED.contract_id, client_id=EXCLUDED.client_id, title=EXCLUDED.title,
          service_type=EXCLUDED.service_type, description=EXCLUDED.description, location=EXCLUDED.location, city=EXCLUDED.city,
          state=EXCLUDED.state, latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, scheduled_start=EXCLUDED.scheduled_start,
          scheduled_end=EXCLUDED.scheduled_end, priority=EXCLUDED.priority, status=EXCLUDED.status, supervisor=EXCLUDED.supervisor,
          required_epis=EXCLUDED.required_epis, required_documents=EXCLUDED.required_documents, notes=EXCLUDED.notes, updated_at=NOW()`;
      await tx.$executeRaw`DELETE FROM erp_work_order_employee WHERE work_order_id=${id}`;
      for (const employee of employees) await tx.$executeRaw`INSERT INTO erp_work_order_employee (work_order_id, employee_id, role) VALUES (${id}, ${employee.id}, ${employee.role})`;
      await tx.$executeRaw`DELETE FROM erp_work_order_equipment WHERE work_order_id=${id}`;
      for (const equipmentId of b.equipmentIds) await tx.$executeRaw`INSERT INTO erp_work_order_equipment (work_order_id, equipment_id) VALUES (${id}, ${equipmentId})`;
      if (!b.id || b.checklist) {
        await tx.$executeRaw`DELETE FROM erp_work_order_checklist WHERE work_order_id=${id}`;
        for (const item of b.checklist || defaultChecklist) await tx.$executeRaw`INSERT INTO erp_work_order_checklist (id, work_order_id, category, item, required, sort_order) VALUES (${randomUUID()}, ${id}, ${item.category}, ${item.item}, ${item.required}, ${item.sortOrder})`;
      }
    });
    return NextResponse.json({ success: true, id, item: await details(id) }, { status: b.id ? 200 : 201 });
  } catch (e: any) {
    if (String(e?.message || "").includes("erp_work_order_number")) return NextResponse.json({ error: "Número de OS já utilizado" }, { status: 409 });
    return erroInterno(e, "api/ordens-servico POST");
  }
}
