
"use client";
import { useEffect, useState } from "react";
export default function CombustivelPage() {
  const [data,setData]=useState<any[]>([]);const [veics,setVeics]=useState<any[]>([]);
  const [demo,setDemo]=useState(false);const [stats,setStats]=useState({totalMes:0,totalLitros:0});
  const [form,setForm]=useState({vehicleId:"",date:"",odometer:"",liters:"",pricePerLiter:"",fuelType:"Gasolina",station:"",notes:""});
  const load=()=>fetch("/api/combustivel").then(r=>r.json()).then(d=>{setData(d.data||[]);setVeics(d.veiculos||[]);setStats({totalMes:d.totalMes||0,totalLitros:d.totalLitros||0});setDemo(!!d._demo);});
  useEffect(()=>{load();},[]);
  const salvar=async()=>{ await fetch("/api/combustivel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}); load(); };
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  const pmKm=data.length>=2?((Number(data[0]?.odometer||0)-Number(data[data.length-1]?.odometer||0))/data.reduce((s:number,l:any)=>s+Number(l.liters),0)).toFixed(1):"—";
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Controle de Combustível {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[["Custo no Mês","R$"+fmt(stats.totalMes),"⛽","#dc2626"],["Litros Abastecidos",Number(stats.totalLitros).toFixed(0)+"L","🛢️","#1a7a4a"],["Média km/L",pmKm,"🚗","#1d4ed8"],["Veículos",veics.length,"🚙","#7c3aed"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>+ Registrar Abastecimento</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",gap:8,marginBottom:9}}>
        <div><label style={LS}>Veículo*</label><select style={IS} value={form.vehicleId} onChange={e=>setForm(p=>({...p,vehicleId:e.target.value}))}><option value="">— Selecione —</option>{veics.map((v:any)=><option key={v.id} value={v.id}>{v.plate} — {v.model}</option>)}</select></div>
        <div><label style={LS}>Data</label><input type="date" style={IS} value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
        <div><label style={LS}>Hodômetro (km)*</label><input type="number" style={IS} value={form.odometer} onChange={e=>setForm(p=>({...p,odometer:e.target.value}))}/></div>
        <div><label style={LS}>Litros*</label><input type="number" step="0.01" style={IS} value={form.liters} onChange={e=>setForm(p=>({...p,liters:e.target.value}))}/></div>
        <div><label style={LS}>Preço/L (R$)*</label><input type="number" step="0.001" style={IS} value={form.pricePerLiter} onChange={e=>setForm(p=>({...p,pricePerLiter:e.target.value}))}/></div>
        <div><label style={LS}>Combustível</label><select style={IS} value={form.fuelType} onChange={e=>setForm(p=>({...p,fuelType:e.target.value}))}>{["Gasolina","Diesel S10","Diesel S500","Etanol","GNV"].map(f=><option key={f}>{f}</option>)}</select></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8}}>
        <div><label style={LS}>Posto</label><input style={IS} value={form.station} onChange={e=>setForm(p=>({...p,station:e.target.value}))}/></div>
        <div><label style={LS}>Total estimado</label><input style={{...IS,background:"#f0fdf4",fontWeight:700,color:"#1a7a4a"}} readOnly value={form.liters&&form.pricePerLiter?"R$"+(Number(form.liters)*Number(form.pricePerLiter)).toFixed(2):""}/></div>
        <button onClick={salvar} disabled={!form.vehicleId||!form.odometer} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"8px 20px",borderRadius:8,cursor:"pointer",fontWeight:700,alignSelf:"flex-end"}}>+ Registrar</button>
      </div>
    </div>
    <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <thead><tr style={{background:"#e8f5ee"}}>{["Data","Veículo","Hodômetro","Litros","Preço/L","Total","Tipo","Posto"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
      <tbody>{data.map((l:any,i:number)=><tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
        <td style={{padding:"8px 12px",fontSize:11}}>{l.date?new Date(l.date).toLocaleDateString("pt-BR"):""}</td>
        <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{l.vehicle?.plate} <span style={{fontSize:10,color:"#9ca3af"}}>— {l.vehicle?.model}</span></td>
        <td style={{padding:"8px 12px",fontFamily:"monospace"}}>{Number(l.odometer).toLocaleString("pt-BR")} km</td>
        <td style={{padding:"8px 12px",fontWeight:700,color:"#1a7a4a"}}>{Number(l.liters).toFixed(1)} L</td>
        <td style={{padding:"8px 12px"}}>R${Number(l.pricePerLiter).toFixed(3)}</td>
        <td style={{padding:"8px 12px",fontWeight:700}}>R${fmt(Number(l.totalCost))}</td>
        <td style={{padding:"8px 12px",fontSize:11}}>{l.fuelType}</td>
        <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{l.station||"—"}</td>
      </tr>)}</tbody>
    </table>
  </div>);
}