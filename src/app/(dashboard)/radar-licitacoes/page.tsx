
"use client";
import { useState } from "react";
export default function RadarPage() {
  const [itens,setItens]=useState<any[]>([]);const [loading,setLoading]=useState(false);
  const [analise,setAnalise]=useState<Record<string,string>>({});const [analisando,setAnalisando]=useState<string|null>(null);
  const [demo,setDemo]=useState(false);const [busca,setBusca]=useState("roçada paisagismo");
  const [addedToPipeline,setAddedToPipeline]=useState<Record<string,boolean>>({});

  const adicionarPipeline = async (item:any, idx:number) => {
    const key = String(idx);
    try {
      const r = await fetch("/api/bid-pipeline",{ method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          titulo: (item.objetoCompra||item.descricaoObjeto||"").substring(0,120),
          orgao: item.nomeUnidade||item.nomeEntidade||"",
          objeto: item.objetoCompra||item.descricaoObjeto||"",
          valorEstimado: item.valorEstimado||0,
          dataAbertura: item.dataAberturaOferta||item.dataPublicacao||null,
          modalidade: item.modalidadeNome||null,
          stage: "monitorando",
          prioridade: "media",
          probabilidade: 30,
          municipio: item.municipio||null,
          uf: item.uf||null,
          url: item.linkSistemaOrigem||null,
          pncpId: item.numeroPncp||null,
        })
      });
      const d = await r.json();
      if(d.success || d.bid) setAddedToPipeline(p=>({...p,[key]:true}));
    } catch(e){ console.error(e); }
  };
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0});
  const buscarEditais=async()=>{
    setLoading(true);
    const r=await fetch(`/api/pncp?q=${encodeURIComponent(busca)}`);
    const d=await r.json();
    setItens(d.itens||[]);setDemo(!!d._demo);setLoading(false);
  };
  const analisarComIA=async(item:any,idx:number)=>{
    const key=String(idx);setAnalisando(key);
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        model:"claude-sonnet-4-20250514",max_tokens:600,
        system:`Você é consultor de licitações para a VERDELIMP SERVICOS E TERCEIRIZACAO LTDA, CNPJ 30.198.776/0001-29, EPP, Simples Nacional, CNAE 81.30-3-00 (Paisagismo), Betim/MG, 8 funcionários. Analise se vale participar do edital. Responda: VALE PARTICIPAR? SIM/NÃO/TALVEZ — e em 3 linhas: motivo, risco principal e sugestão de preço estimado por m² ou unidade. Seja direto e prático.`,
        messages:[{role:"user",content:`Edital: ${item.objetoCompra||item.descricaoObjeto}\nÓrgão: ${item.nomeUnidade||item.nomeEntidade||"Não informado"}\nValor estimado: R$${fmt(item.valorEstimado||0)}\nModalidade: ${item.modalidadeNome||"—"}\nSituação: ${item.situacaoCompra||"—"}`}]
      })});
      const d=await r.json();
      setAnalise(a=>({...a,[key]:d.content?.[0]?.text||"Erro"}));
    }catch{ setAnalise(a=>({...a,[key]:"Erro de conexão com IA"})); }
    setAnalisando(null);
  };
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Radar de Licitações — PNCP + IA</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>Busca oportunidades no Portal Nacional de Contratações Públicas filtradas por serviços ambientais. IA analisa cada edital para a Verdelimp.</p>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",gap:10}}>
        <input style={{flex:1,padding:"8px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}} value={busca} onChange={e=>setBusca(e.target.value)} onKeyDown={e=>e.key==="Enter"&&buscarEditais()} placeholder="Palavras-chave: roçada, paisagismo, limpeza..."/>
        <button onClick={buscarEditais} disabled={loading} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>{loading?"⟳ Buscando...":"🔍 Buscar Editais"}</button>
      </div>
    </div>
    {demo&&<div style={{background:"#e0e7ff",border:"1px solid #c7d2fe",borderRadius:8,padding:"8px 13px",marginBottom:12,fontSize:11,color:"#3730a3"}}>🔮 Dados demonstrativos — PNCP pode estar indisponível. A análise de IA funciona normalmente.</div>}
    {itens.map((item:any,i:number)=>{
      const key=String(i);
      return(<div key={i} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:14,color:"#0f5233",marginBottom:4}}>{item.objetoCompra||item.descricaoObjeto}</div>
            <div style={{fontSize:11,color:"#6b7280"}}>🏛️ {item.nomeUnidade||item.nomeEntidade||"Órgão"} · {item.modalidadeNome||"Licitação"} · {item.dataPublicacao?new Date(item.dataPublicacao).toLocaleDateString("pt-BR"):""}</div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:18,fontWeight:700,color:"#1a7a4a"}}>R${fmt(item.valorEstimado||0)}</div>
            <span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{item.situacaoCompra||"Ativa"}</span>
          </div>
        </div>
        {analise[key]&&<div style={{background:analise[key].includes("SIM")?"#f0fdf4":analise[key].includes("NÃO")?"#fef2f2":"#fffbeb",border:"1px solid "+(analise[key].includes("SIM")?"#86efac":analise[key].includes("NÃO")?"#fca5a5":"#fde68a"),borderRadius:8,padding:"10px 12px",marginBottom:10,fontSize:12,whiteSpace:"pre-wrap",lineHeight:1.6}}>
          <strong style={{color:"#0f5233"}}>🤖 Análise IA — Verdelimp:</strong><br/>{analise[key]}
        </div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>analisarComIA(item,i)} disabled={analisando===key} style={{background:analisando===key?"#6b7280":"#7c3aed",color:"#fff",border:"none",padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>{analisando===key?"⟳ Analisando...":"🤖 Analisar com IA"}</button>
          {item.linkSistemaOrigem&&<a href={item.linkSistemaOrigem} target="_blank" rel="noopener noreferrer" style={{background:"#f3f4f6",color:"#374151",padding:"6px 14px",borderRadius:7,textDecoration:"none",fontSize:11,fontWeight:600}}>🔗 Ver edital</a>}
          {addedToPipeline[key]
            ? <span style={{background:"#dcfce7",color:"#15803d",padding:"6px 14px",borderRadius:7,fontSize:11,fontWeight:700}}>✅ No pipeline</span>
            : <button onClick={()=>adicionarPipeline(item,i)} style={{background:"#0f5233",color:"#fff",border:"none",padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>🏆 → Pipeline</button>
          }
        </div>
      </div>);
    })}
    {!itens.length&&!loading&&<div style={{textAlign:"center",padding:"40px 20px",color:"#9ca3af"}}>Clique em "Buscar Editais" para encontrar oportunidades no PNCP</div>}
  </div>);
}