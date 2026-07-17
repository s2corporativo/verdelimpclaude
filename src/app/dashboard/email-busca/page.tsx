"use client";
import { useEffect, useState, useCallback } from "react";
import { DemoBadge, Card, TabelaHead, Input, Botao, AvisoBox } from "@/components/ui";
import { CORES } from "@/lib/tema";

export default function EmailBuscaPage() {
  const [termo, setTermo] = useState("");
  const [dias, setDias] = useState("180");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [demo, setDemo] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [buscou, setBuscou] = useState(false);

  const buscar = useCallback(async (q: string) => {
    const termoBusca = q.trim();
    if (!termoBusca) { setAviso("Digite um termo para buscar."); return; }
    setCarregando(true); setErro(""); setAviso(""); setBuscou(true);
    try {
      const r = await fetch(`/api/email/buscar?q=${encodeURIComponent(termoBusca)}&dias=${dias}`);
      const d = await r.json();
      setMsgs(Array.isArray(d.mensagens) ? d.mensagens : []);
      setAviso(d.aviso || ""); setErro(d.erro || ""); setDemo(!!d._demo);
    } catch {
      setMsgs([]); setErro("Falha de rede ao buscar no e-mail.");
    } finally { setCarregando(false); }
  }, [dias]);

  // Deep-link: /dashboard/email-busca?q=2026/018 já traz a busca pronta.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) { setTermo(q); buscar(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 style={{ color: CORES.verdeEscuro, fontSize: 20, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center" }}>
        📧 Buscar no E-mail <DemoBadge mostrar={demo} />
      </h1>
      <p style={{ color: CORES.textoSuave, fontSize: 13, marginBottom: 14 }}>
        Procura contratos e propostas na caixa de entrada por assunto, remetente ou conteúdo.
      </p>

      <Card style={{ padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: CORES.textoLabel, display: "block", marginBottom: 3 }}>Termo</label>
            <Input value={termo} onChange={e => setTermo(e.target.value)} placeholder="Nº do contrato, cliente, objeto, edital…"
              onKeyDown={e => { if (e.key === "Enter") buscar(termo); }} />
          </div>
          <div style={{ width: 130 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: CORES.textoLabel, display: "block", marginBottom: 3 }}>Período</label>
            <select value={dias} onChange={e => setDias(e.target.value)} style={{ width: "100%", padding: "7px 10px", border: `1px solid ${CORES.bordaInput}`, borderRadius: 8, fontSize: 13 }}>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="180">Últimos 6 meses</option>
              <option value="365">Último ano</option>
              <option value="730">Últimos 2 anos</option>
            </select>
          </div>
          <Botao onClick={() => buscar(termo)} disabled={carregando} style={{ padding: "9px 20px" }}>{carregando ? "Buscando…" : "🔍 Buscar"}</Botao>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: CORES.textoSuave }}>Atalhos:</span>
          {["contrato", "proposta", "edital", "aditivo", "medição"].map(t => (
            <button key={t} onClick={() => { setTermo(t); buscar(t); }} style={{ background: CORES.verdeClaro, color: CORES.verdeEscuro, border: "none", borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t}</button>
          ))}
        </div>
      </Card>

      {aviso && <AvisoBox tom={demo ? "info" : "atencao"}>{aviso}</AvisoBox>}
      {erro && <AvisoBox tom="erro">⛔ {erro}</AvisoBox>}

      {buscou && !carregando && !erro && (
        <Card>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <TabelaHead colunas={["Assunto", "De", "Data", "Anexo"]} />
            <tbody>
              {msgs.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "16px 12px", textAlign: "center", color: CORES.textoSuave, fontSize: 13 }}>Nenhuma mensagem encontrada para “{termo}”.</td></tr>
              )}
              {msgs.map((m: any) => (
                <tr key={m.uid} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12, color: CORES.verdeEscuro }}>{m.assunto}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11, color: CORES.textoSuave }}>{m.de || "—"}</td>
                  <td style={{ padding: "8px 12px", fontSize: 11 }}>{m.data ? new Date(m.data).toLocaleDateString("pt-BR") : "—"}</td>
                  <td style={{ padding: "8px 12px" }}>{m.temAnexo ? "📎" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
