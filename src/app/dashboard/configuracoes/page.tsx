"use client";
import { useEffect, useState } from "react";

const IS: any = { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 };
const LS: any = { fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 };

const VAZIO = {
  razaoSocial: "", nomeFantasia: "", cnpj: "", porte: "", regimeTributario: "Simples Nacional",
  cnaePrincipal: "", inscMunicipal: "", logradouro: "", bairro: "", municipio: "", uf: "", cep: "",
  email: "", telefone: "", aliqISS: "5", aliqINSS: "7", aliqIRRF: "1.5", aliqFGTS: "8", aliqDAS: "6.72",
  nomeContador: "", emailContador: "",
};

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<any>(VAZIO);
  const [msg, setMsg] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/configuracoes").then((r) => r.json()).then((d) => {
      if (d.data) setForm((p: any) => ({ ...p, ...Object.fromEntries(Object.entries(d.data).filter(([, v]) => v !== null)) }));
    });
  }, []);

  const set = (k: string) => (e: any) => setForm((p: any) => ({ ...p, [k]: e.target.value }));

  const salvar = async () => {
    setSalvando(true); setMsg("");
    const r = await fetch("/api/configuracoes", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const d = await r.json();
    setMsg(d.error ? "✗ " + d.error : "✓ Configurações salvas — os documentos gerados passam a usar estes dados");
    setSalvando(false);
  };

  // função simples (não componente) para não remontar o input a cada render
  const campo = (k: string, label: string) => (
    <div key={k} style={{ marginBottom: 8 }}>
      <label style={LS}>{label}</label>
      <input style={IS} value={form[k] ?? ""} onChange={set(k)} />
    </div>
  );

  return (
    <div>
      <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Configurações</h1>
      <div style={{ background: "#1e1b4b", color: "#a5b4fc", padding: "10px 16px", borderRadius: 8, marginBottom: 16, fontSize: 11 }}>
        🔐 Credenciais sensíveis (chaves de API, senha do banco, certificados) ficam exclusivamente no arquivo <code>.env.production</code> da VPS — nunca neste formulário.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h3 style={{ color: "#0f5233", fontSize: 13, marginBottom: 12 }}>Dados da Empresa</h3>
          {campo("razaoSocial", "Razão Social*")}
          {campo("nomeFantasia", "Nome Fantasia")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {campo("cnpj", "CNPJ*")}
            {campo("porte", "Porte")}
            {campo("regimeTributario", "Regime Tributário")}
            {campo("cnaePrincipal", "CNAE Principal")}
            {campo("inscMunicipal", "Inscrição Municipal")}
            {campo("cep", "CEP")}
          </div>
          {campo("logradouro", "Logradouro")}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 8 }}>
            {campo("bairro", "Bairro")}
            {campo("municipio", "Município")}
            {campo("uf", "UF")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {campo("email", "E-mail")}
            {campo("telefone", "Telefone")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {campo("nomeContador", "Nome do Contador")}
            {campo("emailContador", "E-mail do Contador")}
          </div>
          {msg && <p style={{ color: msg.startsWith("✓") ? "#059669" : "#dc2626", fontSize: 12, margin: "6px 0" }}>{msg}</p>}
          <button onClick={salvar} disabled={salvando || !form.razaoSocial || !form.cnpj}
            style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "9px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
            {salvando ? "Salvando…" : "💾 Salvar Configurações"}
          </button>
        </div>
        <div>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <h3 style={{ color: "#0f5233", fontSize: 13, marginBottom: 12 }}>Alíquotas Fiscais (Gerencial)</h3>
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 7, padding: "7px 11px", marginBottom: 10, fontSize: 10, color: "#92400e" }}>
              Apoio gerencial — validar com contador. Estes percentuais alimentam a apuração automática e a folha.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {campo("aliqDAS", "Alíquota DAS (Simples) %")}
              {campo("aliqISS", "ISS Betim (LC 33/2003) %")}
              {campo("aliqINSS", "INSS Patronal %")}
              {campo("aliqFGTS", "FGTS %")}
              {campo("aliqIRRF", "IRRF Serviços %")}
            </div>
          </div>
          <div style={{ background: "#fce7f3", border: "1px solid #f9a8d4", borderRadius: 12, padding: 16 }}>
            <h3 style={{ color: "#9d174d", fontSize: 13, marginBottom: 10 }}>🔐 Certificado Digital A1</h3>
            <p style={{ fontSize: 11, color: "#831843" }}>
              Certificado digital somente deve ser armazenado com <strong>cofre seguro</strong> (Vault, AWS Secrets Manager),
              criptografia, controle de acesso e logs de uso. SEFAZ_CERTIFICATE_ENABLED=false nesta fase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
