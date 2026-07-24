"use client";

import { useCallback, useEffect, useState } from "react";
import { TabelaHead } from "@/components/ui";

const STATUS_COLORS: Record<string, [string, string]> = {
  Aprovada: ["#dcfce7", "#15803d"],
  "Em aprovação": ["#dbeafe", "#1d4ed8"],
  Aberta: ["#fef9c3", "#92400e"],
  Rejeitada: ["#fee2e2", "#991b1b"],
  Convertida: ["#ede9fe", "#6d28d9"],
  Expirada: ["#f3f4f6", "#6b7280"],
};

export default function PropostasPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [gerando, setGerando] = useState<string | null>(null);
  const [convertendo, setConvertendo] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch("/api/propostas", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar as propostas.");
      setData(payload.data || []);
    } catch (error: any) {
      setErro(error?.message || "Falha ao carregar propostas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function aprovar(proposal: any, level: "technical" | "financial" | "director") {
    setMensagem("");
    const response = await fetch("/api/propostas", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposalId: proposal.id, action: "approve", level, approved: true }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMensagem(`Erro: ${payload.error || "Não foi possível registrar a aprovação."}`);
      return;
    }
    setMensagem("Aprovação registrada na versão atual.");
    await carregar();
  }

  async function arquivar(proposal: any) {
    const reason = window.prompt(`Informe o motivo do arquivamento da proposta ${proposal.number}:`)?.trim();
    if (!reason) return;
    const response = await fetch(`/api/propostas?id=${encodeURIComponent(proposal.id)}&reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMensagem(`Erro: ${payload.error || "Não foi possível arquivar a proposta."}`);
      return;
    }
    setMensagem("Proposta arquivada sem exclusão física do histórico.");
    await carregar();
  }

  async function gerarContrato(proposal: any) {
    if (!window.confirm(`Converter a proposta aprovada ${proposal.number} em contrato?\n\nO processo cria contrato, matriz documental, cronograma e confirma reservas.`)) return;
    setConvertendo(proposal.id);
    setMensagem("");
    try {
      const response = await fetch("/api/proposta-contrato", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proposalId: proposal.id }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.error) throw new Error(payload.error || "Não foi possível converter a proposta.");
      setMensagem(`Contrato ${payload.numero} criado. Requisitos documentais: ${payload.gerado?.requisitosDocs || 0}.`);
      await carregar();
    } catch (error: any) {
      setMensagem(`Erro: ${error?.message || "Falha na conversão."}`);
    } finally {
      setConvertendo(null);
    }
  }

  function abrirPdf(id: string) {
    setGerando(id);
    window.open(`/api/propostas/${id}/pdf`, "_blank", "width=900,height=700");
    window.setTimeout(() => setGerando(null), 1500);
  }

  const fmt = (value: number) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Propostas comerciais</h1>
      <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "9px 13px", marginBottom: 16, fontSize: 11, color: "#15803d" }}>
        O PDF é gerado a partir da proposta persistida. Use a impressão do navegador para salvar uma cópia local.
      </div>

      {mensagem && <div style={{ background: mensagem.startsWith("Erro") ? "#fee2e2" : "#dcfce7", color: mensagem.startsWith("Erro") ? "#991b1b" : "#15803d", borderRadius: 8, padding: "10px 13px", marginBottom: 14, fontSize: 12, fontWeight: 600 }}>{mensagem}</div>}
      {erro && <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 8, padding: "10px 13px", marginBottom: 14, fontSize: 12 }}>{erro}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
        {[
          ["Total", data.length, "#4a9410"],
          ["Aprovadas", data.filter((item) => item.status === "Aprovada").length, "#15803d"],
          ["Em aprovação", data.filter((item) => item.status === "Em aprovação").length, "#1d4ed8"],
        ].map(([label, value, color]) => <div key={label as string} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${color}` }}><div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 20, fontWeight: 700, color: color as string, marginTop: 5 }}>{value}</div></div>)}
      </div>

      {loading ? <div style={{ padding: 24, color: "#4a9410" }}>Carregando propostas…</div> : data.length === 0 ? (
        <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 28, textAlign: "center", color: "#6b7280" }}>Nenhuma proposta cadastrada.</div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 950 }}>
              <TabelaHead colunas={["Número", "Objeto", "Cliente", "Valor total", "Data", "Status", "Ações"]} />
              <tbody>{data.map((proposal) => {
                const [background, color] = STATUS_COLORS[proposal.status] || ["#f3f4f6", "#6b7280"];
                const version = proposal.versions?.[0];
                return <tr key={proposal.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, fontFamily: "monospace", color: "#334532" }}>{proposal.number}</td>
                  <td style={{ padding: "8px 12px", fontSize: 12, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proposal.object}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280" }}>{proposal.client?.name || "—"}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#4a9410" }}>R${fmt(proposal.totalValue)}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280" }}>{proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}><span style={{ background, color, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{proposal.status}</span></td>
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => abrirPdf(proposal.id)} disabled={gerando === proposal.id} style={{ background: gerando === proposal.id ? "#6b7280" : "#334532", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{gerando === proposal.id ? "Gerando…" : "PDF"}</button>
                      {proposal.status === "Aprovada" && <button onClick={() => gerarContrato(proposal)} disabled={convertendo === proposal.id} style={{ background: convertendo === proposal.id ? "#6b7280" : "#4a9410", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>{convertendo === proposal.id ? "Convertendo…" : "Gerar contrato"}</button>}
                      {proposal.status !== "Convertida" && <button onClick={() => arquivar(proposal)} style={{ background: "#fff", color: "#991b1b", border: "1px solid #fca5a5", padding: "5px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Arquivar</button>}
                    </div>
                    {version && proposal.status !== "Convertida" && <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                      {[["technical", "Técnica", version.technicalStatus], ["financial", "Financeira", version.financialStatus], ["director", "Gestão", version.directorStatus]].map(([level, label, status]) => <button key={level} onClick={() => aprovar(proposal, level as any)} disabled={status === "aprovado"} style={{ border: "1px solid #d1d5db", background: status === "aprovado" ? "#dcfce7" : "#fff", color: status === "aprovado" ? "#15803d" : "#374151", borderRadius: 5, padding: "3px 6px", fontSize: 9, cursor: status === "aprovado" ? "default" : "pointer" }}>{status === "aprovado" ? "✓ " : ""}{label}</button>)}
                    </div>}
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
