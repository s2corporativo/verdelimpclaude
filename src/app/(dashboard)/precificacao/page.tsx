
"use client";
import { useState } from "react";
export default function PrecificacaoPage() {
  const [form,setForm]=useState({servico:"Roçada Manual",area:"10000",unit:"m²",dias:"10",workers:"3",custoMO:"1.20",custoMat:"0.15",custoEquip:"0.25",encargos:"70",admin:"10",risco:"5",impostos:"8",margem:"30"});
  const [analiseIA,setAnaliseIA]=useState("");const [loadingIA,setLoadingIA]=useState(false);
  const c={mo:Number(form.custoMO),mat:Number(form.custoMat),eq:Number(form.custoEquip)};
  const custo=c.mo+c.mat+c.eq;
  const enc=custo*(Number(form.encargos)/100);
  const adm=(custo+enc)*(Number(form.admin)/100);
  const ris=(custo+enc)*(Number(form.risco)/100);
  const imp=(custo+enc+adm+ris)*(Number(form.impostos)/100);
  const mar=(custo+enc+adm+ris)*(Number(form.margem)/100);
  const unit=custo+enc+adm+ris+imp+mar;
  const total=unit*Number(form.area);
  const bdi=(custo>0?((unit/custo-1)*100):0).toFixed(1);
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const analisar=async()=>{
    setLoadingIA("");setLoadingIA("...");
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:700,
        system:"Você é especialista em precificação de serviços ambientais e paisagismo para licitações públicas em MG. Analise o preço e dê feedback objetivo. Responda em português, seja prático.",
        messages:[{role:"user",content:`Serviço: ${form.servico} em ${form.area} ${form.unit}, ${form.dias} dias, ${form.workers} funcionários.\nCusto unitário: MO R$${fmt(c.mo)} + Mat R$${fmt(c.mat)} + Equip R$${fmt(c.eq)} = R$${fmt(custo)}/${form.unit}\nPreço calculado: R$${fmt(unit)}/${form.unit} (BDI ${bdi}%)\nTotal proposta: R$${fmt(total)}\nParâmetros: Encargos ${form.encargos}% | Admin ${form.admin}% | Risco ${form.risco}% | Impostos ${form.impostos}% | Margem ${form.margem}%\nAnalise: 1) Este preço está competitivo para licitações em MG? 2) O BDI de ${bdi}% é adequado? 3) Qual o risco de perder para preço? 4) Sugestão de ajuste se necessário.`}]
      })});
      const d=await r.json();setAnaliseIA(d.content?.[0]?.text||"Erro");
    }catch{setAnaliseIA("Erro de conexão com IA");}
    setLoadingIA("");
  };
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Precificação Dinâmica + IA</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>Configure os parâmetros e a IA analisa se o preço está competitivo para licitações públicas em MG.</p>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
        <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>📋 Parâmetros do serviço</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:9}}>
          <div style={{gridColumn:"1/-1"}}><label style={LS}>Tipo de serviço</label>
            <select style={IS} value={form.servico} onChange={e=>setForm(p=>({...p,servico:e.target.value}))}>
              {["Roçada Manual","Roçada Mecanizada","Jardinagem Mensal","Plantio de Mudas","PRADA/PTRF","Limpeza de Terreno","Podação de Árvores","Controle de Formigas","Hidrossemeadura"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label style={LS}>Quantidade</label><input type="number" style={IS} value={form.area} onChange={e=>setForm(p=>({...p,area:e.target.value}))}/></div>
          <div><label style={LS}>Unidade</label><select style={IS} value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}>{["m²","ha","un","mês","dia","h"].map(u=><option key={u}>{u}</option>)}</select></div>
          <div><label style={LS}>Dias de execução</label><input type="number" style={IS} value={form.dias} onChange={e=>setForm(p=>({...p,dias:e.target.value}))}/></div>
          <div><label style={LS}>Funcionários</label><input type="number" style={IS} value={form.workers} onChange={e=>setForm(p=>({...p,workers:e.target.value}))}/></div>
        </div>
        <h4 style={{color:"#6b7280",fontSize:11,fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Custos por {form.unit} (R$)</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><label style={LS}>Mão de obra</label><input type="number" step="0.01" style={IS} value={form.custoMO} onChange={e=>setForm(p=>({...p,custoMO:e.target.value}))}/></div>
          <div><label style={LS}>Material</label><input type="number" step="0.01" style={IS} value={form.custoMat} onChange={e=>setForm(p=>({...p,custoMat:e.target.value}))}/></div>
          <div><label style={LS}>Equipamento</label><input type="number" step="0.01" style={IS} value={form.custoEquip} onChange={e=>setForm(p=>({...p,custoEquip:e.target.value}))}/></div>
        </div>
      </div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
        <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>⚙️ BDI</h3>
        {[["encargos","Encargos Sociais (CLT)","50","90"],["admin","Adm. e Overhead","5","20"],["risco","Riscos e Imprevistos","2","12"],["impostos","Tributos (Simples)","5","20"],["margem","Margem / Lucro","10","50"]].map(([k,l,min,max])=>(
          <div key={k} style={{marginBottom:9}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
              <label style={{color:"#374151",fontWeight:600}}>{l}</label>
              <span style={{fontWeight:700,color:"#1a7a4a"}}>{(form as any)[k]}%</span>
            </div>
            <input type="range" min={min} max={max} step="1" style={{width:"100%",accentColor:"#1a7a4a"}} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/>
          </div>
        ))}
        <div style={{background:"#f0fdf4",borderRadius:8,padding:"10px 12px",marginTop:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:12}}>
            {[["Custo base","R$"+fmt(custo)],["Preço unit.","R$"+fmt(unit)],["BDI total",bdi+"%"],["Total proposta","R$"+fmt(total)]].map(([l,v])=>(
              <div key={l}><span style={{color:"#6b7280"}}>{l}: </span><strong style={{color:"#0f5233"}}>{v}</strong></div>
            ))}
          </div>
        </div>
      </div>
    </div>
    <div style={{textAlign:"center",marginBottom:14}}>
      <button onClick={analisar} disabled={!!loadingIA} style={{background:"#7c3aed",color:"#fff",border:"none",padding:"11px 32px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14}}>
        {loadingIA?"⟳ Analisando com IA...":"🤖 Analisar competitividade com IA"}
      </button>
    </div>
    {analiseIA&&<div style={{background:"#fff",border:"1px solid #c4b5fd",borderRadius:12,padding:16,whiteSpace:"pre-wrap",fontSize:13,lineHeight:1.7,color:"#374151"}}>
      <strong style={{color:"#7c3aed",display:"block",marginBottom:8}}>🤖 Análise de Competitividade — Verdelimp ERP</strong>
      {analiseIA}
    </div>}
  </div>);
}