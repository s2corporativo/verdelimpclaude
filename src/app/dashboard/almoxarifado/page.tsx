
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
  const fmt = (v:number) => (Number.isFinite(v)?v:0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const [showMov, setShowMov] = useState(false);
  const [movItem, setMovItem] = useState<any>(null);
  const [movForm, setMovForm] = useState({tipo:"entrada",quantidade:"",motivo:""});
  const [movErro, setMovErro] = useState("");
  const registrarMov = async () => {
    if(!movItem||!movForm.quantidade) return;
    setMovErro("");
    const r = await fetch("/api/almoxarifado",{ method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ action:"movimentar", itemId:movItem.id, ...movForm, quantidade:Number(movForm.quantidade) })
    });
    if(!r.ok){ const j=await r.json().catch(()=>({})); setMovErro(j.error||"Não foi possível registrar a movimentação."); return; }
    setShowMov(false); setMovForm({tipo:"entrada",quantidade:"",motivo:""});
    fetch("/api/almoxarifado").then(r=>r.json()).then(d=>{setData(d.data||[]);setStats({total:d.total||0,criticos:d.criticos||0,valorEstoque:d.valorEstoque||0});setDemo(!!d._demo);});
  };
  const filtrados = data.filter((i:any)=>!busca||i.description.toLowerCase().includes(busca.toLowerCase())||i.internalCode.toLowerCase().includes(busca.toLowerCase()));
  const STATUS_COLORS:any={regular:["#dcfce7","#15803d"],atencao:["#fef9c3","#92400e"],critico:["#fee2e2","#991b1b"],em_uso:["#dbeafe","#1e40af"],manutencao:["#f3e8ff","#7e22ce"]};
  return (<div>
    <h1 style={{color:"#334532",fontSize:20,fontWeight:700,marginBottom:14}}>Almoxarifado {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
      {[["Total de Itens",stats.total||data.length,"📦","#4a9410"],["Estoque Crítico",stats.criticos,"🚨","#dc2626"],["Valor em Estoque","R$"+fmt(stats.valorEstoque),"💰","#4a9410"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:"3px solid "+c}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{marginBottom:12}}><input placeholder="🔍 Buscar por código ou descrição..." value={busca} onChange={e=>setBusca(e.target.value)} style={{width:"100%",maxWidth:360,padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}}/></div>
    <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <thead><tr style={{background:"#e8f5ee"}}>{["Código","Descrição","Categoria","Qtd.","Mín.","Custo Unit.","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#334532"}}>{h}</th>)}</tr></thead>
      <tbody>{filtrados.map((i:any)=>{
        const sc=STATUS_COLORS[i.status]||["#f3f4f6","#374151"];
        const isAbaixo=Number(i.currentQuantity)<=Number(i.minimumStock);
        return <tr key={i.id} style={{borderBottom:"1px solid #f3f4f6"}}>
          <td style={{padding:"8px 12px",fontFamily:"monospace",fontWeight:700,color:"#334532"}}>{i.internalCode}</td>
          <td style={{padding:"8px 12px"}}>
            <div style={{fontWeight:600,fontSize:12}}>{i.description}</div>
            <div style={{fontSize:10,color:"#9ca3af"}}>{i.category?.icon} {i.category?.name}</div>
          </td>
          <td style={{padding:"8px 12px",fontSize:11}}>{i.category?.name||"—"}</td>
          <td style={{padding:"8px 12px",fontWeight:700,color:isAbaixo?"#dc2626":"#4a9410",fontSize:14}}>{Number(i.currentQuantity).toFixed(0)}</td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{Number(i.minimumStock).toFixed(0)}</td>
          <td style={{padding:"8px 12px"}}>R${fmt(Number(i.averageCost))}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:(isAbaixo?STATUS_COLORS.critico:sc)[0],color:(isAbaixo?STATUS_COLORS.critico:sc)[1],padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{isAbaixo?"Crítico":i.status}</span></td>
          <td style={{padding:"8px 12px"}}>
            <button onClick={()=>{setMovItem(i);setShowMov(true);}} style={{background:"#e8f5ee",color:"#334532",border:"none",padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:700}}>± Mover</button>
          </td>
        </tr>;
      })}</tbody>
    </table>

    {showMov && movItem && (
      <div onClick={()=>{setShowMov(false);setMovErro("");}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
        <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:12,padding:22,width:"100%",maxWidth:380}}>
          <h3 style={{margin:"0 0 4px",color:"#334532",fontSize:16}}>Movimentar estoque</h3>
          <p style={{margin:"0 0 14px",fontSize:12,color:"#6b7280"}}>{movItem.internalCode} · {movItem.description} · saldo atual {Number(movItem.currentQuantity).toFixed(0)}</p>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            {[["entrada","Entrada","#4a9410"],["saida","Saída","#dc2626"]].map(([v,l,c])=>(
              <button key={v} onClick={()=>setMovForm(p=>({...p,tipo:v}))} style={{flex:1,padding:"8px",borderRadius:8,border:"1px solid #d1d5db",background:movForm.tipo===v?c as string:"#fff",color:movForm.tipo===v?"#fff":"#374151",fontWeight:700,fontSize:13,cursor:"pointer"}}>{l}</button>
            ))}
          </div>
          <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}}>Quantidade</label>
          <input type="number" min="0" step="0.01" value={movForm.quantidade} onChange={e=>setMovForm(p=>({...p,quantidade:e.target.value}))} style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,marginBottom:10}}/>
          <label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}}>Motivo</label>
          <input value={movForm.motivo} onChange={e=>setMovForm(p=>({...p,motivo:e.target.value}))} placeholder="Ex.: compra, consumo em obra…" style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13,marginBottom:12}}/>
          {movErro && <div style={{background:"#fee2e2",color:"#991b1b",padding:"8px 12px",borderRadius:8,fontSize:12,marginBottom:12}}>⛔ {movErro}</div>}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>{setShowMov(false);setMovErro("");}} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",cursor:"pointer",fontSize:13}}>Cancelar</button>
            <button onClick={registrarMov} disabled={!movForm.quantidade} style={{padding:"8px 18px",borderRadius:8,border:"none",background:movForm.quantidade?"#4a9410":"#e5e7eb",color:movForm.quantidade?"#fff":"#9ca3af",fontWeight:700,cursor:movForm.quantidade?"pointer":"not-allowed",fontSize:13}}>Registrar</button>
          </div>
        </div>
      </div>
    )}
  </div>);
}