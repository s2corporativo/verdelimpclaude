
"use client";
import { useEffect, useState } from "react";
import { DemoBadge, TabelaHead, KpiGrid, KpiCard } from "@/components/ui";
export default function ContratosPage() {
  const [data,setData]=useState<any[]>([]);const [demo,setDemo]=useState(false);const [clientes,setClientes]=useState<any[]>([]);
  const [form,setForm]=useState({clientId:"",object:"",value:"",monthlyValue:"",startDate:"",endDate:"",notes:""});
  const [erro,setErro]=useState("");const [salvando,setSalvando]=useState(false);const [editId,setEditId]=useState<string|null>(null);
  const load=()=>fetch("/api/contratos").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});
  useEffect(()=>{load();fetch("/api/clientes").then(r=>r.json()).then(d=>setClientes(d.data||[])).catch(()=>{});},[]);
  const limpar=()=>{setForm({clientId:"",object:"",value:"",monthlyValue:"",startDate:"",endDate:"",notes:""});setEditId(null);};
  const salvar=async()=>{
    setErro("");setSalvando(true);
    const payload:any={...form}; if(editId) payload.id=editId;
    try{
      const r=await fetch("/api/contratos",{method:editId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok){const j=await r.json().catch(()=>({}));setErro(j.error||"Não foi possível salvar o contrato. Confira os campos obrigatórios.");return;}
      limpar();load();
    }catch(e:any){setErro(e.message||"Erro de rede ao salvar.");}
    finally{setSalvando(false);}
  };
  const iso=(d:string)=>d?new Date(d).toISOString().slice(0,10):"";
  const editar=(c:any)=>{setEditId(c.id);setForm({clientId:c.clientId||"",object:c.object||"",value:String(c.value||""),monthlyValue:String(c.monthlyValue||""),startDate:iso(c.startDate),endDate:iso(c.endDate),notes:c.notes||""});setErro("");window.scrollTo({top:0,behavior:"smooth"});};
  const excluir=async(c:any)=>{if(!confirm(`Cancelar o contrato ${c.number}? As medições e custos são preservados.`))return;const r=await fetch(`/api/contratos?id=${c.id}`,{method:"DELETE"});if(!r.ok){const j=await r.json().catch(()=>({}));setErro(j.error||"Não foi possível cancelar.");return;}load();};
  const podeS=!!form.object&&!!form.value&&!!form.startDate&&!!form.endDate;
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  const vencendo=data.filter((c:any)=>c.alerta==="renovar").length;
  const vencidos=data.filter((c:any)=>c.alerta==="vencido").length;
  return(<div>
    <h1 style={{color:"#334532",fontSize:20,fontWeight:700,marginBottom:4}}>Gestão de Contratos <DemoBadge mostrar={demo} /></h1>
    <KpiGrid colunas={4}>
      {[["Contratos Ativos",data.filter((c:any)=>c.status==="Ativo").length,"📋","#4a9410"],
        ["Valor Mensal","R$"+fmt(data.filter((c:any)=>c.status==="Ativo").reduce((s:number,c:any)=>s+Number(c.monthlyValue),0)),"💰","#4a9410"],
        ["Renovar em breve",vencendo,"⚠️","#d97706"],
        ["Vencidos",vencidos,"🚨","#dc2626"]].map(([l,v,i,c])=>(
        <KpiCard key={l as string} label={l as string} valor={v as any} cor={c as string} icone={i as string} />
      ))}
    </KpiGrid>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
      <h3 style={{color:"#334532",fontSize:13,marginBottom:12}}>{editId?"✏️ Editar contrato":"+ Novo Contrato"}</h3>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:9,marginBottom:9}}>
        <div><label style={LS}>Cliente</label><select style={IS} value={form.clientId} onChange={e=>setForm(p=>({...p,clientId:e.target.value}))}><option value="">— sem vínculo —</option>{clientes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label style={LS}>Objeto do Contrato*</label><input style={IS} value={form.object} onChange={e=>setForm(p=>({...p,object:e.target.value}))} placeholder="Ex: Roçada Canteiros Norte — PBH"/></div>
        <div><label style={LS}>Valor Total (R$)</label><input type="number" style={IS} value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/></div>
        <div><label style={LS}>Valor Mensal (R$)</label><input type="number" style={IS} value={form.monthlyValue} onChange={e=>setForm(p=>({...p,monthlyValue:e.target.value}))}/></div>
        <div><label style={LS}>Início</label><input type="date" style={IS} value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))}/></div>
        <div><label style={LS}>Término</label><input type="date" style={IS} value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))}/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><label style={LS}>Observações</label><input style={IS} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
        <button onClick={salvar} disabled={!podeS||salvando} title={podeS?"":"Preencha objeto, valor total, início e término"} style={{background:podeS?"#4a9410":"#e5e7eb",color:podeS?"#fff":"#9ca3af",border:"none",padding:"8px 24px",borderRadius:8,cursor:podeS&&!salvando?"pointer":"not-allowed",fontWeight:700,alignSelf:"flex-end"}}>{salvando?"Salvando…":editId?"✓ Salvar alterações":"+ Salvar"}</button>
        {editId&&<button onClick={limpar} style={{background:"#fff",color:"#374151",border:"1px solid #d1d5db",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,alignSelf:"flex-end"}}>Cancelar</button>}
      </div>
      {erro&&<div style={{marginTop:10,background:"#fee2e2",color:"#991b1b",padding:"8px 12px",borderRadius:8,fontSize:12}}>⛔ {erro}</div>}
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <TabelaHead colunas={["Número","Objeto","Valor Mensal","Vigência","Término","Status","Alerta","Ações"]} />
        <tbody>{data.map((c:any)=>(
          <tr key={c.id} style={{borderBottom:"1px solid #f3f4f6",background:editId===c.id?"#f0fdf4":undefined}}>
            <td style={{padding:"8px 12px",fontWeight:700,fontFamily:"monospace",color:"#334532",fontSize:12}}>{c.number}</td>
            <td style={{padding:"8px 12px",fontSize:12,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.object}</td>
            <td style={{padding:"8px 12px",fontWeight:700,color:"#4a9410"}}>R${fmt(Number(c.monthlyValue))}</td>
            <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{c.startDate?new Date(c.startDate).toLocaleDateString("pt-BR"):""}</td>
            <td style={{padding:"8px 12px",fontSize:11,fontWeight:c.diasFim<=90?700:400,color:c.diasFim<=30?"#dc2626":c.diasFim<=90?"#d97706":"#6b7280"}}>{c.endDate?new Date(c.endDate).toLocaleDateString("pt-BR"):""}</td>
            <td style={{padding:"8px 12px"}}><span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{c.status}</span></td>
            <td style={{padding:"8px 12px"}}>{c.alerta==="renovar"?<span style={{background:"#fef9c3",color:"#92400e",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>⚠️ {c.diasFim}d</span>:c.alerta==="vencido"?<span style={{background:"#fee2e2",color:"#991b1b",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>⛔ Vencido</span>:<span style={{color:"#15803d",fontSize:11}}>✓ {c.diasFim}d</span>}</td>
            <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
              <button onClick={()=>editar(c)} disabled={demo} title={demo?"Indisponível em modo demo":"Editar"} style={{background:"none",border:"none",cursor:demo?"default":"pointer",fontSize:14,opacity:demo?.4:1}}>✏️</button>
              <button onClick={()=>excluir(c)} disabled={demo} title={demo?"Indisponível em modo demo":"Cancelar contrato"} style={{background:"none",border:"none",cursor:demo?"default":"pointer",fontSize:14,marginLeft:6,opacity:demo?.4:1}}>🗑️</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>);
}