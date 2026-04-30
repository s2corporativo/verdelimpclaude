
"use client";
import { useEffect, useState } from "react";
export default function ContratosPage() {
  const [data,setData]=useState<any[]>([]);const [demo,setDemo]=useState(false);
  const [form,setForm]=useState({clientId:"",object:"",value:"",monthlyValue:"",startDate:"",endDate:"",notes:""});
  const load=()=>fetch("/api/contratos").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});
  useEffect(()=>{load();},[]);
  const salvar=async()=>{
    await fetch("/api/contratos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
    setForm({clientId:"",object:"",value:"",monthlyValue:"",startDate:"",endDate:"",notes:""});load();
  };
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  const vencendo=data.filter((c:any)=>c.alerta==="renovar").length;
  const vencidos=data.filter((c:any)=>c.alerta==="vencido").length;
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Gestão de Contratos {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[["Contratos Ativos",data.filter((c:any)=>c.status==="Ativo").length,"📋","#1a7a4a"],
        ["Valor Mensal","R$"+fmt(data.filter((c:any)=>c.status==="Ativo").reduce((s:number,c:any)=>s+Number(c.monthlyValue),0)),"💰","#1a7a4a"],
        ["Renovar em breve",vencendo,"⚠️","#d97706"],
        ["Vencidos",vencidos,"🚨","#dc2626"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>+ Novo Contrato</h3>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:9,marginBottom:9}}>
        <div><label style={LS}>Objeto do Contrato*</label><input style={IS} value={form.object} onChange={e=>setForm(p=>({...p,object:e.target.value}))} placeholder="Ex: Roçada Canteiros Norte — PBH"/></div>
        <div><label style={LS}>Valor Total (R$)</label><input type="number" style={IS} value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))}/></div>
        <div><label style={LS}>Valor Mensal (R$)</label><input type="number" style={IS} value={form.monthlyValue} onChange={e=>setForm(p=>({...p,monthlyValue:e.target.value}))}/></div>
        <div><label style={LS}>Início</label><input type="date" style={IS} value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))}/></div>
        <div><label style={LS}>Término</label><input type="date" style={IS} value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))}/></div>
      </div>
      <div style={{display:"flex",gap:10}}>
        <div style={{flex:1}}><label style={LS}>Observações</label><input style={IS} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
        <button onClick={salvar} disabled={!form.object} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"8px 24px",borderRadius:8,cursor:"pointer",fontWeight:700,alignSelf:"flex-end"}}>+ Salvar</button>
      </div>
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr style={{background:"#e8f5ee"}}>{["Número","Objeto","Valor Mensal","Vigência","Término","Status","Alerta"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
        <tbody>{data.map((c:any)=>(
          <tr key={c.id} style={{borderBottom:"1px solid #f3f4f6"}}>
            <td style={{padding:"8px 12px",fontWeight:700,fontFamily:"monospace",color:"#0f5233",fontSize:12}}>{c.number}</td>
            <td style={{padding:"8px 12px",fontSize:12,maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.object}</td>
            <td style={{padding:"8px 12px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(c.monthlyValue))}</td>
            <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{c.startDate?new Date(c.startDate).toLocaleDateString("pt-BR"):""}</td>
            <td style={{padding:"8px 12px",fontSize:11,fontWeight:c.diasFim<=90?700:400,color:c.diasFim<=30?"#dc2626":c.diasFim<=90?"#d97706":"#6b7280"}}>{c.endDate?new Date(c.endDate).toLocaleDateString("pt-BR"):""}</td>
            <td style={{padding:"8px 12px"}}><span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{c.status}</span></td>
            <td style={{padding:"8px 12px"}}>{c.alerta==="renovar"?<span style={{background:"#fef9c3",color:"#92400e",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>⚠️ {c.diasFim}d</span>:c.alerta==="vencido"?<span style={{background:"#fee2e2",color:"#991b1b",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>⛔ Vencido</span>:<span style={{color:"#15803d",fontSize:11}}>✓ {c.diasFim}d</span>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </div>);
}