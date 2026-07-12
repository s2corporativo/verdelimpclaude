// src/app/api/funcionarios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" }, include: { docs: true } });
    if (data.length === 0) return NextResponse.json({ data: DEMO_FUNC, _demo: true });
    return NextResponse.json({ data, folhaTotal: data.reduce((s, e) => s + Number(e.salary), 0) });
  } catch { return NextResponse.json({ data: DEMO_FUNC, _demo: true }); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.cpf || !body.admissionDate || !body.salary) {
      return NextResponse.json({ error: "Nome, CPF, data de admissão e salário obrigatórios" }, { status: 400 });
    }
    const emp = await prisma.employee.create({
      data: { name: body.name, role: body.role || "", cpf: body.cpf, admissionDate: new Date(body.admissionDate), salary: Number(body.salary), dependentes: Number(body.dependentes || 0), bank: body.bank, bankAgency: body.bankAgency, bankAccount: body.bankAccount },
    });
    const session = await getServerSession(authOptions);
    await registrarAuditoria({ userId: (session?.user as any)?.id || null, action: "CRIAR", module: "rh", entityType: "Employee", entityId: emp.id, newValues: { name: emp.name, role: emp.role, salary: Number(emp.salary) } });
    return NextResponse.json(emp, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") return NextResponse.json({ error: "CPF já cadastrado" }, { status: 409 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEMO_FUNC = [
  { id: "e1", name: "Abrão Felipe", role: "Operador de Roçadeira", salary: 2500, status: "ativo" },
  { id: "e2", name: "Ana Luiza Ribeiro", role: "Supervisora de Obras", salary: 3500, status: "ativo" },
  { id: "e3", name: "Gilberto Ferreira", role: "Operador de Roçadeira", salary: 2400, status: "ativo" },
  { id: "e4", name: "José Antonio Mariano", role: "Operador de Roçadeira", salary: 2500, status: "ativo" },
  { id: "e5", name: "Leomar Souza", role: "Op. Retroescavadeira", salary: 3200, status: "ativo" },
  { id: "e6", name: "Uanderson Nunes", role: "Auxiliar de Jardinagem", salary: 2200, status: "ativo" },
  { id: "e7", name: "Leonardo Souza", role: "Motorista", salary: 2800, status: "ativo" },
  { id: "e8", name: "Giovanna Cunha", role: "Assistente Administrativa", salary: 2600, status: "ativo" },
];
