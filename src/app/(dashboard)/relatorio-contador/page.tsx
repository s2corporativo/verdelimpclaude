
"use client";
import { useEffect, useState } from "react";
export default function RelatorioContadorPage() {
  const [dados,setDados]=useState<any>(null);const [comp,setComp]=useState("2026-04");const [loading,setLoading]=useState(false);
  const carregar=async()=>{ setLoading(true); const r=await fetch(`/api/relatorio?competencia=${comp}`); const d=await r.json(); setDados(d); setLoading(false); };
  useEffect(()=>{carregar();},[]);
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const imprimir=()=>{
    const w=window.open("","_blank","width=900,height=700");
    if(!w||!dados)return;
    const html=`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório Contador ${dados.competencia}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:system-ui,sans-serif;padding:20px;color:#1a1a1a;font-size:12px}
    h1{color:#0f5233;font-size:18px;margin-bottom:4px}.sub{color:#6b7280;font-size:11px;margin-bottom:16px}
    h2{color:#0f5233;font-size:13px;border-bottom:1.5px solid #e8f5ee;padding-bottom:4px;margin:14px 0 9px}
    table{width:100%;border-collapse:collapse;margin-bottom:14px}th{background:#e8f5ee;color:#0f5233;padding:6px 9px;text-align:left;font-size:10px;font-weight:700}
    td{padding:6px 9px;border-bottom:1px solid #f3f4f6;font-size:11px}.total{background:#f0fdf4;font-weight:700}
    .kpi{display:inline-block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:7px;padding:8px 14px;margin:0 8px 8px 0;text-align:center}
    .kv{font-size:16px;font-weight:700;color:#0f5233}.kl{font-size:9px;color:#9ca3af;text-transform:uppercase;display:block;margin-bottom:3px}
    .aviso{background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:7px 10px;font-size:10px;color:#92400e;margin-bottom:14px}
    .footer{margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;display:flex;justify-content:space-between}
    @media print{.no-print{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
    <body>
    <div class="no-print" style="background:#0f5233;color:#fff;padding:10px 16px;margin:-20px -20px 20px;display:flex;justify-content:space-between;align-items:center">
      <strong>🌿 Verdelimp ERP — Relatório para Contador</strong>
      <button onclick="window.print()" style="background:#fff;color:#0f5233;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-weight:700">🖨️ Imprimir / PDF</button>
    </div>
    <h1>🌿 Verdelimp — Relatório Mensal para Contador</h1>
    <div class="sub">Competência: <strong>${dados.competencia}</strong> · CNPJ: 30.198.776/0001-29 · Simples Nacional · Emitido em: ${new Date().toLocaleDateString("pt-BR")}</div>
    <div class="aviso">⚠️ Apoio gerencial — validar todos os valores com o contador responsável antes de qualquer recolhimento</div>
    <div style="margin-bottom:14px">
      ${[["Faturamento","R$"+fmt(dados.faturamento)],["Tributos Apurados","R$"+fmt(dados.totalTributos)],["Folha de Pagamento","R$"+fmt(dados.totalFolha)],["Outras Despesas","R$"+fmt(dados.totalDesp)],["Margem Estimada","R$"+fmt(dados.margem)]].map(([l,v])=>`<div class="kpi"><span class="kl">${l}</span><span class="kv">${v}</span></div>`).join("")}
    </div>
    <h2>NFS-e Emitidas (${dados.nfses?.length||0})</h2>
    <table><thead><tr><th>Número</th><th>Tomador</th><th>Valor</th></tr></thead><tbody>
    ${(dados.nfses||[]).map((n:any)=>`<tr><td>${n.number}</td><td>${n.receiverName||n.client?.name||"—"}</td><td>R$${fmt(Number(n.serviceValue))}</td></tr>`).join("")}
    <tr class="total"><td colspan="2">TOTAL FATURADO</td><td>R$${fmt(dados.faturamento)}</td></tr>
    </tbody></table>
    <h2>Tributos Apurados</h2>
    <table><thead><tr><th>Tributo</th><th>Valor</th><th>Status</th></tr></thead><tbody>
    ${(dados.tributos||[]).map((t:any)=>`<tr><td>${t.taxType} — ${t.description||""}</td><td>R$${fmt(Number(t.totalAmount))}</td><td>${t.status}</td></tr>`).join("")}
    <tr class="total"><td>TOTAL TRIBUTOS</td><td>R$${fmt(dados.totalTributos)}</td><td></td></tr>
    </tbody></table>
    <h2>Folha de Pagamento</h2>
    <table><thead><tr><th>Nome</th><th>Função</th><th>Salário</th></tr></thead><tbody>
    ${(dados.folha||[]).map((f:any)=>`<tr><td>${f.name}</td><td>${f.role||""}</td><td>R$${fmt(Number(f.salary))}</td></tr>`).join("")}
    <tr class="total"><td colspan="2">TOTAL FOLHA</td><td>R$${fmt(dados.totalFolha)}</td></tr>
    </tbody></table>
    <div class="footer"><span>Verdelimp ERP · CNPJ 30.198.776/0001-29 · Betim/MG</span><span>Competência ${dados.competencia} · ${new Date().toLocaleString("pt-BR")}</span></div>
    </body></html>`;
    w.document.write(html);w.document.close();
  };
  return(<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Relatório para o Contador</h1>
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:16}}>
      <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
        <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3}}>Competência (AAAA-MM)</label>
          <input style={{width:"100%",padding:"8px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}} value={comp} onChange={e=>setComp(e.target.value)}/></div>
        <button onClick={carregar} disabled={loading} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"9px 20px",borderRadius:8,cursor:"pointer",fontWeight:700}}>{loading?"⟳ Carregando...":"🔄 Gerar"}</button>
        {dados&&<button onClick={imprimir} style={{background:"#0f5233",color:"#fff",border:"none",padding:"9px 20px",borderRadius:8,cursor:"pointer",fontWeight:700}}>🖨️ Imprimir / PDF</button>}
        {dados&&<a href={`mailto:${dados._email||"contador@demo.com.br"}?subject=Relatório ${comp}&body=Segue relatório do mês ${comp}.`} style={{background:"#1d4ed8",color:"#fff",padding:"9px 16px",borderRadius:8,textDecoration:"none",fontSize:13,fontWeight:700}}>📧 Enviar por e-mail</a>}
      </div>
    </div>
    {dados&&<div>
      <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 13px",marginBottom:12,fontSize:11,color:"#92400e"}}>⚠️ Apoio gerencial — validar com contador antes de qualquer recolhimento</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
        {[["Faturamento","R$"+fmt(dados.faturamento),"📈","#1a7a4a"],["Tributos","R$"+fmt(dados.totalTributos),"💸","#d97706"],["Folha","R$"+fmt(dados.totalFolha),"👷","#7c3aed"],["Despesas","R$"+fmt(dados.totalDesp),"📉","#dc2626"],["Margem","R$"+fmt(dados.margem),"💵","#1a7a4a"]].map(([l,v,i,c])=>(
          <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${c}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
            <div style={{fontSize:17,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:"#e8f5ee",padding:"9px 14px",fontWeight:700,color:"#0f5233",fontSize:12}}>NFS-e Emitidas ({dados.nfses?.length})</div>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <tbody>{(dados.nfses||[]).map((n:any,i:number)=><tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
              <td style={{padding:"7px 12px",fontSize:11,fontFamily:"monospace",color:"#0f5233"}}>{n.number}</td>
              <td style={{padding:"7px 12px",fontSize:11}}>{n.receiverName||n.client?.name||"—"}</td>
              <td style={{padding:"7px 12px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(n.serviceValue))}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:"#e8f5ee",padding:"9px 14px",fontWeight:700,color:"#0f5233",fontSize:12}}>Tributos Apurados</div>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <tbody>{(dados.tributos||[]).map((t:any,i:number)=><tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
              <td style={{padding:"7px 12px",fontSize:11,fontWeight:700}}>{t.taxType}</td>
              <td style={{padding:"7px 12px",fontSize:11,color:"#6b7280"}}>{t.description}</td>
              <td style={{padding:"7px 12px",fontWeight:700,color:"#d97706"}}>R${fmt(Number(t.totalAmount||t.principalAmount))}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>}
  </div>);
}