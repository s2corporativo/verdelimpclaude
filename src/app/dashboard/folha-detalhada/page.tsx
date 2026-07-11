
"use client";
import { useEffect, useState } from "react";
export default function FolhaDetalhadaPage() {
  const [dados,setDados]=useState<any>(null);const [demo,setDemo]=useState(false);
  useEffect(()=>{fetch("/api/folha-detalhada").then(r=>r.json()).then(d=>{setDados(d);setDemo(!!d._demo);});},[]);
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  if(!dados) return <div style={{color:"#1a7a4a",padding:20}}>⟳ Calculando folha...</div>;
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Folha Detalhada — INSS + IRRF {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:14}}>Adaptado de: <code style={{fontSize:11,background:"#f3f4f6",padding:"1px 6px",borderRadius:4}}>verdelimp-erp-prime-final → payrollRouter.generate</code> · INSS tabela progressiva 2026 + IRRF. Apoio gerencial — validar com contador.</p>
    {dados.aviso&&<div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#92400e"}}>⚠️ {dados.aviso}</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[["Salário Bruto Total","R$"+fmt(dados.totais.bruto),"💰","#1a7a4a"],["INSS Descontado","R$"+fmt(dados.totais.inss),"🏛️","#d97706"],["Salário Líquido Total","R$"+fmt(dados.totais.liquido),"💵","#1a7a4a"],["Custo Total Empresa","R$"+fmt(dados.totais.custoTotal),"🏦","#dc2626"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${c}`}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:17,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead>
          <tr style={{background:"#e8f5ee"}}>{["Funcionário","Cargo","Salário Bruto","(-) INSS","(-) IRRF","= Líquido","FGTS (emp)","INSS Pat.","Custo Total"].map(h=><th key={h} style={{padding:"8px 11px",textAlign:"right",fontSize:10,fontWeight:700,color:"#0f5233",":first-child":{textAlign:"left"}}}>{h}</th>)}</tr>
          <tr style={{background:"#f0fdf4"}}><td colSpan={9} style={{padding:"4px 12px",fontSize:10,color:"#6b7280",fontStyle:"italic"}}>INSS progressivo: 7,5% (até R$1.412) · 9% (até R$2.666) · 12% (até R$4.000) · 14% (até R$7.786) — Teto INSS. IRRF: isento até R$2.259,20.</td></tr>
        </thead>
        <tbody>
          {(dados.folha||[]).map((f:any,i:number)=>(
            <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
              <td style={{padding:"8px 11px",fontWeight:600,fontSize:12}}>{f.nome?.split(" ")[0]} {f.nome?.split(" ").pop()}</td>
              <td style={{padding:"8px 11px",fontSize:11,color:"#6b7280",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.cargo}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:600}}>R${fmt(f.salarioBruto)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#d97706"}}>-R${fmt(f.inss)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:f.irrf>0?"#dc2626":"#9ca3af"}}>{f.irrf>0?"-R$"+fmt(f.irrf):"—"}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,color:"#1a7a4a"}}>R${fmt(f.salarioLiquido)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#7c3aed"}}>R${fmt(f.fgts)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",color:"#7c3aed"}}>R${fmt(f.inssPatronal)}</td>
              <td style={{padding:"8px 11px",textAlign:"right",fontWeight:700,color:"#dc2626"}}>R${fmt(f.custoTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{background:"#e8f5ee"}}>
            <td colSpan={2} style={{padding:"9px 11px",fontWeight:700,color:"#0f5233"}}>TOTAIS</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700}}>R${fmt(dados.totais.bruto)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#d97706"}}>-R${fmt(dados.totais.inss)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#dc2626"}}>-R${fmt(dados.totais.irrf)}</td>
            <td style={{padding:"9px 11px",textAlign:"right",fontWeight:700,color:"#1a7a4a"}}>R${fmt(dados.totais.liquido)}</td>
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
