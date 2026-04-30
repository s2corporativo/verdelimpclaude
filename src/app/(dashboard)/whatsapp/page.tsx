
"use client";
import { useState, useEffect } from "react";
export default function WhatsAppPage() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [numero, setNumero] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const addLog = (m:string) => setLog(l=>[new Date().toLocaleTimeString("pt-BR")+" → "+m,...l].slice(0,30));

  useEffect(()=>{
    fetch("/api/alertas/whatsapp").then(r=>r.json()).then(d=>{
      setAlertas(d.alertas||[]);
      setStatus(d);
      addLog(`✓ ${d.total} alertas pendentes encontrados · Provedor: ${d.provider}`);
    });
  },[]);

  const testar = async() => {
    if(!numero||numero.replace(/\D/g,"").length<10){ addLog("❌ Informe um número válido"); return; }
    setEnviando(true);
    addLog(`→ Testando envio para ${numero}...`);
    const r = await fetch("/api/alertas/whatsapp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({testar:true,numero:numero.replace(/\D/g,"")})});
    const d = await r.json();
    addLog(d.ok ? `✅ ${d.message}${d.demo?" (MODO DEMO — configure WHATSAPP_PROVIDER)":""}` : `❌ ${d.message}`);
    setEnviando(false);
  };

  const enviarTodos = async() => {
    setEnviando(true);
    addLog(`→ Enviando ${alertas.length} alertas...`);
    const r = await fetch("/api/alertas/whatsapp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({enviarTodos:true})});
    const d = await r.json();
    addLog(`✓ ${d.enviados} mensagens enviadas`);
    setEnviando(false);
  };

  const TIPO_ICON:any = {sst_vencendo:"🦺",sst_vencida:"🚨",das_vencendo:"💼",das_vencida:"🚨",estoque_critico:"🏭",proposta_aprovada:"✅",cnd_vencendo:"📋",tributo_vencendo:"💸",doc_vencendo:"📄"};
  const TIPO_COLOR:any = {sst_vencida:["#fee2e2","#991b1b"],das_vencida:["#fee2e2","#991b1b"],sst_vencendo:["#fef9c3","#92400e"],das_vencendo:["#fef9c3","#92400e"],estoque_critico:["#fef9c3","#92400e"],tributo_vencendo:["#fef9c3","#92400e"]};

  const IS:any = {width:"100%",padding:"8px 11px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};

  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>WhatsApp — Alertas Automáticos</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:16}}>Sistema envia mensagens automáticas para vencimento de SST, DAS, tributos, estoque crítico e certidões.</p>

    {/* Status da integração */}
    <div style={{background:status?.configured?"#f0fdf4":"#fef9c3",border:"1px solid "+(status?.configured?"#86efac":"#fde68a"),borderRadius:10,padding:"12px 16px",marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div>
          <strong style={{color:status?.configured?"#15803d":"#92400e",fontSize:13}}>
            {status?.configured ? "✅ WhatsApp Configurado" : "⚙️ WhatsApp não configurado — modo demonstrativo"}
          </strong>
          <p style={{fontSize:11,color:"#6b7280",marginTop:3}}>Provedor: <strong>{status?.provider||"disabled"}</strong></p>
        </div>
        <span style={{background:status?.configured?"#dcfce7":"#fef9c3",color:status?.configured?"#15803d":"#92400e",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700}}>
          {alertas.length} alertas pendentes
        </span>
      </div>
    </div>

    {/* Configuração */}
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18,marginBottom:16}}>
      <h3 style={{color:"#0f5233",fontSize:14,marginBottom:12}}>⚙️ Configuração</h3>
      <div style={{background:"#1e1b4b",color:"#a5b4fc",padding:"10px 14px",borderRadius:8,marginBottom:14,fontSize:11}}>
        🔐 Configure no Render: Dashboard → Environment Variables. Chaves nunca no código-fonte.
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
        <div style={{background:"#f9fafb",borderRadius:8,padding:12}}>
          <h4 style={{fontSize:12,fontWeight:700,color:"#0f5233",marginBottom:8}}>Evolution API (Gratuita)</h4>
          {[["WHATSAPP_PROVIDER","evolution"],["EVOLUTION_API_URL","https://seu-servidor:8080"],["EVOLUTION_API_KEY","sua-api-key"],["EVOLUTION_INSTANCE","verdelimp"],["WHATSAPP_ADMIN_NUMBER","5531999990000"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f3f4f6",fontSize:10}}>
              <code style={{color:"#1a7a4a",fontWeight:600}}>{k}</code>
              <span style={{color:"#6b7280"}}>{v}</span>
            </div>
          ))}
          <a href="https://doc.evolution-api.com" target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:8,color:"#1a7a4a",fontSize:11,fontWeight:600}}>📖 Documentação Evolution API →</a>
        </div>
        <div style={{background:"#f9fafb",borderRadius:8,padding:12}}>
          <h4 style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:8}}>Z-API (Pago — R$69/mês)</h4>
          {[["WHATSAPP_PROVIDER","zapi"],["ZAPI_URL","https://api.z-api.io/instances/XXX/token/YYY"],["ZAPI_CLIENT_TOKEN","seu-client-token"],["WHATSAPP_ADMIN_NUMBER","5531999990000"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f3f4f6",fontSize:10}}>
              <code style={{color:"#1d4ed8",fontWeight:600}}>{k}</code>
              <span style={{color:"#6b7280"}}>{v}</span>
            </div>
          ))}
          <a href="https://www.z-api.io" target="_blank" rel="noopener noreferrer" style={{display:"block",marginTop:8,color:"#1d4ed8",fontSize:11,fontWeight:600}}>📖 Documentação Z-API →</a>
        </div>
      </div>
    </div>

    {/* Teste */}
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18,marginBottom:16}}>
      <h3 style={{color:"#0f5233",fontSize:14,marginBottom:12}}>📱 Testar Envio</h3>
      <div style={{display:"flex",gap:10,alignItems:"flex-end",marginBottom:12}}>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}}>Número WhatsApp (com DDD e código do país)</label><input style={IS} value={numero} onChange={e=>setNumero(e.target.value)} placeholder="55 31 99999-0000"/></div>
        <button onClick={testar} disabled={enviando} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"9px 22px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,opacity:enviando?.7:1}}>
          {enviando?"⟳ Enviando...":"📤 Testar"}
        </button>
        {alertas.length>0&&<button onClick={enviarTodos} disabled={enviando} style={{background:"#7c3aed",color:"#fff",border:"none",padding:"9px 22px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,opacity:enviando?.7:1}}>
          📢 Enviar todos ({alertas.length})
        </button>}
      </div>
    </div>

    {/* Alertas pendentes */}
    {alertas.length>0&&(<div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18,marginBottom:16}}>
      <h3 style={{color:"#0f5233",fontSize:14,marginBottom:12}}>🔔 Alertas Pendentes ({alertas.length})</h3>
      {alertas.map((a:any,i:number)=>{
        const [bg,co]=TIPO_COLOR[a.tipo]||["#f0fdf4","#15803d"];
        return(<div key={i} style={{background:bg,border:"1px solid "+co+"44",borderRadius:8,padding:"10px 13px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <span style={{fontSize:16,marginRight:8}}>{TIPO_ICON[a.tipo]||"📋"}</span>
              <strong style={{color:co,fontSize:13}}>{a.tipo.replace(/_/g," ").toUpperCase()}</strong>
            </div>
            <span style={{fontSize:10,color:"#6b7280"}}>{a.destinatario}</span>
          </div>
          <div style={{marginTop:6,fontSize:11,color:"#374151",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:4}}>
            {Object.entries(a.dados).map(([k,v])=>(
              <span key={k}><span style={{color:"#9ca3af"}}>{k}:</span> <strong>{v as string}</strong></span>
            ))}
          </div>
        </div>);
      })}
    </div>)}

    {/* Log */}
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:10}}>Log ({log.length})</h3>
      <div style={{background:"#f9fafb",borderRadius:8,padding:10,maxHeight:180,overflowY:"auto",fontFamily:"monospace"}}>
        {log.length===0?<p style={{fontSize:11,color:"#9ca3af"}}>Aguardando ações...</p>:log.map((l,i)=>(
          <div key={i} style={{fontSize:11,padding:"3px 0",borderBottom:"1px solid #f3f4f6",color:l.includes("✅")||l.includes("✓")?"#15803d":l.includes("❌")?"#dc2626":"#374151"}}>{l}</div>
        ))}
      </div>
    </div>
  </div>);
}
