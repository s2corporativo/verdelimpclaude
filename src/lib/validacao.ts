// Validação de entrada das rotas de escrita (zod) — antes NENHUMA rota
// validava o body: qualquer shape entrava no prisma.create (mass assignment).
// Os schemas usam .strip() implícito do zod: campos não declarados são
// DESCARTADOS, nunca gravados.
import { z } from "zod";
import { NextResponse } from "next/server";

export function validar<T extends z.ZodTypeAny>(schema: T, body: unknown):
  | { data: z.infer<T>; erro: null }
  | { data: null; erro: NextResponse } {
  const r = schema.safeParse(body);
  if (!r.success) {
    const detalhes = r.error.issues.map((i) => `${i.path.join(".") || "corpo"}: ${i.message}`).join("; ");
    return { data: null, erro: NextResponse.json({ error: `Dados inválidos — ${detalhes}` }, { status: 400 }) };
  }
  return { data: r.data, erro: null };
}

const texto = (max = 300) => z.string().trim().max(max);
const textoOpc = (max = 300) => texto(max).optional().nullable();

export const ClienteSchema = z.object({
  name: texto(200).min(1, "razão social obrigatória"),
  cnpjCpf: textoOpc(20),
  type: z.enum(["juridica", "fisica"]).optional(),
  category: z.enum(["Público", "Privado"]).optional(),
  email: texto(200).email("e-mail inválido").optional().nullable().or(z.literal("")),
  phone: textoOpc(30),
  contact: textoOpc(120),
  logradouro: textoOpc(250),
  municipio: textoOpc(120),
  uf: textoOpc(2),
  cep: textoOpc(10),
  situacao: textoOpc(40),
  notes: textoOpc(2000),
});

export const ClienteUpdateSchema = ClienteSchema.partial().extend({
  id: z.string().min(1, "id obrigatório"),
});

export const FuncionarioSchema = z.object({
  name: texto(200).min(1, "nome obrigatório"),
  role: textoOpc(120),
  cpf: texto(14).min(11, "CPF incompleto"),
  admissionDate: z.string().min(8, "data de admissão obrigatória"),
  salary: z.coerce.number().positive("salário deve ser maior que zero").max(1_000_000),
  dependentes: z.coerce.number().int().min(0).max(30).optional(),
  bank: textoOpc(80),
  bankAgency: textoOpc(20),
  bankAccount: textoOpc(30),
});

export const DocumentoSchema = z.object({
  nome: texto(300).min(1, "nome obrigatório"),
  descricao: textoOpc(2000),
  categoria: z.enum(["contrato", "fiscal", "rh", "juridico", "licitacao", "tecnico", "outro"]),
  subcategoria: textoOpc(120),
  tags: textoOpc(500),
  clienteId: textoOpc(40),
  contratoId: textoOpc(40),
  funcionarioId: textoOpc(40),
  estrategia: z.enum(["base64", "url", "gdrive"]).optional(),
  urlArquivo: textoOpc(1000),
  base64Data: z.string().max(2_800_000).optional().nullable(),
  mimeType: textoOpc(120),
  tamanhoKb: z.coerce.number().int().min(0).optional().nullable(),
  validade: textoOpc(30),
  confidencial: z.coerce.boolean().optional(),
});

export const MedicaoSchema = z.object({
  contractId: z.string().min(1, "contrato obrigatório"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "período deve ser YYYY-MM"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "data inicial inválida"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "data final inválida"),
  value: z.coerce.number().min(0).optional(),
  notes: textoOpc(2000),
  items: z.array(z.object({
    description: texto(300),
    unit: textoOpc(20),
    quantity: z.coerce.number().min(0),
    unitValue: z.coerce.number().min(0),
  })).optional(),
});
