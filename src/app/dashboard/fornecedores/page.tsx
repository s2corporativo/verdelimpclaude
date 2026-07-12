
"use client";
import { useEffect, useState } from "react";
export default function FornecedoresPage() {
  const [data, setData] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [form, setForm] = useState({nome:"",cnpj:"",tipo:"Material",contato:"",email:"",municipio:"",uf:""});
  const [msg, setMsg] = useState("");
  const load = () => fetch("/api/fornecedores").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});
  useEffect(()=>{load();},[]);
  const buscarCNPJ = async() => {
    const r = await fetch(`/api/integracoes/publicas/cnpj/${form.cnpj.replace(/\D/g,"")}`);
    const d = await r.json();
    if(d.razao_social){setForm(p=>({...p,nome:d.razao_social,municipio:d.municipio||p.municipio,uf:d.uf||p.uf}));setMsg("✓ Dados preenchidos via Receita Federal");}
  };
  const [editId, setEditId] = useState<string|null>(null);
  const limpar = () => { setForm({nome:"",cnpj:"",tipo:"Material",contato:"",email:"",municipio:"",uf:""}); setEditId(null); };
  const salvar = async() => {
    if(!form.nome.trim()){ setMsg("⛔ Informe o nome do fornecedor."); return; }
    setMsg("");
    const payload:any = {name:form.nome,cnpj:form.cnpj,type:form.tipo,phone:form.contato,email:form.email,municipio:form.municipio,uf:form.uf};
    if(editId) payload.id = editId;
    try{
      const r = await fetch("/api/fornecedores",{method:editId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok){ const j=await r.json().catch(()=>({})); setMsg("⛔ "+(j.error||"Não foi possível salvar. Confira os dados.")); return; }
      limpar(); setMsg(editId?"✓ Alterado!":"✓ Salvo!"); load();
    }catch(e:any){ setMsg("⛔ "+(e.message||"Erro de rede.")); }
  };
  const editar = (f:any) => { setEditId(f.id); setForm({nome:f.name||"",cnpj:f.cnpj||"",tipo:f.type||"Material",contato:f.phone||"",email:f.email||"",municipio:f.municipio||"",uf:f.uf||""}); setMsg(""); window.scrollTo({top:0,behavior:"smooth"}); };
  const excluir = async(f:any) => {
    if(!confirm(`Excluir o fornecedor "${f.name}"?`)) return;
    const r = await fetch(`/api/fornecedores?id=${f.id}`,{method:"DELETE"});
    if(!r.ok){ const j=await r.json().catch(()=>({})); setMsg("⛔ "+(j.error||"Não foi possível excluir.")); return; }
    setMsg("✓ Excluído."); load();
  };
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  return (<div>
    <h1 style={{color:"#334532",fontSize:20,fontWeight:700,marginBottom:14}}>Fornecedores {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{color:"#334532",fontSize:13,marginBottom:12}}>+ Novo Fornecedor</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={LS}>CNPJ</label><div style={{display:"flex",gap:6}}><input style={{...IS,flex:1}} value={form.cnpj} onChange={e=>setForm(p=>({...p,cnpj:e.target.value}))}/><button onClick={buscarCNPJ} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12}}>🔍 CNPJ</button></div></div>
        <div><label style={LS}>Nome*</label><input style={IS} value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></div>
        <div><label style={LS}>Tipo</label><select style={IS} value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>{["Material","EPI","Ferramentas","Combustível","Serviços","Outro"].map(t=><option key={t}>{t}</option>)}</select></div>
        <div><label style={LS}>Telefone</label><input style={IS} value={form.contato} onChange={e=>setForm(p=>({...p,contato:e.target.value}))}/></div>
        <div><label style={LS}>Município</label><input style={IS} value={form.municipio} onChange={e=>setForm(p=>({...p,municipio:e.target.value}))}/></div>
        <div><label style={LS}>UF</label><input style={IS} value={form.uf} onChange={e=>setForm(p=>({...p,uf:e.target.value}))}/></div>
      </div>
      {msg&&<p style={{color:msg.startsWith("⛔")?"#991b1b":"#059669",fontSize:12,marginBottom:8}}>{msg}</p>}
      <div style={{display:"flex",gap:8}}>
        <button onClick={salvar} disabled={!form.nome} style={{background:"#4a9410",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:600}}>{editId?"✓ Salvar alterações":"+ Cadastrar"}</button>
        {editId&&<button onClick={limpar} style={{background:"#fff",color:"#374151",border:"1px solid #d1d5db",padding:"9px 18px",borderRadius:8,cursor:"pointer",fontWeight:600}}>Cancelar</button>}
      </div>
    </div>
    <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",borderRadius:12,overflow:"hidden",border:"1px solid #e5e7eb"}}>
      <thead><tr style={{background:"#e8f5ee"}}>{["Nome","CNPJ","Tipo","Município","Situação","Ações"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#334532"}}>{h}</th>)}</tr></thead>
      <tbody>{data.map((f:any)=><tr key={f.id} style={{borderBottom:"1px solid #f3f4f6",background:editId===f.id?"#f0fdf4":undefined}}>
        <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{f.name}</td>
        <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11}}>{f.cnpj||"—"}</td>
        <td style={{padding:"8px 12px",fontSize:11}}>{f.type||"—"}</td>
        <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{f.municipio?`${f.municipio}/${f.uf}`:"—"}</td>
        <td style={{padding:"8px 12px"}}><span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{f.situacao||"ATIVA"}</span></td>
        <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
          <button onClick={()=>editar(f)} disabled={demo} title={demo?"Indisponível em modo demo":"Editar"} style={{background:"none",border:"none",cursor:demo?"default":"pointer",fontSize:14,opacity:demo?.4:1}}>✏️</button>
          <button onClick={()=>excluir(f)} disabled={demo} title={demo?"Indisponível em modo demo":"Excluir"} style={{background:"none",border:"none",cursor:demo?"default":"pointer",fontSize:14,marginLeft:6,opacity:demo?.4:1}}>🗑️</button>
        </td>
      </tr>)}</tbody>
    </table>
  </div>);
}
