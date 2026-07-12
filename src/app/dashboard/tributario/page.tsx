"use client";
// Módulo Tributário — orientação de impostos, Fator R, comparação de regimes
// e auditoria de economia estratégica. Simulação; validar com o contador.
import { useEffect, useState, useCallback } from "react";
import {
  ANEXOS, TETO_SIMPLES, aliquotaEfetivaSimples, fatorR, simularSimples,
  simularPresumido, folhaParaFatorR,
} from "@/lib/tributario";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => v.toFixed(2).replace(".", ",") + "%";

export default function TributarioPage() {
  const [receita12, setReceita12] = useState(0);
  const [folha12, setFolha12] = useState(0);
  const [iss, setIss] = useState(5);
  const [anexo, setAnexo] = useState<"III" | "IV" | "V">("IV");
  const [proLabore, setProLabore] = useState(0);
  const [carregou, setCarregou] = useState(false);
  const [meta, setMeta] = useState<any>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/tributario");
      const j = await r.json();
      if (j.receita12) setReceita12(Math.round(j.receita12));
      if (j.folha12) setFolha12(Math.round(j.folha12));
      if (j.issPct) setIss(Number(j.issPct));
      setMeta(j);
    } catch {}
    setCarregou(true);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const receitaMes = receita12 / 12;
  const folhaMes = folha12 / 12;
  const folhaTotal12 = folha12 + proLabore * 12;
  const fr = fatorR(folhaTotal12, receita12);
  const anexoPorFatorR = fr >= 28 ? "III" : "V";

  const simSimples = simularSimples(receitaMes, receita12, anexo, folhaMes);
  const simIII = simularSimples(receitaMes, receita12, "III", folhaMes);
  const simV = simularSimples(receitaMes, receita12, "V", folhaMes);
  const simPresumido = simularPresumido(receitaMes, folhaMes, iss);

  const folhaAlvo = folhaParaFatorR(receita12, 28);
  const faltaFolha = Math.max(0, folhaAlvo - folhaTotal12);
  const economiaFatorR = simV.cargaTotalMensal - simIII.cargaTotalMensal;

  const num = (v: number, set: (n: number) => void, label: string, dica?: string) => (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block" }}>{label}</label>
      <input type="number" value={v || ""} onChange={(e) => set(Number(e.target.value))}
        style={{ padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, width: 160 }} />
      {dica && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9ca3af" }}>{dica}</p>}
    </div>
  );

  const cardRegime = (titulo: string, carga: number, cargaPct: number, cor: string, melhor: boolean, detalhe?: string) => (
    <div style={{ background: "#fff", borderRadius: 12, border: `2px solid ${melhor ? "#4a9410" : "#e5e7eb"}`, padding: 16, flex: 1, minWidth: 200, position: "relative" }}>
      {melhor && <span style={{ position: "absolute", top: -10, left: 14, background: "#4a9410", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>MAIS ECONÔMICO</span>}
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: cor }}>{titulo}</p>
      <p style={{ margin: "8px 0 0", fontSize: 24, fontWeight: 900, color: "#111827" }}>{brl(carga)}<span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>/mês</span></p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>{pct(cargaPct)} da receita</p>
      {detalhe && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#9ca3af" }}>{detalhe}</p>}
    </div>
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 900, color: "#334532", marginBottom: 4 }}>🧾 Inteligência Tributária</h1>
      <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12, maxWidth: 720 }}>
        Orientação de impostos, Fator R, comparação de regimes e economia estratégica. Os dados abaixo vêm da sua receita e folha reais — ajuste o que precisar.
      </p>
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#92400e" }}>
        ⚠️ <strong>Isto é uma simulação de apoio à decisão</strong>, com base nas tabelas do Simples Nacional (LC 123/2006 e LC 155/2016). O enquadramento do Anexo e as alíquotas de ISS dependem do seu CNAE e serviço — <strong>confirme sempre com o seu contador</strong> antes de mudar de regime ou de estratégia.
      </div>

      {/* Parâmetros */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 18, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        {num(receita12, setReceita12, "Receita bruta 12 meses (R$)", meta?.fontesReceita ? "puxado das medições/NFS-e" : undefined)}
        {num(folha12, setFolha12, "Folha 12 meses (R$)", "salários + FGTS (aprox.)")}
        {num(proLabore, setProLabore, "Pró-labore mensal (R$)", "entra no Fator R")}
        {num(iss, setIss, "ISS do município (%)")}
        <button onClick={carregar} style={{ background: "#f3f4f6", border: "none", padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>↻ Recarregar dados reais</button>
      </div>

      {/* Fator R — a alavanca principal */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 18, marginBottom: 18, borderLeft: `5px solid ${fr >= 28 ? "#15803d" : "#b45309"}` }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: "#334532", margin: "0 0 4px" }}>⭐ Fator R — a maior alavanca de economia</h2>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6b7280" }}>
          É a razão folha ÷ receita (12 meses). Para serviços sujeitos ao Fator R: <strong>≥ 28% → Anexo III</strong> (mais barato); <strong>&lt; 28% → Anexo V</strong> (mais caro).
        </p>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 700 }}>SEU FATOR R</p>
            <p style={{ margin: "2px 0 0", fontSize: 32, fontWeight: 900, color: fr >= 28 ? "#15803d" : "#b45309" }}>{pct(fr)}</p>
          </div>
          <div style={{ flex: 1, minWidth: 260, fontSize: 13, color: "#374151" }}>
            {fr >= 28 ? (
              <p style={{ margin: 0 }}>✅ Você está <strong>acima de 28%</strong> — se o seu serviço é sujeito ao Fator R, se enquadra no <strong>Anexo III</strong>, o mais econômico. Mantenha o pró-labore/folha nesse patamar.</p>
            ) : (
              <>
                <p style={{ margin: 0 }}>⚠️ Você está <strong>abaixo de 28%</strong> — cairia no <strong>Anexo V</strong> (alíquotas maiores).</p>
                <p style={{ margin: "6px 0 0" }}>Para chegar a 28% faltam <strong>{brl(faltaFolha)}</strong> de folha/pró-labore no ano (≈ {brl(faltaFolha / 12)}/mês).</p>
                <p style={{ margin: "6px 0 0", color: "#15803d", fontWeight: 700 }}>💡 Migrar do Anexo V para o III economizaria ≈ {brl(economiaFatorR)}/mês ({brl(economiaFatorR * 12)}/ano).</p>
              </>
            )}
          </div>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9ca3af" }}>
          Atenção: serviços de <strong>limpeza, conservação, vigilância e obras</strong> costumam ser <strong>Anexo IV</strong> por natureza (o Fator R não os move). Confirme o seu caso com o contador.
        </p>
      </div>

      {/* Comparação de regimes */}
      <h2 style={{ fontSize: 15, fontWeight: 800, color: "#334532", margin: "0 0 10px" }}>⚖️ Comparação de carga tributária (mês atual)</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>Anexo do Simples para você:</span>
        {(["III", "IV", "V"] as const).map((a) => (
          <button key={a} onClick={() => setAnexo(a)}
            style={{ background: anexo === a ? "#334532" : "#fff", color: anexo === a ? "#fff" : "#374151", border: "1px solid #d1d5db", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            Anexo {a}
          </button>
        ))}
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{ANEXOS[anexo].descricao}</span>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        {cardRegime(
          `Simples — Anexo ${anexo} (faixa ${simSimples.faixa})`,
          simSimples.cargaTotalMensal, simSimples.cargaTotalPct, "#4a9410",
          simSimples.cargaTotalMensal <= simPresumido.cargaTotalMensal,
          `Alíquota efetiva DAS ${pct(simSimples.aliquotaEfetiva)}${simSimples.inssForaDas > 0 ? ` + INSS ${brl(simSimples.inssForaDas)} fora do DAS` : ""}`,
        )}
        {cardRegime(
          "Lucro Presumido",
          simPresumido.cargaTotalMensal, simPresumido.cargaTotalPct, "#7c3aed",
          simPresumido.cargaTotalMensal < simSimples.cargaTotalMensal,
          "IRPJ+CSLL+PIS+COFINS+ISS+INSS patronal",
        )}
      </div>

      {/* Detalhe Lucro Presumido */}
      <details style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 18 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#334532" }}>Ver a conta do Lucro Presumido</summary>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 10 }}>
          <tbody>
            {simPresumido.detalhe.map((d, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "6px 8px" }}>{d.nome}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700 }}>{brl(d.valor)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: "2px solid #e5e7eb" }}>
              <td style={{ padding: "6px 8px", fontWeight: 800 }}>Total mensal</td>
              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 900, color: "#7c3aed" }}>{brl(simPresumido.cargaTotalMensal)}</td>
            </tr>
          </tbody>
        </table>
      </details>

      {/* Auditoria de economia */}
      <h2 style={{ fontSize: 15, fontWeight: 800, color: "#334532", margin: "0 0 10px" }}>🔍 Auditoria de economia estratégica</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(() => {
          const achados: { nivel: "ok" | "dica" | "risco"; texto: string }[] = [];
          if (receita12 === 0) achados.push({ nivel: "risco", texto: "Sem receita registrada nos últimos 12 meses — cadastre medições/NFS-e para a auditoria usar seus números reais." });
          if (fr < 28 && receita12 > 0) achados.push({ nivel: "dica", texto: `Fator R em ${pct(fr)}: aumentar a folha/pró-labore em ${brl(faltaFolha / 12)}/mês leva ao Anexo III e economiza ≈ ${brl(economiaFatorR)}/mês. Avalie com o contador se seu serviço é sujeito ao Fator R.` });
          if (fr >= 28) achados.push({ nivel: "ok", texto: `Fator R saudável (${pct(fr)}) — mantém você no anexo mais econômico entre III e V.` });
          const melhorSimples = Math.min(simIII.cargaTotalMensal, simSimples.cargaTotalMensal);
          if (simPresumido.cargaTotalMensal < melhorSimples && receita12 > 0) achados.push({ nivel: "dica", texto: `O Lucro Presumido apareceu mais barato que o Simples (${brl(simPresumido.cargaTotalMensal)} vs ${brl(melhorSimples)}/mês). Vale uma análise de mudança de regime com o contador — depende de créditos e da folha real.` });
          else if (receita12 > 0) achados.push({ nivel: "ok", texto: `O Simples (Anexo ${anexo}) está mais econômico que o Lucro Presumido no seu cenário atual.` });
          if (receita12 > TETO_SIMPLES * 0.8 && receita12 <= TETO_SIMPLES) achados.push({ nivel: "risco", texto: `Sua receita 12m (${brl(receita12)}) está acima de 80% do teto do Simples (${brl(TETO_SIMPLES)}). Planeje: perto do teto, o sublimite de ICMS/ISS e o desenquadramento precisam de atenção.` });
          if (receita12 > TETO_SIMPLES) achados.push({ nivel: "risco", texto: `Receita acima do teto do Simples (${brl(TETO_SIMPLES)}) — você provavelmente já está em Lucro Presumido/Real. Confirme o regime nas Configurações.` });
          achados.push({ nivel: "dica", texto: "Cessão de mão de obra: o tomador retém 11% de INSS na sua NF (compensável). Controle essas retenções para não pagar INSS em duplicidade." });
          achados.push({ nivel: "dica", texto: "ISS: se o serviço é prestado em outro município, verifique onde o ISS é devido — retenção na fonte pelo tomador é comum e evita bitributação." });

          const cor = { ok: ["#dcfce7", "#15803d", "✅"], dica: ["#e0f2fe", "#075985", "💡"], risco: ["#fef3c7", "#92400e", "⚠️"] } as const;
          return achados.map((a, i) => {
            const [bg, c, ic] = cor[a.nivel];
            return (
              <div key={i} style={{ background: bg, color: c, borderRadius: 10, padding: "11px 14px", fontSize: 12.5, fontWeight: 500 }}>
                {ic} {a.texto}
              </div>
            );
          });
        })()}
      </div>

      {!carregou && <p style={{ color: "#6b7280", fontSize: 12, marginTop: 12 }}>Carregando seus dados…</p>}
    </div>
  );
}
