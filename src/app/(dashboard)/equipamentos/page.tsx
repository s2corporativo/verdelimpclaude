
"use client";
import { useEffect, useState } from "react";

const TIPO_ICON: any = { Roçadeira:"🌿", Motosserra:"🪚", Veiculo:"🚗", Soprador:"💨", Bomba:"⛽", Outro:"🔧" };
const STATUS_STYLE: any = {
  operacional: ["#dcfce7","#15803d","✅ Operacional"],
  manutencao:  ["#fee2e2","#dc2626","🔧 Em Manutenção"],
  inativo:     ["#f3f4f6","#6b7280","⏸️ Inativo"],
};

export default function EquipamentosPage() {
  const [data, setData] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [demo, setDemo] = useState(false);
  const [selecionado, setSelecionado] = useState<any>(null);
  const [showMan, setShowMan] = useState(false);
  const [manut, setManut] = useState<any>({ tipo:"preventiva", status:"agendada" });
  const [showNovo, setShowNovo] = useState(false);
  const [novoEq, setNovoEq] = useState<any>({ tipo:"Roçadeira" });
  const fmt = (v:number) => v?.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS: any = {width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12};
  const LS: any = {fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};

  useEffect(() => {
    fetch("/api/equipamentos").then(r=>r.json()).then(d=>{
      setData(d.equipamentos||[]); setAlertas(d.alertas||[]); setStats(d.stats||{}); setDemo(!!d._demo);
    });
  }, []);

  const registrarManutencao = async () => {
    if(!selecionado||!manut.descricao||!manut.dataAgendada) return;
    await fetch("/api/equipamentos",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...manut, action:"manutencao", equipmentId:selecionado.id }) });
    setShowMan(false); setManut({ tipo:"preventiva", status:"agendada" });
    fetch("/api/equipamentos").then(r=>r.json()).then(d=>{ setData(d.equipamentos||[]); setAlertas(d.alertas||[]); });
  };

  const mudarStatus = async (id:string, status:string) => {
    await fetch("/api/equipamentos",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ action:"update_status", id, status }) });
    setData(p=>p.map(e=>e.id===id?{...e,status}:e));
  };

  const cadastrarEq = async () => {
    if(!novoEq.descricao) return;
    const r = await fetch("/api/equipamentos",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(novoEq) });
    const d = await r.json();
    if(d.success){ setData(p=>[...p,d.equipamento]); setShowNovo(false); setNovoEq({ tipo:"Roçadeira" }); }
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:0}}>
            🔧 Gestão de Equipamentos
            {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8,marginLeft:8}}>Demo</span>}
          </h1>
          <p style={{color:"#6b7280",fontSize:12,margin:"4px 0 0"}}>Frota, ferramentas, manutenção preventiva/corretiva e alertas de revisão</p>
        </div>
        <button onClick={()=>setShowNovo(f=>!f)} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>+ Novo Equipamento</button>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
        {[
          ["Total",stats.total||0,"🔧","#1a7a4a"],
          ["Operacionais",stats.operacional||0,"✅","#15803d"],
          ["Em Manutenção",stats.manutencao||0,"🔧","#dc2626"],
          ["Alertas revisão",stats.alertas||0,"⚠️","#d97706"],
        ].map(([l,v,i,c])=>(
          <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",borderTop:`3px solid ${c}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
            <div style={{fontSize:18,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Alertas de manutenção */}
      {alertas.length>0&&(
        <div style={{marginBottom:14}}>
          {alertas.map((a:any,i:number)=>{
            const [bg,co,txt] = a.tipo==="vencida" ? ["#fee2e2","#991b1b","⛔ MANUTENÇÃO VENCIDA"] : a.tipo==="urgente" ? ["#fef9c3","#92400e","⚠️ Manutenção em até 7 dias"] : ["#dbeafe","#1e40af","💡 Manutenção em até 30 dias"];
            return(
              <div key={i} style={{background:bg,border:`1px solid`,borderRadius:8,padding:"8px 14px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                <span style={{fontSize:12,color:co,fontWeight:700}}>{txt}: <strong>{a.descricao}</strong></span>
                <span style={{fontSize:11,color:co}}>📅 {a.data ? new Date(a.data).toLocaleDateString("pt-BR") : "—"}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Form novo equipamento */}
      {showNovo&&(
        <div style={{background:"#fff",border:"2px solid #0f5233",borderRadius:12,padding:18,marginBottom:14}}>
          <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:12}}>+ Cadastrar Equipamento</h3>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Descrição *</label><input style={IS} value={novoEq.descricao||""} onChange={e=>setNovoEq((p:any)=>({...p,descricao:e.target.value}))}/></div>
            <div><label style={LS}>Tipo</label>
              <select style={IS} value={novoEq.tipo||"Roçadeira"} onChange={e=>setNovoEq((p:any)=>({...p,tipo:e.target.value}))}>
                {["Roçadeira","Motosserra","Veiculo","Soprador","Bomba","Outro"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={LS}>Marca</label><input style={IS} value={novoEq.marca||""} onChange={e=>setNovoEq((p:any)=>({...p,marca:e.target.value}))}/></div>
            <div><label style={LS}>Modelo</label><input style={IS} value={novoEq.modelo||""} onChange={e=>setNovoEq((p:any)=>({...p,modelo:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LS}>Nº Patrimônio / Placa</label><input style={IS} value={novoEq.numeroProprio||""} onChange={e=>setNovoEq((p:any)=>({...p,numeroProprio:e.target.value}))}/></div>
            <div><label style={LS}>Ano</label><input type="number" style={IS} value={novoEq.anoFabricacao||""} onChange={e=>setNovoEq((p:any)=>({...p,anoFabricacao:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Valor aquisição</label><input type="number" style={IS} value={novoEq.valorAquisicao||""} onChange={e=>setNovoEq((p:any)=>({...p,valorAquisicao:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Próxima revisão</label><input type="date" style={IS} value={novoEq.proximaRevisao||""} onChange={e=>setNovoEq((p:any)=>({...p,proximaRevisao:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={cadastrarEq} disabled={!novoEq.descricao} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700}}>Cadastrar</button>
            <button onClick={()=>setShowNovo(false)} style={{background:"#f3f4f6",border:"none",padding:"9px 18px",borderRadius:8,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de equipamentos */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
        {data.map((eq:any)=>{
          const [sbg,sco,stxt]=STATUS_STYLE[eq.status]||STATUS_STYLE.operacional;
          const sel=selecionado?.id===eq.id;
          return(
            <div key={eq.id} onClick={()=>setSelecionado(sel?null:eq)}
              style={{background:"#fff",border:`2px solid ${sel?"#0f5233":"#e5e7eb"}`,borderRadius:12,padding:14,cursor:"pointer",transition:"border-color 0.15s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <span style={{fontSize:22}}>{TIPO_ICON[eq.tipo]||"🔧"}</span>
                  <h3 style={{fontWeight:700,fontSize:13,color:"#0f5233",margin:"4px 0 2px"}}>{eq.descricao}</h3>
                  <div style={{fontSize:10,color:"#6b7280"}}>{eq.codigo} · {eq.marca} {eq.modelo} {eq.anoFabricacao?`(${eq.anoFabricacao})`:""}</div>
                  {eq.numeroProprio&&<div style={{fontSize:10,color:"#374151",fontWeight:600}}>{eq.tipo==="Veiculo"?"Placa":"Patrimônio"}: {eq.numeroProprio}</div>}
                </div>
                <span style={{background:sbg,color:sco,padding:"2px 9px",borderRadius:10,fontSize:9,fontWeight:700}}>{stxt}</span>
              </div>
              <div style={{display:"flex",gap:8,fontSize:10,color:"#6b7280",flexWrap:"wrap",marginBottom:8}}>
                {eq.horasUso>0&&<span>⏱️ {eq.horasUso}h uso</span>}
                {eq.valorAquisicao&&<span>💰 R$ {eq.valorAquisicao.toLocaleString("pt-BR")}</span>}
                {eq.proximaRevisao&&<span style={{color:new Date(eq.proximaRevisao)<new Date()?"#dc2626":"#d97706",fontWeight:600}}>🔧 Revisão: {new Date(eq.proximaRevisao).toLocaleDateString("pt-BR")}</span>}
              </div>
              {/* Histórico de manutenções */}
              {eq.manutencoes?.length>0&&(
                <div style={{background:"#f9fafb",borderRadius:7,padding:"6px 8px",marginBottom:8}}>
                  {eq.manutencoes.slice(0,2).map((m:any,i:number)=>(
                    <div key={i} style={{fontSize:10,color:m.status==="agendada"?"#d97706":"#6b7280",marginBottom:2}}>
                      {m.status==="agendada"?"⏳":"✅"} {m.tipo}: {m.descricao} — {m.dataAgendada?new Date(m.dataAgendada).toLocaleDateString("pt-BR"):""}
                    </div>
                  ))}
                </div>
              )}
              {sel&&(
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={e=>{e.stopPropagation();setShowMan(true);}} style={{background:"#fef9c3",color:"#92400e",border:"none",padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>🔧 Registrar Manutenção</button>
                  {eq.status==="operacional"&&<button onClick={e=>{e.stopPropagation();mudarStatus(eq.id,"manutencao");}} style={{background:"#fee2e2",color:"#dc2626",border:"none",padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11}}>→ Em Manutenção</button>}
                  {eq.status==="manutencao"&&<button onClick={e=>{e.stopPropagation();mudarStatus(eq.id,"operacional");}} style={{background:"#dcfce7",color:"#15803d",border:"none",padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11}}>→ Operacional</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de manutenção */}
      {showMan&&selecionado&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:14,padding:24,maxWidth:480,width:"95%",boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>
            <h3 style={{color:"#0f5233",fontSize:16,fontWeight:700,marginBottom:14}}>🔧 Registrar Manutenção — {selecionado.descricao}</h3>
            <div style={{display:"grid",gap:10,marginBottom:12}}>
              <div><label style={LS}>Tipo</label>
                <select style={IS} value={manut.tipo} onChange={e=>setManut((p:any)=>({...p,tipo:e.target.value}))}>
                  <option value="preventiva">Preventiva</option><option value="corretiva">Corretiva</option><option value="revisao">Revisão geral</option>
                </select>
              </div>
              <div><label style={LS}>Descrição da manutenção *</label><input style={IS} value={manut.descricao||""} onChange={e=>setManut((p:any)=>({...p,descricao:e.target.value}))} placeholder="Ex: Troca de carburador, afiação do disco..."/></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={LS}>Data agendada *</label><input type="date" style={IS} value={manut.dataAgendada||""} onChange={e=>setManut((p:any)=>({...p,dataAgendada:e.target.value}))}/></div>
                <div><label style={LS}>Data realizada</label><input type="date" style={IS} value={manut.dataRealizada||""} onChange={e=>setManut((p:any)=>({...p,dataRealizada:e.target.value}))}/></div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={LS}>Custo (R$)</label><input type="number" step="0.01" style={IS} value={manut.custo||""} onChange={e=>setManut((p:any)=>({...p,custo:Number(e.target.value)}))}/></div>
                <div><label style={LS}>Próxima revisão</label><input type="date" style={IS} value={manut.proximaRevisao||""} onChange={e=>setManut((p:any)=>({...p,proximaRevisao:e.target.value}))}/></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowMan(false)} style={{background:"#f3f4f6",border:"none",padding:"9px 20px",borderRadius:8,cursor:"pointer"}}>Cancelar</button>
              <button onClick={registrarManutencao} disabled={!manut.descricao||!manut.dataAgendada} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700}}>Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
