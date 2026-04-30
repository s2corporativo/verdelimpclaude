
"use client";
import { useEffect, useState } from "react";
export default function TreinamentosPage() {
  const [data,setData]=useState<any[]>([]);const [demo,setDemo]=useState(false);
  const [form,setForm]=useState({employeeId:"",trainingType:"NR-06",issuedAt:"",expiresAt:"",institution:""});
  const [funcs,setFuncs]=useState<any[]>([]);
  useEffect(()=>{
    fetch("/api/treinamentos").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});
    fetch("/api/funcionarios").then(r=>r.json()).then(d=>setFuncs(d.data||[]));
  },[]);
  const salvar=async()=>{ await fetch("/api/treinamentos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)}); };
  const NRS=["NR-06","NR-12","NR-35","NR-20","NR-10","ASO","CNH Cat. B","CNH Cat. C","Direção Defensiva","Primeiros Socorros","SIPAT","Outro"];
  const SC:any={valido:["#dcfce7","#15803d","✅ Válido"],a_vencer:["#fef9c3","#92400e","⚠️ A vencer"],vencido:["#fee2e2","#991b1b","⛔ Vencido"]};
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  const vencidos=data.filter((t:any)=>t.status==="vencido").length;
  const aVencer=data.filter((t:any)=>t.status==="a_vencer").length;
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Treinamentos & NRs {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    {(vencidos>0||aVencer>0)&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"10px 14px",marginBottom:14}}>
      🚨 <strong>{vencidos} vencido(s)</strong> e <strong>{aVencer} a vencer</strong> — regularize para evitar autuação do MTE
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
      {[["Válidos",data.filter((t:any)=>t.status==="valido").length,"✅","#1a7a4a"],["A vencer (30d)",aVencer,"⚠️","#d97706"],["Vencidos",vencidos,"⛔","#dc2626"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>+ Registrar Treinamento</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:9}}>
        <div><label style={LS}>Funcionário*</label><select style={IS} value={form.employeeId} onChange={e=>setForm(p=>({...p,employeeId:e.target.value}))}><option value="">— Selecione —</option>{funcs.map((f:any)=><option key={f.id} value={f.id}>{f.name?.split(" ")[0]+" "+f.name?.split(" ").pop()}</option>)}</select></div>
        <div><label style={LS}>Tipo</label><select style={IS} value={form.trainingType} onChange={e=>setForm(p=>({...p,trainingType:e.target.value}))}>{NRS.map(n=><option key={n}>{n}</option>)}</select></div>
        <div><label style={LS}>Emissão*</label><input type="date" style={IS} value={form.issuedAt} onChange={e=>setForm(p=>({...p,issuedAt:e.target.value}))}/></div>
        <div><label style={LS}>Vencimento*</label><input type="date" style={IS} value={form.expiresAt} onChange={e=>setForm(p=>({...p,expiresAt:e.target.value}))}/></div>
        <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}><label style={LS}>Instituição</label><input style={IS} value={form.institution} onChange={e=>setForm(p=>({...p,institution:e.target.value}))}/></div>
      </div>
      <button onClick={salvar} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"8px 24px",borderRadius:8,cursor:"pointer",fontWeight:700,marginTop:10}}>+ Registrar</button>
    </div>
    <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <thead><tr style={{background:"#e8f5ee"}}>{["Funcionário","Função","Treinamento","Emissão","Vencimento","Dias","Instituição","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
      <tbody>{data.sort((a:any,b:any)=>a.diasVenc-b.diasVenc).map((t:any,i:number)=>{
        const [bg,co,txt]=SC[t.status]||["#f3f4f6","#374151","—"];
        return<tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
          <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{t.employee?.name?.split(" ")[0]+" "+t.employee?.name?.split(" ").pop()}</td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{t.employee?.role}</td>
          <td style={{padding:"8px 12px",fontWeight:600,color:"#1a7a4a"}}>{t.trainingType}</td>
          <td style={{padding:"8px 12px",fontSize:11}}>{t.issuedAt?new Date(t.issuedAt).toLocaleDateString("pt-BR"):""}</td>
          <td style={{padding:"8px 12px",fontSize:11,fontWeight:t.diasVenc<=30?700:400,color:t.diasVenc<0?"#dc2626":t.diasVenc<=30?"#d97706":"#374151"}}>{t.expiresAt?new Date(t.expiresAt).toLocaleDateString("pt-BR"):""}</td>
          <td style={{padding:"8px 12px",fontWeight:700,color:t.diasVenc<0?"#dc2626":t.diasVenc<=30?"#d97706":"#15803d"}}>{t.diasVenc<0?"Venceu há "+Math.abs(t.diasVenc)+"d":t.diasVenc+" d"}</td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{t.institution||"—"}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:bg,color:co,padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{txt}</span></td>
        </tr>;
      })}</tbody>
    </table>
  </div>);
}