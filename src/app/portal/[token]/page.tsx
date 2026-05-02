
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PortalClientePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [aprovando, setAprovando] = useState<string|null>(null);
  const [obs, setObs] = useState("");

  useEffect(() => {
    if(!token) return;
    fetch(`/api/portal-cliente?token=${token}`)
      .then(r=>r.json())
      .then(d=>{ if(d.error) setErro(d.error); else setData(d); setLoading(false); })
      .catch(()=>{ setErro("Erro ao carregar portal"); setLoading(false); });
  }, [token]);

  const aprovar = async (medicaoId:string, acao:string) => {
    setAprovando(medicaoId);
    const r = await fetch("/api/portal-cliente",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ token, medicaoId, acao, observacao: obs })
    });
    const d = await r.json();
    if(d.success){
      setData((p:any)=>({ ...p, medicoes: p.medicoes.map((m:any)=>m.id===medicaoId?{...m,status:acao==="aprovar"?"aprovada":"contestada"}:m) }));
    }
    setAprovando(null); setObs("");
  };

  const fmt = (v:number) => v?.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const STATUS_MED:any = { em_elaboracao:["#fef9c3","#92400e","Em elaboração"], aprovada:["#dcfce7","#15803d","✅ Aprovada"], contestada:["#fee2e2","#991b1b","⚠️ Contestada"], enviada:["#dbeafe","#1e40af","Enviada para aprovação"] };

  if(loading) return <div style={{textAlign:"center",padding:60,color:"#6b7280",fontSize:16}}>Carregando portal do cliente...</div>;
  if(erro) return <div style={{textAlign:"center",padding:60,color:"#991b1b",fontSize:15}}>❌ {erro}</div>;
  if(!data) return null;

  return (
    <div style={{fontFamily:"Arial,sans-serif",maxWidth:900,margin:"0 auto",padding:"16px"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0f5233,#1a7a4a)",color:"#fff",borderRadius:12,padding:20,marginBottom:16}}>
        <div style={{fontSize:11,opacity:.75,textTransform:"uppercase",letterSpacing:1}}>Portal do Cliente</div>
        <h1 style={{fontSize:22,fontWeight:700,margin:"6px 0 4px"}}>{data.cliente?.name}</h1>
        <p style={{fontSize:12,opacity:.85,margin:0}}>CNPJ: {data.cliente?.cnpjCpf} · {data.cliente?.municipio}/{data.cliente?.uf}</p>
      </div>

      {/* Contratos */}
      <div style={{marginBottom:16}}>
        <h2 style={{color:"#0f5233",fontSize:15,fontWeight:700,marginBottom:10}}>📋 Contratos Ativos</h2>
        {data.contratos?.map((c:any)=>(
          <div key={c.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:14,marginBottom:8}}>
            <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontWeight:700,color:"#0f5233",fontSize:13}}>{c.number}</div>
                <div style={{fontSize:12,color:"#374151"}}>{c.object}</div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:4}}>
                  Vigência: {new Date(c.startDate).toLocaleDateString("pt-BR")} → {new Date(c.endDate).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:11,color:"#6b7280"}}>Valor mensal</div>
                <div style={{fontSize:16,fontWeight:700,color:"#0f5233"}}>R$ {fmt(c.monthlyValue||0)}</div>
                <span style={{background:"#dcfce7",color:"#15803d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{c.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Medições */}
      <div style={{marginBottom:16}}>
        <h2 style={{color:"#0f5233",fontSize:15,fontWeight:700,marginBottom:10}}>💰 Medições</h2>
        {data.medicoes?.map((m:any)=>{
          const [mbg,mco,mtxt] = STATUS_MED[m.status]||STATUS_MED.em_elaboracao;
          const pendente = m.status==="enviada";
          return(
            <div key={m.id} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:14,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:pendente?10:0}}>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{m.period} — {m.contract?.number}</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>Período: {new Date(m.startDate).toLocaleDateString("pt-BR")} a {new Date(m.endDate).toLocaleDateString("pt-BR")}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:18,fontWeight:700,color:"#0f5233"}}>R$ {fmt(m.value)}</div>
                  <span style={{background:mbg,color:mco,padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{mtxt}</span>
                </div>
              </div>
              {pendente&&(
                <div style={{borderTop:"1px solid #f3f4f6",paddingTop:10}}>
                  <input value={obs} onChange={e=>setObs(e.target.value)} placeholder="Observação (opcional)"
                    style={{width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12,marginBottom:8}}/>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>aprovar(m.id,"aprovar")} disabled={!!aprovando}
                      style={{background:"#15803d",color:"#fff",border:"none",padding:"8px 20px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:12}}>
                      ✅ Aprovar Medição
                    </button>
                    <button onClick={()=>aprovar(m.id,"contestar")} disabled={!!aprovando}
                      style={{background:"#fef2f2",color:"#991b1b",border:"1px solid #fca5a5",padding:"8px 20px",borderRadius:8,cursor:"pointer",fontSize:12}}>
                      ⚠️ Contestar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Histórico de OS */}
      <div>
        <h2 style={{color:"#0f5233",fontSize:15,fontWeight:700,marginBottom:10}}>📋 Histórico de Serviços</h2>
        {data.diarios?.slice(0,10).map((d:any)=>(
          <div key={d.id} style={{background:"#fff",border:"1px solid #f3f4f6",borderRadius:8,padding:"10px 14px",marginBottom:6,display:"flex",gap:12,flexWrap:"wrap"}}>
            <div style={{fontWeight:700,fontSize:11,color:"#0f5233",minWidth:85}}>{new Date(d.date).toLocaleDateString("pt-BR")}</div>
            <div style={{flex:1,fontSize:11,color:"#374151"}}>{d.activitiesDone}</div>
            <div style={{fontSize:10,color:"#6b7280"}}>👷 {d.teamSize} pessoas · ☁️ {d.weather}</div>
          </div>
        ))}
      </div>

      <div style={{textAlign:"center",marginTop:20,fontSize:10,color:"#9ca3af"}}>
        Portal fornecido pela VERDELIMP Servicos e Terceirizacao Ltda — CNPJ 30.198.776/0001-29
      </div>
    </div>
  );
}
