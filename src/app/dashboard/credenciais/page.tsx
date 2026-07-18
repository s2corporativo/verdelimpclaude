"use client";
// 🔑 Credenciais & APIs (cofre) — o administrador digita chaves, senhas e
// logins de integração AQUI e todo o sistema passa a usá-los na hora
// (criptografados no banco; sem editar .env nem reiniciar o servidor).
import { useMemo, useState } from "react";
import { useRecurso } from "@/lib/useRecurso";

interface Cred {
  nome: string; rotulo: string; grupo: string; secreta: boolean;
  placeholder: string; ajuda: string;
  configurada: boolean; origem: "cofre" | "ambiente" | null; preview: string;
  atualizadaEm: string | null; atualizadaPor: string | null;
}

export default function CredenciaisPage() {
  const { data, loading, erro, reload } = useRecurso<{ credenciais: Cred[] }>("/api/admin/credenciais");
  const creds = useMemo(() => data?.credenciais ?? [], [data]);
  const grupos = useMemo(() => Array.from(new Set(creds.map((c) => c.grupo))), [creds]);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [mostrar, setMostrar] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [ia, setIa] = useState<any>(null);

  const chamar = async (metodo: "POST" | "DELETE", body: any, okMsg: string) => {
    setMsg(null);
    try {
      const r = await fetch("/api/admin/credenciais", { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `Falha (HTTP ${r.status})`);
      setMsg({ tipo: "ok", texto: okMsg });
      reload();
    } catch (e: any) {
      setMsg({ tipo: "erro", texto: e?.message || "Falha na operação" });
    }
  };

  const salvar = async (c: Cred) => {
    const valor = (valores[c.nome] || "").trim();
    if (!valor) return;
    setBusy(c.nome);
    await chamar("POST", { nome: c.nome, valor }, `✅ ${c.rotulo} salva — já vale em todo o sistema.`);
    setValores((v) => ({ ...v, [c.nome]: "" }));
    setBusy(null);
  };

  const remover = async (c: Cred) => {
    if (!confirm(`Remover ${c.rotulo} do cofre? O sistema volta a usar a variável de ambiente, se existir.`)) return;
    setBusy(c.nome);
    await chamar("DELETE", { nome: c.nome }, `🗑️ ${c.rotulo} removida do cofre.`);
    setBusy(null);
  };

  const testarIa = async () => {
    setBusy("__ia__"); setIa(null);
    try { setIa(await fetch("/api/ia-status").then((r) => r.json())); } catch { setIa({ ativa: false, mensagem: "Falha ao testar." }); }
    setBusy(null);
  };

  const input = { padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: "100%" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🔑 Credenciais & APIs</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12, maxWidth: 800 }}>
        Digite aqui as chaves, senhas e logins das integrações. Elas são gravadas <strong>criptografadas</strong> no banco e{" "}
        <strong>sincronizam com todo o sistema na hora</strong> — IA, e-mail, cotações — sem editar arquivos no servidor nem reiniciar.
      </p>
      <div style={{ background: "#1e1b4b", color: "#a5b4fc", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 11 }}>
        🔐 Acesso restrito a ADMIN · valores nunca são reexibidos em claro (só um trecho mascarado) · toda alteração fica na trilha de auditoria · uma credencial salva aqui tem prioridade sobre a variável de ambiente do servidor.
      </div>

      {erro && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>⛔ {erro}</div>}
      {msg && <div style={{ background: msg.tipo === "ok" ? "#f0fdf4" : "#fee2e2", border: `1px solid ${msg.tipo === "ok" ? "#86efac" : "#fecaca"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: msg.tipo === "ok" ? "#15803d" : "#991b1b" }}>{msg.texto}</div>}
      {loading && !creds.length && <p style={{ fontSize: 13, color: "#9ca3af" }}>⟳ Carregando cofre…</p>}

      {grupos.map((grupo) => (
        <div key={grupo} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>{grupo}</h2>
          {creds.filter((c) => c.grupo === grupo).map((c) => (
            <div key={c.nome} style={{ borderBottom: "1px solid #f3f4f6", padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <div>
                  <strong style={{ fontSize: 13, color: "#334532" }}>{c.rotulo}</strong>{" "}
                  <code style={{ fontSize: 10, color: "#9ca3af" }}>{c.nome}</code>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {c.configurada
                    ? <span style={{ background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>● Configurada ({c.origem === "cofre" ? "cofre" : "ambiente"})</span>
                    : <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>○ Não configurada</span>}
                  {c.preview && <code style={{ fontSize: 11, color: "#6b7280", background: "#f9fafb", padding: "2px 8px", borderRadius: 6 }}>{c.preview}</code>}
                </div>
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 8px" }}>{c.ajuda}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                  <label htmlFor={`in-${c.nome}`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>{c.rotulo}</label>
                  <input id={`in-${c.nome}`} type={c.secreta && !mostrar[c.nome] ? "password" : "text"}
                    value={valores[c.nome] || ""} onChange={(e) => setValores((v) => ({ ...v, [c.nome]: e.target.value }))}
                    placeholder={c.configurada ? "digite para substituir…" : c.placeholder}
                    autoComplete="off" style={input as any} />
                </div>
                {c.secreta && (
                  <button onClick={() => setMostrar((m) => ({ ...m, [c.nome]: !m[c.nome] }))} aria-label={mostrar[c.nome] ? "Ocultar valor digitado" : "Mostrar valor digitado"}
                    style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontSize: 12 }}>
                    {mostrar[c.nome] ? "🙈" : "👁️"}
                  </button>
                )}
                <button onClick={() => salvar(c)} disabled={busy !== null || !(valores[c.nome] || "").trim()}
                  style={{ background: (valores[c.nome] || "").trim() ? "#4a9410" : "#e5e7eb", color: (valores[c.nome] || "").trim() ? "#fff" : "#9ca3af", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: (valores[c.nome] || "").trim() ? "pointer" : "default" }}>
                  {busy === c.nome ? "⟳ Salvando…" : "💾 Salvar"}
                </button>
                {c.origem === "cofre" && (
                  <button onClick={() => remover(c)} disabled={busy !== null}
                    style={{ background: "#fff", color: "#991b1b", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    🗑️ Remover
                  </button>
                )}
              </div>
              {c.atualizadaEm && (
                <p style={{ fontSize: 10, color: "#9ca3af", margin: "6px 0 0" }}>
                  Salva no cofre em {new Date(c.atualizadaEm).toLocaleString("pt-BR")}{c.atualizadaPor ? ` por ${c.atualizadaPor}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}

      {/* Teste ao vivo da IA */}
      <div style={{ background: "#fff", border: "1px solid " + (ia ? (ia.ativa ? "#86efac" : "#fecaca") : "#e5e7eb"), borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div>
            <strong style={{ fontSize: 13, color: "#334532" }}>🤖 Verificar IA agora</strong>
            <p style={{ fontSize: 11, color: ia ? (ia.ativa ? "#15803d" : "#991b1b") : "#6b7280", marginTop: 3 }}>
              {ia ? ia.mensagem : "Depois de salvar a chave GROQ, clique para confirmar com um ping real ao modelo."}
            </p>
          </div>
          <button onClick={testarIa} disabled={busy !== null}
            style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy === "__ia__" ? 0.6 : 1 }}>
            {busy === "__ia__" ? "⟳ Testando…" : "Testar IA"}
          </button>
        </div>
      </div>
    </div>
  );
}
