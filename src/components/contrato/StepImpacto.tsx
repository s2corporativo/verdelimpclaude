// src/components/contrato/StepImpacto.tsx
"use client";
// Etapa 2: Impacto em todos os módulos
// Extraído de novo-contrato/page.tsx

interface Props {
  c: any;
  impacto: any;
  calculando: boolean;
  gerandoCronograma: boolean;
  analisandoEquipe: boolean;
  salvando: boolean;
  setAba: (a: string) => void;
  gerarCronograma: () => void;
  propagarContrato: () => void;
  calcularImpacto: () => void;
  fmt0: (v: number) => string;
  fmt: (v: number) => string;
}

export function StepImpacto({ c, impacto, calculando, gerandoCronograma, analisandoEquipe, salvando, setAba, gerarCronograma, propagarContrato, calcularImpacto, fmt0, fmt }: Props) {
  return (
    {/* ═══════════ ABA 2: IMPACTO NOS MÓDULOS ═══════════════════ */}
      {aba === "impacto" && impacto && (
        <div>
          {/* Resumo executivo */}
          <div style={{ background: "linear-gradient(135deg, #0f5233, #1a7a4a)", color: "#fff", borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>💼 {c.objeto || "Contrato"}</h3>
            <p style={{ fontSize: 12, opacity: 0.9, margin: "0 0 10px" }}>{c.clienteNome} · {c.municipio}/{c.uf} · Vigência {c.vigenciaMeses} meses</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              {[
                ["Receita total", "R$ " + fmt0(impacto.contrato.valorTotal)],
                ["Receita mensal", "R$ " + fmt0(impacto.contrato.valorMensal)],
                ["Margem mensal", "R$ " + fmt0(impacto.dre.margemMensal) + " (" + impacto.dre.margemPct + "%)"],
                ["Margem total", "R$ " + fmt0(impacto.dre.margemTotal)],
              ].map(([l, v]) => (
                <div key={l as string} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, opacity: 0.75, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              )</>)
            </div>
          </div>

          {/* Alertas */}
          {impacto.alertas?.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
              <h4 style={{ color: "#991b1b", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>🚨 Alertas</h4>
              {impacto.alertas.map((a: string, i: number) => <p key={i} style={{ color: "#991b1b", fontSize: 12, margin: "3px 0" }}>{a}</p></>)
            </div>
          </>)
          {impacto.recomendacoes?.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
              <h4 style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>💡 Recomendações</h4>
              {impacto.recomendacoes.map((r: string, i: number) => <p key={i} style={{ color: "#15803d", fontSize: 12, margin: "3px 0" }}>{r}</p></>)
            </div>
          </>)

          {/* Grid de módulos impactados */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 14 }}>
            {/* TRIBUTÁRIO */}
            <div style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#92400e", fontSize: 13, fontWeight: 700, margin: 0 }}>💸 Tributário</h4>
                <span style={{ background: "#fef9c3", color: "#92400e", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>+{c.vigenciaMeses * 2} lançamentos</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>DAS / mês (6,72%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#92400e" }}>R$ {fmt(impacto.tributario.dasMensal</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>ISS Betim / mês (5%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#92400e" }}>R$ {fmt(impacto.tributario.issMensal</>)</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Total tributos / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R$ {fmt(impacto.tributario.tributosMensal</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R$ {fmt0(impacto.tributario.tributosTotal</>)</td></tr>
                  <tr><td colSpan={2} style={{ paddingTop: 6, fontSize: 10, color: "#92400e" }}>Alíquota efetiva: <strong>{impacto.tributario.aliquotaEfetiva}%</strong></td></tr>
                </tbody>
              </table>
            </div>

            {/* RH / FOLHA */}
            <div style={{ background: "#fff", border: "1px solid #ddd6fe", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#6d28d9", fontSize: 13, fontWeight: 700, margin: 0 }}>👷 RH / Folha</h4>
                <span style={{ background: "#f3e8ff", color: "#6d28d9", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{impacto.rh.equipeNecessaria} pessoas</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>1 supervisor + {impacto.rh.operacionais} operacionais</td><td style={{ textAlign: "right" }}></td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Folha bruta / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.rh.folhaBruta</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>INSS patronal (7%)</td><td style={{ textAlign: "right" }}>R$ {fmt(impacto.rh.inssPatronal</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>FGTS (8%)</td><td style={{ textAlign: "right" }}>R$ {fmt(impacto.rh.fgts</>)</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Custo folha total / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#6d28d9" }}>R$ {fmt(impacto.rh.custoFolhaTotal</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#6d28d9" }}>R$ {fmt0(impacto.rh.custoFolhaContrato</>)</td></tr>
                </tbody>
              </table>
            </div>

            {/* LOGÍSTICA */}
            <div style={{ background: "#fff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#1e40af", fontSize: 13, fontWeight: 700, margin: 0 }}>🚛 Logística</h4>
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>+{impacto.logistica.osPrevistasTotal} OS</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Distância da base</td><td style={{ textAlign: "right", fontWeight: 700 }}>{impacto.logistica.distBase} km</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>OS previstas / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>{impacto.logistica.osPrevistasMes}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Km / mês</td><td style={{ textAlign: "right" }}>{fmt0(impacto.logistica.kmMes</>) km</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Custo combustível / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.logistica.custoKmMes</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Horas operacionais / mês</td><td style={{ textAlign: "right" }}>{impacto.logistica.horasOperacionaisMes}h</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Custo logística contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#1e40af" }}>R$ {fmt0(impacto.logistica.custoKmTotal</>)</td></tr>
                </tbody>
              </table>
            </div>

            {/* ALMOXARIFADO */}
            <div style={{ background: "#fff", border: "1px solid #fed7aa", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#c2410c", fontSize: 13, fontWeight: 700, margin: 0 }}>📦 Almoxarifado / EPI</h4>
                <span style={{ background: "#ffedd5", color: "#c2410c", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{impacto.rh.equipeNecessaria} kits EPI</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Material / mês (3% receita)</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.almoxarifado.materialMes</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>EPI / mês ({impacto.rh.equipeNecessaria} pessoas)</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.almoxarifado.epiMes</>)</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#c2410c" }}>R$ {fmt0(impacto.almoxarifado.materialTotal + impacto.almoxarifado.epiTotal</>)</td></tr>
                </tbody>
              </table>
            </div>

            {/* PRECIFICAÇÃO */}
            <div style={{ background: "#fff", border: `1px solid ${impacto.precificacao.competitividade === "lucrativo" ? "#86efac" : impacto.precificacao.competitividade === "apertado" ? "#fde68a" : "#fca5a5"}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, margin: 0 }}>🧮 Precificação</h4>
                <span style={{ background: impacto.precificacao.competitividade === "lucrativo" ? "#dcfce7" : impacto.precificacao.competitividade === "apertado" ? "#fef9c3" : "#fee2e2", color: impacto.precificacao.competitividade === "lucrativo" ? "#15803d" : impacto.precificacao.competitividade === "apertado" ? "#92400e" : "#991b1b", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>
                  {impacto.precificacao.competitividade.toUpperCase(</>)
                </span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Valor contratado / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.precificacao.valorContratado</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Valor ideal (markup 25%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#0f5233" }}>R$ {fmt(impacto.precificacao.valorIdeal</>)</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Diferença</td><td style={{ textAlign: "right", fontWeight: 700, color: impacto.precificacao.diferenca >= 0 ? "#15803d" : "#dc2626" }}>{impacto.precificacao.diferenca >= 0 ? "+" : ""}R$ {fmt(impacto.precificacao.diferenca</>)</td></tr>
                </tbody>
              </table>
            </div>

            {/* DRE */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, gridColumn: "span 1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, margin: 0 }}>📊 DRE Mensal</h4>
                <span style={{ background: impacto.dre.margemPct >= 25 ? "#dcfce7" : impacto.dre.margemPct >= 15 ? "#fef9c3" : "#fee2e2", color: impacto.dre.margemPct >= 25 ? "#15803d" : impacto.dre.margemPct >= 15 ? "#92400e" : "#991b1b", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>
                  Margem {impacto.dre.margemPct}%
                </span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ padding: "3px 0", fontWeight: 700, color: "#15803d" }}>(+) Receita</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt(impacto.dre.receitaMensal</>)</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Tributos</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.tributos</>)</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Folha</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.folha</>)</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Deslocamento</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.deslocamento</>)</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Material + EPI</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.material + impacto.dre.epi</>)</td></tr>
                  <tr style={{ borderTop: "2px solid #0f5233" }}><td style={{ padding: "6px 0", fontWeight: 700 }}>(=) Margem líquida</td><td style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: impacto.dre.margemPct >= 15 ? "#15803d" : "#dc2626" }}>R$ {fmt(impacto.dre.margemMensal</>)</td></tr>
                </tbody>
              </table>
            </div>

            {/* FINANCEIRO */}
            <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#15803d", fontSize: 13, fontWeight: 700, margin: 0 }}>💰 Financeiro</h4>
                <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>+{Math.min(c.vigenciaMeses, 24</>) receitas</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Receita / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt(impacto.financeiro.receitaMensal</>)</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Dia padrão pagamento</td><td style={{ textAlign: "right", fontWeight: 700 }}>Dia {impacto.financeiro.diaPagamento}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Receita total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt0(impacto.financeiro.receitaTotal</>)</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 16 }}>
            <button onClick={() => setAba("input"</>) style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Voltar e ajustar</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={gerarCronograma} disabled={gerandoCronograma}
                style={{ background: gerandoCronograma ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {gerandoCronograma ? "⟳ Gerando cronograma com IA..." : "📅 Gerar Cronograma →"}
              </button>
              <button onClick={propagarContrato} disabled={salvando}
                style={{ background: salvando ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {salvando ? "⟳ Salvando..." : "✅ Confirmar e Salvar"}
              </button>
            </div>
          </div>
        </div>
      </>)
  );
}
