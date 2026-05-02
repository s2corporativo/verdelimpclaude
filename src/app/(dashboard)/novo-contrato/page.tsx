
"use client";
import { useState } from "react";

export default function NovoContratoPage() {
  const [aba, setAba] = useState<"input"|"impacto"|"sucesso">("input");
  const [modoEntrada, setModoEntrada] = useState<"manual"|"colar">("manual");
  const [textoColado, setTextoColado] = useState("");
  const [extraindo, setExtraindo] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [impacto, setImpacto] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");

  const [c, setC] = useState({
    objeto: "",
    clienteNome: "",
    clienteCnpj: "",
    valorMensal: "",
    valorTotal: "",
    vigenciaMeses: "12",
    dataInicio: "",
    dataFim: "",
    tipoServico: "Roçada Manual",
    areaM2: "",
    diasExecucao: "4",
    equipeMinima: "",
    municipio: "Betim",
    uf: "MG",
    enderecos: "",
    modalidadeLicitacao: "",
    indiceReajuste: "INPC",
    observacoes: "",
  });

  const fmt = (v: number) => v?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = (v: number) => v?.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const extrairTexto = async () => {
    if (textoColado.length < 30) { setErro("Cole pelo menos 30 caracteres do edital/contrato"); return; }
    setExtraindo(true); setErro("");
    try {
      const r = await fetch("/api/extrair-edital", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: textoColado }) });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      const e = d.dados;
      setC(prev => ({
        ...prev,
        objeto: e.objeto || prev.objeto,
        clienteNome: e.clienteNome || prev.clienteNome,
        clienteCnpj: e.clienteCnpj || prev.clienteCnpj,
        valorMensal: String(e.valorMensal || prev.valorMensal || ""),
        valorTotal: String(e.valorTotal || prev.valorTotal || ""),
        vigenciaMeses: String(e.vigenciaMeses || prev.vigenciaMeses || "12"),
        dataInicio: e.dataInicio || prev.dataInicio,
        dataFim: e.dataFim || prev.dataFim,
        tipoServico: e.tipoServico || prev.tipoServico,
        areaM2: String(e.areaM2 || prev.areaM2 || ""),
        diasExecucao: String(e.diasExecucao || prev.diasExecucao || "4"),
        equipeMinima: String(e.equipeMinima || prev.equipeMinima || ""),
        municipio: e.municipio || prev.municipio,
        uf: e.uf || prev.uf,
        enderecos: Array.isArray(e.enderecos) ? e.enderecos.join("\n") : prev.enderecos,
        modalidadeLicitacao: e.modalidadeLicitacao || prev.modalidadeLicitacao,
        indiceReajuste: e.indiceReajuste || prev.indiceReajuste,
        observacoes: e.observacoes || prev.observacoes,
      }));
      setModoEntrada("manual"); // mostra os dados extraídos no formulário
    } catch (e: any) { setErro(e.message); }
    setExtraindo(false);
  };

  const calcularImpacto = async () => {
    if (!c.valorMensal || !c.vigenciaMeses) { setErro("Preencha valor mensal e vigência"); return; }
    setCalculando(true); setErro("");
    try {
      const r = await fetch("/api/contrato-impacto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...c,
          valorMensal: Number(c.valorMensal),
          valorTotal: Number(c.valorTotal) || Number(c.valorMensal) * Number(c.vigenciaMeses),
          vigenciaMeses: Number(c.vigenciaMeses),
          areaM2: Number(c.areaM2) || undefined,
          diasExecucao: Number(c.diasExecucao) || undefined,
          equipeMinima: Number(c.equipeMinima) || undefined,
        })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      setImpacto(d);
      setAba("impacto");
    } catch (e: any) { setErro(e.message); }
    setCalculando(false);
  };

  const propagarContrato = async () => {
    setSalvando(true); setErro("");
    try {
      const r = await fetch("/api/contrato-propagar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato: {
            ...c,
            valorMensal: Number(c.valorMensal),
            valorTotal: Number(c.valorTotal) || Number(c.valorMensal) * Number(c.vigenciaMeses),
            vigenciaMeses: Number(c.vigenciaMeses),
            areaM2: Number(c.areaM2) || undefined,
            enderecos: c.enderecos ? c.enderecos.split("\n").filter(Boolean) : [],
          },
          impacto,
        })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      setResultado(d);
      setAba("sucesso");
    } catch (e: any) { setErro(e.message); }
    setSalvando(false);
  };

  const IS: any = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13 };
  const LS: any = { fontSize:11, fontWeight:600, color:"#374151", display:"block", marginBottom:3 };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: "#0f5233", fontSize: 22, fontWeight: 700, margin: 0 }}>📋 Cadastrar Contrato/Cotação</h1>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
          Ao salvar, o sistema propaga automaticamente em <strong>Logística</strong>, <strong>Tributário</strong>, <strong>Financeiro</strong>, <strong>RH</strong>, <strong>DRE</strong> e <strong>Almoxarifado</strong>.
        </p>
      </div>

      {/* Barra de etapas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 6 }}>
        {[
          ["input", "1. Dados do contrato"],
          ["impacto", "2. Impacto nos módulos"],
          ["sucesso", "3. Confirmação"],
        ].map(([id, l], i) => (
          <div key={id} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: aba === id ? "#0f5233" : "#f9fafb", color: aba === id ? "#fff" : "#6b7280", fontWeight: 600, fontSize: 12, textAlign: "center" }}>
            {l}
          </div>
        ))}
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "9px 14px", marginBottom: 14, color: "#991b1b", fontSize: 13 }}>❌ {erro}</div>}

      {/* ═══════════ ABA 1: ENTRADA DE DADOS ═══════════════════════ */}
      {aba === "input" && (
        <div>
          {/* Toggle modo entrada */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Como você quer informar os dados?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModoEntrada("manual")}
                style={{ background: modoEntrada === "manual" ? "#0f5233" : "#f3f4f6", color: modoEntrada === "manual" ? "#fff" : "#374151", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                ✍️ Preencher manualmente
              </button>
              <button onClick={() => setModoEntrada("colar")}
                style={{ background: modoEntrada === "colar" ? "#7c3aed" : "#f3f4f6", color: modoEntrada === "colar" ? "#fff" : "#374151", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                🤖 Colar texto do edital — IA extrai
              </button>
            </div>
          </div>

          {/* Modo: colar texto */}
          {modoEntrada === "colar" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <h3 style={{ color: "#7c3aed", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🤖 IA — Extrair dados de edital/contrato</h3>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Cole o texto do edital, contrato ou cotação. A IA extrai automaticamente: cliente, CNPJ, valor, vigência, área, tipo de serviço, modalidade, etc.</p>
              <textarea style={{ ...IS, height: 200, resize: "vertical", fontFamily: "system-ui" }} value={textoColado} onChange={e => setTextoColado(e.target.value)}
                placeholder="Cole aqui o texto do edital, contrato ou cotação..." />
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{textoColado.length} caracteres</p>
              <button onClick={extrairTexto} disabled={extraindo || textoColado.length < 30}
                style={{ background: extraindo ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, marginTop: 8, opacity: textoColado.length < 30 ? 0.5 : 1 }}>
                {extraindo ? "⟳ IA analisando..." : "🤖 Extrair dados com IA"}
              </button>
            </div>
          )}

          {/* Formulário */}
          {modoEntrada === "manual" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <h3 style={{ color: "#0f5233", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📝 Dados do Contrato</h3>

              {/* Cliente */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Cliente / Contratante *</label><input style={IS} value={c.clienteNome} onChange={e => setC(p => ({...p, clienteNome: e.target.value}))} placeholder="Ex: Prefeitura de Belo Horizonte"/></div>
                <div><label style={LS}>CNPJ</label><input style={IS} value={c.clienteCnpj} onChange={e => setC(p => ({...p, clienteCnpj: e.target.value}))} placeholder="00.000.000/0000-00"/></div>
              </div>

              {/* Objeto */}
              <div style={{ marginBottom: 10 }}>
                <label style={LS}>Objeto do contrato *</label>
                <input style={IS} value={c.objeto} onChange={e => setC(p => ({...p, objeto: e.target.value}))} placeholder="Ex: Roçada manual e mecanizada de canteiros..."/>
              </div>

              {/* Valores */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Valor mensal (R$) *</label><input type="number" step="0.01" style={IS} value={c.valorMensal} onChange={e => setC(p => ({...p, valorMensal: e.target.value, valorTotal: String(Number(e.target.value) * Number(p.vigenciaMeses || 12))}))}/></div>
                <div><label style={LS}>Vigência (meses) *</label><input type="number" style={IS} value={c.vigenciaMeses} onChange={e => setC(p => ({...p, vigenciaMeses: e.target.value, valorTotal: String(Number(p.valorMensal || 0) * Number(e.target.value))}))}/></div>
                <div><label style={LS}>Valor total (R$)</label><input type="number" step="0.01" style={{...IS, background: "#f9fafb"}} value={c.valorTotal} onChange={e => setC(p => ({...p, valorTotal: e.target.value}))}/></div>
                <div><label style={LS}>Início *</label><input type="date" style={IS} value={c.dataInicio} onChange={e => setC(p => ({...p, dataInicio: e.target.value}))}/></div>
                <div><label style={LS}>Reajuste</label><select style={IS} value={c.indiceReajuste} onChange={e => setC(p => ({...p, indiceReajuste: e.target.value}))}>
                  {["INPC","IPCA","IGPM","Sem reajuste"].map(x => <option key={x}>{x}</option>)}
                </select></div>
              </div>

              {/* Serviço */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Tipo de serviço</label><select style={IS} value={c.tipoServico} onChange={e => setC(p => ({...p, tipoServico: e.target.value}))}>
                  {["Roçada Manual","Roçada Mecanizada","Jardinagem Mensal","PRADA/PTRF","Limpeza","Podação","Hidrossemeadura","Controle de Formigas","Outro"].map(x => <option key={x}>{x}</option>)}
                </select></div>
                <div><label style={LS}>Área (m²)</label><input type="number" style={IS} value={c.areaM2} onChange={e => setC(p => ({...p, areaM2: e.target.value}))}/></div>
                <div><label style={LS}>Dias execução / mês</label><input type="number" style={IS} value={c.diasExecucao} onChange={e => setC(p => ({...p, diasExecucao: e.target.value}))}/></div>
                <div><label style={LS}>Equipe mínima</label><input type="number" style={IS} value={c.equipeMinima} onChange={e => setC(p => ({...p, equipeMinima: e.target.value}))} placeholder="auto"/></div>
                <div><label style={LS}>Modalidade</label><select style={IS} value={c.modalidadeLicitacao} onChange={e => setC(p => ({...p, modalidadeLicitacao: e.target.value}))}>
                  <option value="">— escolher —</option>
                  {["Pregão Eletrônico","Concorrência","Dispensa","Direto","Privado"].map(x => <option key={x}>{x}</option>)}
                </select></div>
              </div>

              {/* Endereço */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Município</label><input style={IS} value={c.municipio} onChange={e => setC(p => ({...p, municipio: e.target.value}))}/></div>
                <div><label style={LS}>UF</label><input style={IS} value={c.uf} onChange={e => setC(p => ({...p, uf: e.target.value}))}/></div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={LS}>Endereços de execução (um por linha)</label>
                <textarea style={{ ...IS, height: 60 }} value={c.enderecos} onChange={e => setC(p => ({...p, enderecos: e.target.value}))} placeholder="Av. Vilarinho, s/n — Canteiros&#10;R. Floriano Peixoto, 2100"/>
              </div>

              {/* Observações */}
              <div style={{ marginBottom: 14 }}>
                <label style={LS}>Observações / Equipamentos / Restrições</label>
                <textarea style={{ ...IS, height: 70 }} value={c.observacoes} onChange={e => setC(p => ({...p, observacoes: e.target.value}))}/>
              </div>

              <button onClick={calcularImpacto} disabled={calculando || !c.valorMensal || !c.vigenciaMeses}
                style={{ background: calculando ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: (!c.valorMensal || !c.vigenciaMeses) ? 0.5 : 1 }}>
                {calculando ? "⟳ Calculando impacto em todos os módulos..." : "🚀 Calcular Impacto Total →"}
              </button>
            </div>
          )}
        </div>
      )}

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
              ))}
            </div>
          </div>

          {/* Alertas */}
          {impacto.alertas?.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
              <h4 style={{ color: "#991b1b", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>🚨 Alertas</h4>
              {impacto.alertas.map((a: string, i: number) => <p key={i} style={{ color: "#991b1b", fontSize: 12, margin: "3px 0" }}>{a}</p>)}
            </div>
          )}
          {impacto.recomendacoes?.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
              <h4 style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>💡 Recomendações</h4>
              {impacto.recomendacoes.map((r: string, i: number) => <p key={i} style={{ color: "#15803d", fontSize: 12, margin: "3px 0" }}>{r}</p>)}
            </div>
          )}

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
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>DAS / mês (6,72%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#92400e" }}>R$ {fmt(impacto.tributario.dasMensal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>ISS Betim / mês (5%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#92400e" }}>R$ {fmt(impacto.tributario.issMensal)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Total tributos / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R$ {fmt(impacto.tributario.tributosMensal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R$ {fmt0(impacto.tributario.tributosTotal)}</td></tr>
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
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Folha bruta / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.rh.folhaBruta)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>INSS patronal (7%)</td><td style={{ textAlign: "right" }}>R$ {fmt(impacto.rh.inssPatronal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>FGTS (8%)</td><td style={{ textAlign: "right" }}>R$ {fmt(impacto.rh.fgts)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Custo folha total / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#6d28d9" }}>R$ {fmt(impacto.rh.custoFolhaTotal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#6d28d9" }}>R$ {fmt0(impacto.rh.custoFolhaContrato)}</td></tr>
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
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Km / mês</td><td style={{ textAlign: "right" }}>{fmt0(impacto.logistica.kmMes)} km</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Custo combustível / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.logistica.custoKmMes)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Horas operacionais / mês</td><td style={{ textAlign: "right" }}>{impacto.logistica.horasOperacionaisMes}h</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Custo logística contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#1e40af" }}>R$ {fmt0(impacto.logistica.custoKmTotal)}</td></tr>
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
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Material / mês (3% receita)</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.almoxarifado.materialMes)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>EPI / mês ({impacto.rh.equipeNecessaria} pessoas)</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.almoxarifado.epiMes)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#c2410c" }}>R$ {fmt0(impacto.almoxarifado.materialTotal + impacto.almoxarifado.epiTotal)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* PRECIFICAÇÃO */}
            <div style={{ background: "#fff", border: `1px solid ${impacto.precificacao.competitividade === "lucrativo" ? "#86efac" : impacto.precificacao.competitividade === "apertado" ? "#fde68a" : "#fca5a5"}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, margin: 0 }}>🧮 Precificação</h4>
                <span style={{ background: impacto.precificacao.competitividade === "lucrativo" ? "#dcfce7" : impacto.precificacao.competitividade === "apertado" ? "#fef9c3" : "#fee2e2", color: impacto.precificacao.competitividade === "lucrativo" ? "#15803d" : impacto.precificacao.competitividade === "apertado" ? "#92400e" : "#991b1b", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>
                  {impacto.precificacao.competitividade.toUpperCase()}
                </span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Valor contratado / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.precificacao.valorContratado)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Valor ideal (markup 25%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#0f5233" }}>R$ {fmt(impacto.precificacao.valorIdeal)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Diferença</td><td style={{ textAlign: "right", fontWeight: 700, color: impacto.precificacao.diferenca >= 0 ? "#15803d" : "#dc2626" }}>{impacto.precificacao.diferenca >= 0 ? "+" : ""}R$ {fmt(impacto.precificacao.diferenca)}</td></tr>
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
                  <tr><td style={{ padding: "3px 0", fontWeight: 700, color: "#15803d" }}>(+) Receita</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt(impacto.dre.receitaMensal)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Tributos</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.tributos)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Folha</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.folha)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Deslocamento</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.deslocamento)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Material + EPI</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.material + impacto.dre.epi)}</td></tr>
                  <tr style={{ borderTop: "2px solid #0f5233" }}><td style={{ padding: "6px 0", fontWeight: 700 }}>(=) Margem líquida</td><td style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: impacto.dre.margemPct >= 15 ? "#15803d" : "#dc2626" }}>R$ {fmt(impacto.dre.margemMensal)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* FINANCEIRO */}
            <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#15803d", fontSize: 13, fontWeight: 700, margin: 0 }}>💰 Financeiro</h4>
                <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>+{Math.min(c.vigenciaMeses, 24)} receitas</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Receita / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt(impacto.financeiro.receitaMensal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Dia padrão pagamento</td><td style={{ textAlign: "right", fontWeight: 700 }}>Dia {impacto.financeiro.diaPagamento}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Receita total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt0(impacto.financeiro.receitaTotal)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 16 }}>
            <button onClick={() => setAba("input")} style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Voltar e ajustar</button>
            <button onClick={propagarContrato} disabled={salvando}
              style={{ background: salvando ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px 32px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              {salvando ? "⟳ Salvando e propagando em todos os módulos..." : "✅ Confirmar e Propagar em Todos os Módulos →"}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ ABA 3: SUCESSO ════════════════════════════════ */}
      {aba === "sucesso" && resultado && (
        <div style={{ background: "#fff", border: "2px solid #15803d", borderRadius: 14, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
          <h2 style={{ color: "#15803d", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>{resultado.mensagem}</h2>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 22px" }}>
            Contrato <strong style={{ color: "#0f5233", fontFamily: "monospace" }}>{resultado.contratoNumero}</strong> criado e propagado.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 22 }}>
            {[
              ["Cliente", resultado.propagacao.clienteCriado ? "✅ Cadastrado" : "✓ Já existia", "#0f5233"],
              ["Contrato", "✅ Criado", "#0f5233"],
              ["Tributos projetados", "✅ " + resultado.propagacao.tributosProjetados + " lançamentos", "#92400e"],
              ["Receitas projetadas", "✅ " + resultado.propagacao.receitasProjetadas + " no caixa", "#15803d"],
              ["OS na logística", "✅ " + resultado.propagacao.osProjetadas + " geradas", "#1e40af"],
            ].map(([l, v, c], i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${c}` }}>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
          {resultado.propagacao.avisos?.length > 0 && (
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "left" }}>
              <strong style={{ color: "#92400e", fontSize: 12 }}>⚠️ Avisos:</strong>
              {resultado.propagacao.avisos.map((a: string, i: number) => <p key={i} style={{ color: "#92400e", fontSize: 11, margin: "3px 0" }}>• {a}</p>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/dashboard/contratos" style={{ background: "#0f5233", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>📋 Ver Contratos</a>
            <a href="/dashboard/logistica" style={{ background: "#1e40af", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>🚛 Ver na Logística</a>
            <a href="/dashboard/fiscal" style={{ background: "#92400e", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>💸 Ver Tributos</a>
            <a href="/dashboard/dre" style={{ background: "#6d28d9", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>📊 Ver DRE</a>
            <a href="/dashboard/novo-contrato" style={{ background: "#f3f4f6", color: "#374151", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>+ Novo Contrato</a>
          </div>
        </div>
      )}
    </div>
  );
}
