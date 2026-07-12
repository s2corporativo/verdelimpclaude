
"use client";
import { useEffect, useState } from "react";
export default function FolhaDetalhadaPage() {
  const [dados,setDados]=useState<any>(null);const [demo,setDemo]=useState(false);
  const [extras,setExtras]=useState<Record<string,{he50?:number;he100?:number}>>({});
  const [mostraHE,setMostraHE]=useState(false);const [recalc,setRecalc]=useState(false);
  useEffect(()=>{fetch("/api/folha-detalhada").then(r=>r.json()).then(d=>{setDados(d);setDemo(!!d._demo);});},[]);
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const setHE=(id:string,campo:"he50"|"he100",val:string)=>setExtras(p=>({...p,[id]:{...p[id],[campo]:Number(val)||0}}));
  const recalcular=async()=>{
    setRecalc(true);
    try{const r=await fetch("/api/folha-detalhada",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({extras})});const d=await r.json();if(r.ok){setDados(d);setDemo(!!d._demo);}}
    catch{} finally{setRecalc(false);}
  };
  if(!dados) return <div style={{color:"#4a9410",padding:20}}>⟳ Calculando folha...</div>;
  return(<div>
    <h1 style={{color:"#334532",fontSize:20,fontWeight:700,marginBottom:4}}>Folha Detalhada — INSS + IRRF {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>Adaptado de: <code style={{fontSize:11,background:"#f3f4f6",padding:"1px 6px",borderRadius:4}}>verdelimp-erp-prime-final → payrollRouter.generate</code> · INSS tabela progressiva 2026 + IRRF. Apoio gerencial — validar com contador.</p>
    {dados.aviso&&<div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#92400e"}}>⚠️ {dados.aviso}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[["Salário Bruto Total","R$"+fmt(dados.totais.bruto),"💰","#4a9410"],["INSS Descontado","R$"+fmt(dados.totais.inss),"🏛️","#d97706"],["Salário Líquido Total","R$"+fmt(dados.totais.liquido),"💵","#4a9410"],["Custo Total Empresa","R$"+fmt(dados.totais.custoTotal),"🏦","#dc2626"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:17,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{marginBottom:12}}>
      <button onClick={()=>setMostraHE(v=>!v)} style={{background:"#fff",border:"1px solid #d1d5db",borderRadius:8,padding:"7px 14px",fontSize:12,fontWeight:700,color:"#334532",cursor:"pointer"}}>
        ⏱️ Horas extras do mês {mostraHE?"▲":"▼"}
      </button>
    </div>
    {mostraHE&&(
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
        <p style={{margin:"0 0 10px",fontSize:12,color:"#6b7280"}}>Informe as horas extras de cada funcionário (50% e 100%) e recalcule. As HE entram na base de INSS/IRRF/FGTS. Valores variam por mês — não ficam salvos no cadastro.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:"6px 12px",alignItems:"center",maxWidth:520}}>
          <span style={{fontSize:10,fontWeight:700,color:"#6b7280"}}>FUNCIONÁRIO</span><span style={{fontSize:10,fontWeight:700,color:"#6b7280",textAlign:"center"}}>HORAS 50%</span><span style={{fontSize:10,fontWeight:700,color:"#6b7280",textAlign:"center"}}>HORAS 100%</span>
          {(dados.folha||[]).map((f:any)=>(
            <>
              <span key={f.id+"n"} style={{fontSize:12}}>{f.nome}</span>
              <input key={f.id+"a"} type="number" min="0" step="0.5" value={extras[f.id]?.he50??""} onChange={e=>setHE(f.id,"he50",e.target.value)} style={{width:80,padding:"5px 8px",border:"1px solid #d1d5db",borderRadius:6,fontSize:12,textAlign:"right"}}/>
              <input key={f.id+"b"} type="number" min="0" step="0.5" value={extras[f.id]?.he100??""} onChange={e=>setHE(f.id,"he100",e.target.value)} style={{width:80,padding:"5px 8px",border:"1px solid #d1d5db",borderRadius:6,fontSize:12,textAlign:"right"}}/>
            </>
          ))}
        </div>
        <button onClick={recalcular} disabled={recalc} style={{marginTop:12,background:"#4a9410",color:"#fff",border:"none",padding:"8px 18px",borderRadius:8,fontWeight:700,fontSize:12,cursor:recalc?"default":"pointer"}}>{recalc?"Recalculando…":"↻ Recalcular folha com HE"}</button>
      </div>
    )}
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead>
          <tr style={{background:"#e8f5ee"}}>{["Funcionário","Cargo","Salário Bruto","(-) INSS","(-) IRRF","= Líquido","FGTS (emp)","INSS Pat.","Custo Total"].map(h=><th key={h} style={{padding:"8px 11px",textAlign:"right",fontSize:10,fontWeight:700,color:"#334532"}}>{h}</th>)}</tr>
          <tr style={{background:"#f0fdf4"}}><td colSpan={9} style={{padding:"4px 12px",fontSize:10,color:"#6b7280",fontStyle:"italic"}}>INSS progressivo: 7,5% (até R$1.412) · 9% (até R$2.666) · 12% (até R$4.000) · 14% (até R$7.786) — Teto INSS. IRRF: isento até R$2.259,20.</td></tr>
        </thead>
        <tbody>
          {(dados.folha||[]).map((f:any,i:number)=>(
            <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
              <td style={{padding:"8px 11px",fontWeight:600,fontSize:12}}>{f.nome?.split(" ")[0]} {f.nome?.split(" ").pop()}</td>
              <td style={{padding:"8px 11px",fontSize:11,color:"#6b7280",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.cargo}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:600}}>R${fmt(f.salarioBruto)}
                {(f.adicionais>0||f.horasExtras>0)&&<div style={{fontSize:9,color:"#7c3aed",fontWeight:500}}>{f.adicionais>0?`+adic R$${fmt(f.adicionais)}`:""}{f.adicionais>0&&f.horasExtras>0?" · ":""}{f.horasExtras>0?`+HE R$${fmt(f.horasExtras)}`:""}</div>}
              </td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#d97706"}}>-R${fmt(f.inss)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:f.irrf>0?"#dc2626":"#9ca3af"}}>{f.irrf>0?"-R$"+fmt(f.irrf):"—"}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,color:"#4a9410"}}>R${fmt(f.salarioLiquido)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#7c3aed"}}>R${fmt(f.fgts)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#7c3aed"}}>R${fmt(f.inssPatronal)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,color:"#dc2626"}}>R${fmt(f.custoTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{background:"#e8f5ee"}}>
            <td colSpan={2} style={{padding:"9px 11px",fontWeight:700,color:"#334532"}}>TOTAIS</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700}}>R${fmt(dados.totais.bruto)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#d97706"}}>-R${fmt(dados.totais.inss)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#dc2626"}}>-R${fmt(dados.totais.irrf)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#4a9410"}}>R${fmt(dados.totais.liquido)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#7c3aed"}}>R${fmt(dados.totais.fgts)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#7c3aed"}}>R${fmt(dados.totais.inssPatronal)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#dc2626"}}>R${fmt(dados.totais.custoTotal)}</td>
          </tr>
          <tr style={{background:"#f0fdf4"}}>
            <td colSpan={9} style={{padding:"7px 12px",fontSize:11,color:"#15803d"}}>
              💡 FGTS e INSS Patronal são encargos da empresa (não descontam do funcionário). Custo Total inclui todos os encargos. Empresa: +{((dados.totais.custoTotal/dados.totais.bruto-1)*100).toFixed(1)}% sobre a folha bruta.
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>);
}
