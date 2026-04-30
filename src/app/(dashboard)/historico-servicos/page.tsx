
"use client";
import { useEffect, useState } from "react";
export default function HistoricoServicosPage() {
  const [data,setData]=useState<any[]>([]);const [demo,setDemo]=useState(false);
  useEffect(()=>{fetch("/api/historico-servicos").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});},[]);
  const TIPO_COR:any={"Roçada Manual":["#dcfce7","#15803d"],"Roçada Mecanizada":["#dbeafe","#1e40af"],"Jardinagem Mensal":["#f3e8ff","#7c3aed"],"PRADA":["#fef9c3","#92400e"],"Herbicida":["#fce7f3","#9d174d"],"Hidrossemeadura":["#e0f2fe","#0369a1"]};
  const TXT=(s:string)=>{
    const m=s.match(/\[([^\]]+)\]/);
    return {tipo:m?m[1]:"Serviço",desc:s.replace(/\[[^\]]+\]\s*/,"")};
  };
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Histórico de Serviços {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>Adaptado de: <code style={{fontSize:11,background:"#f3f4f6",padding:"1px 6px",borderRadius:4}}>verdelimp-erp-prime-final → serviceHistory table</code> — registro de serviços prestados por contrato.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
      {[["Total registros",data.length,"📋","#1a7a4a"],["Este mês",data.filter((d:any)=>new Date(d.date).getMonth()===new Date().getMonth()).length,"📅","#1d4ed8"],["Contratos ativos",[...new Set(data.map((d:any)=>d.contractId).filter(Boolean))].length,"🤝","#7c3aed"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {data.map((d:any,i:number)=>{
        const {tipo,desc}=TXT(d.activitiesDone||"");
        const [bg,co]=TIPO_COR[tipo]||["#f3f4f6","#374151"];
        return(<div key={i} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 16px"}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8}}>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <span style={{background:bg,color:co,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{tipo}</span>
              <span style={{fontSize:11,color:"#9ca3af"}}>📅 {d.date?new Date(d.date).toLocaleDateString("pt-BR"):""} · 👤 {d.supervisor} · 👥 {d.teamSize} pessoas</span>
            </div>
            {d.areasWorked&&<span style={{background:"#f0fdf4",color:"#15803d",padding:"2px 9px",borderRadius:8,fontSize:11,fontWeight:600}}>📐 {d.areasWorked}</span>}
          </div>
          <div style={{fontWeight:500,fontSize:13,marginBottom:4}}>{d.location}</div>
          <div style={{fontSize:12,color:"#6b7280",lineHeight:1.5}}>{desc}</div>
        </div>);
      })}
    </div>
  </div>);
}
