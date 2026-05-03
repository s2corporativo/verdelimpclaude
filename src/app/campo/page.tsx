"use client";
import { useState, useEffect } from "react";

// App mobile para equipe de campo — sem autenticação complexa, acesso por PIN
const PIN_CORRETO = "1234"; // TODO: mover para env var / configuração

export default function CampoPage() {
  const [pin, setPin] = useState("");
  const [logado, setLogado] = useState(false);
  const [aba, setAba] = useState<"os"|"ponto"|"foto">("os");
  const [os, setOs] = useState<any[]>([]);
  const [pontoBatido, setPontoBatido] = useState<{entrada?:string;saida?:string}>({});
  const [gps, setGps] = useState<{lat?:number;lng?:number;ok?:boolean}>({});
  const [foto, setFoto] = useState<{tipo:string;url:string;desc:string}>({tipo:"antes",url:"",desc:""});
  const [fotoSalva, setFotoSalva] = useState(false);
  const [nomeUser, setNomeUser] = useState("Equipe");

  useEffect(() => {
    // Tentar recuperar do sessionStorage
    const saved = sessionStorage.getItem("campo_logado");
    if (saved) { setLogado(true); setNomeUser(sessionStorage.getItem("campo_nome")||"Equipe"); }
  }, []);

  const fazerLogin = () => {
    if (pin === PIN_CORRETO) {
      setLogado(true);
      sessionStorage.setItem("campo_logado","1");
      // Carregar OS do dia
      fetch("/api/logistica").then(r=>r.json()).then(d=>setOs((d.os||[]).slice(0,8)));
      // Pegar GPS
      navigator.geolocation?.getCurrentPosition(p=>setGps({lat:p.coords.latitude,lng:p.coords.longitude,ok:true}),()=>setGps({ok:false}));
    } else {
      setPin("");
    }
  };

  const baterPonto = (tipo: "entrada"|"saida") => {
    const hora = new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    setPontoBatido(p=>({...p,[tipo]:hora}));
    // Registrar no diário via API
    if (gps.lat) {
      fetch("/api/diario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        location:`GPS: ${gps.lat?.toFixed(4)}, ${gps.lng?.toFixed(4)}`,
        supervisor: nomeUser,
        teamSize:1, weather:"Verificado em campo",
        activitiesDone:`${tipo === "entrada" ? "Entrada" : "Saída"} registrada às ${hora}`
      })}).catch(()=>{});
    }
  };

  const salvarFoto = async () => {
    if (!foto.url) return;
    await fetch("/api/fotos-os",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tipo:foto.tipo,url:foto.url,descricao:foto.desc,latitude:gps.lat,longitude:gps.lng})});
    setFotoSalva(true); setFoto({tipo:"antes",url:"",desc:""});
    setTimeout(()=>setFotoSalva(false),3000);
  };

  const cor = "#0f5233";
  const btnStyle: any = {width:"100%",background:cor,color:"#fff",border:"none",padding:"16px",borderRadius:12,cursor:"pointer",fontWeight:700,fontSize:18,marginBottom:10};
  const cardStyle: any = {background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:10};

  if (!logado) return (
    <div style={{minHeight:"100vh",background:"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:16,padding:32,maxWidth:320,width:"100%",boxShadow:"0 4px 24px rgba(0,0,0,.1)",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8}}>🌿</div>
        <h1 style={{color:cor,fontSize:22,fontWeight:700,margin:"0 0 4px"}}>Verdelimp</h1>
        <p style={{color:"#6b7280",fontSize:13,margin:"0 0 24px"}}>App de Campo</p>
        <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fazerLogin()} placeholder="PIN de acesso"
          style={{width:"100%",textAlign:"center",fontSize:28,letterSpacing:12,padding:"12px 0",border:"2px solid #d1d5db",borderRadius:10,marginBottom:16,outline:"none"}}/>
        {/* Teclado numérico */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
            <button key={i} onClick={()=>{ if(n==="⌫") setPin(p=>p.slice(0,-1)); else if(n!=="") setPin(p=>p.length<4?p+n:""); }}
              style={{padding:"14px",borderRadius:10,border:"1px solid #e5e7eb",background:n==="⌫"?"#fee2e2":"#f9fafb",cursor:"pointer",fontSize:20,fontWeight:700,color:n==="⌫"?"#dc2626":"#374151"}}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={fazerLogin} disabled={pin.length<4} style={{...btnStyle,opacity:pin.length<4?.5:1}}>Entrar</button>
        <p style={{fontSize:10,color:"#9ca3af",margin:0}}>PIN padrão: 1234 (altere em Configurações)</p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f0fdf4",paddingBottom:80}}>
      {/* Header */}
      <div style={{background:cor,color:"#fff",padding:"14px 16px",position:"sticky",top:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontWeight:700,fontSize:16}}>🌿 Verdelimp Campo</div>
          <div style={{fontSize:11,opacity:.8}}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,opacity:.8}}>{gps.ok?"📍 GPS OK":"📍 Sem GPS"}</div>
          <button onClick={()=>{sessionStorage.clear();setLogado(false);}} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",padding:"3px 8px",borderRadius:6,cursor:"pointer",fontSize:10}}>Sair</button>
        </div>
      </div>

      <div style={{padding:"14px 16px"}}>
        {/* Abas */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:16,background:"#fff",borderRadius:12,padding:6,border:"1px solid #e5e7eb"}}>
          {[["os","📋 OS do Dia"],["ponto","⏰ Ponto"],["foto","📸 Fotos"]].map(([id,l])=>(
            <button key={id} onClick={()=>setAba(id as any)}
              style={{background:aba===id?cor:"transparent",color:aba===id?"#fff":"#6b7280",border:"none",padding:"10px 4px",borderRadius:8,cursor:"pointer",fontWeight:aba===id?700:500,fontSize:12,lineHeight:1.3}}>
              {l}
            </button>
          ))}
        </div>

        {/* ABA OS */}
        {aba==="os"&&(
          <div>
            <h2 style={{color:cor,fontSize:16,fontWeight:700,marginBottom:12}}>📋 Ordens de Serviço — Hoje</h2>
            {os.length===0&&<div style={{...cardStyle,textAlign:"center",color:"#9ca3af",padding:32}}>
              <div style={{fontSize:36,marginBottom:8}}>✅</div>
              <div>Sem OS pendentes para hoje</div>
            </div>}
            {os.slice(0,5).map((o:any,i:number)=>{
              const pCor = o.prioridade==="urgente"?"#dc2626":o.prioridade==="normal"?"#1d4ed8":"#6b7280";
              return(
                <div key={i} style={{...cardStyle,borderLeft:`4px solid ${pCor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{background:pCor+"22",color:pCor,padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{o.prioridade?.toUpperCase()}</span>
                    <span style={{fontSize:10,color:"#9ca3af"}}>{o.tempoEstimadoH}h</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:15,color:cor,marginBottom:4}}>{o.titulo}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginBottom:4}}>🤝 {o.clienteNome}</div>
                  <div style={{fontSize:12,color:"#374151",marginBottom:8}}>📍 {o.municipio}/{o.uf}</div>
                  {o.observacoes&&<div style={{fontSize:11,color:"#92400e",background:"#fef9c3",borderRadius:7,padding:"6px 8px",marginBottom:8}}>{o.observacoes}</div>}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <button style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:12}}>▶ Iniciar</button>
                    <button style={{background:"#dcfce7",color:"#15803d",border:"none",padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:12}}>✅ Concluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA PONTO */}
        {aba==="ponto"&&(
          <div>
            <h2 style={{color:cor,fontSize:16,fontWeight:700,marginBottom:12}}>⏰ Controle de Ponto</h2>
            <div style={cardStyle}>
              <div style={{fontSize:32,textAlign:"center",fontWeight:700,color:"#374151",marginBottom:8}}>
                {new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
              </div>
              {gps.lat&&<div style={{textAlign:"center",fontSize:11,color:"#15803d",marginBottom:16}}>📍 {gps.lat.toFixed(4)}, {gps.lng?.toFixed(4)}</div>}
              {!pontoBatido.entrada
                ? <button onClick={()=>baterPonto("entrada")} style={{...btnStyle,background:"#15803d"}}>✅ Bater Entrada</button>
                : <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"12px",textAlign:"center",marginBottom:10}}>
                    <div style={{fontSize:13,color:"#6b7280"}}>Entrada registrada</div>
                    <div style={{fontSize:28,fontWeight:700,color:"#15803d"}}>{pontoBatido.entrada}</div>
                  </div>
              }
              {pontoBatido.entrada&&!pontoBatido.saida
                ? <button onClick={()=>baterPonto("saida")} style={{...btnStyle,background:"#dc2626"}}>🚪 Bater Saída</button>
                : pontoBatido.saida&&<div style={{background:"#fff7f7",border:"1px solid #fca5a5",borderRadius:10,padding:"12px",textAlign:"center"}}>
                    <div style={{fontSize:13,color:"#6b7280"}}>Saída registrada</div>
                    <div style={{fontSize:28,fontWeight:700,color:"#dc2626"}}>{pontoBatido.saida}</div>
                  </div>
              }
            </div>
            {pontoBatido.entrada&&pontoBatido.saida&&(
              <div style={{...cardStyle,textAlign:"center"}}>
                <div style={{fontSize:13,color:"#6b7280",marginBottom:4}}>Jornada do dia</div>
                <div style={{fontSize:22,fontWeight:700,color:cor}}>
                  {(()=>{
                    const [eh,em]=pontoBatido.entrada!.split(":").map(Number);
                    const [sh,sm]=pontoBatido.saida!.split(":").map(Number);
                    const mins=(sh*60+sm)-(eh*60+em);
                    return `${Math.floor(mins/60)}h ${mins%60}min`;
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA FOTOS */}
        {aba==="foto"&&(
          <div>
            <h2 style={{color:cor,fontSize:16,fontWeight:700,marginBottom:12}}>📸 Registrar Foto</h2>
            <div style={cardStyle}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Tipo de foto</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                  {[["antes","🔴 Antes"],["depois","🟢 Depois"],["ocorrencia","⚠️ Ocorrência"]].map(([t,l])=>(
                    <button key={t} onClick={()=>setFoto(p=>({...p,tipo:t}))}
                      style={{background:foto.tipo===t?cor:"#f3f4f6",color:foto.tipo===t?"#fff":"#374151",border:"none",padding:"10px 4px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>URL ou link da foto</label>
                <input value={foto.url} onChange={e=>setFoto(p=>({...p,url:e.target.value}))}
                  placeholder="Cole o link do Google Drive, Fotos, WhatsApp Web..."
                  style={{width:"100%",padding:"10px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}}/>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:4}}>Tire a foto pelo celular → compartilhe → copie o link aqui</div>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Descrição (opcional)</label>
                <input value={foto.desc} onChange={e=>setFoto(p=>({...p,desc:e.target.value}))}
                  placeholder="Ex: Canteiro km 3, antes da roçada"
                  style={{width:"100%",padding:"10px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13}}/>
              </div>
              {fotoSalva
                ? <div style={{background:"#dcfce7",border:"1px solid #86efac",borderRadius:10,padding:"14px",textAlign:"center",fontWeight:700,color:"#15803d",fontSize:16}}>✅ Foto registrada!</div>
                : <button onClick={salvarFoto} disabled={!foto.url} style={{...btnStyle,opacity:!foto.url?.5:1}}>📸 Salvar Foto</button>
              }
            </div>
            <div style={{...cardStyle,background:"#eff6ff",border:"1px solid #bfdbfe"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:4}}>💡 Como tirar e enviar fotos</div>
              <div style={{fontSize:11,color:"#374151",lineHeight:1.7}}>
                1. Tire a foto pela câmera do celular<br/>
                2. Abra o Google Fotos ou WhatsApp Web<br/>
                3. Compartilhe a foto → Copiar link<br/>
                4. Cole o link no campo acima
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav bottom fixo */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e5e7eb",display:"grid",gridTemplateColumns:"repeat(3,1fr)",padding:"8px 0",zIndex:100}}>
        {[["os","📋","OS"],["ponto","⏰","Ponto"],["foto","📸","Fotos"]].map(([id,ic,l])=>(
          <button key={id} onClick={()=>setAba(id as any)}
            style={{background:"none",border:"none",padding:"6px 4px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:22}}>{ic}</span>
            <span style={{fontSize:10,color:aba===id?cor:"#9ca3af",fontWeight:aba===id?700:400}}>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
