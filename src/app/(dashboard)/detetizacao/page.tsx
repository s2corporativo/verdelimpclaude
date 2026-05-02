
"use client";
import { useEffect, useState } from "react";

const TIPOS = ["Desinsetizacao","Desratizacao","Descupinizacao","Geral","Controle Formigas","Fumigacao"];
const TIPO_ICON: any = { "Desinsetizacao":"🪲","Desratizacao":"🐀","Descupinizacao":"🐛","Geral":"🦟","Controle Formigas":"🐜","Fumigacao":"💨" };
const INFESTACAO_STYLE: any = { leve:["#dcfce7","#15803d","Leve"], moderado:["#fef9c3","#92400e","Moderado"], grave:["#fee2e2","#dc2626","⚠️ Grave"] };
const STATUS_STYLE: any = {
  orcamento:   ["#f3f4f6","#6b7280","📝 Orçamento"],
  agendado:    ["#dbeafe","#1e40af","📅 Agendado"],
  em_execucao: ["#fef9c3","#92400e","⚙️ Em Execução"],
  concluido:   ["#dcfce7","#15803d","✅ Concluído"],
  cancelado:   ["#fee2e2","#dc2626","❌ Cancelado"],
};

export default function DetetizacaoPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [catalogo, setCatalogo] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [aba, setAba] = useState<"jobs"|"viabilidade"|"catalogo"|"docs">("jobs");
  const [novoJob, setNovoJob] = useState<any>({ tipoServico:"Desinsetizacao", infestacaoNivel:"leve", status:"orcamento" });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [calc, setCalc] = useState<any>(null);
  const [calcInput, setCalcInput] = useState({ tipo:"Desinsetizacao", area:"500", valor:"" });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    fetch("/api/detetizacao").then(r=>r.json()).then(d=>{ setJobs(d.jobs||[]); setDemo(!!d._demo); });
    fetch("/api/detetizacao?action=catalogo").then(r=>r.json()).then(d=>setCatalogo(d.produtos||[]));
  }, []);

  const calcularViab = async () => {
    const r = await fetch(`/api/detetizacao?action=viabilidade&tipo=${encodeURIComponent(calcInput.tipo)}&area=${calcInput.area}&valor=${calcInput.valor||0}`);
    const d = await r.json();
    setCalc(d);
  };

  const salvarJob = async () => {
    if(!novoJob.clienteNome||!novoJob.endereco) return;
    setSalvando(true);
    const r = await fetch("/api/detetizacao",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(novoJob) });
    const d = await r.json();
    if(d.success){ setJobs(p=>[d.job,...p]); setMostrarForm(false); setNovoJob({ tipoServico:"Desinsetizacao", infestacaoNivel:"leve", status:"orcamento" }); }
    setSalvando(false);
  };

  const fmt = (v:number) => v?.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:12 };
  const LS:any = { fontSize:11, fontWeight:600, color:"#374151", display:"block", marginBottom:3 };

  const faturado = jobs.filter(j=>j.status==="concluido").reduce((s:number,j:any)=>s+Number(j.valorCobrado||0),0);
  const agendados = jobs.filter(j=>j.status==="agendado").length;
  const certificadosPendentes = jobs.filter(j=>j.status==="concluido"&&!j.certificadoEmitido).length;
  const retornos = jobs.filter(j=>{ if(!j.dataRetorno) return false; const d=new Date(j.dataRetorno); return d>=new Date()&&d<=new Date(Date.now()+7*86400000); }).length;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:0}}>
            🪲 Dedetização — Controle de Pragas
            {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8,marginLeft:8}}>Demo</span>}
          </h1>
          <p style={{color:"#6b7280",fontSize:12,margin:"4px 0 0"}}>Desinsetização · Desratização · Descupinização · Controle de Formigas</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setMostrarForm(f=>!f)} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>+ Nova OS</button>
        </div>
      </div>

      {/* Alertas */}
      {(certificadosPendentes>0||retornos>0)&&(
        <div style={{marginBottom:12,display:"flex",flexDirection:"column",gap:6}}>
          {certificadosPendentes>0&&<div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#92400e",fontWeight:600}}>📄 {certificadosPendentes} certificado(s) de dedetização ainda não emitido(s)</div>}
          {retornos>0&&<div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:8,padding:"8px 14px",fontSize:12,color:"#991b1b",fontWeight:600}}>⏰ {retornos} retorno(s) programado(s) para os próximos 7 dias</div>}
        </div>
      )}

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
        {[
          ["Total OS",jobs.length,"🪲","#1a7a4a"],
          ["Agendados",agendados,"📅","#1d4ed8"],
          ["Faturado",`R$ ${fmt(faturado)}`,"💰","#15803d"],
          ["Cert. pendentes",certificadosPendentes,"📄","#d97706"],
          ["Retornos próximos",retornos,"⏰","#dc2626"],
        ].map(([l,v,i,c])=>(
          <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",borderTop:`3px solid ${c}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
            <div style={{fontSize:17,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Abas */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[["jobs","🪲 OS/Serviços"],["viabilidade","🧮 Precificação"],["catalogo","🧪 Produtos ANVISA"],["docs","📄 Documentos"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAba(id as any)}
            style={{background:aba===id?"#0f5233":"transparent",color:aba===id?"#fff":"#374151",border:`1px solid ${aba===id?"#0f5233":"#d1d5db"}`,padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:aba===id?700:400}}>{l}</button>
        ))}
      </div>

      {/* FORM nova OS */}
      {mostrarForm&&(
        <div style={{background:"#fff",border:"2px solid #0f5233",borderRadius:12,padding:18,marginBottom:14}}>
          <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:12}}>+ Nova Ordem de Serviço — Dedetização</h3>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Cliente *</label><input style={IS} value={novoJob.clienteNome||""} onChange={e=>setNovoJob((p:any)=>({...p,clienteNome:e.target.value}))}/></div>
            <div><label style={LS}>Tipo de serviço *</label><select style={IS} value={novoJob.tipoServico} onChange={e=>setNovoJob((p:any)=>({...p,tipoServico:e.target.value}))}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
            <div><label style={LS}>Nível de infestação</label><select style={IS} value={novoJob.infestacaoNivel} onChange={e=>setNovoJob((p:any)=>({...p,infestacaoNivel:e.target.value}))}><option value="leve">Leve</option><option value="moderado">Moderado</option><option value="grave">Grave</option></select></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Endereço completo *</label><input style={IS} value={novoJob.endereco||""} onChange={e=>setNovoJob((p:any)=>({...p,endereco:e.target.value}))}/></div>
            <div><label style={LS}>Município</label><input style={IS} value={novoJob.municipio||""} onChange={e=>setNovoJob((p:any)=>({...p,municipio:e.target.value}))}/></div>
            <div><label style={LS}>Área (m²)</label><input type="number" style={IS} value={novoJob.areaM2||""} onChange={e=>setNovoJob((p:any)=>({...p,areaM2:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Valor (R$)</label><input type="number" step="0.01" style={IS} value={novoJob.valorCobrado||""} onChange={e=>setNovoJob((p:any)=>({...p,valorCobrado:Number(e.target.value)}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Ambientes</label><input style={IS} value={novoJob.ambientes||""} onChange={e=>setNovoJob((p:any)=>({...p,ambientes:e.target.value}))} placeholder="cozinha,banheiro,deposito"/></div>
            <div><label style={LS}>Data aplicação</label><input type="date" style={IS} value={novoJob.dataAplicacao||""} onChange={e=>setNovoJob((p:any)=>({...p,dataAplicacao:e.target.value}))}/></div>
            <div><label style={LS}>Data retorno</label><input type="date" style={IS} value={novoJob.dataRetorno||""} onChange={e=>setNovoJob((p:any)=>({...p,dataRetorno:e.target.value}))}/></div>
            <div><label style={LS}>Técnico responsável</label><input style={IS} value={novoJob.tecnicoNome||""} onChange={e=>setNovoJob((p:any)=>({...p,tecnicoNome:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:12}}><label style={LS}>Observações</label><textarea style={{...IS,height:50}} value={novoJob.observacoes||""} onChange={e=>setNovoJob((p:any)=>({...p,observacoes:e.target.value}))}/></div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={salvarJob} disabled={salvando||!novoJob.clienteNome||!novoJob.endereco} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700}}>💾 Salvar OS</button>
            <button onClick={()=>setMostrarForm(false)} style={{background:"#f3f4f6",border:"none",padding:"9px 18px",borderRadius:8,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ABA JOBS */}
      {aba==="jobs"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {jobs.map((j:any)=>{
            const [sbg,sco,stxt]=STATUS_STYLE[j.status]||STATUS_STYLE.orcamento;
            const [ibg,ico,itxt]=INFESTACAO_STYLE[j.infestacaoNivel]||INFESTACAO_STYLE.leve;
            const retornoProx = j.dataRetorno&&new Date(j.dataRetorno)<=new Date(Date.now()+7*86400000);
            return(
              <div key={j.id} style={{background:"#fff",border:`1px solid ${retornoProx?"#fca5a5":"#e5e7eb"}`,borderRadius:12,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:8}}>
                  <div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:4}}>
                      <span style={{fontSize:18}}>{TIPO_ICON[j.tipoServico]||"🪲"}</span>
                      <span style={{fontSize:11,fontFamily:"monospace",color:"#6b7280"}}>{j.numero}</span>
                      <span style={{background:sbg,color:sco,padding:"1px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{stxt}</span>
                      <span style={{background:ibg,color:ico,padding:"1px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{itxt}</span>
                      {j.certificadoEmitido&&<span style={{background:"#dcfce7",color:"#15803d",padding:"1px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>📄 Cert. emitido</span>}
                      {retornoProx&&<span style={{background:"#fee2e2",color:"#991b1b",padding:"1px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>⏰ Retorno próximo!</span>}
                    </div>
                    <h3 style={{fontWeight:700,fontSize:14,color:"#0f5233",margin:"0 0 4px"}}>{j.clienteNome}</h3>
                    <div style={{display:"flex",gap:12,fontSize:11,color:"#6b7280",flexWrap:"wrap"}}>
                      <span>📍 {j.endereco}{j.municipio?`, ${j.municipio}`:""}</span>
                      {j.areaM2&&<span>📐 {Number(j.areaM2).toLocaleString("pt-BR")} m²</span>}
                      {j.tipoServico&&<span>🧪 {j.tipoServico}</span>}
                      {j.tecnicoNome&&<span>👤 {j.tecnicoNome}</span>}
                    </div>
                    <div style={{display:"flex",gap:12,fontSize:11,color:"#6b7280",marginTop:3,flexWrap:"wrap"}}>
                      {j.dataAplicacao&&<span>📅 Aplicação: {new Date(j.dataAplicacao).toLocaleDateString("pt-BR")}</span>}
                      {j.dataRetorno&&<span style={{color:retornoProx?"#dc2626":"inherit",fontWeight:retornoProx?700:400}}>🔁 Retorno: {new Date(j.dataRetorno).toLocaleDateString("pt-BR")}</span>}
                      {j.garantiaDias&&<span>🛡️ Garantia: {j.garantiaDias===1825?"5 anos":j.garantiaDias+"d"}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    {j.valorCobrado&&<div style={{fontSize:16,fontWeight:700,color:"#0f5233"}}>R$ {fmt(j.valorCobrado)}</div>}
                    {j.custoTotal&&<div style={{fontSize:10,color:"#6b7280"}}>Custo: R$ {fmt(j.custoTotal)}</div>}
                    {j.valorCobrado&&j.custoTotal&&<div style={{fontSize:11,fontWeight:700,color:"#15803d"}}>Margem: {(((j.valorCobrado-j.custoTotal)/j.valorCobrado)*100).toFixed(0)}%</div>}
                  </div>
                </div>
                {j.observacoes&&<div style={{fontSize:11,color:"#6b7280",fontStyle:"italic",borderTop:"1px solid #f3f4f6",paddingTop:6}}>{j.observacoes}</div>}
              </div>
            );
          })}
          {jobs.length===0&&<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>Nenhuma OS. Clique em "+ Nova OS".</div>}
        </div>
      )}

      {/* ABA VIABILIDADE */}
      {aba==="viabilidade"&&(
        <div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18,marginBottom:14}}>
            <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:14}}>🧮 Calculadora de Precificação</h3>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={LS}>Tipo de serviço</label><select style={IS} value={calcInput.tipo} onChange={e=>setCalcInput(p=>({...p,tipo:e.target.value}))}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label style={LS}>Área (m²)</label><input type="number" style={IS} value={calcInput.area} onChange={e=>setCalcInput(p=>({...p,area:e.target.value}))}/></div>
              <div><label style={LS}>Valor proposto (R$)</label><input type="number" step="0.01" style={IS} value={calcInput.valor} onChange={e=>setCalcInput(p=>({...p,valor:e.target.value}))} placeholder="0 = ver custo"/></div>
            </div>
            <button onClick={calcularViab} style={{background:"#0f5233",color:"#fff",border:"none",padding:"10px 28px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14}}>⚡ Calcular</button>
          </div>

          {calc&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
                <h4 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:10}}>💰 Faixa de Preço de Mercado</h4>
                <table style={{width:"100%",fontSize:12}}>
                  <tbody>
                    {[
                      ["Custo direto total","#dc2626",calc.custoTotal],
                      ["Preço mínimo (breakeven)","#d97706",calc.precoMinimoTotal],
                      ["Preço referência mercado","#1d4ed8",calc.precoIdealTotal],
                      ["Preço máximo mercado","#15803d",calc.precoMaximoTotal],
                    ].map(([l,c,v])=>(
                      <tr key={l as string} style={{borderBottom:"1px solid #f3f4f6"}}>
                        <td style={{padding:"6px 0",color:c as string,fontWeight:600}}>{l as string}</td>
                        <td style={{padding:"6px 0",textAlign:"right",fontWeight:700,color:c as string}}>R$ {fmt(v as number)}</td>
                        <td style={{padding:"6px 0",textAlign:"right",fontSize:10,color:"#9ca3af"}}>R$ {((v as number)/Number(calcInput.area)).toFixed(2)}/m²</td>
                      </tr>
                    ))}
                    {calc.valorProposto>0&&<tr style={{background:"#e8f5ee"}}><td style={{padding:"6px 0",fontWeight:700}}>Seu valor</td><td style={{padding:"6px 0",textAlign:"right",fontWeight:700,color:"#0f5233"}}>R$ {fmt(calc.valorProposto)}</td><td style={{padding:"6px 0",textAlign:"right",fontSize:11,fontWeight:700,color:calc.margemReal>=20?"#15803d":calc.margemReal>=0?"#d97706":"#dc2626"}}>{calc.margemReal}%</td></tr>}
                  </tbody>
                </table>
                <div style={{marginTop:12,background:calc.recomendacao.startsWith("✅")?"#dcfce7":calc.recomendacao.startsWith("⚠️")?"#fef9c3":"#fee2e2",borderRadius:8,padding:"8px 12px",fontWeight:700,fontSize:12,color:calc.recomendacao.startsWith("✅")?"#15803d":calc.recomendacao.startsWith("⚠️")?"#92400e":"#991b1b"}}>
                  {calc.recomendacao}
                </div>
              </div>
              <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
                <h4 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:10}}>📋 Documentos Obrigatórios</h4>
                {calc.documentosObrigatorios?.map((d:string,i:number)=>(
                  <div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:11}}>
                    <span style={{color:"#1a7a4a",fontWeight:700,flexShrink:0}}>✓</span><span>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA CATÁLOGO */}
      {aba==="catalogo"&&(
        <div>
          <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"9px 14px",marginBottom:14,fontSize:12,color:"#92400e"}}>
            ⚠️ <strong>Atenção:</strong> Somente produtos registrados na ANVISA podem ser utilizados em serviços de controle de pragas. Verifique sempre a validade do registro antes de cada aplicação.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
            {catalogo.map((p:any)=>(
              <div key={p.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <h4 style={{fontWeight:700,fontSize:13,color:"#0f5233",margin:0}}>{p.nomeComercial}</h4>
                  <span style={{background:"#dbeafe",color:"#1e40af",padding:"1px 7px",borderRadius:6,fontSize:9,fontWeight:700}}>{p.tipo}</span>
                </div>
                <div style={{fontSize:11,color:"#374151",marginBottom:4}}>Princípio ativo: <strong>{p.principioAtivo}</strong></div>
                <div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>Fabricante: {p.fabricante} · Conc.: {p.concentracao}</div>
                <div style={{fontSize:10,color:"#374151",marginBottom:6}}>
                  <span style={{fontWeight:600}}>Alvos: </span>
                  {p.alvosPrincipais?.split(",").map((a:string)=>(
                    <span key={a} style={{background:"#f3f4f6",padding:"1px 5px",borderRadius:4,marginRight:3,fontSize:9}}>{a.trim()}</span>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:9,fontFamily:"monospace",color:"#6b7280",background:"#f9fafb",padding:"2px 6px",borderRadius:4}}>ANVISA: {p.registroAnvisa}</span>
                  {p.custoLitro&&<span style={{fontSize:11,fontWeight:700,color:"#0f5233"}}>R$ {fmt(p.custoLitro)}/L</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA DOCUMENTOS */}
      {aba==="docs"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
            <h4 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:12}}>📂 Documentos da Empresa para operar</h4>
            {[
              ["Licença da Vigilância Sanitária Municipal","Prefeitura/ANVISA","Anual","Obrigatória"],
              ["Alvará de Funcionamento","Prefeitura","Anual","Obrigatório"],
              ["RT — Responsável Técnico (CREA-MG)","CREA","Contínuo","Obrigatório"],
              ["Registro ANVISA como prestador de serviço","ANVISA","5 anos","Obrigatório"],
              ["Seguro RC Ambiental","Seguradora","Anual","Recomendado"],
              ["Certificados NR-05 (CIPA)","Técnico","2 anos","Obrigatório"],
              ["NR-09 — PPRA/PGR","RT","Anual","Obrigatório"],
              ["PCMSO — Programa de Saúde","Médico do Trabalho","Anual","Obrigatório"],
            ].map(([l,o,v,t])=>(
              <div key={l as string} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                <span style={{color:t==="Obrigatório"||t==="Obrigatória"?"#15803d":"#1d4ed8",fontWeight:700,fontSize:12,flexShrink:0}}>✓</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:600}}>{l as string}</div>
                  <div style={{fontSize:9,color:"#6b7280"}}>{o} · {v} · <span style={{color:t==="Obrigatório"||t==="Obrigatória"?"#dc2626":"#1d4ed8",fontWeight:700}}>{t}</span></div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
            <h4 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:12}}>📋 Documentos por Serviço (entregues ao cliente)</h4>
            {[
              ["Certificado de Dedetização","Todos","Comprovante do serviço realizado"],
              ["Laudo técnico pré-aplicação","Todos","Diagnóstico da infestação"],
              ["FISPQ dos produtos utilizados","Todos","Fichas de segurança dos produtos"],
              ["Mapa de iscas raticidas","Desratização","Planta baixa com localização das iscas"],
              ["Garantia por escrito","Todos","Especificando tipo e período"],
              ["ART CREA-MG","Contratos públicos","Anotação de Responsabilidade Técnica"],
              ["Ordem de serviço assinada","Todos","Autorização e responsabilidade do cliente"],
            ].map(([l,s,d])=>(
              <div key={l as string} style={{display:"flex",gap:8,padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                <span style={{color:"#7c3aed",fontWeight:700,fontSize:12,flexShrink:0}}>📄</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:11,fontWeight:600}}>{l as string}</div>
                  <div style={{fontSize:9,color:"#6b7280"}}>{s} · {d}</div>
                </div>
              </div>
            ))}
            <div style={{marginTop:12,background:"#f0fdf4",borderRadius:8,padding:"9px 12px",fontSize:11,color:"#15803d"}}>
              💡 O certificado de dedetização é exigido por vigilâncias sanitárias, licitações e contratos com indústrias alimentícias, restaurantes e hospitais. Emitir sempre com validade, tipo de praga controlada e produtos utilizados.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
