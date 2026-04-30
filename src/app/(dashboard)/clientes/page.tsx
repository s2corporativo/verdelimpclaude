
"use client";
import { useEffect, useState } from "react";
export default function ClientesPage() {
  const [data, setData] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [form, setForm] = useState({ nome:"", cnpj:"", tipo:"Público", contato:"", email:"", municipio:"", uf:"", cep:"" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const load = () => fetch("/api/clientes").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);});
  useEffect(()=>{load();},[]);
  const buscarCNPJ = async() => {
    const r = await fetch(`/api/integracoes/publicas/cnpj/${form.cnpj.replace(/\D/g,"")}`);
    const d = await r.json();
    if(d.razao_social){setForm(p=>({...p,nome:d.razao_social,municipio:d.municipio||p.municipio,uf:d.uf||p.uf}));setMsg("✓ Dados preenchidos via Receita Federal");}
  };
  const buscarCEP = async() => {
    const r = await fetch(`/api/integracoes/publicas/cep/${form.cep.replace(/\D/g,"")}`);
    const d = await r.json();
    if(d.localidade){setForm(p=>({...p,municipio:d.localidade,uf:d.uf}));setMsg("✓ CEP preenchido via ViaCEP");}
  };
  const salvar = async() => {
    setLoading(true);
    await fetch("/api/clientes",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:form.nome,cnpjCpf:form.cnpj,category:form.tipo,phone:form.contato,email:form.email,municipio:form.municipio,uf:form.uf,cep:form.cep})});
    setForm({nome:"",cnpj:"",tipo:"Público",contato:"",email:"",municipio:"",uf:"",cep:""});setMsg("✓ Salvo!");load();setLoading(false);
  };
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Clientes {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#1e40af"}}>
      🔗 Digite o CNPJ e clique em "CNPJ" — razão social e município preenchidos automaticamente via Receita Federal (BrasilAPI). O CEP preenche o endereço via ViaCEP.
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>+ Novo Cliente</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={LS}>CNPJ</label><div style={{display:"flex",gap:6}}><input style={{...IS,flex:1}} value={form.cnpj} onChange={e=>setForm(p=>({...p,cnpj:e.target.value}))} placeholder="00.000.000/0000-00"/><button onClick={buscarCNPJ} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12}}>🔍 CNPJ</button></div></div>
        <div><label style={LS}>Razão Social*</label><input style={IS} value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></div>
        <div><label style={LS}>Tipo</label><select style={IS} value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}><option>Público</option><option>Privado</option></select></div>
        <div><label style={LS}>Telefone</label><input style={IS} value={form.contato} onChange={e=>setForm(p=>({...p,contato:e.target.value}))}/></div>
        <div><label style={LS}>E-mail</label><input style={IS} value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></div>
        <div><label style={LS}>CEP</label><div style={{display:"flex",gap:6}}><input style={{...IS,flex:1}} value={form.cep} onChange={e=>setForm(p=>({...p,cep:e.target.value}))} placeholder="00000-000"/><button onClick={buscarCEP} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12}}>🔍 CEP</button></div></div>
        <div><label style={LS}>Município</label><input style={IS} value={form.municipio} onChange={e=>setForm(p=>({...p,municipio:e.target.value}))}/></div>
        <div><label style={LS}>UF</label><input style={IS} value={form.uf} onChange={e=>setForm(p=>({...p,uf:e.target.value}))}/></div>
      </div>
      {msg&&<p style={{color:"#059669",fontSize:12,marginBottom:8}}>{msg}</p>}
      <button onClick={salvar} disabled={loading||!form.nome} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:600}}>{loading?"Salvando...":"+ Cadastrar"}</button>
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr style={{background:"#e8f5ee"}}>{["Nome","CNPJ","Tipo","Município","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
        <tbody>{data.map((c:any)=><tr key={c.id} style={{borderBottom:"1px solid #f3f4f6"}}>
          <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{c.name}</td>
          <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11}}>{c.cnpjCpf||"—"}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:c.category==="Público"?"#e0e7ff":"#fce7f3",color:c.category==="Público"?"#3730a3":"#9d174d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{c.category||"—"}</span></td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{c.municipio?`${c.municipio}/${c.uf}`:"—"}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{c.situacao||"ATIVA"}</span></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>);
}
