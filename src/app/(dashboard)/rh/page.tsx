
"use client";
import { useEffect, useState } from "react";
export default function RHPage() {
  const [data, setData] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  useEffect(()=>{ fetch("/api/funcionarios").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);}); },[]);
  const folha = data.reduce((s:number,e:any)=>s+Number(e.salary),0);
  const fmt = (v:number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:0}}>RH & Folha {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{display:"flex",gap:8}}><a href="/dashboard/mobilizacoes" style={{background:"#e8f5ee",color:"#0f5233",padding:"7px 14px",borderRadius:8,textDecoration:"none",fontWeight:600,fontSize:12}}>🦺 Ver Mobilizações</a><a href="/dashboard/treinamentos" style={{background:"#f3e8ff",color:"#6d28d9",padding:"7px 14px",borderRadius:8,textDecoration:"none",fontWeight:600,fontSize:12}}>🎓 Treinamentos/NRs</a><a href="/dashboard/folha-detalhada" style={{background:"#dbeafe",color:"#1d4ed8",padding:"7px 14px",borderRadius:8,textDecoration:"none",fontWeight:600,fontSize:12}}>📊 Folha Detalhada</a></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[["Colaboradores",data.length+"","👷","#1d4ed8"],["Folha Bruta","R$"+fmt(folha),"💰","#1a7a4a"],["FGTS (8%)","R$"+fmt(folha*0.08),"🏦","#7c3aed"],["INSS Patronal (7%)","R$"+fmt(folha*0.07),"🏛️","#d97706"]].map(([l,v,i,c])=>(
        <div key={l} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:"3px solid "+c}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#92400e"}}>⚠️ Apoio gerencial — validar com contador. Encargos podem variar conforme categorias e convenções coletivas.</div>
    <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <thead><tr style={{background:"#e8f5ee"}}>{["Funcionário","Função","Salário","FGTS 8%","INSS 7%","Custo Total","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
      <tbody>{data.map((e:any)=>(
        <tr key={e.id} style={{borderBottom:"1px solid #f3f4f6"}}>
          <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{e.name}</td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{e.role}</td>
          <td style={{padding:"8px 12px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(e.salary))}</td>
          <td style={{padding:"8px 12px"}}>R${fmt(Number(e.salary)*0.08)}</td>
          <td style={{padding:"8px 12px"}}>R${fmt(Number(e.salary)*0.07)}</td>
          <td style={{padding:"8px 12px",fontWeight:700}}>R${fmt(Number(e.salary)*1.7)}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{e.status||"ativo"}</span></td>
        </tr>
      ))}</tbody>
      <tfoot><tr style={{background:"#e8f5ee"}}>
        <td colSpan={2} style={{padding:"9px 12px",fontWeight:700,fontSize:12,color:"#0f5233"}}>TOTAIS</td>
        <td style={{padding:"9px 12px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(folha)}</td>
        <td style={{padding:"9px 12px",fontWeight:700}}>R${fmt(folha*0.08)}</td>
        <td style={{padding:"9px 12px",fontWeight:700}}>R${fmt(folha*0.07)}</td>
        <td style={{padding:"9px 12px",fontWeight:700}}>R${fmt(folha*1.7)}</td>
        <td style={{padding:"9px 12px"}}></td>
      </tr></tfoot>
    </table>
  </div>);
}
