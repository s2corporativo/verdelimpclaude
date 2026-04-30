
"use client";
import { useEffect, useState } from "react";
export default function PrecificacaoRegrasPage() {
  const [data, setData] = useState<any[]>([]);
  const [editando, setEditando] = useState<any>(null);
  const load = () => fetch("/api/precificacao-regras").then(r=>r.json()).then(d=>setData(d.data||[]));
  useEffect(()=>{load();},[]);
  const salvar = async () => {
    if(!editando) return;
    await fetch("/api/precificacao-regras",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(editando)});
    setEditando(null);load();
  };
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:6,fontSize:12,width:"100%"};
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Tabela de Precificação</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>Adaptado de: <code style={{fontSize:11,background:"#f3f4f6",padding:"1px 6px",borderRadius:4}}>verdelimp-erp-prime-final → pricingRules table</code> · costPerM2, profitMargin, marketReference por tipo de serviço.</p>
    <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#92400e"}}>
      ⚠️ Referência gerencial — valores baseados em histórico de mercado MG. Ajuste conforme contratos reais da Verdelimp.
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr style={{background:"#e8f5ee"}}>{["Serviço","Un","Custo/Un","Margem","Mín","Máx","Referência Mercado","Ação"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"right",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
        <tbody>{data.map((r:any,i:number)=>(
          <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
            <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{r.serviceType}</td>
            <td style={{padding:"8px 12px",textAlign:"right",fontSize:11,color:"#6b7280"}}>{r.unit}</td>
            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#1a7a4a"}}>R${fmt(r.costPerM2)}</td>
            <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#7c3aed"}}>{r.profitMargin}%</td>
            <td style={{padding:"8px 12px",textAlign:"right",color:"#6b7280"}}>R${fmt(r.minPrice)}</td>
            <td style={{padding:"8px 12px",textAlign:"right",color:"#6b7280"}}>R${fmt(r.maxPrice)}</td>
            <td style={{padding:"8px 12px",textAlign:"right"}}>
              <span style={{background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>R${fmt(r.marketReference)}/{r.unit}</span>
            </td>
            <td style={{padding:"8px 12px",textAlign:"right"}}>
              <button onClick={()=>setEditando({...r})} style={{background:"#f3f4f6",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11}}>✏️</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
    {editando&&(
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setEditando(null)}>
        <div style={{background:"#fff",borderRadius:14,padding:24,width:420,boxShadow:"0 20px 40px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
          <h3 style={{color:"#0f5233",fontSize:15,fontWeight:700,marginBottom:16}}>Editar: {editando.serviceType}</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[["costPerM2","Custo/Un (R$)"],["profitMargin","Margem (%)"],["minPrice","Preço mínimo (R$)"],["maxPrice","Preço máximo (R$)"],["marketReference","Ref. mercado (R$)"]].map(([k,l])=>(
              <div key={k}><label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:2}}>{l}</label>
                <input type="number" step="0.01" style={IS} value={(editando as any)[k]} onChange={e=>setEditando((p:any)=>({...p,[k]:e.target.value}))}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setEditando(null)} style={{background:"#f3f4f6",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer"}}>Cancelar</button>
            <button onClick={salvar} style={{background:"#1a7a4a",color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",cursor:"pointer",fontWeight:700}}>Salvar</button>
          </div>
        </div>
      </div>
    )}
  </div>);
}
