"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";

export default function AlterarSenhaPage() {
  const [form, setForm] = useState({ atual: "", nova: "", confirma: "" });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  const salvar = async () => {
    setErro(""); 
    if (!form.atual || !form.nova || !form.confirma) { setErro("Preencha todos os campos"); return; }
    if (form.nova !== form.confirma) { setErro("Nova senha e confirmação não conferem"); return; }
    if (form.nova.length < 8) { setErro("Nova senha deve ter no mínimo 8 caracteres"); return; }
    if (!/[A-Z]/.test(form.nova)) { setErro("Nova senha deve conter ao menos uma letra maiúscula"); return; }
    if (!/[0-9]/.test(form.nova)) { setErro("Nova senha deve conter ao menos um número"); return; }

    setLoading(true);
    const r = await fetch("/api/auth/alterar-senha", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senhaAtual: form.atual, novaSenha: form.nova }),
    });
    const d = await r.json();
    setLoading(false);
    if (!r.ok) { setErro(d.error || "Erro ao alterar senha"); return; }
    setOk(true);
    setTimeout(() => signOut({ callbackUrl: "/login" }), 2000);
  };

  const IS: any = { width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 };
  const LS: any = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 32, width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, margin: 0 }}>Alterar Senha</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 6 }}>Por segurança, defina uma nova senha antes de continuar.</p>
        </div>

        {ok ? (
          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: 16, textAlign: "center", color: "#15803d", fontWeight: 600 }}>
            ✅ Senha alterada! Redirecionando para login...
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 14 }}>
              <label style={LS}>Senha atual</label>
              <input type="password" style={IS} value={form.atual} onChange={e => setForm(p => ({ ...p, atual: e.target.value }))} autoComplete="current-password" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={LS}>Nova senha</label>
              <input type="password" style={IS} value={form.nova} onChange={e => setForm(p => ({ ...p, nova: e.target.value }))} autoComplete="new-password" />
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Mínimo 8 caracteres, uma maiúscula e um número</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={LS}>Confirmar nova senha</label>
              <input type="password" style={IS} value={form.confirma} onChange={e => setForm(p => ({ ...p, confirma: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && salvar()} autoComplete="new-password" />
            </div>
            {erro && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 7, padding: "8px 12px", color: "#991b1b", fontSize: 13, marginBottom: 14 }}>{erro}</div>}
            <button onClick={salvar} disabled={loading}
              style={{ width: "100%", background: loading ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 15 }}>
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
