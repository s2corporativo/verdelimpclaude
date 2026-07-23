import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";

export const dynamic = "force-dynamic";

const ItemSchema = z.object({
  name: z.string().trim().min(1).max(180),
  code: z.string().trim().max(80).optional(),
  validityDays: z.coerce.number().int().min(0).optional(),
  replacementDays: z.coerce.number().int().min(0).optional(),
  mandatory: z.boolean().default(true),
  notes: z.string().trim().max(500).optional(),
}).passthrough();

const Schema = z.object({
  id: z.string().optional(),
  roleName: z.string().trim().min(2).max(120),
  version: z.coerce.number().int().min(1).default(1),
  pgrReference: z.string().trim().max(300).optional().nullable(),
  pcmsoReference: z.string().trim().max(300).optional().nullable(),
  activities: z.array(ItemSchema).default([]),
  risks: z.array(ItemSchema).default([]),
  exams: z.array(ItemSchema).default([]),
  trainings: z.array(ItemSchema).default([]),
  epis: z.array(ItemSchema).default([]),
  mandatoryDocuments: z.array(ItemSchema).default([]),
  validFrom: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  active: z.boolean().default(true),
  approvedBy: z.string().trim().max(180).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const date = (v?: string | null) => v ? new Date(`${v}T12:00:00`) : null;

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH", "SST");
  if (erro) return erro;
  try {
    const role = req.nextUrl.searchParams.get("role");
    const rows = role
      ? await prisma.$queryRaw<any[]>`SELECT * FROM erp_role_sst_matrix WHERE role_name = ${role} ORDER BY version DESC`
      : await prisma.$queryRaw<any[]>`SELECT * FROM erp_role_sst_matrix ORDER BY role_name, version DESC`;
    return NextResponse.json({ data: rows });
  } catch (e) { return erroInterno(e, "api/rh/matriz-sst GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH", "SST");
  if (erro) return erro;
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    const b = parsed.data;
    const id = b.id || randomUUID();
    if (b.active) {
      await prisma.$executeRaw`UPDATE erp_role_sst_matrix SET active = FALSE, updated_at = NOW() WHERE role_name = ${b.roleName} AND id <> ${id}`;
    }
    await prisma.$executeRaw`
      INSERT INTO erp_role_sst_matrix (
        id, role_name, version, pgr_reference, pcmso_reference, activities, risks, exams, trainings, epis,
        mandatory_documents, valid_from, valid_until, active, approved_by, approved_at, notes, updated_at
      ) VALUES (
        ${id}, ${b.roleName}, ${b.version}, ${b.pgrReference || null}, ${b.pcmsoReference || null},
        ${JSON.stringify(b.activities)}::jsonb, ${JSON.stringify(b.risks)}::jsonb, ${JSON.stringify(b.exams)}::jsonb,
        ${JSON.stringify(b.trainings)}::jsonb, ${JSON.stringify(b.epis)}::jsonb, ${JSON.stringify(b.mandatoryDocuments)}::jsonb,
        ${date(b.validFrom) || new Date()}, ${date(b.validUntil)}, ${b.active}, ${b.approvedBy || user?.name || user?.email || null},
        ${b.active ? new Date() : null}, ${b.notes || null}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        role_name=EXCLUDED.role_name, version=EXCLUDED.version, pgr_reference=EXCLUDED.pgr_reference,
        pcmso_reference=EXCLUDED.pcmso_reference, activities=EXCLUDED.activities, risks=EXCLUDED.risks,
        exams=EXCLUDED.exams, trainings=EXCLUDED.trainings, epis=EXCLUDED.epis,
        mandatory_documents=EXCLUDED.mandatory_documents, valid_from=EXCLUDED.valid_from,
        valid_until=EXCLUDED.valid_until, active=EXCLUDED.active, approved_by=EXCLUDED.approved_by,
        approved_at=EXCLUDED.approved_at, notes=EXCLUDED.notes, updated_at=NOW()
    `;
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    if (String(e?.message || "").includes("role_name") || String(e?.message || "").includes("unique")) {
      return NextResponse.json({ error: "Já existe esta versão para a função informada" }, { status: 409 });
    }
    return erroInterno(e, "api/rh/matriz-sst POST");
  }
}
