"use client";
import React, { useEffect, useMemo, useState } from "react";
import { custoHoraHomem, calcularServico, PARAMETROS_PADRAO, type ParametrosHH } from "@/lib/hora-homem";
import { estiloInput, estiloLabel } from "@/lib/estilos";

const IS = estiloInput;
const LS = estiloLabel;
const CARD: any = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 };
const TH: any = { padding: "8px 10px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#334532" };
const TD: any = { padding: "7px 10px", fontSize: 12 };

const R$ = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n2 = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default function HoraHomemPage() {
  const [dados, setDados] = useState<any>(null);
  const [params, setParams] = useState<ParametrosHH>(PARAMETROS_PADRAO);
  const [detalheFuncao, setDetalheFuncao] = useState<string | null>(null);

  // Calculadora de serviço
  const [servicoIdx, setServicoIdx] = useState(0);
  const [quantidade, setQuantidade] = useState(5000);
  const [produtividade, setProdutividade] = useState(90);
  const [equipe, setEquipe] = useState<{ funcao: string; quantidade: number }[]>([]);
  const [horasDia, setHorasDia] = useState(8);
  const [extrasDia, setExtrasDia] = useState(250);
  const [materiais, setMateriais] = useState(0);
  const [bdiPct, setBdiPct] = useState(20);
  const [impostosPct, setImpostosPct] = useState(8);
  const [margemPct, setMargemPct] = useState(20);

  useEffect(() => {
    fetch("/api/hora-homem").then((r) => r.json()).then((d) => {
      setDados(d);
      if (d.parametros) setParams(d.parametros);
      if (d.produtividades?.[0]) setProdutividade(d.produtividades[0].porHH);
      if (d.funcoes?.length) setEquipe([{ funcao: d.funcoes[0].funcao, quantidade: 3 }]);
    });
  }, []);

  // Recalcula custo HH por função em tempo real quando os parâmetros mudam
  const funcoes = useMemo(() => {
    if (!dados?.funcoes) return [];
    return dados.funcoes.map((f: any) => ({ ...f, custo: custoHoraHomem(f.salarioMedio, params) }));
  }, [dados, params]);

  const resultado = useMemo(() => {
    const equipeCalc = equipe
      .map((e) => {
        const f = funcoes.find((x: any) => x.funcao === e.funcao);
        return f ? { funcao: e.funcao, quantidade: e.quantidade, custoHoraProdutiva: f.custo.custoHoraProdutiva } : null;
      })
      .filter(Boolean) as any[];
    if (!equipeCalc.length || quantidade <= 0 || produtividade <= 0) return null;
    return calcularServico({
      quantidade, produtividadePorHH: produtividade, equipe: equipeCalc,
      horasDia, custosExtrasDia: extrasDia, materiaisTotal: materiais,
      bdiPct, impostosPct, margemPct,
    });
  }, [equipe, funcoes, quantidade, produtividade, horasDia, extrasDia, materiais, bdiPct, impostosPct, margemPct]);

  const servicoSel = dados?.produtividades?.[servicoIdx];
  // Semáforo vs. mercado (PricingRule)
  const mercadoRef = useMemo(() => {
    if (!dados?.mercado || !servicoSel) return null;
    const nome = servicoSel.servico.toLowerCase();
    return dados.mercado.find((m: any) =>
      nome.includes(m.serviceType.toLowerCase().split(" ")[0].toLowerCase()) ||
      m.serviceType.toLowerCase().includes(nome.split(" ")[0]));
  }, [dados, servicoSel]);

  const setP = (k: keyof ParametrosHH) => (e: any) => setParams((p) => ({ ...p, [k]: Number(e.target.value) || 0 }));

  if (!dados) return <p style={{ fontSize: 13, color: "#6b7280" }}>Carregando…</p>;

  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>👷 Custo Hora-Homem</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 14 }}>
        Quanto custa DE VERDADE cada hora de trabalho — e quanto cobrar em cada serviço para não errar o preço.
      </p>

      {/* PARÂMETROS */}
      <div style={CARD}>
        <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 4 }}>⚙️ Parâmetros de encargos e jornada</h3>
        <p style={{ fontSize: 10.5, color: "#92400e", background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 7, padding: "6px 10px", marginBottom: 10 }}>
          Apoio gerencial — valide os percentuais com seu contador. A <b>eficiência</b> é o segredo: dos 220h pagos,
          quantos % viram trabalho no cliente (descontando deslocamento, chuva, DDS, montagem)?
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {([
            ["fgtsPct", "FGTS %"], ["inssPatronalPct", "INSS patronal %"], ["decimoTerceiroPct", "13º %"],
            ["feriasPct", "Férias+1/3 %"], ["provisaoRescisaoPct", "Rescisão %"],
            ["beneficiosMensais", "Benefícios R$/mês"], ["epiUniformeMensal", "EPI+uniforme R$/mês"],
            ["horasContratadasMes", "Horas pagas/mês"], ["eficienciaPct", "Eficiência % ⭐"],
            ["encargosSobreProvisoesPct", "Enc. s/ provisões %"],
          ] as [keyof ParametrosHH, string][]).map(([k, l]) => (
            <div key={k}><label style={LS}>{l}</label><input type="number" style={IS} value={params[k]} onChange={setP(k)} /></div>
          ))}
        </div>
      </div>

      {/* CUSTO HH POR FUNÇÃO */}
      <div style={CARD}>
        <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 10 }}>1️⃣ Custo real da hora de cada função (da sua folha)</h3>
        {dados._semFolha && <p style={{ fontSize: 12, color: "#92400e" }}>Cadastre funcionários em RH &amp; Folha para calcular com dados reais.</p>}
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr style={{ background: "#e8f5ee" }}>
            {["Função", "Pessoas", "Salário médio", "Encargos", "Custo/mês", "HH paga", "HH PRODUTIVA ⭐", ""].map((h) => <th key={h} style={TH}>{h}</th>)}
          </tr></thead>
          <tbody>{funcoes.map((f: any) => (
            <React.Fragment key={f.funcao}>
              <tr key={f.funcao} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ ...TD, fontWeight: 700 }}>{f.funcao}</td>
                <td style={TD}>{f.pessoas}</td>
                <td style={TD}>{R$(f.salarioMedio)}</td>
                <td style={TD}>{R$(f.custo.encargosValor)} <span style={{ color: "#6b7280", fontSize: 10 }}>({f.custo.encargosPct.toFixed(1)}%)</span></td>
                <td style={{ ...TD, fontWeight: 600 }}>{R$(f.custo.custoMensalTotal)}</td>
                <td style={{ ...TD, color: "#6b7280" }}>{R$(f.custo.custoHoraPaga)}</td>
                <td style={{ ...TD }}><span style={{ background: "#334532", color: "#fff", padding: "3px 10px", borderRadius: 8, fontWeight: 800, fontSize: 12 }}>{R$(f.custo.custoHoraProdutiva)}</span></td>
                <td style={TD}><button onClick={() => setDetalheFuncao(detalheFuncao === f.funcao ? null : f.funcao)} style={{ background: "#e0e7ff", color: "#3730a3", border: "none", padding: "3px 9px", borderRadius: 7, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>{detalheFuncao === f.funcao ? "fechar" : "abrir conta"}</button></td>
              </tr>
              {detalheFuncao === f.funcao && (
                <tr key={f.funcao + "-det"}><td colSpan={8} style={{ background: "#f9fafb", padding: "10px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, fontSize: 11 }}>
                    {f.custo.detalhe.map((d: any) => (
                      <div key={d.nome} style={{ display: "flex", justifyContent: "space-between", padding: "3px 8px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                        <span style={{ color: "#6b7280" }}>{d.nome}</span><b>{R$(d.valor)}</b>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10.5, color: "#374151", marginTop: 8 }}>
                    Custo mensal <b>{R$(f.custo.custoMensalTotal)}</b> ÷ {n2(f.custo.horasProdutivas)}h produtivas ({params.horasContratadasMes}h × {params.eficienciaPct}%) = <b>{R$(f.custo.custoHoraProdutiva)}/h</b>. É esse número que entra no preço — usar a "HH paga" subestima o custo e come a margem.
                  </p>
                </td></tr>
              )}
            </React.Fragment>
          ))}</tbody>
        </table>
      </div>

      {/* CALCULADORA DE SERVIÇO */}
      <div style={CARD}>
        <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 10 }}>2️⃣ Calculadora de serviço — quanto custa e quanto cobrar</h3>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label style={LS}>Serviço (produtividade de referência)</label>
            <select style={IS} value={servicoIdx} onChange={(e) => { const i = Number(e.target.value); setServicoIdx(i); setProdutividade(dados.produtividades[i].porHH); }}>
              {dados.produtividades.map((p: any, i: number) => <option key={p.servico} value={i}>{p.servico} — {p.porHH} {p.unidade}/HH</option>)}
            </select>
          </div>
          <div><label style={LS}>Quantidade ({servicoSel?.unidade})</label><input type="number" style={IS} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value) || 0)} /></div>
          <div><label style={LS}>Produtividade ({servicoSel?.unidade}/HH)</label><input type="number" style={IS} value={produtividade} onChange={(e) => setProdutividade(Number(e.target.value) || 0)} /></div>
          <div><label style={LS}>Horas produtivas/dia</label><input type="number" style={IS} value={horasDia} onChange={(e) => setHorasDia(Number(e.target.value) || 0)} /></div>
        </div>
        {servicoSel && <p style={{ fontSize: 10.5, color: "#6b7280", marginBottom: 10 }}>💡 {servicoSel.observacao} — ajuste a produtividade à realidade do terreno (vegetação alta/declive reduzem; área aberta aumenta).</p>}

        <label style={LS}>Equipe</label>
        {equipe.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
            <select style={{ ...IS, flex: 2 }} value={e.funcao} onChange={(ev) => setEquipe((p) => p.map((x, j) => j === i ? { ...x, funcao: ev.target.value } : x))}>
              {funcoes.map((f: any) => <option key={f.funcao}>{f.funcao}</option>)}
            </select>
            <input type="number" min={1} style={{ ...IS, flex: 1 }} value={e.quantidade} onChange={(ev) => setEquipe((p) => p.map((x, j) => j === i ? { ...x, quantidade: Number(ev.target.value) || 1 } : x))} />
            <span style={{ fontSize: 11, color: "#6b7280", flex: 1 }}>{(() => { const f = funcoes.find((x: any) => x.funcao === e.funcao); return f ? R$(f.custo.custoHoraProdutiva) + "/h cada" : ""; })()}</span>
            <button onClick={() => setEquipe((p) => p.filter((_, j) => j !== i))} style={{ background: "#fee2e2", color: "#991b1b", border: "none", padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 11 }}>✕</button>
          </div>
        ))}
        <button onClick={() => funcoes[0] && setEquipe((p) => [...p, { funcao: funcoes[0].funcao, quantidade: 1 }])} style={{ background: "#e8f5ee", color: "#334532", border: "1px solid #bbf7d0", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, marginBottom: 12 }}>+ Adicionar função</button>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 12 }}>
          <div><label style={LS}>Equip./transp. R$/dia</label><input type="number" style={IS} value={extrasDia} onChange={(e) => setExtrasDia(Number(e.target.value) || 0)} /></div>
          <div><label style={LS}>Materiais totais R$</label><input type="number" style={IS} value={materiais} onChange={(e) => setMateriais(Number(e.target.value) || 0)} /></div>
          <div><label style={LS}>BDI/adm/risco %</label><input type="number" style={IS} value={bdiPct} onChange={(e) => setBdiPct(Number(e.target.value) || 0)} /></div>
          <div><label style={LS}>Impostos %</label><input type="number" style={IS} value={impostosPct} onChange={(e) => setImpostosPct(Number(e.target.value) || 0)} /></div>
          <div><label style={LS}>Margem de lucro %</label><input type="number" style={IS} value={margemPct} onChange={(e) => setMargemPct(Number(e.target.value) || 0)} /></div>
        </div>

        {resultado && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
              {[
                ["Horas-homem", `${n2(resultado.horasHomemNecessarias)} HH`, "#374151"],
                ["Prazo estimado", `${resultado.diasEstimados} dia(s) c/ ${resultado.pessoas} pessoa(s)`, "#374151"],
                ["Custo mão de obra", R$(resultado.custoMaoDeObra), "#7c3aed"],
                ["Custo total (c/ BDI)", R$(resultado.custoTotal), "#d97706"],
              ].map(([l, v, c]) => (
                <div key={l as string} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: c as string, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#991b1b" }}>🚨 PREÇO MÍNIMO (margem zero — abaixo disso é prejuízo)</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#991b1b", margin: "4px 0" }}>{R$(resultado.precoMinimo)}</div>
                <div style={{ fontSize: 12, color: "#7f1d1d" }}>{R$(resultado.precoUnitarioMinimo)}/{servicoSel?.unidade}</div>
              </div>
              <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#15803d" }}>✅ PREÇO SUGERIDO (margem {margemPct}%)</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#15803d", margin: "4px 0" }}>{R$(resultado.precoSugerido)}</div>
                <div style={{ fontSize: 12, color: "#166534" }}>{R$(resultado.precoUnitarioSugerido)}/{servicoSel?.unidade}</div>
              </div>
            </div>
            {mercadoRef && (
              <div style={{ marginTop: 10, padding: "9px 13px", borderRadius: 9, fontSize: 12,
                background: resultado.precoUnitarioSugerido > mercadoRef.maxPrice ? "#fef2f2" : resultado.precoUnitarioSugerido < mercadoRef.minPrice ? "#fef9c3" : "#f0fdf4",
                border: "1px solid " + (resultado.precoUnitarioSugerido > mercadoRef.maxPrice ? "#fca5a5" : resultado.precoUnitarioSugerido < mercadoRef.minPrice ? "#fde68a" : "#86efac") }}>
                📊 <b>Mercado ({mercadoRef.serviceType})</b>: {R$(mercadoRef.minPrice)} a {R$(mercadoRef.maxPrice)}/{mercadoRef.unit} (ref. {R$(mercadoRef.marketReference)}). Seu sugerido: <b>{R$(resultado.precoUnitarioSugerido)}</b> — {resultado.precoUnitarioSugerido > mercadoRef.maxPrice ? "acima do teto: risco de perder o cliente; reveja equipe/produtividade" : resultado.precoUnitarioSugerido < mercadoRef.minPrice ? "abaixo do piso de mercado: você pode estar deixando dinheiro na mesa (ou a produtividade está otimista)" : "dentro da faixa de mercado ✓"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
