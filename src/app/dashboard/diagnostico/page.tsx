"use client";
// Central de Diagnóstico — a "central eletrônica" que testa o sistema e
// aponta problemas com correção sugerida e explicação por IA.
import { useState, useCallback } from "react";

const ST: Record<string, { label: string; fundo: string; cor: string; icone: string }> = {
  ok:      { label: "OK", fundo: "#dcfce7", cor: "#15803d", icone: "✅" },
  atencao: { label: "Atenção", fundo: "#fef3c7", cor: "#92400e", icone: "⚠️" },
  falha:   { label: "Falha", fundo: "#fee2e2", cor: "#991b1b", icone: "❌" },
};

export default function DiagnosticoPage() {
  const [dados, setDados] = useState<any>(null);
  const [rodando, setRodando] = useState(false);
  const [explica, setExplica] = useState<Record<string, string>>({});
  const [explicando, setExplicando] = useState<string>("");

  const rodar = useCallback(async () => {
    setRodando(true); setExplica({});
    try {
      const r = await fetch("/api/diagnostico");
      setDados(await r.json());
    } catch {
      setDados({ erro: "Não foi possível rodar o diagnóstico (o sistema pode estar fora do ar)." });
    }
    setRodando(false);
  }, []);

  const explicar = async (c: any) => {
    setExplicando(c.id);
    try {
      const r = await fetch("/api/diagnostico/explicar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) });
      const j = await r.json();
      setExplica((p) => ({ ...p, [c.id]: j.text || j.error || "Sem resposta." }));
    } catch {
      setExplica((p) => ({ ...p, [c.id]: "Erro ao consultar a IA." }));
    }
    setExplicando("");
  };

  const saudeUI = dados?.saude ? ST[dados.saude] : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🩺 Central de Diagnóstico</h1>
          <p style={{ color: "#6b7280", fontSize: 13, margin: 0, maxWidth: 640 }}>
            Testa o sistema de ponta a ponta (banco, configuração, segurança, integrações, migrações e consistência dos dados) e aponta o que corrigir. Rode sempre que algo parecer estranho.
          </p>
        </div>
        <button onClick={rodar} disabled={rodando}
          style={{ background: rodando ? "#9ca3af" : "#334532", color: "#fff", border: "none", padding: "11px 22px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: rodando ? "default" : "pointer" }}>
          {rodando ? "⟳ Testando…" : "▶ Rodar diagnóstico"}
        </button>
      </div>

      {dados?.erro && (
        <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 12, padding: 20, marginTop: 18, fontWeight: 700 }}>{dados.erro}</div>
      )}

      {dados?.checks && (
        <>
          <div style={{ display: "flex", gap: 12, margin: "18px 0", flexWrap: "wrap", alignItems: "center" }}>
            {saudeUI && (
              <div style={{ background: saudeUI.fundo, color: saudeUI.cor, borderRadius: 12, padding: "14px 22px", fontWeight: 900, fontSize: 15 }}>
                {saudeUI.icone} Saúde geral: {dados.saude === "ok" ? "Tudo certo" : dados.saude === "atencao" ? "Requer atenção" : "Há falhas"}
              </div>
            )}
            <span style={{ fontSize: 13, color: "#6b7280" }}>
              ✅ {dados.resumo.ok} ok · ⚠️ {dados.resumo.atencao} atenção · ❌ {dados.resumo.falha} falha
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dados.checks.map((c: any) => {
              const s = ST[c.status];
              return (
                <div key={c.id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", borderLeft: `4px solid ${s.cor}`, padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 18 }}>{s.icone}</span>
                    <strong style={{ fontSize: 14, color: "#111827" }}>{c.titulo}</strong>
                    <span style={{ background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700 }}>{c.area}</span>
                    <span style={{ background: s.fundo, color: s.cor, padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800, marginLeft: "auto" }}>{s.label}</span>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#374151" }}>{c.detalhe}</p>
                  {c.correcao && (
                    <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "#0f5233", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px" }}>
                      🔧 <strong>Como corrigir:</strong> {c.correcao}
                    </p>
                  )}
                  {c.status !== "ok" && (
                    <div style={{ marginTop: 8 }}>
                      <button onClick={() => explicar(c)} disabled={explicando === c.id}
                        style={{ background: "#fff", color: "#334532", border: "1px solid #334532", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        {explicando === c.id ? "⟳ Consultando IA…" : "🤖 Explicar com IA"}
                      </button>
                      {explica[c.id] && (
                        <div style={{ marginTop: 8, background: "#f9fafb", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{explica[c.id]}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p style={{ marginTop: 14, fontSize: 11, color: "#9ca3af" }}>Diagnóstico gerado em {new Date(dados.geradoEm).toLocaleString("pt-BR")}.</p>
        </>
      )}

      {!dados && !rodando && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px dashed #d1d5db", padding: 30, marginTop: 18, textAlign: "center", color: "#6b7280" }}>
          Clique em <strong>▶ Rodar diagnóstico</strong> para verificar a saúde do sistema.
        </div>
      )}
    </div>
  );
}
