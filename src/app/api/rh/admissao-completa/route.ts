import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { erroInterno, exigirPapel } from "@/lib/authz";
import { registrarAuditoria } from "@/lib/admin";

export const dynamic = "force-dynamic";

const nullableText = z.string().trim().max(300).optional().nullable();
const Schema = z.object({
  employeeId: z.string().optional(),
  name: z.string().trim().min(3).max(180),
  role: z.string().trim().min(2).max(120),
  cpf: z.string().trim().max(20).optional().nullable(),
  admissionDate: z.string().min(8),
  salary: z.coerce.number().nonnegative(),
  dependentes: z.coerce.number().int().min(0).default(0),
  insalubridadeGrau: z.coerce.number().int().refine((v) => [0, 10, 20, 40].includes(v)),
  periculosidade: z.boolean().default(false),
  bank: nullableText, bankAgency: nullableText, bankAccount: nullableText,
  dateOfBirth: z.string().optional().nullable(), rg: nullableText, rgIssuer: nullableText,
  ctps: nullableText, pisPasep: nullableText, voterId: nullableText,
  cnh: nullableText, cnhCategory: nullableText, cnhExpiresAt: z.string().optional().nullable(),
  maritalStatus: nullableText, educationLevel: nullableText, phone: nullableText, email: z.string().email().optional().nullable(),
  emergencyContactName: nullableText, emergencyContactPhone: nullableText,
  street: nullableText, number: nullableText, complement: nullableText, neighborhood: nullableText,
  city: nullableText, state: z.string().trim().max(2).optional().nullable(), postalCode: nullableText,
  contractType: z.string().trim().max(40).default("CLT"), weeklyHours: z.coerce.number().positive().max(80).default(44),
  workSchedule: nullableText, unionName: nullableText, collectiveAgreement: nullableText, costCenter: nullableText,
  terminationDate: z.string().optional().nullable(), terminationReason: nullableText, terminationNotes: nullableText,
});

const dt = (value?: string | null) => value ? new Date(`${value}T12:00:00`) : null;

export async function GET() {
  const { erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const employees = await prisma.employee.findMany({ orderBy: { name: "asc" }, include: { docs: true } });
    const profiles = await prisma.$queryRaw<any[]>`
      SELECT * FROM erp_employee_profile ORDER BY updated_at DESC
    `;
    const byEmployee = new Map(profiles.map((p) => [p.employee_id, p]));
    return NextResponse.json({ data: employees.map((employee) => ({ ...employee, profile: byEmployee.get(employee.id) || null })) });
  } catch (e) { return erroInterno(e, "api/rh/admissao-completa GET"); }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;
  try {
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    const b = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const employee = b.employeeId
        ? await tx.employee.update({
            where: { id: b.employeeId },
            data: {
              name: b.name, role: b.role, cpf: b.cpf || null, admissionDate: dt(b.admissionDate)!, salary: b.salary,
              dependentes: b.dependentes, insalubridadeGrau: b.insalubridadeGrau, periculosidade: b.periculosidade,
              bank: b.bank || null, bankAgency: b.bankAgency || null, bankAccount: b.bankAccount || null,
              status: b.terminationDate ? "desligado" : "ativo", active: !b.terminationDate,
            },
          })
        : await tx.employee.create({
            data: {
              name: b.name, role: b.role, cpf: b.cpf || null, admissionDate: dt(b.admissionDate)!, salary: b.salary,
              dependentes: b.dependentes, insalubridadeGrau: b.insalubridadeGrau, periculosidade: b.periculosidade,
              bank: b.bank || null, bankAgency: b.bankAgency || null, bankAccount: b.bankAccount || null,
              status: b.terminationDate ? "desligado" : "ativo", active: !b.terminationDate,
            },
          });

      await tx.$executeRaw`
        INSERT INTO erp_employee_profile (
          employee_id, date_of_birth, rg, rg_issuer, ctps, pis_pasep, voter_id, cnh, cnh_category, cnh_expires_at,
          marital_status, education_level, phone, email, emergency_contact_name, emergency_contact_phone,
          street, number, complement, neighborhood, city, state, postal_code, contract_type, weekly_hours,
          work_schedule, union_name, collective_agreement, cost_center, termination_date, termination_reason,
          termination_notes, updated_at
        ) VALUES (
          ${employee.id}, ${dt(b.dateOfBirth)}, ${b.rg || null}, ${b.rgIssuer || null}, ${b.ctps || null}, ${b.pisPasep || null},
          ${b.voterId || null}, ${b.cnh || null}, ${b.cnhCategory || null}, ${dt(b.cnhExpiresAt)}, ${b.maritalStatus || null},
          ${b.educationLevel || null}, ${b.phone || null}, ${b.email || null}, ${b.emergencyContactName || null},
          ${b.emergencyContactPhone || null}, ${b.street || null}, ${b.number || null}, ${b.complement || null},
          ${b.neighborhood || null}, ${b.city || null}, ${b.state || null}, ${b.postalCode || null}, ${b.contractType},
          ${b.weeklyHours}, ${b.workSchedule || null}, ${b.unionName || null}, ${b.collectiveAgreement || null},
          ${b.costCenter || null}, ${dt(b.terminationDate)}, ${b.terminationReason || null}, ${b.terminationNotes || null}, NOW()
        )
        ON CONFLICT (employee_id) DO UPDATE SET
          date_of_birth=EXCLUDED.date_of_birth, rg=EXCLUDED.rg, rg_issuer=EXCLUDED.rg_issuer, ctps=EXCLUDED.ctps,
          pis_pasep=EXCLUDED.pis_pasep, voter_id=EXCLUDED.voter_id, cnh=EXCLUDED.cnh, cnh_category=EXCLUDED.cnh_category,
          cnh_expires_at=EXCLUDED.cnh_expires_at, marital_status=EXCLUDED.marital_status, education_level=EXCLUDED.education_level,
          phone=EXCLUDED.phone, email=EXCLUDED.email, emergency_contact_name=EXCLUDED.emergency_contact_name,
          emergency_contact_phone=EXCLUDED.emergency_contact_phone, street=EXCLUDED.street, number=EXCLUDED.number,
          complement=EXCLUDED.complement, neighborhood=EXCLUDED.neighborhood, city=EXCLUDED.city, state=EXCLUDED.state,
          postal_code=EXCLUDED.postal_code, contract_type=EXCLUDED.contract_type, weekly_hours=EXCLUDED.weekly_hours,
          work_schedule=EXCLUDED.work_schedule, union_name=EXCLUDED.union_name, collective_agreement=EXCLUDED.collective_agreement,
          cost_center=EXCLUDED.cost_center, termination_date=EXCLUDED.termination_date,
          termination_reason=EXCLUDED.termination_reason, termination_notes=EXCLUDED.termination_notes, updated_at=NOW()
      `;
      return employee;
    });

    await registrarAuditoria({
      userId: user!.id, action: b.employeeId ? "ATUALIZAR" : "CRIAR", module: "rh",
      entityType: "Employee", entityId: result.id,
      newValues: { name: result.name, role: result.role, status: result.status, operacao: b.terminationDate ? "desligamento" : "admissao" },
    });
    return NextResponse.json({ success: true, employeeId: result.id, correlationId: randomUUID() }, { status: b.employeeId ? 200 : 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 });
    return erroInterno(e, "api/rh/admissao-completa POST");
  }
}
