"use client";
// Módulo WhatsApp DESATIVADO por decisão operacional (jul/2026).
// Os alertas continuam disponíveis na Central de Alertas; a busca e análise
// de cotações/contratos migrou para o módulo de E-mail (/dashboard/email-analise).
import Link from "next/link";

export default function WhatsAppPage() {
  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>WhatsApp — módulo desativado</h1>
      <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", marginTop: 12, maxWidth: 640 }}>
        <p style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>⚠️ O envio de alertas por WhatsApp foi desativado.</p>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
          Os vencimentos e pendências continuam visíveis na{" "}
          <Link href="/dashboard/alertas" style={{ color: "#4a9410", fontWeight: 700 }}>Central de Alertas</Link>.
          A análise de cotações e contratos recebidos agora é feita pelo módulo de{" "}
          <Link href="/dashboard/email-analise" style={{ color: "#4a9410", fontWeight: 700 }}>E-mail com IA</Link>.
        </p>
      </div>
    </div>
  );
}
