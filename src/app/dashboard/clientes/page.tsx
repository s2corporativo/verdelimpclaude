
"use client";
import { useState } from "react";
import { DemoBadge, Card, TabelaHead, Campo, Input, Botao, TabelaScroll } from "@/components/ui";
import { estiloInput, estiloLabel } from "@/lib/estilos";
import { useRecurso } from "@/lib/useRecurso";
export default function ClientesPage() {
  // useRecurso: abort automático, loading e erro visível — a listagem nunca
  // mais fica eternamente vazia em silêncio quando a API falha.
  const { data: resp, loading: carregando, erro: erroLista, reload } = useRecurso<{ data?: any[]; _demo?: boolean }>("/api/clientes");
  const data = resp?.data || [];
  const demo = !!resp?._demo;
  const [form, setForm] = useState({ nome:"", cnpj:"", tipo:"Público", contato:"", email:"", municipio:"", uf:"", cep:"" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const buscarCNPJ = async() => {
    try {
      const r = await fetch(`/api/integracoes/publicas/cnpj/${form.cnpj.replace(/\D/g,"")}`);
      const d = await r.json();
      if(d.razao_social){setForm(p=>({...p,nome:d.razao_social,municipio:d.municipio||p.municipio,uf:d.uf||p.uf}));setMsg("✓ Dados preenchidos via Receita Federal");}
      else setMsg("⛔ CNPJ não encontrado na Receita — confira o número.");
    } catch { setMsg("⛔ Consulta de CNPJ indisponível no momento."); }
  };
  const buscarCEP = async() => {
    try {
      const r = await fetch(`/api/integracoes/publicas/cep/${form.cep.replace(/\D/g,"")}`);
      const d = await r.json();
      if(d.localidade){setForm(p=>({...p,municipio:d.localidade,uf:d.uf}));setMsg("✓ CEP preenchido via ViaCEP");}
      else setMsg("⛔ CEP não encontrado — confira o número.");
    } catch { setMsg("⛔ Consulta de CEP indisponível no momento."); }
  };
  const [editId, setEditId] = useState<string|null>(null);
  const limpar = () => { setForm({nome:"",cnpj:"",tipo:"Público",contato:"",email:"",municipio:"",uf:"",cep:""}); setEditId(null); };
  const salvar = async() => {
    if(!form.nome.trim()){ setMsg("⛔ Informe a razão social."); return; }
    setLoading(true); setMsg("");
    const payload:any = {name:form.nome,cnpjCpf:form.cnpj,category:form.tipo,phone:form.contato,email:form.email,municipio:form.municipio,uf:form.uf,cep:form.cep};
    if(editId) payload.id = editId;
    try{
      const r = await fetch("/api/clientes",{method:editId?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(!r.ok){ const j=await r.json().catch(()=>({})); setMsg("⛔ "+(j.error||"Não foi possível salvar. Confira os dados.")); return; }
      limpar(); setMsg(editId?"✓ Alterado!":"✓ Salvo!"); reload();
    }catch(e:any){ setMsg("⛔ "+(e.message||"Erro de rede.")); }
    finally{ setLoading(false); }
  };
  const editar = (c:any) => { setEditId(c.id); setForm({nome:c.name||"",cnpj:c.cnpjCpf||"",tipo:c.category||"Público",contato:c.phone||"",email:c.email||"",municipio:c.municipio||"",uf:c.uf||"",cep:c.cep||""}); setMsg(""); window.scrollTo({top:0,behavior:"smooth"}); };
  const excluir = async(c:any) => {
    if(!confirm(`Excluir o cliente "${c.name}"? O histórico de contratos é preservado.`)) return;
    const r = await fetch(`/api/clientes?id=${c.id}`,{method:"DELETE"});
    if(!r.ok){ const j=await r.json().catch(()=>({})); setMsg("⛔ "+(j.error||"Não foi possível excluir.")); return; }
    setMsg("✓ Excluído."); reload();
  };
  const IS = estiloInput;
  const LS = estiloLabel;
  return (<div>
    <h1 style={{color:"#334532",fontSize:20,fontWeight:700,marginBottom:4}}>Clientes <DemoBadge mostrar={demo} /></h1>
    <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#1e40af"}}>
      🔗 Digite o CNPJ e clique em "CNPJ" — razão social e município preenchidos automaticamente via Receita Federal (BrasilAPI). O CEP preenche o endereço via ViaCEP.
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:16}}>
      <h3 style={{color:"#334532",fontSize:13,marginBottom:12}}>+ Novo Cliente</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={LS}>CNPJ</label><div style={{display:"flex",gap:6}}><input style={{...IS,flex:1}} value={form.cnpj} onChange={e=>setForm(p=>({...p,cnpj:e.target.value}))} placeholder="00.000.000/0000-00"/><button onClick={buscarCNPJ} style={{background:"#059669",color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12}}>🔍 CNPJ</button></div></div>
        <Campo label="Razão Social*"><Input value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))}/></Campo>
        <div><label style={LS}>Tipo</label><select style={IS} value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}><option>Público</option><option>Privado</option></select></div>
        <Campo label="Telefone"><Input value={form.contato} onChange={e=>setForm(p=>({...p,contato:e.target.value}))}/></Campo>
        <Campo label="E-mail"><Input value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/></Campo>
        <div><label style={LS}>CEP</label><div style={{display:"flex",gap:6}}><input style={{...IS,flex:1}} value={form.cep} onChange={e=>setForm(p=>({...p,cep:e.target.value}))} placeholder="00000-000"/><button onClick={buscarCEP} style={{background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,padding:"7px 12px",cursor:"pointer",fontSize:12}}>🔍 CEP</button></div></div>
        <div><label style={LS}>Município</label><input style={IS} value={form.municipio} onChange={e=>setForm(p=>({...p,municipio:e.target.value}))}/></div>
        <div><label style={LS}>UF</label><input style={IS} value={form.uf} onChange={e=>setForm(p=>({...p,uf:e.target.value}))}/></div>
      </div>
      {msg&&<p role="alert" aria-live="polite" style={{color:msg.startsWith("⛔")?"#991b1b":"#059669",fontSize:12,marginBottom:8}}>{msg}</p>}
      <div style={{display:"flex",gap:8}}>
        <Botao onClick={salvar} disabled={loading||!form.nome} style={{padding:"9px 24px",fontWeight:600}}>{loading?"Salvando...":editId?"✓ Salvar alterações":"+ Cadastrar"}</Botao>
        {editId&&<Botao variante="neutro" onClick={limpar} style={{padding:"9px 18px",fontWeight:600}}>Cancelar</Botao>}
      </div>
    </div>
    {erroLista&&<div role="alert" style={{background:"#fef2f2",border:"1px solid #fecaca",color:"#991b1b",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:12}}>
      ⛔ Não foi possível carregar os clientes: {erroLista} <button onClick={reload} style={{marginLeft:8,background:"none",border:"none",color:"#991b1b",textDecoration:"underline",cursor:"pointer",fontSize:12}}>Tentar de novo</button>
    </div>}
    {carregando&&<p style={{color:"#6b7280",fontSize:12,marginBottom:12}}>Carregando clientes…</p>}
    <Card>
      <TabelaScroll>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <TabelaHead colunas={["Nome","CNPJ","Tipo","Município","Status","Ações"]} />
        <tbody>{data.map((c:any)=><tr key={c.id} style={{borderBottom:"1px solid #f3f4f6",background:editId===c.id?"#f0fdf4":undefined}}>
          <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{c.name}</td>
          <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11}}>{c.cnpjCpf||"—"}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:c.category==="Público"?"#e0e7ff":"#fce7f3",color:c.category==="Público"?"#3730a3":"#9d174d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{c.category||"—"}</span></td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{c.municipio?`${c.municipio}/${c.uf}`:"—"}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{c.situacao||"ATIVA"}</span></td>
          <td style={{padding:"8px 12px",whiteSpace:"nowrap"}}>
            <button onClick={()=>editar(c)} disabled={demo} aria-label={`Editar ${c.name}`} title={demo?"Indisponível em modo demo":"Editar"} style={{background:"none",border:"none",cursor:demo?"default":"pointer",fontSize:14,opacity:demo?.4:1}}>✏️</button>
            <button onClick={()=>excluir(c)} disabled={demo} aria-label={`Excluir ${c.name}`} title={demo?"Indisponível em modo demo":"Excluir"} style={{background:"none",border:"none",cursor:demo?"default":"pointer",fontSize:14,marginLeft:6,opacity:demo?.4:1}}>🗑️</button>
          </td>
        </tr>)}</tbody>
      </table>
      </TabelaScroll>
    </Card>
  </div>);
}
