"use client";
// Manual do Sistema — guia intuitivo de cada ferramenta (o que é, para que
// serve e como usar). Conteúdo em src/lib/manual.ts.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MANUAL } from "@/lib/manual";

export default function ManualPage() {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [aberta, setAberta] = useState<string>("");

  const q = busca.trim().toLowerCase();
  const secoes = MANUAL.map((s) => ({
    ...s,
    ferramentas: q
      ? s.ferramentas.filter((f) =>
          (f.titulo + " " + f.oQueE + " " + f.paraQue + " " + f.passos.join(" ")).toLowerCase().includes(q))
      : s.ferramentas,
  })).filter((s) => s.ferramentas.length > 0);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>📖 Manual do Sistema</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
        Guia de cada ferramenta: o que é, para que serve e como usar. Clique em qualquer item para expandir, ou no botão verde para abrir a ferramenta.
      </p>

      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔎 Buscar (ex.: contrato, ASO, preço, férias…)"
        style={{ width: "100%", maxWidth: 480, padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, marginBottom: 20 }} />

      {secoes.map((s) => (
        <div key={s.secao} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: "#334532", margin: "0 0 10px", textTransform: "uppercase", letterSpacing: ".5px" }}>{s.secao}</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {s.ferramentas.map((f) => {
              const id = f.href;
              const exp = aberta === id || !!q;
              return (
                <div key={id} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                  <button onClick={() => setAberta(exp && !q ? "" : id)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 24 }}>{f.icone}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: "#111827" }}>{f.titulo}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{f.oQueE}</p>
                    </div>
                    <span style={{ color: "#9ca3af", fontSize: 13 }}>{exp ? "▲" : "▼"}</span>
                  </button>

                  {exp && (
                    <div style={{ borderTop: "1px solid #f3f4f6", padding: "14px 18px 18px" }}>
                      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#374151" }}>
                        <strong style={{ color: "#4a9410" }}>Para que serve:</strong> {f.paraQue}
                      </p>
                      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 800, color: "#334532" }}>Como usar:</p>
                      <ol style={{ margin: "0 0 12px", paddingLeft: 20, fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                        {f.passos.map((p, i) => <li key={i}>{p}</li>)}
                      </ol>
                      {f.dicas && f.dicas.length > 0 && (
                        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                          {f.dicas.map((d, i) => (
                            <p key={i} style={{ margin: i ? "6px 0 0" : 0, fontSize: 12, color: "#15803d" }}>💡 {d}</p>
                          ))}
                        </div>
                      )}
                      <button onClick={() => router.push(f.href)}
                        style={{ background: "#4a9410", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
                        Abrir {f.titulo} →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {secoes.length === 0 && (
        <p style={{ color: "#6b7280", fontSize: 14, textAlign: "center", padding: 30 }}>Nada encontrado para “{busca}”. Tente outra palavra.</p>
      )}
    </div>
  );
}
