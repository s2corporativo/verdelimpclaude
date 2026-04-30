
"use client";
import { useEffect, useState } from "react";
export default function MedicaoPage() {
  const [data,setData]=useState<any[]>([]);const [demo,setDemo]=useState(false);
  useEffect(()=>{fetch("/api/medicao").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});},[]);
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const SC:any={em_elaboracao:["#f3f4f6","#374151"],enviada:["#dbeafe","#1e40af"],aprovada:["#dcfce7","#15803d"],glosada:["#fee2e2","#991b1b"],faturada:["#f3e8ff","#6d28d9"]};
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Medição Mensal {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#1e40af"}}>
      📋 Medições são registradas do dia 21 ao dia 20 de cada mês. Após aprovação do fiscal, emitir NFS-e correspondente.
    </div>
    {data.map((m:any)=>{
      const [bg,co]=SC[m.status]||["#f3f4f6","#374151"];
      return(<div key={m.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#0f5233"}}>{m.contract?.object}</div>
            <div style={{fontSize:11,color:"#6b7280"}}>Contrato: {m.contract?.number} · Período: {m.period} · {m.startDate?new Date(m.startDate).toLocaleDateString("pt-BR"):""} a {m.endDate?new Date(m.endDate).toLocaleDateString("pt-BR"):""}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20,fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(m.value))}</div>
            <span style={{background:bg,color:co,padding:"2px 9px",borderRadius:8,fontSize:10,fontWeight:700}}>{m.status.replace(/_/g," ").toUpperCase()}</span>
          </div>
        </div>
        {m.items?.length>0&&<table style={{borderCollapse:"collapse",width:"100%",marginTop:8}}>
          <thead><tr style={{background:"#e8f5ee"}}>{["Descrição","Unid.","Qtd.","V.Unit.","Total"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
          <tbody>{m.items.map((i:any,idx:number)=><tr key={idx} style={{borderBottom:"1px solid #f3f4f6"}}>
            <td style={{padding:"6px 10px",fontSize:12}}>{i.description}</td>
            <td style={{padding:"6px 10px",fontSize:11}}>{i.unit}</td>
            <td style={{padding:"6px 10px",fontWeight:700}}>{Number(i.quantity).toLocaleString("pt-BR",{maximumFractionDigits:2})}</td>
            <td style={{padding:"6px 10px"}}>R${fmt(Number(i.unitValue))}</td>
            <td style={{padding:"6px 10px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(i.totalValue))}</td>
          </tr>)}</tbody>
        </table>}
        {m.approvedBy&&<div style={{marginTop:8,fontSize:11,color:"#15803d",fontWeight:600}}>✅ Aprovado por: {m.approvedBy} em {m.approvedAt?new Date(m.approvedAt).toLocaleDateString("pt-BR"):""}</div>}
        <div style={{display:"flex",gap:8,marginTop:12}}>
          {m.status==="em_elaboracao"&&<button style={{background:"#1d4ed8",color:"#fff",border:"none",padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>📤 Enviar para aprovação</button>}
          {m.status==="aprovada"&&<button style={{background:"#6d28d9",color:"#fff",border:"none",padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>🧾 Gerar NFS-e</button>}
          <button style={{background:"#f3f4f6",color:"#374151",border:"none",padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11}}>📄 Imprimir</button>
        </div>
      </div>);
    })}
  </div>);
}