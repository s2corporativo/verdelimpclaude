
"use client";
import { useState, useEffect } from "react";

const FONTES_CND = [
  { nome: "CND Federal — Receita Federal", url: "https://solucoes.receita.fazenda.gov.br/Servicos/certidaointernet/PJ/Emitir", tipo: "federal", obs: "Débitos federais, IRPJ, CSLL, PIS, COFINS" },
  { nome: "CRF/FGTS — Caixa Econômica Federal", url: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf", tipo: "trabalhista", obs: "Regularidade do FGTS — obrigatória para contratos públicos" },
  { nome: "Certidão Trabalhista — TST", url: "https://certidao.tst.jus.br/", tipo: "trabalhista", obs: "Lei 12.440/2011 — exigida em licitações" },
  { nome: "SINTEGRA MG — SEFAZ Estadual", url: "https://www.fazenda.mg.gov.br/empresas/cadastro_contribuintes/consulta_publica/", tipo: "estadual", obs: "Situação estadual ICMS — Minas Gerais" },
  { nome: "CND Municipal — Pref. Betim", url: "https://tributario.betim.mg.gov.br/", tipo: "municipal", obs: "Certidão de ISS e tributos municipais de Betim" },
  { nome: "CADIN Federal", url: "https://www.tesourotransparente.gov.br/", tipo: "federal", obs: "Cadastro de inadimplentes com a União" },
];

const TIPO_COLOR: any = {
  federal: ["#dbeafe", "#1e40af"],
  trabalhista: ["#f3e8ff", "#6d28d9"],
  estadual: ["#dcfce7", "#15803d"],
  municipal: ["#fef9c3", "#92400e"],
};

const REG_COLOR: any = {
  regular: ["#dcfce7", "#15803d", "✅ Regular"],
  irregular: ["#fee2e2", "#991b1b", "⛔ Irregular"],
  pendente: ["#fef9c3", "#92400e", "⚠️ Pendente"],
  desconhecida: ["#f3f4f6", "#6b7280", "❓ Não consultado"],
};

function Badge({ s, txt }: any) {
  const [bg = "#f3f4f6", co = "#374151", label = s] = REG_COLOR[s] || [];
  return <span style={{ background: bg, color: co, padding: "2px 9px", borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{txt || label}</span>;
}

function Kpi({ l, v, i, c = "#1a7a4a", alert = false }: any) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${alert ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${alert ? "#dc2626" : c}` }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{l}</span>
        <span style={{ fontSize: 15 }}>{i}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: alert ? "#dc2626" : c, marginTop: 5 }}>{v}</div>
    </div>
  );
}

export default function RegularidadePage() {
  const [aba, setAba] = useState("consulta");
  const [cnpj, setCnpj] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [lote, setLote] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLote, setLoadingLote] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  const consultar = async () => {
    const clean = cnpj.replace(/\D/g, "");
    if (clean.length !== 14) return;
    setLoading(true);
    setResultado(null);
    try {
      const r = await fetch(`/api/regularidade/cnpj/${clean}`);
      const d = await r.json();
      setResultado(d);
      if (!d.error) setHistorico(h => [{ ...d, consultadoEm: new Date().toLocaleString("pt-BR") }, ...h].slice(0, 20));
    } catch (e: any) {
      setResultado({ error: e.message });
    }
    setLoading(false);
  };

  const consultarLote = async () => {
    setLoadingLote(true);
    const r = await fetch("/api/regularidade/lote");
    const d = await r.json();
    setLote(d);
    setLoadingLote(false);
  };

  const IS: any = { width: "100%", padding: "8px 11px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14 };

  const rConsulta = () => (
    <div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ color: "#0f5233", fontSize: 14, marginBottom: 12 }}>🔍 Consultar CNPJ na Receita Federal</h3>
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 13px", marginBottom: 14, fontSize: 11, color: "#1e40af" }}>
          🔗 <strong>Fonte:</strong> Dados da Receita Federal via BrasilAPI · Cache de 6 horas · Situação cadastral, CNAE, porte, natureza jurídica · Validação matemática do CNPJ antes de consultar
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>CNPJ (14 dígitos, com ou sem pontuação)</label>
            <input style={IS} value={cnpj} onChange={e => setCnpj(e.target.value)} onKeyDown={e => e.key === "Enter" && consultar()} placeholder="00.000.000/0000-00 ou 00000000000000" maxLength={18} />
          </div>
          <button onClick={consultar} disabled={loading || cnpj.replace(/\D/g, "").length !== 14} style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "9px 28px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: loading ? 0.7 : 1 }}>
            {loading ? "⟳ Consultando..." : "Consultar"}
          </button>
        </div>

        {/* CNPJs rápidos */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#6b7280", alignSelf: "center" }}>Testar:</span>
          {[
            ["Prefeitura BH", "17317344000119"],
            ["CEMIG", "17038582000153"],
            ["Verdelimp", "30198776000129"],
            ["Copasa", "17054027000178"],
          ].map(([n, c]) => (
            <button key={c} onClick={() => { setCnpj(c); setTimeout(consultar, 100); }}
              style={{ background: "#f3f4f6", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 11, color: "#374151" }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {resultado && !resultado.error && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Header resultado */}
          <div style={{ background: "#fff", border: `2px solid ${resultado.regularidadeRF === "regular" ? "#86efac" : resultado.regularidadeRF === "irregular" ? "#fca5a5" : "#fde68a"}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <div>
                <h2 style={{ color: "#0f5233", fontSize: 16, fontWeight: 700, margin: 0 }}>{resultado.razaoSocial}</h2>
                <p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0 0" }}>{resultado.cnpj}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <Badge s={resultado.regularidadeRF} />
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{resultado.cached ? "⚡ Cache 6h" : "🔄 Consulta em tempo real"}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {[
                ["Situação Cadastral", resultado.situacaoCadastral, resultado.regularidadeRF === "regular" ? "#15803d" : "#dc2626"],
                ["Descrição", resultado.situacaoDesc, "#374151"],
                ["CNAE Principal", resultado.cnae, "#374151"],
                ["Município", resultado.municipio && resultado.uf ? `${resultado.municipio}/${resultado.uf}` : "—", "#374151"],
                ["Porte", resultado.porte, "#374151"],
                ["Natureza Jurídica", resultado.natureza, "#374151"],
                ["Abertura", resultado.dataAbertura, "#374151"],
                ["E-mail RF", resultado.email || "—", "#374151"],
              ].map(([l, v, c]) => v ? (
                <div key={l as string} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 11px" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: c as string }}>{v}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Alertas */}
          {resultado.alertas?.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px" }}>
              <h4 style={{ color: "#991b1b", fontSize: 13, marginBottom: 8 }}>🚨 Alertas</h4>
              {resultado.alertas.map((a: string, i: number) => <p key={i} style={{ color: "#991b1b", fontSize: 12, margin: "4px 0" }}>{a}</p>)}
            </div>
          )}

          {/* Recomendações */}
          {resultado.recomendacoes?.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px" }}>
              <h4 style={{ color: "#15803d", fontSize: 13, marginBottom: 8 }}>💡 Recomendações</h4>
              {resultado.recomendacoes.map((r: string, i: number) => <p key={i} style={{ color: "#166534", fontSize: 12, margin: "4px 0" }}>• {r}</p>)}
            </div>
          )}

          {/* Fontes para consulta oficial */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px" }}>
            <h4 style={{ color: "#0f5233", fontSize: 13, marginBottom: 10 }}>📋 Consultar certidões originais (fontes oficiais)</h4>
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 7, padding: "7px 11px", marginBottom: 10, fontSize: 11, color: "#92400e" }}>
              ⚠️ Os dados acima são informativos. Para contratos, licitações e fins legais, sempre consultar as certidões originais diretamente nos órgãos oficiais abaixo.
            </div>
            {resultado.fontes?.map((f: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{f.nome}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{f.obs}</div>
                </div>
                <a href={f.url} target="_blank" rel="noopener noreferrer"
                  style={{ background: "#1a7a4a", color: "#fff", padding: "5px 12px", borderRadius: 7, fontSize: 11, textDecoration: "none", fontWeight: 600, flexShrink: 0 }}>
                  Acessar →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {resultado?.error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: 16, color: "#991b1b", fontSize: 13 }}>
          ❌ {resultado.error}
        </div>
      )}
    </div>
  );

  const rLote = () => (
    <div>
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <h3 style={{ color: "#0f5233", fontSize: 14, marginBottom: 8 }}>Verificação em lote — todos os clientes e fornecedores</h3>
        <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>Consulta a situação cadastral de todos os CNPJs cadastrados no sistema via Receita Federal (BrasilAPI). Cache de 6 horas por CNPJ.</p>
        <button onClick={consultarLote} disabled={loadingLote}
          style={{ background: "#1a7a4a", color: "#fff", border: "none", padding: "10px 28px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: loadingLote ? 0.7 : 1 }}>
          {loadingLote ? "⟳ Consultando..." : "🔄 Verificar todos agora"}
        </button>
      </div>

      {lote && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 9, marginBottom: 16 }}>
            <Kpi l="Total" v={lote.total} i="📋" />
            <Kpi l="Regulares" v={lote.regulares} i="✅" c="#15803d" />
            <Kpi l="Irregulares" v={lote.irregulares} i="⛔" c="#dc2626" alert={lote.irregulares > 0} />
            <Kpi l="Pendentes" v={lote.pendentes} i="⚠️" c="#d97706" alert={lote.pendentes > 0} />
            <Kpi l="Não consultados" v={lote.desconhecidos} i="❓" c="#6b7280" />
          </div>

          {lote._demo && <div style={{ background: "#e0e7ff", border: "1px solid #c7d2fe", borderRadius: 8, padding: "8px 13px", marginBottom: 12, fontSize: 11, color: "#3730a3" }}>🔮 Dados demonstrativos — conecte o banco para consultas reais</div>}

          {(lote.irregulares > 0 || lote.pendentes > 0) && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
              <h4 style={{ color: "#991b1b", fontSize: 13, marginBottom: 8 }}>🚨 Atenção — CNPJs com irregularidade</h4>
              {lote.resultados?.filter((r: any) => r.regularidade !== "regular" && r.regularidade !== "desconhecida").map((r: any) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #fca5a5", alignItems: "center" }}>
                  <div><span style={{ fontWeight: 600, fontSize: 12 }}>{r.nome}</span><span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{r.cnpj}</span></div>
                  <Badge s={r.regularidade} />
                </div>
              ))}
            </div>
          )}

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr style={{ background: "#e8f5ee" }}>
                {["Tipo", "Nome", "CNPJ", "Situação RF", "Regularidade"].map(h =>
                  <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#0f5233" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {lote.resultados?.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ background: r.tipo === "cliente" ? "#e0e7ff" : "#fef3c7", color: r.tipo === "cliente" ? "#3730a3" : "#d97706", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>
                        {r.tipo === "cliente" ? "🤝 Cliente" : "📦 Fornecedor"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12 }}>{r.nome}</td>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 11 }}>{r.cnpj}</td>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{r.situacao}</td>
                    <td style={{ padding: "8px 12px" }}><Badge s={r.regularidade} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const rFontes = () => (
    <div>
      <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 12, color: "#664d03" }}>
        ⚠️ <strong>Aviso Legal:</strong> O sistema exibe dados informativos com base na Receita Federal via BrasilAPI. Para fins contratuais, licitatórios ou legais, as certidões devem ser obtidas diretamente nos órgãos oficiais abaixo. Validade das certidões: geralmente 180 dias.
      </div>
      {FONTES_CND.map((f, i) => {
        const [bg, co] = TIPO_COLOR[f.tipo] || ["#f3f4f6", "#374151"];
        return (
          <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{f.nome}</h4>
                  <span style={{ background: bg, color: co, padding: "2px 8px", borderRadius: 7, fontSize: 10, fontWeight: 700 }}>{f.tipo.toUpperCase()}</span>
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{f.obs}</p>
                <p style={{ margin: "3px 0 0", fontSize: 10, color: "#9ca3af", fontFamily: "monospace" }}>{f.url}</p>
              </div>
              <a href={f.url} target="_blank" rel="noopener noreferrer"
                style={{ background: "#0f5233", color: "#fff", padding: "7px 16px", borderRadius: 8, fontSize: 12, textDecoration: "none", fontWeight: 600, flexShrink: 0 }}>
                Acessar →
              </a>
            </div>
          </div>
        );
      })}
      <div style={{ background: "#f3e8ff", border: "1px solid #c4b5fd", borderRadius: 10, padding: "12px 16px", marginTop: 8 }}>
        <h4 style={{ color: "#6d28d9", fontSize: 13, marginBottom: 8 }}>📋 Lista de certidões para contratos públicos (Art. 29 da Lei 14.133/2021)</h4>
        {[
          "CND Federal e da Dívida Ativa da União — Receita Federal",
          "CND Estadual — SEFAZ do estado do estabelecimento",
          "CND Municipal — Prefeitura do domicílio fiscal",
          "CRF — Certificado de Regularidade do FGTS (CEF)",
          "CNDT — Certidão Negativa de Débitos Trabalhistas (TST)",
          "Prova de regularidade perante a Justiça do Trabalho",
        ].map((c, i) => <p key={i} style={{ margin: "4px 0", fontSize: 12, color: "#4c1d95" }}>• {c}</p>)}
      </div>
    </div>
  );

  const rHistorico = () => (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ color: "#0f5233", fontSize: 14 }}>Histórico de consultas desta sessão ({historico.length})</h3>
        {historico.length > 0 && <button onClick={() => setHistorico([])} style={{ background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 7, padding: "4px 12px", cursor: "pointer", fontSize: 11 }}>Limpar</button>}
      </div>
      {historico.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 13 }}>Nenhuma consulta realizada ainda nesta sessão.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {historico.map((h, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{h.razaoSocial}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{h.cnpj} · {h.consultadoEm}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{h.municipio && h.uf ? `${h.municipio}/${h.uf}` : ""} {h.cnae ? "· " + h.cnae?.split("—")[0] : ""}</div>
              </div>
              <Badge s={h.regularidadeRF} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const ABAS = [
    { id: "consulta", l: "🔍 Consulta Individual" },
    { id: "lote", l: "📋 Verificação em Lote" },
    { id: "fontes", l: "📎 Links Oficiais (CND)" },
    { id: "historico", l: `⏱ Histórico (${historico.length})` },
  ];

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ color: "#0f5233", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Regularidade Fiscal — Sintegra / CND</h1>
        <p style={{ color: "#6b7280", fontSize: 13 }}>Consulta automatizada de situação cadastral, regularidade fiscal e links para certidões oficiais</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ background: aba === a.id ? "#0f5233" : "transparent", color: aba === a.id ? "#fff" : "#374151", border: `1px solid ${aba === a.id ? "#0f5233" : "#d1d5db"}`, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: aba === a.id ? 700 : 400 }}>
            {a.l}
          </button>
        ))}
      </div>

      {aba === "consulta" && rConsulta()}
      {aba === "lote" && rLote()}
      {aba === "fontes" && rFontes()}
      {aba === "historico" && rHistorico()}
    </div>
  );
}
