
"use client";
import { useEffect, useState } from "react";
export default function FiscalPage() {
  const [despesas, setDespesas] = useState<any[]>([]);
  const [nfses, setNfses] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [aba, setAba] = useState("despesas");
  const [fat, setFat] = useState(57000);
  const [comp, setComp] = useState("2026-04");
  const [apurando, setApurando] = useState(false);
  const [resultApuracao, setResultApuracao] = useState<any>(null);
  const load = () => {
    fetch("/api/fiscal/despesas").then(r=>r.json()).then(d=>{setDespesas(d.data||[]);setDemo(!!d._demo);});
    fetch("/api/fiscal/nfse").then(r=>r.json()).then(d=>setNfses(d.data||[]));
  };
  useEffect(()=>{load();},[]);
  const apurar = async() => {
    setApurando(true);
    const r = await fetch("/api/fiscal/apuracao",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({competencia:comp,faturamento:fat})});
    const d = await r.json();
    setResultApuracao(d);
    if(d.success) load();
    setApurando(false);
  };
  const marcarPago = async(id:string) => {
    await fetch(`/api/fiscal/despesas/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"pago",paymentDate:new Date().toISOString()})});
    load();
  };
  const fmt = (v:number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const tabs = [{id:"despesas",l:"Despesas Tributárias"},{id:"nfse",l:"NFS-e Emitidas"},{id:"apuracao",l:"✨ Apuração Automática"}];
  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Central Fiscal {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <div style={{display:"flex",gap:8,marginBottom:16}}>{tabs.map(t=><button key={t.id} onClick={()=>setAba(t.id)} style={{background:aba===t.id?"#0f5233":"transparent",color:aba===t.id?"#fff":"#374151",border:"1px solid "+( aba===t.id?"#0f5233":"#d1d5db"),padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:aba===t.id?700:400}}>{t.l}</button>)}</div>
    <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#92400e"}}>⚠️ Apoio gerencial — todos os valores sujeitos à validação do contador. DAS exige apuração oficial no PGDAS-D.</div>
    {aba==="despesas"&&(<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[["Em Aberto","R$"+fmt(despesas.filter((d:any)=>d.status==="em_aberto").reduce((s:number,d:any)=>s+Number(d.totalAmount),0)),"💸","#d97706"],["Pagos","R$"+fmt(despesas.filter((d:any)=>d.status==="pago").reduce((s:number,d:any)=>s+Number(d.totalAmount),0)),"✅","#1a7a4a"],["Total","R$"+fmt(despesas.reduce((s:number,d:any)=>s+Number(d.totalAmount),0)),"📋","#1a7a4a"]].map(([l,v,i,c])=>(
          <div key={l} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:"3px solid "+c}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
            <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
          </div>
        ))}
      </div>
      <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
        <thead><tr style={{background:"#e8f5ee"}}>{["Tipo","Descrição","Competência","Vencimento","Valor","Origem","Status"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
        <tbody>{despesas.map((d:any)=><tr key={d.id} style={{borderBottom:"1px solid #f3f4f6"}}>
          <td style={{padding:"8px 12px"}}><span style={{background:"#f3f4f6",padding:"2px 7px",borderRadius:7,fontSize:11,fontWeight:700}}>{d.taxType}</span></td>
          <td style={{padding:"8px 12px",fontSize:12}}>{d.description}</td>
          <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11}}>{d.competence}</td>
          <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{d.dueDate?new Date(d.dueDate).toLocaleDateString("pt-BR"):"—"}</td>
          <td style={{padding:"8px 12px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(d.totalAmount||d.principalAmount))}</td>
          <td style={{padding:"8px 12px"}}>{d.generatedAuto?<span style={{background:"#f3e8ff",color:"#6d28d9",fontSize:10,padding:"2px 7px",borderRadius:7,fontWeight:700}}>🤖 AUTO</span>:<span style={{fontSize:10,color:"#9ca3af"}}>Manual</span>}</td>
          <td style={{padding:"8px 12px"}}><span style={{background:d.status==="pago"?"#dcfce7":d.status==="vencido"?"#fee2e2":"#fef9c3",color:d.status==="pago"?"#15803d":d.status==="vencido"?"#991b1b":"#92400e",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{d.status}</span></td>
        </tr>)}</tbody>
      </table>
    </div>)}
    {aba==="nfse"&&(<div>
      <div style={{background:"#e0e7ff",border:"1px solid #c7d2fe",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#3730a3"}}>
        🔗 <strong>ISS automático:</strong> alíquota preenchida pela tabela da Lei Complementar 33/2003 de Betim/MG ao cadastrar nova NFS-e via API POST /api/fiscal/nfse
      </div>
      <table style={{borderCollapse:"collapse",width:"100%",background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
        <thead><tr style={{background:"#e8f5ee"}}>{["Número","Tomador","Valor","ISS","Alíq.","Retido","Líquido","Competência"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
        <tbody>{nfses.map((n:any)=><tr key={n.id} style={{borderBottom:"1px solid #f3f4f6"}}>
          <td style={{padding:"8px 12px",fontWeight:700,color:"#0f5233"}}>{n.number}</td>
          <td style={{padding:"8px 12px",fontSize:12}}>{n.receiverName||n.client?.name||"—"}</td>
          <td style={{padding:"8px 12px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(n.serviceValue))}</td>
          <td style={{padding:"8px 12px"}}>R${fmt(Number(n.issAmount))}</td>
          <td style={{padding:"8px 12px",fontFamily:"monospace"}}>{n.issRate}%</td>
          <td style={{padding:"8px 12px"}}>{n.issRetained?<span style={{color:"#dc2626",fontWeight:700}}>Sim</span>:<span style={{color:"#1a7a4a"}}>Não</span>}</td>
          <td style={{padding:"8px 12px",fontWeight:600}}>R${fmt(Number(n.netAmount))}</td>
          <td style={{padding:"8px 12px",fontFamily:"monospace"}}>{n.competence}</td>
        </tr>)}</tbody>
      </table>
    </div>)}
    {aba==="apuracao"&&(<div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:20,marginBottom:14}}>
        <h3 style={{color:"#0f5233",fontSize:14,marginBottom:14}}>✨ Gerar lançamentos tributários automaticamente</h3>
        <p style={{fontSize:12,color:"#6b7280",marginBottom:14}}>O sistema calcula DAS, FGTS, INSS, ISS e CSRF com base nos dados reais do sistema (folha de pagamento e NFS-e emitidas). Apoio gerencial — validar com contador.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,alignItems:"flex-end"}}>
          <div><label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}}>Competência (AAAA-MM)</label><input style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}} value={comp} onChange={e=>setComp(e.target.value)} placeholder="2026-04"/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}}>Faturamento do mês (R$)</label><input type="number" style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}} value={fat} onChange={e=>setFat(Number(e.target.value))}/></div>
          <button onClick={apurar} disabled={apurando} style={{background:"#3C3489",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
            {apurando?"⟳ Apurando...":"✨ Gerar Lançamentos"}
          </button>
        </div>
        {resultApuracao&&(<div style={{marginTop:16,background:resultApuracao.success?"#f0fdf4":"#fef2f2",border:"1px solid "+(resultApuracao.success?"#86efac":"#fca5a5"),borderRadius:8,padding:12}}>
          {resultApuracao.success?(<div>
            <p style={{fontWeight:700,color:"#15803d",marginBottom:8}}>✅ {resultApuracao.lancamentos?.length} lançamentos gerados para {resultApuracao.competencia}</p>
            {resultApuracao.lancamentos?.map((l:any)=><div key={l.tipo} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"4px 0",borderBottom:"1px solid #dcfce7"}}>
              <span>{l.tipo} — {l.notes?.substring(0,60)}</span>
              <strong>R${fmt(l.valor)}</strong>
            </div>)}
            <p style={{fontSize:11,color:"#15803d",marginTop:8}}>Total: <strong>R${fmt(resultApuracao.lancamentos?.reduce((s:number,l:any)=>s+l.valor,0))}</strong></p>
          </div>):(<p style={{color:"#991b1b"}}>{resultApuracao.error||"Erro na apuração"}</p>)}
        </div>)}
      </div>
    </div>)}
  </div>);
}
