import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";
import { exigirPapel, erroInterno } from "@/lib/authz";
import { validar, FuncionarioSchema } from "@/lib/validacao";
import { parseDataOperacional } from "@/lib/data-operacional";

export const dynamic = "force-dynamic";

const AtualizacaoSchema = z.object({
  id: z.string().trim().min(1, "id obrigatório"),
  name: z.string().trim().min(2).max(200).optional(),
  role: z.string().trim().max(120).optional().nullable(),
  cpf: z.string().trim().min(11).max(14).optional().nullable(),
  admissionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de admissão inválida").optional(),
  salary: z.coerce.number().positive().max(1_000_000).optional(),
  dependentes: z.coerce.number().int().min(0).max(30).optional(),
  insalubridadeGrau: z.coerce.number().int().refine((value) => [0, 10, 20, 40].includes(value), "Grau de insalubridade inválido").optional(),
  periculosidade: z.coerce.boolean().optional(),
  bank: z.string().trim().max(80).optional().nullable(),
  bankAgency: z.string().trim().max(20).optional().nullable(),
  bankAccount: z.string().trim().max(30).optional().nullable(),
  status: z.enum(["ativo", "afastado", "ferias", "desligado"]).optional(),
  active: z.coerce.boolean().optional(),
});

const DesligamentoSchema = z.object({
  id: z.string().trim().min(1, "id obrigatório"),
  motivo: z.string().trim().min(3).max(1000),
});

function cpfNormalizado(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || null;
}

export async function GET(req: NextRequest) {
  const { erro } = await exigirPapel("ADMIN", "RH");
  if (erro) return erro;

  try {
    const incluirInativos = req.nextUrl.searchParams.get("inativos") === "true";
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const busca = req.nextUrl.searchParams.get("busca")?.trim() || undefined;
    const hoje = new Date();
    const em30 = new Date(Date.now() + 30 * 86_400_000);

    const data = await prisma.employee.findMany({
      where: {
        ...(incluirInativos ? {} : { active: true }),
        ...(status ? { status } : {}),
        ...(busca ? { OR: [{ name: { contains: busca, mode: "insensitive" } }, { role: { contains: busca, mode: "insensitive" } }, { cpf: { contains: cpfNormalizado(busca) || busca } }] } : {}),
      },
      orderBy: { name: "asc" },
      include: {
        docs: { orderBy: { expiresAt: "asc" } },
        trainings: { orderBy: { expiresAt: "asc" } },
        asoExams: { orderBy: { expiresAt: "asc" } },
      },
    });

    const documentosVencidos = data.reduce((soma, employee) => soma + employee.docs.filter((doc) => doc.expiresAt < hoje).length, 0);
    const documentosVencendo = data.reduce((soma, employee) => soma + employee.docs.filter((doc) => doc.expiresAt >= hoje && doc.expiresAt <= em30).length, 0);
    const treinamentosVencidos = data.reduce((soma, employee) => soma + employee.trainings.filter((training) => training.expiresAt < hoje).length, 0);
    const asoVencidos = data.reduce((soma, employee) => soma + employee.asoExams.filter((aso) => Boolean(aso.expiresAt && aso.expiresAt < hoje)).length, 0);
    const folhaTotal = data.filter((employee) => employee.active).reduce((soma, employee) => soma + Number(employee.salary), 0);

    return NextResponse.json({
      data,
      folhaTotal: Number(folhaTotal.toFixed(2)),
      stats: {
        total: data.length,
        ativos: data.filter((employee) => employee.active).length,
        afastados: data.filter((employee) => employee.status === "afastado").length,
        ferias: data.filter((employee) => employee.status === "ferias").length,
        documentosVencidos,
        documentosVencendo,
        treinamentosVencidos,
        asoVencidos,
      },
      empty: data.length === 0,
    });
  } catch (error) {
    return erroInterno(error, "api/funcionarios GET");
  }
}

export async function POST(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro || !user) return erro;

  try {
    const bruto = await req.json();
    const { data: body, erro: erroVal } = validar(FuncionarioSchema, bruto);
    if (erroVal) return erroVal;
    const admissionDate = parseDataOperacional(body.admissionDate);
    if (!admissionDate) return NextResponse.json({ error: "Data de admissão inválida" }, { status: 400 });
    const cpf = cpfNormalizado(body.cpf);
    if (!cpf || ![11, 14].includes(cpf.length)) return NextResponse.json({ error: "CPF/CNPJ do funcionário inválido" }, { status: 400 });

    const employee = await prisma.employee.create({
      data: {
        name: body.name,
        role: body.role || "",
        cpf,
        admissionDate,
        salary: body.salary,
        dependentes: body.dependentes ?? 0,
        bank: body.bank || null,
        bankAgency: body.bankAgency || null,
        bankAccount: body.bankAccount || null,
        status: "ativo",
        active: true,
      },
    });
    await registrarAuditoria({
      userId: user.id,
      action: "CRIAR",
      module: "rh",
      entityType: "Employee",
      entityId: employee.id,
      newValues: { name: employee.name, role: employee.role, admissionDate: employee.admissionDate, salary: Number(employee.salary), cpfFinal: cpf.slice(-4) },
    });
    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 });
    return erroInterno(error, "api/funcionarios POST");
  }
}

export async function PUT(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro || !user) return erro;

  try {
    const parsed = AtualizacaoSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    const body = parsed.data;
    const current = await prisma.employee.findUnique({ where: { id: body.id } });
    if (!current) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role || "";
    if (body.cpf !== undefined) {
      const cpf = cpfNormalizado(body.cpf);
      if (cpf && ![11, 14].includes(cpf.length)) return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
      data.cpf = cpf;
    }
    if (body.admissionDate !== undefined) {
      const admissionDate = parseDataOperacional(body.admissionDate);
      if (!admissionDate) return NextResponse.json({ error: "Data de admissão inválida" }, { status: 400 });
      data.admissionDate = admissionDate;
    }
    for (const field of ["salary", "dependentes", "insalubridadeGrau", "periculosidade", "status", "active"] as const) {
      if (body[field] !== undefined) data[field] = body[field];
    }
    for (const field of ["bank", "bankAgency", "bankAccount"] as const) {
      if (body[field] !== undefined) data[field] = body[field] || null;
    }
    if (body.status === "desligado") data.active = false;
    if (body.active === true && body.status === undefined && current.status === "desligado") data.status = "ativo";

    const employee = await prisma.employee.update({ where: { id: body.id }, data });
    await registrarAuditoria({
      userId: user.id,
      action: "EDITAR",
      module: "rh",
      entityType: "Employee",
      entityId: employee.id,
      oldValues: { name: current.name, role: current.role, salary: Number(current.salary), status: current.status, active: current.active },
      newValues: { name: employee.name, role: employee.role, salary: Number(employee.salary), status: employee.status, active: employee.active },
    });
    return NextResponse.json(employee);
  } catch (error: any) {
    if (error?.code === "P2002") return NextResponse.json({ error: "CPF já cadastrado em outro funcionário" }, { status: 409 });
    return erroInterno(error, "api/funcionarios PUT");
  }
}

export async function DELETE(req: NextRequest) {
  const { user, erro } = await exigirPapel("ADMIN", "RH");
  if (erro || !user) return erro;

  try {
    const id = req.nextUrl.searchParams.get("id");
    const motivo = req.nextUrl.searchParams.get("motivo") || "Desligamento registrado no sistema";
    const parsed = DesligamentoSchema.safeParse({ id, motivo });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Desligamento inválido" }, { status: 400 });
    const current = await prisma.employee.findUnique({
      where: { id: parsed.data.id },
      include: { mobilizations: { where: { status: "ativa" }, select: { id: true, contractId: true } }, resourceReservations: { where: { status: { in: ["provisoria", "confirmada"] }, endDate: { gte: new Date() } }, select: { id: true } } },
    });
    if (!current) return NextResponse.json({ error: "Funcionário não encontrado" }, { status: 404 });
    if (current.mobilizations.length || current.resourceReservations.length) {
      return NextResponse.json({ error: "Funcionário possui mobilização ou reserva ativa. Encerre os vínculos antes do desligamento." }, { status: 409 });
    }
    const employee = await prisma.employee.update({ where: { id: current.id }, data: { active: false, status: "desligado" } });
    await registrarAuditoria({
      userId: user.id,
      action: "DESLIGAR",
      module: "rh",
      entityType: "Employee",
      entityId: employee.id,
      oldValues: { status: current.status, active: current.active },
      newValues: { status: employee.status, active: employee.active, motivo: parsed.data.motivo },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return erroInterno(error, "api/funcionarios DELETE");
  }
}
