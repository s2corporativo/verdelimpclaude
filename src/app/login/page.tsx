"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("E-mail ou senha inválidos. Verifique os dados.");
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 32, width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🌿</div>
          <h1 style={{ color: "#0f5233", fontSize: 22, fontWeight: 900 }}>VERDELIMP ERP</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Sistema Integrado de Gestão</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>E-mail</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}
              placeholder="seu@email.com.br"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Senha</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{ width: "100%", background: "#1a7a4a", color: "#fff", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#9ca3af" }}>
          v2.2 · CNPJ 30.198.776/0001-29 · Betim/MG
        </p>
      </div>
    </div>
  );
}
