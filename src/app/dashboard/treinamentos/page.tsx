"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TabelaHead, KpiGrid, KpiCard, Botao } from "@/components/ui";
import { estiloInput, estiloLabel } from "@/lib/estilos";

async function upload(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.success) throw new Error(payload.error || "Falha no upload");
  return payload.url as string;
}

const TRAINING_TYPES = ["NR-06", "NR-10", "NR-11", "NR-12", "NR-20", "NR-33", "NR-35", "FISPQ", "CNH Cat. B", "CNH Cat. C", "Direção Defensiva", "Primeiros Socorros", "Integração", "Outro"];
const STATUS_STYLE: Record<string, [string, string, string]> = {
  valido: ["#dcfce7", "#15803d", "Válido"],
  a_vencer: ["#fef9c3", "#92400e", "A vencer"],
  vencido: ["#fee2e2", "#991b1b", "Vencido"],
};

export default function TreinamentosPage() {
  const [data, setData] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ employeeId: "", trainingType: "NR-06", issuedAt: "", expiresAt: "", institution: "", certificatePath: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const [trainingResponse, employeeResponse] = await Promise.all([
        fetch("/api/treinamentos", { cache: "no-store" }),
        fetch("/api/funcionarios", { cache: "no-store" }),
      ]);
      const trainingPayload = await trainingResponse.json().catch(() => ({}));
      const employeePayload = await employeeResponse.json().catch(() => ({}));
      if (!trainingResponse.ok) throw new Error(trainingPayload.error || "Não foi possível carregar os treinamentos.");
      if (!employeeResponse.ok) throw new Error(employeePayload.error || "Não foi possível carregar os funcionários.");
      setData(trainingPayload.data || []);
      setFuncionarios((employeePayload.data || []).filter((item: any) => item.active !== false));
    } catch (error: any) {
      setErro(error?.message || "Falha ao carregar o módulo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const indicadores = useMemo(() => ({
    validos: data.filter((item) => item.status === "valido").length,
    aVencer: data.filter((item) => item.status === "a_vencer").length,
    vencidos: data.filter((item) => item.status === "vencido").length,
    semCertificado: data.filter((item) => !item.certificatePath).length,
  }), [data]);

  async function selecionarArquivo(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    setMensagem("");
    try {
      const path = await upload(selected);
      setForm((current) => ({ ...current, certificatePath: path }));
      setMensagem("Certificado enviado.");
    } catch (error: any) {
      setErro(error?.message || "Não foi possível enviar o certificado.");
    }
  }

  async function salvar() {
    setMensagem("");
    setErro("");
    setSalvando(true);
    try {
      const response = await fetch("/api/treinamentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Não foi possível registrar o treinamento.");
      setMensagem("Treinamento registrado e integrado ao monitor documental.");
      setForm({ employeeId: "", trainingType: "NR-06", issuedAt: "", expiresAt: "", institution: "", certificatePath: "" });
      await load();
    } catch (error: any) {
      setErro(error?.message || "Falha ao registrar treinamento.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar(id: string) {
    const reason = window.prompt("Informe o motivo do arquivamento deste treinamento:")?.trim();
    if (!reason) return;
    setErro("");
    const response = await fetch(`/api/treinamentos?id=${encodeURIComponent(id)}&reason=${encodeURIComponent(reason)}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setErro(payload.error || "Não foi possível arquivar o treinamento.");
      return;
    }
    setMensagem("Treinamento arquivado sem exclusão física do histórico.");
    await load();
  }

  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Treinamentos & NRs</h1>
      <p style={{ fontSize: 12, color: "#6b7280" }}>Certificados, vencimentos, reciclagens e histórico por colaborador.</p>

      {mensagem && <div style={{ padding: 9, background: "#dcfce7", color: "#15803d", borderRadius: 8, marginBottom: 10, fontSize: 12 }}>{mensagem}</div>}
      {erro && <div style={{ padding: 9, background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 10, fontSize: 12 }}>{erro}</div>}
      {(indicadores.vencidos > 0 || indicadores.aVencer > 0) && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>Existem <b>{indicadores.vencidos} vencido(s)</b> e <b>{indicadores.aVencer} a vencer</b>.</div>}

      <KpiGrid colunas={4}>
        <KpiCard label="Válidos" valor={indicadores.validos} cor="#4a9410" />
        <KpiCard label="A vencer em 30 dias" valor={indicadores.aVencer} cor="#d97706" />
        <KpiCard label="Vencidos" valor={indicadores.vencidos} cor="#dc2626" />
        <KpiCard label="Sem certificado" valor={indicadores.semCertificado} cor="#7c3aed" />
      </KpiGrid>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
        <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 12 }}>Registrar treinamento</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 9 }}>
          <div><label style={estiloLabel}>Funcionário</label><select style={estiloInput} value={form.employeeId} onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}><option value="">Selecione</option>{funcionarios.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.role}</option>)}</select></div>
          <div><label style={estiloLabel}>Tipo</label><select style={estiloInput} value={form.trainingType} onChange={(event) => setForm((current) => ({ ...current, trainingType: event.target.value }))}>{TRAINING_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label style={estiloLabel}>Emissão</label><input type="date" style={estiloInput} value={form.issuedAt} onChange={(event) => setForm((current) => ({ ...current, issuedAt: event.target.value }))} /></div>
          <div><label style={estiloLabel}>Vencimento/reciclagem</label><input type="date" style={estiloInput} value={form.expiresAt} onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))} /></div>
          <div><label style={estiloLabel}>Instituição</label><input style={estiloInput} value={form.institution} onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))} /></div>
          <div><label style={estiloLabel}>Certificado</label><input type="file" accept="application/pdf,image/*" onChange={selecionarArquivo} style={{ fontSize: 11 }} />{form.certificatePath && <a href={form.certificatePath} target="_blank" rel="noreferrer" style={{ fontSize: 10 }}>Arquivo enviado</a>}</div>
        </div>
        <Botao onClick={salvar} disabled={salvando || !form.employeeId || !form.issuedAt || !form.expiresAt} style={{ padding: "8px 24px", marginTop: 10 }}>{salvando ? "Registrando…" : "Registrar"}</Botao>
      </div>

      {loading ? <div style={{ padding: 20, color: "#4a9410" }}>Carregando treinamentos…</div> : data.length === 0 ? (
        <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 24, textAlign: "center", color: "#6b7280" }}>Nenhum treinamento registrado.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, minWidth: 1000 }}>
            <TabelaHead colunas={["Funcionário", "Função", "Treinamento", "Emissão", "Vencimento", "Dias", "Instituição", "Certificado", "Status", "Ação"]} />
            <tbody>{[...data].sort((a, b) => a.diasVenc - b.diasVenc).map((item) => {
              const [background, color, label] = STATUS_STYLE[item.status] || ["#f3f4f6", "#374151", item.status || "—"];
              return <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.employee?.name}</td>
                <td style={{ padding: "8px 12px", fontSize: 11 }}>{item.employee?.role}</td>
                <td style={{ padding: "8px 12px", fontWeight: 600, color: "#4a9410" }}>{item.trainingType}</td>
                <td style={{ padding: "8px 12px" }}>{new Date(item.issuedAt).toLocaleDateString("pt-BR")}</td>
                <td style={{ padding: "8px 12px" }}>{new Date(item.expiresAt).toLocaleDateString("pt-BR")}</td>
                <td style={{ padding: "8px 12px", fontWeight: 700, color: item.diasVenc < 0 ? "#dc2626" : item.diasVenc <= 30 ? "#d97706" : "#15803d" }}>{item.diasVenc < 0 ? `Venceu há ${Math.abs(item.diasVenc)}d` : `${item.diasVenc}d`}</td>
                <td style={{ padding: "8px 12px" }}>{item.institution || "—"}</td>
                <td style={{ padding: "8px 12px" }}>{item.certificatePath ? <a href={item.certificatePath} target="_blank" rel="noreferrer">Abrir</a> : <span style={{ color: "#991b1b" }}>Pendente</span>}</td>
                <td style={{ padding: "8px 12px" }}><span style={{ background, color, padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{label}</span></td>
                <td style={{ padding: "8px 12px" }}><button onClick={() => arquivar(item.id)} style={{ border: 0, background: "transparent", color: "#991b1b", cursor: "pointer" }}>Arquivar</button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
