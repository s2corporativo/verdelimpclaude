// src/components/contrato/StepDados.tsx
"use client";
// Etapa 1: Entrada de dados do contrato (manual ou IA)

interface Props {
  c: any;
  setC: (fn: (prev: any) => any) => void;
  modoEntrada: "manual" | "colar";
  setModoEntrada: (m: "manual" | "colar") => void;
  textoColado: string;
  setTextoColado: (t: string) => void;
  extraindo: boolean;
  calculando: boolean;
  erro: string;
  extrairTexto: () => void;
  calcularImpacto: () => void;
}

export function StepDados({ c, setC, modoEntrada, setModoEntrada, textoColado, setTextoColado, extraindo, calculando, erro, extrairTexto, calcularImpacto }: Props) {
  const IS: any = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13 };
  const LS: any = { fontSize:11, fontWeight:600, color:"#374151", display:"block", marginBottom:3 };

  return (
    <div>
      {/* ═══════════ ABA 1: ENTRADA DE DADOS ═══════════════════════ */}
      {true && (
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
    </div>
  );
}
