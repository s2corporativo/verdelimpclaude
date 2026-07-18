// Envio de e-mail via SMTP (nodemailer). As credenciais vêm do COFRE
// (Admin → Credenciais & APIs) com fallback para as variáveis de ambiente
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM.
import nodemailer from "nodemailer";
import { getCredenciais } from "@/lib/cofre";

export async function emailConfigurado(): Promise<boolean> {
  const c = await getCredenciais("SMTP_HOST", "SMTP_USER", "SMTP_PASS");
  return Boolean(c.SMTP_HOST && c.SMTP_USER && c.SMTP_PASS);
}

export async function enviarEmail(params: {
  para: string;
  assunto: string;
  html: string;
  texto?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  const c = await getCredenciais("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "EMAIL_FROM");
  if (!c.SMTP_HOST || !c.SMTP_USER || !c.SMTP_PASS) {
    return { ok: false, erro: "SMTP não configurado — cadastre em Admin → Credenciais & APIs (ou defina SMTP_HOST/USER/PASS no ambiente)" };
  }
  try {
    const porta = Number(c.SMTP_PORT || 587);
    const transporte = nodemailer.createTransport({
      host: c.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: { user: c.SMTP_USER, pass: c.SMTP_PASS },
    });
    await transporte.sendMail({
      from: c.EMAIL_FROM || c.SMTP_USER,
      to: params.para,
      subject: params.assunto,
      html: params.html,
      text: params.texto,
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e.message };
  }
}
