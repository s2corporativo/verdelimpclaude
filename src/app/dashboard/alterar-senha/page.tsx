
"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AlterarSenhaPage() {
  const [form, setForm] = useState({ atual: "", nova: "", confirma: "" });
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const salvar = async () => {
    if (form.nova !== form.confirma) { setErro("As senhas não coincidem"); return; }
    if (form.nova.length < 8) { setErro("A senha deve ter pelo menos 8 caracteres"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: form.atual, novaSenha: form.nova }),
      });
      const d = await r.json();
      if (d.error) { setErro(d.error); setLoading(false); return; }
      await signOut({ callbackUrl: "/login" });
    } catch { setErro("Erro ao alterar senha"); }
    setLoading(false);
  };

  const IS: any = { width: "100%", padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, marginBottom: 12 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 32, width: 400, boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 36 }}>🔐</div>
          <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, marginTop: 8 }}>Alterar Senha</h1>
          <p style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>Por segurança, defina uma nova senha antes de continuar.</p>
        </div>
        {erro && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "9px 12px", marginBottom: 14, color: "#991b1b", fontSize: 13 }}>{erro}</div>}
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Senha atual</label>
        <input type="password" style={IS} value={form.atual} onChange={e => setForm(p => ({ ...p, atual: e.target.value }))} />
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Nova senha (mín. 8 caracteres)</label>
        <input type="password" style={IS} value={form.nova} onChange={e => setForm(p => ({ ...p, nova: e.target.value }))} />
        <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Confirmar nova senha</label>
        <input type="password" style={IS} value={form.confirma} onChange={e => setForm(p => ({ ...p, confirma: e.target.value }))} />
        <button onClick={salvar} disabled={loading || !form.atual || !form.nova || !form.confirma}
          style={{ width: "100%", background: "#0f5233", color: "#fff", border: "none", padding: "11px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, marginTop: 4 }}>
          {loading ? "Salvando..." : "Confirmar nova senha"}
        </button>
      </div>
    </div>
  );
}
