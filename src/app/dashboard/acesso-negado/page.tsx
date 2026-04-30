export default function AcessoNegadoPage() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <h1 style={{ color: "#0f5233", fontSize: 22, fontWeight: 700 }}>Acesso Negado</h1>
      <p style={{ color: "#6b7280", fontSize: 14 }}>Você não tem permissão para acessar esta área.</p>
      <p style={{ color: "#9ca3af", fontSize: 12 }}>Entre em contato com o administrador do sistema.</p>
      <a href="/dashboard" style={{ background: "#1a7a4a", color: "#fff", padding: "9px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>
        ← Voltar ao Dashboard
      </a>
    </div>
  );
}
