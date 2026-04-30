
"use client";
import { useEffect, useState } from "react";
export default function AlmoxarifadoPage() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({total:0,criticos:0,valorEstoque:0});
  const [demo, setDemo] = useState(false);
  const [busca, setBusca] = useState("");
  useEffect(()=>{
    fetch("/api/almoxarifado").then(r=>r.json()).then(d=>{setData(d.data||[]);setStats({total:d.total||0,criticos:d.criticos||0,valorEstoque:d.valorEstoque||0});setDemo(!!d._demo);});
  },[]);
  const fmt = (v:number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const filtrados = data.filter((i:any)=>!busca||i.description.toLowerCase().includes(busca.toLowerCase())||i.internalCode.toLowerCase().includes(busca.toLowerCase()));
  const STATUS_COLORS:any={regular:["#dcfce7","#15803d"],atencao:["#fef9c3","#92400e"],critico:["#fee2e2","#991b1b"],em_uso:["#dbeafe","#1e40af"],manutencao:["#f3e8ff","#7e22ce"]};
  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Almoxarifado {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
      {[["Total de Itens",stats.total||data.length,"📦","#1a7a4a"],["Estoque Crítico",stats.criticos,"🚨","#dc2626"],["Valor em Estoque","R$"+fmt(stats.valorEstoque),"💰","#1a7a4a"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:"3px solid "+c}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{marginBottom:12}}><input placeholder="🔍 Buscar por código ou descrição..." value={busca} onChange={e=>setBusca(e.target.value)} style={{width:"100%",maxWidth:360,padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}}/></div>
    <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <thead><tr style={{background:"#e8f5ee"}}>{["Código","Descrição","Categoria","Qtd.","Mín.","Custo Unit.","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
      <tbody>{filtrados.map((i:any)=>{
        const sc=STATUS_COLORS[i.status]||["#f3f4f6","#374151"];
        const isAbaixo=Number(i.currentQuantity)<=Number(i.minimumStock);
        return <tr key={i.id} style={{borderBottom:"1px solid #f3f4f6"}}>
          <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:"#0f5233"}}>{i.internalCode}</td>
          <td style={{padding:"8px 12px"}}>
            <div style={{fontWeight:600,fontSize:12}}>{i.description}</div>
            <div style={{fontSize:10,color:"#9ca3af"}}>{i.category?.icon} {i.category?.name}</div>
          </td>
          <td style={{padding:"8px 12px",fontSize:11}}>{i.category?.name||"—"}</td>
          <td style={{padding:"8px 12px",fontWeight:700,color:isAbaixo?"#dc2626":"#1a7a4a",fontSize:14}}>{Number(i.currentQuantity).toFixed(0)}</td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{Number(i.minimumStock).toFixed(0)}</td>
          <td style={{padding:"8px 12px"}}>R${fmt(Number(i.averageCost))}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:(isAbaixo?STATUS_COLORS.critico:sc)[0],color:(isAbaixo?STATUS_COLORS.critico:sc)[1],padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{isAbaixo?"Crítico":i.status}</span></td>
        </tr>;
      })}</tbody>
    </table>
  </div>);
}
