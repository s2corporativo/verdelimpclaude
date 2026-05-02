"use client";
import { useEffect, useState } from "react";

const TIPOS = ["Terraplanagem","Valetamento","Drenagem Superficial","Limpeza de Terreno","Nivelamento","Carregamento de Material","Apoio PRADA/Recuperação","Demolição/Retirada","Outro"];
const STATUS_STYLE: any = {
  orcamento:    ["#f3f4f6","#6b7280","📝 Orçamento"],
  agendado:     ["#dbeafe","#1e40af","📅 Agendado"],
  em_execucao:  ["#fef9c3","#92400e","⚙️ Em Execução"],
  concluido:    ["#dcfce7","#15803d","✅ Concluído"],
  cancelado:    ["#fee2e2","#dc2626","❌ Cancelado"],
};

export default function RetroPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({});
  const [demo, setDemo] = useState(false);
  const [aba, setAba] = useState<"jobs"|"viabilidade"|"config">("jobs");
  const [novoJob, setNovoJob] = useState<any>({ tipoServico:"Terraplanagem", status:"orcamento", distanciaKm:30 });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [calc, setCalc] = useState<any>(null);
  const [calcInput, setCalcInput] = useState({ tipo:"Terraplanagem", qtd:"100", dist:"30", valor:"" });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/retro").then(r=>r.json()).then(d=>{ setJobs(d.jobs||[]); setConfig(d.config||{}); setDemo(!!d._demo); });
  }, []);

  const calcularViab = async () => {
    const r = await fetch(`/api/retro?action=viabilidade&tipo=${encodeURIComponent(calcInput.tipo)}&qtd=${calcInput.qtd}&dist=${calcInput.dist}&valor=${calcInput.valor||0}`);
    const d = await r.json();
    setCalc(d);
    // Preencher form com os dados calculados
    setNovoJob((p:any) => ({ ...p, tipoServico:calcInput.tipo, distanciaKm:Number(calcInput.dist), horasEstimadas:d.horas, valorCobrado:calcInput.valor||"" }));
  };

  const salvarJob = async () => {
    if(!novoJob.clienteNome||!novoJob.tipoServico) return;
    setSalvando(true);
    const r = await fetch("/api/retro",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(novoJob) });
    const d = await r.json();
    if(d.success){ setJobs(p=>[d.job,...p]); setMostrarForm(false); setNovoJob({ tipoServico:"Terraplanagem", status:"orcamento", distanciaKm:30 }); }
    setSalvando(false);
  };

  const salvarConfig = async () => {
    await fetch("/api/retro",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"update_config", config }) });
    alert("Configurações salvas!");
  };

  const fmt = (v:number) => v?.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:12 };
  const LS:any = { fontSize:11, fontWeight:600, color:"#374151", display:"block", marginBottom:3 };

  const faturado = jobs.filter(j=>j.status==="concluido").reduce((s:number,j:any)=>s+Number(j.valorCobrado||0),0);
  const custo = jobs.filter(j=>j.status==="concluido").reduce((s:number,j:any)=>s+Number(j.custoTotal||0),0);
  const inviáveis = jobs.filter(j=>!j.viavel&&j.status==="orcamento").length;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:0}}>
            🚜 Retroescavadeira
            {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8,marginLeft:8}}>Demo</span>}
          </h1>
          <p style={{color:"#6b7280",fontSize:12,margin:"4px 0 0"}}>Gestão de serviços, despesas operacionais e viabilidade por job</p>
        </div>
        <button onClick={()=>setMostrarForm(f=>!f)} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>+ Novo Serviço</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
        {[
          ["Total jobs",jobs.length,"🚜","#1a7a4a"],
          ["Faturado",`R$ ${fmt(faturado)}`,"💰","#15803d"],
          ["Custo operacional",`R$ ${fmt(custo)}`,"⛽","#dc2626"],
          ["Margem",custo>0?`${(((faturado-custo)/faturado)*100).toFixed(0)}%`:"—","📊","#7c3aed"],
          ["Inviáveis",inviáveis,"⛔","#dc2626"],
        ].map(([l,v,i,c])=>(
          <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",borderTop:`3px solid ${c}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
            <div style={{fontSize:17,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[["jobs","🚜 Serviços"],["viabilidade","🧮 Calculadora"],["config","⚙️ Custos Hora"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAba(id as any)}
            style={{background:aba===id?"#0f5233":"transparent",color:aba===id?"#fff":"#374151",border:`1px solid ${aba===id?"#0f5233":"#d1d5db"}`,padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:aba===id?700:400}}>{l}</button>
        ))}
      </div>

      {/* FORM novo serviço */}
      {mostrarForm&&(
        <div style={{background:"#fff",border:"2px solid #0f5233",borderRadius:12,padding:18,marginBottom:14}}>
          <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:12}}>+ Novo Serviço de Retroescavadeira</h3>
          {calc&&(
            <div style={{background:"#e8f5ee",borderRadius:8,padding:"8px 12px",marginBottom:12,fontSize:12,color:"#0f5233"}}>
              ✅ Dados pré-preenchidos pela calculadora — custo estimado: R$ {fmt(calc.custoTotal)} · Preço ideal: R$ {fmt(calc.precoIdeal)}
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Cliente *</label><input style={IS} value={novoJob.clienteNome||""} onChange={e=>setNovoJob((p:any)=>({...p,clienteNome:e.target.value}))}/></div>
            <div><label style={LS}>Tipo de serviço *</label><select style={IS} value={novoJob.tipoServico} onChange={e=>setNovoJob((p:any)=>({...p,tipoServico:e.target.value}))}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={LS}>Status</label><select style={IS} value={novoJob.status} onChange={e=>setNovoJob((p:any)=>({...p,status:e.target.value}))}>{Object.entries(STATUS_STYLE).map(([k,v])=><option key={k} value={k}>{(v as any)[2]}</option>)}</select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Endereço / Local</label><input style={IS} value={novoJob.endereco||""} onChange={e=>setNovoJob((p:any)=>({...p,endereco:e.target.value}))}/></div>
            <div><label style={LS}>Município</label><input style={IS} value={novoJob.municipio||""} onChange={e=>setNovoJob((p:any)=>({...p,municipio:e.target.value}))}/></div>
            <div><label style={LS}>Horas est.</label><input type="number" step="0.5" style={IS} value={novoJob.horasEstimadas||""} onChange={e=>setNovoJob((p:any)=>({...p,horasEstimadas:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Dist. base (km)</label><input type="number" style={IS} value={novoJob.distanciaKm||30} onChange={e=>setNovoJob((p:any)=>({...p,distanciaKm:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Valor cobrado (R$)</label><input type="number" step="0.01" style={IS} value={novoJob.valorCobrado||""} onChange={e=>setNovoJob((p:any)=>({...p,valorCobrado:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Data início</label><input type="date" style={IS} value={novoJob.dataInicio||""} onChange={e=>setNovoJob((p:any)=>({...p,dataInicio:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:12}}><label style={LS}>Observações / ART</label><textarea style={{...IS,height:50}} value={novoJob.observacoes||""} onChange={e=>setNovoJob((p:any)=>({...p,observacoes:e.target.value}))}/></div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={salvarJob} disabled={salvando||!novoJob.clienteNome} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700}}>💾 Salvar</button>
            <button onClick={()=>setMostrarForm(false)} style={{background:"#f3f4f6",border:"none",padding:"9px 18px",borderRadius:8,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ABA JOBS */}
      {aba==="jobs"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {jobs.map((j:any)=>{
            const [sbg,sco,stxt]=STATUS_STYLE[j.status]||STATUS_STYLE.orcamento;
            const margem = j.valorCobrado&&j.custoTotal ? (((j.valorCobrado-j.custoTotal)/j.valorCobrado)*100).toFixed(0) : null;
            return(
              <div key={j.id} style={{background:"#fff",border:`1px solid ${!j.viavel&&j.status==="orcamento"?"#fca5a5":"#e5e7eb"}`,borderRadius:12,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
                  <div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:11,fontFamily:"monospace",color:"#6b7280"}}>{j.numero}</span>
                      <span style={{background:sbg,color:sco,padding:"1px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{stxt}</span>
                      {!j.viavel&&j.status==="orcamento"&&<span style={{background:"#fee2e2",color:"#991b1b",padding:"1px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>⛔ INVIÁVEL</span>}
                    </div>
                    <h3 style={{fontWeight:700,fontSize:14,color:"#0f5233",margin:"0 0 4px"}}>{j.clienteNome}</h3>
                    <div style={{display:"flex",gap:12,fontSize:11,color:"#6b7280",flexWrap:"wrap"}}>
                      <span>🚜 {j.tipoServico}</span>
                      {j.municipio&&<span>📍 {j.municipio}/{j.uf}</span>}
                      {j.horasEstimadas&&<span>⏱️ {j.horasEstimadas}h est.</span>}
                      {j.horasRealizadas&&<span>✅ {j.horasRealizadas}h real.</span>}
                      {j.distanciaKm&&<span>🛣️ {j.distanciaKm}km</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {j.valorCobrado&&<div style={{fontSize:16,fontWeight:700,color:"#0f5233"}}>R$ {fmt(j.valorCobrado)}</div>}
                    {j.precoMinimo&&<div style={{fontSize:10,color:"#6b7280"}}>Mínimo: R$ {fmt(j.precoMinimo)} · Ideal: R$ {fmt(j.precoIdeal)}</div>}
                    {margem&&<div style={{fontSize:11,fontWeight:700,color:Number(margem)>=20?"#15803d":Number(margem)>=0?"#d97706":"#dc2626"}}>Margem: {margem}%</div>}
                  </div>
                </div>
                {j.despesas?.length>0&&(
                  <div style={{background:"#f9fafb",borderRadius:7,padding:"7px 10px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#6b7280",marginBottom:5}}>DESPESAS OPERACIONAIS:</div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                      {j.despesas.map((d:any,idx:number)=>(
                        <div key={idx} style={{fontSize:10,color:"#374151"}}>
                          <span style={{color:"#6b7280"}}>{d.tipo}:</span> R$ {fmt(Number(d.valor))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {j.observacoes&&<div style={{marginTop:6,fontSize:11,color:"#6b7280",fontStyle:"italic"}}>{j.observacoes}</div>}
              </div>
            );
          })}
          {jobs.length===0&&<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>Nenhum serviço. Clique em "+ Novo Serviço".</div>}
        </div>
      )}

      {/* ABA CALCULADORA */}
      {aba==="viabilidade"&&(
        <div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18,marginBottom:14}}>
            <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:14}}>🧮 Calculadora de Viabilidade — Retroescavadeira</h3>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={LS}>Tipo de serviço</label><select style={IS} value={calcInput.tipo} onChange={e=>setCalcInput(p=>({...p,tipo:e.target.value}))}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={LS}>Quantidade (m³/m²/m)</label><input type="number" style={IS} value={calcInput.qtd} onChange={e=>setCalcInput(p=>({...p,qtd:e.target.value}))}/></div>
              <div><label style={LS}>Distância da base (km)</label><input type="number" style={IS} value={calcInput.dist} onChange={e=>setCalcInput(p=>({...p,dist:e.target.value}))}/></div>
              <div><label style={LS}>Valor proposto (R$)</label><input type="number" step="0.01" style={IS} value={calcInput.valor} onChange={e=>setCalcInput(p=>({...p,valor:e.target.value}))} placeholder="Deixe 0 para ver custo"/></div>
            </div>
            <button onClick={calcularViab} style={{background:"#0f5233",color:"#fff",border:"none",padding:"10px 28px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14}}>
              ⚡ Calcular Viabilidade
            </button>
          </div>

          {calc&&(
            <div>
              <div style={{background:calc.recomendacao.startsWith("✅")?"linear-gradient(135deg,#0f5233,#1a7a4a)":calc.recomendacao.startsWith("⚠️")?"linear-gradient(135deg,#d97706,#f59e0b)":"linear-gradient(135deg,#dc2626,#ef4444)",color:"#fff",borderRadius:12,padding:18,marginBottom:14}}>
                <div style={{fontSize:24,fontWeight:700,marginBottom:4}}>{calc.recomendacao}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:8}}>
                  {[["Horas necessárias",calc.horas+"h"],["Custo total","R$ "+fmt(calc.custoTotal)],["Preço mínimo","R$ "+fmt(calc.precoMinimo)],["Preço ideal","R$ "+fmt(calc.precoIdeal)],calc.valorProposto>0&&["Sua margem",calc.margemReal+"%"]].filter(Boolean).map((item:any)=>(
                    <div key={item[0]} style={{background:"rgba(255,255,255,.15)",borderRadius:8,padding:"8px 10px"}}>
                      <div style={{fontSize:9,opacity:.75,textTransform:"uppercase"}}>{item[0]}</div>
                      <div style={{fontSize:15,fontWeight:700,marginTop:2}}>{item[1]}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
                <h4 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:10}}>📋 Detalhamento das Despesas Operacionais</h4>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <tbody>
                    {[
                      ["⛽ Combustível (diesel)","#dc2626",calc.detalhamento.combustivel],
                      ["👷 Operador (CLT + encargos)","#7c3aed",calc.detalhamento.operador],
                      ["📉 Depreciação da máquina","#d97706",calc.detalhamento.depreciacao],
                      ["🔧 Manutenção preventiva","#1d4ed8",calc.detalhamento.manutencao],
                      ["🛡️ Seguro da máquina","#6b7280",calc.detalhamento.seguro],
                      ["🚛 Transporte (ida+volta)","#92400e",calc.detalhamento.transporte],
                    ].map(([l,c,v])=>(
                      <tr key={l as string} style={{borderBottom:"1px solid #f3f4f6"}}>
                        <td style={{padding:"8px 10px",color:c as string,fontWeight:600}}>{l as string}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700}}>R$ {fmt(v as number)}</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontSize:10,color:"#9ca3af"}}>{((v as number/calc.custoTotal)*100).toFixed(0)}%</td>
                      </tr>
                    ))}
                    <tr style={{background:"#e8f5ee"}}>
                      <td style={{padding:"8px 10px",fontWeight:700,color:"#0f5233"}}>TOTAL</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#0f5233",fontSize:14}}>R$ {fmt(calc.custoTotal)}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontSize:10,color:"#0f5233"}}>100%</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{marginTop:12,display:"flex",gap:8}}>
                  <button onClick={()=>{setMostrarForm(true);setAba("jobs");}} style={{background:"#0f5233",color:"#fff",border:"none",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>📋 Criar serviço com estes dados</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA CONFIG */}
      {aba==="config"&&(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18}}>
          <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:4}}>⚙️ Parâmetros de Custo por Hora</h3>
          <p style={{fontSize:12,color:"#6b7280",marginBottom:16}}>Configure os custos reais da sua retroescavadeira para cálculos precisos de viabilidade</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {[
              ["custoHoraCombustivel","⛽ Combustível diesel (R$/h)","Consumo ~8L/h × preço do diesel"],
              ["custoHoraOperador","👷 Operador CLT + encargos (R$/h)","Salário + 70% encargos ÷ horas mês"],
              ["custoHoraDepreciacao","📉 Depreciação (R$/h)","Valor máquina ÷ vida útil em horas"],
              ["custoHoraManutencao","🔧 Manutenção (R$/h)","Média preventiva + corretiva"],
              ["custoHoraSeguro","🛡️ Seguro (R$/h)","Seguro anual ÷ horas trabalhadas"],
              ["custoKmTransporte","🚛 Transporte plataforma (R$/km)","Caminhão + baixa-carga por km"],
              ["margemAlvo","🎯 Margem alvo (%)","Lucro mínimo desejado sobre o custo"],
            ].map(([field,label,hint])=>(
              <div key={field}>
                <label style={LS}>{label as string}</label>
                <input type="number" step="0.01" style={IS} value={(config as any)[field]||""} onChange={e=>setConfig((p:any)=>({...p,[field as string]:Number(e.target.value)}))}/>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:2}}>{hint as string}</div>
              </div>
            ))}
          </div>
          <button onClick={salvarConfig} style={{marginTop:16,background:"#0f5233",color:"#fff",border:"none",padding:"10px 28px",borderRadius:8,cursor:"pointer",fontWeight:700}}>💾 Salvar Configurações</button>
        </div>
      )}
    </div>
  );
}
