
"use client";
import { useState, useEffect } from "react";

type Prioridade = "urgente" | "normal" | "pode_agendar";
type Status = "pendente" | "agendado" | "em_execucao" | "concluido";

interface OS {
  id: string; titulo: string; clienteNome: string; endereco: string;
  municipio: string; uf: string; tipoServico: string; areaM2?: number;
  prazo?: string; prioridade: Prioridade; tempoEstimadoH?: number;
  funcionariosNecessarios?: number; status: Status; observacoes?: string;
  equipeAlocada?: string[]; dataAgendada?: string;
}

const PRIO_STYLE: Record<Prioridade, [string,string,string]> = {
  urgente:       ["#fee2e2","#991b1b","🔴"],
  normal:        ["#dbeafe","#1e40af","🔵"],
  pode_agendar:  ["#f3f4f6","#6b7280","⚪"],
};
const STATUS_STYLE: Record<Status, [string,string]> = {
  pendente:     ["#fef9c3","#92400e"],
  agendado:     ["#dbeafe","#1e40af"],
  em_execucao:  ["#f3e8ff","#6d28d9"],
  concluido:    ["#dcfce7","#15803d"],
};

const TIPOS_SERVICO = ["Roçada Manual","Roçada Mecanizada","Jardinagem Mensal",
  "PRADA/PTRF","Controle de Formigas","Podação de Árvores","Hidrossemeadura",
  "Limpeza de Terreno","Capina Química","Outro"];
const VEICULOS = ["Hilux QWE-1234","Iveco ASD-5678","Gol ZXC-9012"];

export default function LogisticaPage() {
  const [os, setOs] = useState<OS[]>([]);
  const [funcs, setFuncs] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [aba, setAba] = useState("os");
  const [plano, setPlano] = useState<any>(null);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [criterio, setCriterio] = useState("balanceado");
  const [semana, setSemana] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay() + 1) % 7 || 7);
    return d.toISOString().slice(0,10);
  });
  const [editando, setEditando] = useState<OS | null>(null);
  const [novaOs, setNovaOs] = useState<Partial<OS>>({
    tipoServico:"Roçada Manual", prioridade:"normal", status:"pendente",
    municipio:"Betim", uf:"MG"
  });
  const [mostrarForm, setMostrarForm] = useState(false);

  useEffect(() => {
    fetch("/api/logistica").then(r=>r.json()).then(d=>{
      setOs(d.os||[]); setFuncs(d.funcionarios||[]); setDemo(!!d._demo);
    });
  }, []);

  const gerarPlano = async () => {
    const pendentes = os.filter(o => o.status === "pendente" || o.status === "agendado");
    if (!pendentes.length) return;
    setGerandoPlano(true); setPlano(null);
    try {
      const r = await fetch("/api/logistica", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ os: pendentes, funcionarios: funcs, semana, criterio }),
      });
      const d = await r.json();
      if (d.success) { setPlano(d.plano); setAba("plano"); }
      else alert("Erro: " + d.error);
    } catch (e: any) { alert("Erro: " + e.message); }
    setGerandoPlano(false);
  };

  const addOs = () => {
    if (!novaOs.titulo || !novaOs.clienteNome) return;
    const newOs: OS = {
      id: `os-${Date.now()}`, titulo: novaOs.titulo||"", clienteNome: novaOs.clienteNome||"",
      endereco: novaOs.endereco||"", municipio: novaOs.municipio||"Betim", uf: novaOs.uf||"MG",
      tipoServico: novaOs.tipoServico||"Roçada Manual", areaM2: novaOs.areaM2,
      prazo: novaOs.prazo, prioridade: novaOs.prioridade||"normal",
      tempoEstimadoH: novaOs.tempoEstimadoH, funcionariosNecessarios: novaOs.funcionariosNecessarios||2,
      status: "pendente", observacoes: novaOs.observacoes,
    };
    setOs(prev => [newOs, ...prev]);
    setNovaOs({ tipoServico:"Roçada Manual", prioridade:"normal", status:"pendente", municipio:"Betim", uf:"MG" });
    setMostrarForm(false);
  };

  const updateStatus = (id: string, status: Status) => setOs(p => p.map(o => o.id===id ? {...o, status} : o));
  const removeOs = (id: string) => setOs(p => p.filter(o => o.id!==id));
  const fmt = (v: number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});

  const IS: any = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13 };
  const LS: any = { fontSize:11, fontWeight:600, color:"#374151", display:"block", marginBottom:3 };

  const urgentes = os.filter(o=>o.prioridade==="urgente"&&o.status==="pendente").length;
  const pendentes = os.filter(o=>o.status==="pendente"||o.status==="agendado").length;
  const concluidas = os.filter(o=>o.status==="concluido").length;

  return (
    <div>
      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:0}}>
            🚛 Logística Operacional
            {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8,marginLeft:8}}>Demo</span>}
          </h1>
          <p style={{color:"#6b7280",fontSize:12,margin:"4px 0 0"}}>
            Planejamento de equipes, rotas e cronograma semanal por OS — IA otimiza ordem, deslocamento e alocação
          </p>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setMostrarForm(f=>!f)}
            style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
            + Nova OS
          </button>
          <button onClick={gerarPlano} disabled={gerandoPlano||pendentes===0}
            style={{background:gerandoPlano?"#6b7280":"#7c3aed",color:"#fff",border:"none",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,opacity:pendentes===0?.5:1}}>
            {gerandoPlano?"⟳ Gerando plano...":"🤖 Gerar Plano com IA"}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:9,marginBottom:16}}>
        {[
          ["Total OS",os.length,"📋","#1a7a4a"],
          ["🔴 Urgentes",urgentes,"⚠️","#dc2626"],
          ["Pendentes",pendentes,"⏳","#d97706"],
          ["Concluídas",concluidas,"✅","#1a7a4a"],
          ["Equipe",funcs.length,"👷","#1d4ed8"],
        ].map(([l,v,i,c])=>(
          <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 13px",borderTop:`3px solid ${c}`,borderLeft:l==="🔴 Urgentes"&&(v as number)>0?`3px solid #dc2626`:""}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
            <div style={{fontSize:20,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>

      {/* FORMULÁRIO NOVA OS */}
      {mostrarForm&&(
        <div style={{background:"#fff",border:"2px solid #1a7a4a",borderRadius:12,padding:18,marginBottom:14}}>
          <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:14}}>+ Nova Ordem de Serviço</h3>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Título / Descrição*</label><input style={IS} value={novaOs.titulo||""} onChange={e=>setNovaOs(p=>({...p,titulo:e.target.value}))} placeholder="Ex: Roçada Canteiros Norte — Cicloviário"/></div>
            <div><label style={LS}>Cliente*</label><input style={IS} value={novaOs.clienteNome||""} onChange={e=>setNovaOs(p=>({...p,clienteNome:e.target.value}))} placeholder="Nome do cliente"/></div>
            <div><label style={LS}>Tipo de Serviço</label>
              <select style={IS} value={novaOs.tipoServico||""} onChange={e=>setNovaOs(p=>({...p,tipoServico:e.target.value}))}>
                {TIPOS_SERVICO.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Endereço completo</label><input style={IS} value={novaOs.endereco||""} onChange={e=>setNovaOs(p=>({...p,endereco:e.target.value}))} placeholder="Rua, número, bairro"/></div>
            <div><label style={LS}>Município</label><input style={IS} value={novaOs.municipio||""} onChange={e=>setNovaOs(p=>({...p,municipio:e.target.value}))}/></div>
            <div><label style={LS}>UF</label><input style={IS} value={novaOs.uf||""} onChange={e=>setNovaOs(p=>({...p,uf:e.target.value}))}/></div>
            <div><label style={LS}>Área (m²)</label><input type="number" style={IS} value={novaOs.areaM2||""} onChange={e=>setNovaOs(p=>({...p,areaM2:Number(e.target.value)}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Prazo / Data Limite</label><input type="date" style={IS} value={novaOs.prazo||""} onChange={e=>setNovaOs(p=>({...p,prazo:e.target.value}))}/></div>
            <div><label style={LS}>Prioridade</label>
              <select style={IS} value={novaOs.prioridade||"normal"} onChange={e=>setNovaOs(p=>({...p,prioridade:e.target.value as Prioridade}))}>
                <option value="urgente">🔴 Urgente</option>
                <option value="normal">🔵 Normal</option>
                <option value="pode_agendar">⚪ Pode agendar</option>
              </select>
            </div>
            <div><label style={LS}>Tempo estimado (h)</label><input type="number" step="0.5" style={IS} value={novaOs.tempoEstimadoH||""} onChange={e=>setNovaOs(p=>({...p,tempoEstimadoH:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Funcionários necessários</label><input type="number" style={IS} value={novaOs.funcionariosNecessarios||2} onChange={e=>setNovaOs(p=>({...p,funcionariosNecessarios:Number(e.target.value)}))}/></div>
            <div><label style={LS}>Data agendada</label><input type="date" style={IS} value={novaOs.dataAgendada||""} onChange={e=>setNovaOs(p=>({...p,dataAgendada:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={LS}>Observações / Equipamentos necessários / Acesso especial</label>
            <textarea style={{...IS,height:60,resize:"vertical"}} value={novaOs.observacoes||""} onChange={e=>setNovaOs(p=>({...p,observacoes:e.target.value}))} placeholder="Ex: Levar 2 roçadeiras + soprador. Supervisor: Ana Luiza. Necessário EPI completo."/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={addOs} disabled={!novaOs.titulo||!novaOs.clienteNome} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700}}>+ Adicionar OS</button>
            <button onClick={()=>setMostrarForm(false)} style={{background:"#f3f4f6",border:"none",padding:"9px 20px",borderRadius:8,cursor:"pointer",color:"#374151"}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ABAS */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {[["os",`📋 Ordens de Serviço (${os.length})`],["plano","📅 Plano Semanal IA"],["equipe","👷 Equipe Disponível"],["config","⚙️ Configurações"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAba(id)}
            style={{background:aba===id?"#0f5233":"transparent",color:aba===id?"#fff":"#374151",border:`1px solid ${aba===id?"#0f5233":"#d1d5db"}`,padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:aba===id?700:400}}>
            {l}
          </button>
        ))}
      </div>

      {/* ABA: LISTA DE OS */}
      {aba==="os"&&(
        <div>
          {urgentes>0&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"9px 14px",marginBottom:12,color:"#991b1b",fontWeight:600,fontSize:13}}>
            🚨 {urgentes} OS(s) URGENTE(S) — gere o plano semanal para alocar equipes imediatamente
          </div>}

          {/* Filtros rápidos */}
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {(["todas","urgente","normal","pode_agendar","concluido"] as const).map(f=>(
              <button key={f} onClick={()=>{}}
                style={{background:"#f3f4f6",border:"none",borderRadius:20,padding:"4px 12px",cursor:"pointer",fontSize:11,color:"#374151"}}>
                {f==="todas"?"Todas":f==="urgente"?"🔴 Urgente":f==="normal"?"🔵 Normal":f==="pode_agendar"?"⚪ Flexível":"✅ Concluída"}
              </button>
            ))}
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {os.map(o=>{
              const [pbg,pco,pic]=PRIO_STYLE[o.prioridade];
              const [sbg,sco]=STATUS_STYLE[o.status];
              const dias = o.prazo ? Math.ceil((new Date(o.prazo).getTime()-Date.now())/86400000) : null;
              return(
                <div key={o.id} style={{background:"#fff",border:`1px solid ${o.prioridade==="urgente"?"#fca5a5":"#e5e7eb"}`,borderRadius:12,padding:16,borderLeft:`4px solid ${pco}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:14}}>{pic}</span>
                        <h3 style={{fontWeight:700,fontSize:14,color:"#0f5233",margin:0}}>{o.titulo}</h3>
                        <span style={{background:pbg,color:pco,padding:"1px 8px",borderRadius:10,fontSize:10,fontWeight:700}}>{o.prioridade.replace("_"," ").toUpperCase()}</span>
                        <span style={{background:sbg,color:sco,padding:"1px 8px",borderRadius:10,fontSize:10,fontWeight:700}}>{o.status.replace("_"," ")}</span>
                      </div>
                      <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11,color:"#6b7280"}}>
                        <span>🤝 {o.clienteNome}</span>
                        <span>📍 {o.endereco?o.endereco+", ":""}{o.municipio}/{o.uf}</span>
                        <span>🛠️ {o.tipoServico}</span>
                        {o.areaM2&&<span>📐 {o.areaM2.toLocaleString("pt-BR")} m²</span>}
                        {o.tempoEstimadoH&&<span>⏱️ {o.tempoEstimadoH}h</span>}
                        {o.funcionariosNecessarios&&<span>👷 {o.funcionariosNecessarios} pessoas</span>}
                      </div>
                      {o.observacoes&&<div style={{marginTop:6,fontSize:11,color:"#374151",background:"#f9fafb",borderRadius:6,padding:"4px 8px"}}>{o.observacoes}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
                      {o.prazo&&<span style={{fontSize:12,fontWeight:700,color:dias!==null&&dias<=3?"#dc2626":dias!==null&&dias<=7?"#d97706":"#6b7280"}}>
                        📅 {new Date(o.prazo).toLocaleDateString("pt-BR")} {dias!==null&&`(${dias>0?dias+"d":dias===0?"HOJE":"VENCEU"})`}
                      </span>}
                      {o.dataAgendada&&<span style={{fontSize:11,color:"#1d4ed8",fontWeight:600}}>🗓️ Agendado: {new Date(o.dataAgendada).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {(["pendente","agendado","em_execucao","concluido"] as Status[]).map(s=>(
                      <button key={s} onClick={()=>updateStatus(o.id,s)}
                        style={{background:o.status===s?"#0f5233":"#f3f4f6",color:o.status===s?"#fff":"#374151",border:"none",padding:"4px 10px",borderRadius:7,cursor:"pointer",fontSize:10,fontWeight:o.status===s?700:400}}>
                        {s==="pendente"?"Pendente":s==="agendado"?"Agendado":s==="em_execucao"?"Em Execução":"Concluído"}
                      </button>
                    ))}
                    <button onClick={()=>removeOs(o.id)} style={{background:"#fee2e2",color:"#991b1b",border:"none",padding:"4px 10px",borderRadius:7,cursor:"pointer",fontSize:10,marginLeft:"auto"}}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
          {os.length===0&&<div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>Nenhuma OS. Clique em "+ Nova OS" para adicionar.</div>}
        </div>
      )}

      {/* ABA: PLANO SEMANAL */}
      {aba==="plano"&&(
        <div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap"}}>
              <div>
                <label style={LS}>Semana (início)</label>
                <input type="date" style={{...IS,width:160}} value={semana} onChange={e=>setSemana(e.target.value)}/>
              </div>
              <div>
                <label style={LS}>Critério de otimização</label>
                <select style={{...IS,width:200}} value={criterio} onChange={e=>setCriterio(e.target.value)}>
                  <option value="balanceado">⚖️ Balanceado (padrão)</option>
                  <option value="urgencia">🔴 Prioridade urgência</option>
                  <option value="menor_deslocamento">📍 Menor deslocamento</option>
                  <option value="menor_custo">💰 Menor custo</option>
                </select>
              </div>
              <button onClick={gerarPlano} disabled={gerandoPlano||pendentes===0}
                style={{background:gerandoPlano?"#6b7280":"#7c3aed",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,opacity:pendentes===0?.5:1}}>
                {gerandoPlano?"⟳ Analisando "+pendentes+" OS com IA...":"🤖 Gerar Plano Semanal com IA"}
              </button>
            </div>
            {gerandoPlano&&<div style={{marginTop:10,background:"#f3e8ff",borderRadius:8,padding:"10px 14px",fontSize:12,color:"#6d28d9"}}>
              🤖 A IA está analisando {pendentes} OS, {funcs.length} funcionários, distâncias e prioridades para gerar o plano otimizado...
            </div>}
          </div>

          {plano&&(
            <div>
              {/* Resumo */}
              <div style={{background:"linear-gradient(135deg,#0f5233,#1a7a4a)",color:"#fff",borderRadius:12,padding:18,marginBottom:14}}>
                <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 8px"}}>📅 Plano: {plano.semana}</h3>
                <p style={{fontSize:13,opacity:.9,margin:"0 0 10px"}}>{plano.resumo}</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
                  {[["OS atendidas",plano.totais?.osAtendidas],["Km semana",plano.totais?.kmSemana+"km"],["Horas",plano.totais?.horasTotais+"h"],["Custo est.","R$"+Number(plano.totais?.custoEstimadoTotal||0).toLocaleString("pt-BR")],["Eficiência",plano.totais?.eficiencia]].map(([l,v])=>(
                    <div key={l as string} style={{background:"rgba(255,255,255,.15)",borderRadius:8,padding:"8px 10px"}}>
                      <div style={{fontSize:9,opacity:.75,textTransform:"uppercase",marginBottom:2}}>{l}</div>
                      <div style={{fontSize:16,fontWeight:700}}>{v||"—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alertas */}
              {plano.alertas?.length>0&&(
                <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
                  <h4 style={{color:"#991b1b",fontSize:13,marginBottom:8}}>🚨 Alertas</h4>
                  {plano.alertas.map((a:string,i:number)=><p key={i} style={{color:"#991b1b",fontSize:12,margin:"3px 0"}}>• {a}</p>)}
                </div>
              )}

              {/* Dias */}
              {plano.dias?.map((dia:any,di:number)=>(
                <div key={di} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,marginBottom:12,overflow:"hidden"}}>
                  <div style={{background:"#e8f5ee",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                    <h4 style={{color:"#0f5233",fontSize:14,fontWeight:700,margin:0}}>
                      {dia.diaSemana} — {dia.data?new Date(dia.data+"T12:00:00").toLocaleDateString("pt-BR"):""}
                    </h4>
                    <div style={{display:"flex",gap:10,fontSize:11,color:"#6b7280"}}>
                      <span>🚗 {dia.kmTotal||0}km</span>
                      <span>⏱️ {dia.horasEquipe||0}h/equipe</span>
                      {dia.observacoesDia&&<span style={{color:"#d97706"}}>⚠️ {dia.observacoesDia}</span>}
                    </div>
                  </div>
                  <div style={{padding:14}}>
                    {dia.os?.map((item:any,oi:number)=>(
                      <div key={oi} style={{display:"flex",gap:12,padding:"10px 12px",background:oi%2===0?"#f9fafb":"#fff",borderRadius:8,marginBottom:6,flexWrap:"wrap"}}>
                        <div style={{width:24,height:24,background:"#0f5233",color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{item.ordem}</div>
                        <div style={{flex:1,minWidth:200}}>
                          <div style={{fontWeight:600,fontSize:13,color:"#0f5233",marginBottom:3}}>
                            {os.find(o=>o.id===item.osId)?.titulo || item.osId}
                          </div>
                          <div style={{display:"flex",gap:10,fontSize:11,color:"#6b7280",flexWrap:"wrap"}}>
                            <span>🚗 Saída {item.horarioSaida} → Chegada {item.horarioChegada}</span>
                            <span>⚒️ Execução até {item.horarioConclusao}</span>
                            <span>🏠 Retorno {item.horarioRetorno}</span>
                          </div>
                          <div style={{display:"flex",gap:10,marginTop:4,fontSize:11,flexWrap:"wrap"}}>
                            <span style={{background:"#f3e8ff",color:"#6d28d9",padding:"1px 7px",borderRadius:6,fontWeight:600}}>🚙 {item.veiculo}</span>
                            <span style={{background:"#dbeafe",color:"#1e40af",padding:"1px 7px",borderRadius:6,fontWeight:600}}>👷 {item.equipe?.join(", ")}</span>
                            <span style={{background:"#f0fdf4",color:"#15803d",padding:"1px 7px",borderRadius:6,fontWeight:600}}>⏱️ {item.tempoExecucaoH}h · R${Number(item.custoEstimado||0).toLocaleString("pt-BR")}</span>
                          </div>
                          {item.observacoes&&<div style={{fontSize:11,color:"#6b7280",marginTop:4,fontStyle:"italic"}}>{item.observacoes}</div>}
                        </div>
                      </div>
                    ))}
                    {!dia.os?.length&&<p style={{color:"#9ca3af",fontSize:12}}>Sem OS alocadas neste dia</p>}
                  </div>
                </div>
              ))}

              {/* Recomendações */}
              {plano.recomendacoes?.length>0&&(
                <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
                  <h4 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:10}}>💡 Recomendações da IA</h4>
                  {plano.recomendacoes.map((r:string,i:number)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #f3f4f6",fontSize:12}}>
                      <span style={{color:"#1a7a4a",fontWeight:700,flexShrink:0}}>{i+1}.</span><span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!plano&&!gerandoPlano&&(
            <div style={{textAlign:"center",padding:"60px 20px",color:"#9ca3af"}}>
              <div style={{fontSize:48,marginBottom:12}}>🤖</div>
              <p style={{fontSize:15,fontWeight:600,color:"#374151",margin:"0 0 6px"}}>Pronto para gerar o plano semanal</p>
              <p style={{fontSize:13}}>{pendentes} OS pendentes · {funcs.length} funcionários disponíveis</p>
              <p style={{fontSize:12}}>Configure a semana e o critério acima e clique em "Gerar Plano"</p>
            </div>
          )}
        </div>
      )}

      {/* ABA: EQUIPE */}
      {aba==="equipe"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {funcs.map((f:any,i:number)=>(
              <div key={i} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:"12px 14px"}}>
                <div style={{width:36,height:36,background:"#0f5233",color:"#fff",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,marginBottom:8}}>
                  {f.name.charAt(0)}
                </div>
                <div style={{fontWeight:700,fontSize:13}}>{f.name}</div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{f.role}</div>
                <div style={{marginTop:8,display:"flex",gap:4,flexWrap:"wrap"}}>
                  <span style={{background:"#dcfce7",color:"#15803d",padding:"2px 7px",borderRadius:7,fontSize:10,fontWeight:700}}>● Disponível</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"9px 14px",marginTop:14,fontSize:11,color:"#92400e"}}>
            💡 A IA usa automaticamente todos os funcionários ativos ao gerar o plano semanal. Futuramente: marcar como "em férias" ou "afastado" para excluir da alocação.
          </div>
        </div>
      )}

      {/* ABA: CONFIGURAÇÕES */}
      {aba==="config"&&(
        <div>
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18,marginBottom:14}}>
            <h3 style={{color:"#0f5233",fontSize:14,marginBottom:12}}>⚙️ Parâmetros de Logística</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div><label style={LS}>Horário de saída da base</label><input type="time" style={IS} defaultValue="07:00"/></div>
              <div><label style={LS}>Horário máximo de retorno</label><input type="time" style={IS} defaultValue="17:00"/></div>
              <div><label style={LS}>Endereço da base (Betim/MG)</label><input style={IS} defaultValue="R. Primeiro de Janeiro, 415 — Betim/MG"/></div>
              <div><label style={LS}>Velocidade média urbana (km/h)</label><input type="number" style={IS} defaultValue="40"/></div>
              <div><label style={LS}>Velocidade média estrada (km/h)</label><input type="number" style={IS} defaultValue="70"/></div>
              <div><label style={LS}>Custo médio por km (R$)</label><input type="number" step="0.01" style={IS} defaultValue="1.80"/></div>
            </div>
          </div>
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"9px 13px",fontSize:11,color:"#1e40af"}}>
            🔌 <strong>Futuro:</strong> Integração com Google Maps API para cálculo exato de rotas e distâncias. Configure GOOGLE_MAPS_API_KEY nas variáveis de ambiente para ativar.
          </div>
        </div>
      )}
    </div>
  );
}
