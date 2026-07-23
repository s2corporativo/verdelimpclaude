"use client";
import { useState } from "react";
import { useRecurso } from "@/lib/useRecurso";

interface EmailItem {
  uid: number;
  assunto: string;
  de: string;
  data: string;
  anexos: string[];
  categoria: string;
  categoriaLabel: string;
  categoriaCor: string;
  categoriaFundo: string;
}

type FiltroTab = "todos" | "cotacao" | "contabil" | "contrato" | "geral";

const TABS: { key: FiltroTab; label: string; cor?: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "cotacao", label: "Cotações", cor: "#15803d" },
  { key: "contabil", label: "Documentos Contábeis", cor: "#b45309" },
  { key: "contrato", label: "Contratos", cor: "#3730a3" },
  { key: "geral", label: "Outros", cor: "#374151" },
];

export default function EmailIntegrationPage() {
  const [filtro, setFiltro] = useState<FiltroTab>("todos");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const { data, loading, erro, reload } = useRecurso<{ configurado: boolean; data: EmailItem[]; total: number; _demo?: boolean; aviso?: string }>("/api/email-integration");
  const emails = data?.data ?? [];

  const filtrados = filtro === "todos" ? emails : emails.filter((e) => e.categoria === filtro);

  const contagemPorCategoria = emails.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoria] = (acc[e.categoria] || 0) + 1;
    return acc;
  }, {});

  const triggerScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const r = await fetch("/api/email-integration", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dias: 30 }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || `Falha ao escanear (HTTP ${r.status})`);
      setScanResult(`${d.total} e-mails encontrados — ${new Date().toLocaleTimeString("pt-BR")}`);
      reload();
    } catch (e: any) {
      setScanResult(e?.message || "Falha ao escanear caixa de entrada");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📧 Integração de E-mail</h1>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            Varredura automática da caixa de entrada — e-mails com anexos (PDF, imagens, planilhas) categorizados por tipo.
          </p>
        </div>
        <button onClick={triggerScan} disabled={scanning}
          style={{ background: scanning ? "#6b7280" : "#4a9410", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 8, cursor: scanning ? "default" : "pointer", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", opacity: scanning ? 0.7 : 1 }}>
          {scanning ? "⟳ Escaneando..." : "🔄 Escanear Agora"}
        </button>
      </div>

      {data && !data.configurado && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
          <strong style={{ color: "#92400e", fontSize: 13 }}>⚙️ IMAP não configurado — modo demonstrativo</strong>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
            Configure <code>EMAIL_IMAP_HOST</code>, <code>EMAIL_IMAP_PORT</code>, <code>EMAIL_IMAP_USER</code> e <code>EMAIL_IMAP_PASS</code> no Admin → Credenciais & APIs.
          </p>
        </div>
      )}

      {scanResult && (
        <div style={{ background: scanResult.includes("Falha") ? "#fee2e2" : "#dcfce7", border: `1px solid ${scanResult.includes("Falha") ? "#fecaca" : "#86efac"}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: scanResult.includes("Falha") ? "#991b1b" : "#15803d" }}>
          {scanResult.includes("Falha") ? "❌ " : "✅ "}{scanResult}
        </div>
      )}

      {erro && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#991b1b" }}>❌ {erro}</div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const count = tab.key === "todos" ? emails.length : (contagemPorCategoria[tab.key] || 0);
          const active = filtro === tab.key;
          return (
            <button key={tab.key} onClick={() => setFiltro(tab.key)}
              style={{ background: active ? "#334532" : "#fff", color: active ? "#fff" : "#374151", border: `1px solid ${active ? "#334532" : "#d1d5db"}`, padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      {loading && !emails.length && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 40, justifyContent: "center" }}>
          <div style={{ width: 24, height: 24, border: "3px solid #d1d5db", borderTopColor: "#4a9410", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "#6b7280" }}>Carregando e-mails...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      {!loading && !filtrados.length && !erro && (
        <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: 12, padding: 32, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#374151" }}>📭 Nenhum e-mail encontrado</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "#9ca3af" }}>
            {filtro !== "todos" ? "Nenhum e-mail nesta categoria. Tente outro filtro ou escaneie novamente." : "Clique em 'Escanear Agora' para varrer a caixa de entrada."}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtrados.map((em) => (
          <div key={em.uid} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", borderLeft: `4px solid ${em.categoriaCor}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ background: em.categoriaFundo, color: em.categoriaCor, padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                    {em.categoriaLabel}
                  </span>
                  {em.anexos.length > 0 && (
                    <span style={{ background: "#f3f4f6", color: "#374151", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                      📎 {em.anexos.length} anexo{em.anexos.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827" }}>{em.assunto}</p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: "#6b7280" }}>{em.de}</p>
              </div>
              <span style={{ fontSize: 11, color: "#9ca3af", whiteSpace: "nowrap" }}>
                {new Date(em.data).toLocaleDateString("pt-BR")} {new Date(em.data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {em.anexos.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {em.anexos.map((anexo, i) => {
                  const ext = anexo.split(".").pop()?.toLowerCase() || "";
                  const iconMap: Record<string, string> = { pdf: "📄", jpg: "🖼️", jpeg: "🖼️", png: "🖼️", xlsx: "📊", xls: "📊", csv: "📊" };
                  return (
                    <span key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "3px 8px", fontSize: 10, color: "#374151" }}>
                      {iconMap[ext] || "📎"} {anexo}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
