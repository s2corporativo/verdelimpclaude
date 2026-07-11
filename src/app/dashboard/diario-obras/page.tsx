
"use client";
import { useEffect, useState } from "react";
export default function DiarioPage() {
  const [data,setData]=useState<any[]>([]);const [demo,setDemo]=useState(false);
  const [form,setForm]=useState({location:"",supervisor:"",teamSize:"1",weather:"Bom",activitiesDone:"",areasWorked:"",equipmentUsed:"",occurrences:"",date:""});
  const load=()=>fetch("/api/diario").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});
  useEffect(()=>{load();},[]);
  const salvar=async()=>{ await fetch("/api/diario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}); load(); };
  const WC:any={Bom:["#dcfce7","#15803d","☀️"],Nublado:["#f3f4f6","#374151","⛅"],Chuva:["#dbeafe","#1e40af","🌧️"],Suspensão:["#fee2e2","#991b1b","⛔"]};
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Diário de Obras {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>+ Novo Registro</h3>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr",gap:9,marginBottom:9}}>
        <div><label style={LS}>Local / Contrato*</label><input style={IS} value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Ex: PBH — Canteiro Região Norte"/></div>
        <div><label style={LS}>Supervisor*</label><input style={IS} value={form.supervisor} onChange={e=>setForm(p=>({...p,supervisor:e.target.value}))}/></div>
        <div><label style={LS}>Equipe (pessoas)</label><input type="number" style={IS} value={form.teamSize} onChange={e=>setForm(p=>({...p,teamSize:e.target.value}))}/></div>
        <div><label style={LS}>Data</label><input type="date" style={IS} value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
        <div><label style={LS}>Tempo</label><select style={IS} value={form.weather} onChange={e=>setForm(p=>({...p,weather:e.target.value}))}>{["Bom","Nublado","Chuva","Suspensão"].map(w=><option key={w}>{w}</option>)}</select></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
        <div><label style={LS}>Atividades Executadas*</label><textarea style={{...IS,height:70,resize:"vertical"}} value={form.activitiesDone} onChange={e=>setForm(p=>({...p,activitiesDone:e.target.value}))}/></div>
        <div><label style={LS}>Áreas Atendidas</label><textarea style={{...IS,height:70,resize:"vertical"}} value={form.areasWorked} onChange={e=>setForm(p=>({...p,areasWorked:e.target.value}))}/></div>
        <div><label style={LS}>Equipamentos Usados</label><input style={IS} value={form.equipmentUsed} onChange={e=>setForm(p=>({...p,equipmentUsed:e.target.value}))}/></div>
        <div><label style={LS}>Ocorrências</label><input style={IS} value={form.occurrences} onChange={e=>setForm(p=>({...p,occurrences:e.target.value}))} placeholder="Nenhuma ocorrência"/></div>
      </div>
      <button onClick={salvar} disabled={!form.location||!form.activitiesDone} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700}}>+ Salvar Registro</button>
    </div>
    {data.map((d:any,i:number)=>{
      const [wbg,wco,wic]=WC[d.weather]||["#f3f4f6","#374151","?"];
      return(<div key={i} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:10}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#0f5233"}}>{d.location}</div>
            <div style={{fontSize:11,color:"#6b7280"}}>📅 {d.date?new Date(d.date).toLocaleDateString("pt-BR",""):""} · 👷 {d.supervisor} · 👥 {d.teamSize} pessoas</div>
          </div>
          <span style={{background:wbg,color:wco,padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700}}>{wic} {d.weather}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"#f9fafb",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"#9ca3af",fontWeight:600,marginBottom:4}}>ATIVIDADES</div><div style={{fontSize:12}}>{d.activitiesDone}</div></div>
          {d.areasWorked&&<div style={{background:"#f9fafb",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"#9ca3af",fontWeight:600,marginBottom:4}}>ÁREAS</div><div style={{fontSize:12}}>{d.areasWorked}</div></div>}
          {d.equipmentUsed&&<div style={{background:"#f9fafb",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"#9ca3af",fontWeight:600,marginBottom:4}}>EQUIPAMENTOS</div><div style={{fontSize:12}}>{d.equipmentUsed}</div></div>}
          {d.occurrences&&<div style={{background:d.occurrences.toLowerCase().includes("nenhuma")?"#f0fdf4":"#fef2f2",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"#9ca3af",fontWeight:600,marginBottom:4}}>OCORRÊNCIAS</div><div style={{fontSize:12}}>{d.occurrences}</div></div>}
        </div>
      </div>);
    })}
  </div>);
}