
"use client";
import { useEffect, useState } from "react";
export default function FinanceiroPage() {
  const [data, setData] = useState<any[]>([]);
  const [totais, setTotais] = useState({totalReceitas:0,totalDespesas:0,saldo:0});
  const [demo, setDemo] = useState(false);
  const [form, setForm] = useState({description:"",amount:"",dueDate:"",status:"em_aberto",categoryName:"Operacional",notes:""});
  const load = () => fetch("/api/financeiro").then(r=>r.json()).then(d=>{setData(d.data||[]);setTotais({totalReceitas:d.totalReceitas||0,totalDespesas:d.totalDespesas||0,saldo:d.saldo||0});setDemo(!!d._demo);});
  useEffect(()=>{load();},[]);
  const salvar = async() => {
    await fetch("/api/financeiro",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,amount:Number(form.amount)})});
    setForm({description:"",amount:"",dueDate:"",status:"em_aberto",categoryName:"Operacional",notes:""});load();
  };
  const fmt = (v:number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Financeiro {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[["Receitas (NFS-e)","R$"+fmt(totais.totalReceitas),"📈","#1a7a4a"],["Despesas","R$"+fmt(totais.totalDespesas),"📉","#dc2626"],["Saldo","R$"+fmt(totais.saldo),"💵",totais.saldo>=0?"#1a7a4a":"#dc2626"],["Margem",totais.totalReceitas>0?((totais.saldo/totais.totalReceitas)*100).toFixed(1)+"%":"—%","%","#1a7a4a"]].map(([l,v,i,c])=>(
        <div key={l} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:"3px solid "+c}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>+ Nova Despesa</h3>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
        <div><label style={LS}>Descrição*</label><input style={IS} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/></div>
        <div><label style={LS}>Valor (R$)*</label><input type="number" style={IS} value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></div>
        <div><label style={LS}>Vencimento*</label><input type="date" style={IS} value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))}/></div>
        <div><label style={LS}>Status</label><select style={IS} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}><option value="em_aberto">Em Aberto</option><option value="pago">Pago</option></select></div>
        <button onClick={salvar} disabled={!form.description||!form.amount} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontWeight:600}}>+ Add</button>
      </div>
    </div>
    <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <thead><tr style={{background:"#e8f5ee"}}>{["Descrição","Categoria","Vencimento","Valor","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
      <tbody>{data.map((l:any)=><tr key={l.id} style={{borderBottom:"1px solid #f3f4f6"}}>
        <td style={{padding:"8px 12px",fontSize:12}}>{l.description}</td>
        <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{l.category?.name||"—"}</td>
        <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{l.dueDate?new Date(l.dueDate).toLocaleDateString("pt-BR"):"—"}</td>
        <td style={{padding:"8px 12px",fontWeight:700,color:"#dc2626"}}>R${Number(l.amount).toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
        <td style={{padding:"8px 12px"}}><span style={{background:l.status==="pago"?"#dcfce7":"#fef9c3",color:l.status==="pago"?"#15803d":"#92400e",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{l.status}</span></td>
      </tr>)}</tbody>
    </table>
  </div>);
}
