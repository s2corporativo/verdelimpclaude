// Envio de e-mail via SMTP (nodemailer) — configurado por variáveis de ambiente
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
import nodemailer from "nodemailer";

export function emailConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function enviarEmail(params: {
  para: string;
  assunto: string;
  html: string;
  texto?: string;
}): Promise<{ ok: boolean; erro?: string }> {
  if (!emailConfigurado()) {
    return { ok: false, erro: "SMTP não configurado — defina SMTP_HOST, SMTP_USER e SMTP_PASS no ambiente" };
  }
  try {
    const porta = Number(process.env.SMTP_PORT || 587);
    const transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: porta,
      secure: porta === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporte.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
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
