// Admin → Credenciais & APIs — gerencia o cofre de credenciais.
//   GET    → status de cada credencial do catálogo (mascarado, nunca em claro)
//   POST   → salva { nome, valor } (criptografa e sincroniza todo o sistema)
//   DELETE → remove { nome } do cofre (volta a valer a variável de ambiente)
// Guard duplo: middleware (/api/admin → ADMIN) + exigirAdmin() aqui.
import { NextResponse } from "next/server";
import { z } from "zod";
import { exigirAdmin, registrarAuditoria } from "@/lib/admin";
import { erroInterno } from "@/lib/authz";
import { validar } from "@/lib/validacao";
import { statusCofre, salvarCredencial, removerCredencial, NOMES_PERMITIDOS } from "@/lib/cofre";

export const dynamic = "force-dynamic";

export async function GET() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const credenciais = await statusCofre();
    return NextResponse.json({ credenciais });
  } catch (e) {
    return erroInterno(e, "api/admin/credenciais GET");
  }
}

const SalvarSchema = z.object({
  nome: z.string().trim().min(1).max(60),
  valor: z.string().min(1, "valor obrigatório").max(2000),
});

export async function POST(req: Request) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const { data, erro: erroVal } = validar(SalvarSchema, await req.json().catch(() => ({})));
    if (erroVal) return erroVal;
    if (!NOMES_PERMITIDOS.has(data.nome)) {
      return NextResponse.json({ error: "Credencial fora do catálogo do cofre." }, { status: 400 });
    }
    await salvarCredencial(data.nome, data.valor, user?.email || user?.name || null);
    // Auditoria SEM o valor — registra apenas qual credencial mudou.
    await registrarAuditoria({ userId: user?.id, action: "credencial_salva", module: "cofre", entityType: "SystemCredential", entityId: data.nome });
    return NextResponse.json({ ok: true, nome: data.nome });
  } catch (e) {
    return erroInterno(e, "api/admin/credenciais POST");
  }
}

const RemoverSchema = z.object({ nome: z.string().trim().min(1).max(60) });

export async function DELETE(req: Request) {
  const { user, erro } = await exigirAdmin();
  if (erro) return erro;
  try {
    const { data, erro: erroVal } = validar(RemoverSchema, await req.json().catch(() => ({})));
    if (erroVal) return erroVal;
    if (!NOMES_PERMITIDOS.has(data.nome)) {
      return NextResponse.json({ error: "Credencial fora do catálogo do cofre." }, { status: 400 });
    }
    await removerCredencial(data.nome);
    await registrarAuditoria({ userId: user?.id, action: "credencial_removida", module: "cofre", entityType: "SystemCredential", entityId: data.nome });
    return NextResponse.json({ ok: true, nome: data.nome });
  } catch (e) {
    return erroInterno(e, "api/admin/credenciais DELETE");
  }
}
