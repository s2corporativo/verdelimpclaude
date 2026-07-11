
"use client";
import { useEffect, useState } from "react";
export default function PropostasPage() {
  const [data, setData] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [gerando, setGerando] = useState<string|null>(null);
  useEffect(()=>{ fetch("/api/propostas").then(r=>r.json()).then(d=>{setData(d.data||[]);setDemo(!!d._demo);}); },[]);
  const fmt = (v:number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const STATUS_COLORS:any = {Aprovada:["#dcfce7","#15803d"],Aberta:["#fef9c3","#92400e"],Rejeitada:["#fee2e2","#991b1b"],Expirada:["#f3f4f6","#6b7280"]};

  const abrirPDF = (id:string, numero:string) => {
    setGerando(id);
    // Abrir HTML de proposta em nova aba — usuário usa Ctrl+P para salvar como PDF
    const url = `/api/propostas/${id}/pdf`;
    window.open(url, "_blank", "width=900,height=700");
    setTimeout(()=>setGerando(null), 2000);
  };

  // Para modo demo, abrir PDF demo
  const abrirPDFDemo = () => {
    window.open("/api/propostas/demo/pdf", "_blank", "width=900,height=700");
  };

  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Propostas Comerciais {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}</h1>

    <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:8,padding:"9px 13px",marginBottom:16,fontSize:11,color:"#15803d"}}>
      📄 <strong>PDF disponível:</strong> Clique em "Gerar PDF" em qualquer proposta. O sistema abre a proposta formatada — use <strong>Ctrl+P → Salvar como PDF</strong> para exportar. Inclui: dados do cliente, objeto, composição de BDI, condições comerciais e espaço para assinatura.
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
      {[["Total",data.length,"📄","#1a7a4a"],["Aprovadas",data.filter((p:any)=>p.status==="Aprovada").length,"✅","#15803d"],["Em Aberto",data.filter((p:any)=>p.status==="Aberta").length,"⏳","#d97706"]].map(([l,v,i,c])=>(
        <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 14px",borderTop:"3px solid "+c}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
          <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:5}}>{v}</div>
        </div>
      ))}
    </div>

    {demo&&<div style={{textAlign:"center",marginBottom:14}}>
      <button onClick={abrirPDFDemo} style={{background:"#7c3aed",color:"#fff",border:"none",padding:"10px 24px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
        📄 Ver Exemplo de PDF (Demo)
      </button>
    </div>}

    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr style={{background:"#e8f5ee"}}>{["Número","Objeto","Cliente","Valor Total","Data","Status","PDF"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
        <tbody>{data.map((p:any)=>{
          const [bg,co]=STATUS_COLORS[p.status]||["#f3f4f6","#6b7280"];
          return(<tr key={p.id} style={{borderBottom:"1px solid #f3f4f6"}}>
            <td style={{padding:"8px 12px",fontWeight:700,fontFamily:"monospace",color:"#0f5233"}}>{p.number}</td>
            <td style={{padding:"8px 12px",fontSize:12,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.object}</td>
            <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{p.client?.name||"—"}</td>
            <td style={{padding:"8px 12px",fontWeight:700,color:"#1a7a4a"}}>R${fmt(Number(p.totalValue||0))}</td>
            <td style={{padding:"8px 12px",fontSize:11,color:"#6b7280"}}>{p.createdAt?new Date(p.createdAt).toLocaleDateString("pt-BR"):"—"}</td>
            <td style={{padding:"8px 12px"}}><span style={{background:bg,color:co,padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{p.status}</span></td>
            <td style={{padding:"8px 12px"}}>
              <button onClick={()=>abrirPDF(p.id,p.number)} disabled={gerando===p.id}
                style={{background:gerando===p.id?"#6b7280":"#0f5233",color:"#fff",border:"none",padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                {gerando===p.id?"⟳...":"📄 PDF"}
              </button>
            </td>
          </tr>);
        })}</tbody>
      </table>
    </div>
  </div>);
}
