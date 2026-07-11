"use client";
import { useEffect, useState } from "react";

export default function FinanceiroPage() {
  const [data, setData] = useState<any[]>([]);
  const [totais, setTotais] = useState({totalReceitas:0,totalDespesas:0,saldo:0});
  const [aging, setAging] = useState<any>({});
  const [totalVencido, setTotalVencido] = useState(0);
  const [totalGeral, setTotalGeral] = useState(0);
  const [demo, setDemo] = useState(false);
  const [aba, setAba] = useState<"lancamentos"|"aging"|"novo">("lancamentos");
  const [form, setForm] = useState({description:"",amount:"",dueDate:"",status:"em_aberto",categoryName:"Operacional",notes:""});

  const load = () => {
    fetch("/api/financeiro").then(r=>r.json()).then(d=>{setData(d.data||[]);setTotais({totalReceitas:d.totalReceitas||0,totalDespesas:d.totalDespesas||0,saldo:d.saldo||0});setDemo(!!d._demo);});
    fetch("/api/financeiro/aging").then(r=>r.json()).then(d=>{ setAging(d.aging||{}); setTotalVencido(d.totalVencido||0); setTotalGeral(d.totalGeral||0); });
  };
  useEffect(()=>{load();},[]);

  const salvar = async() => {
    await fetch("/api/financeiro",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,amount:Number(form.amount)})});
    setForm({description:"",amount:"",dueDate:"",status:"em_aberto",categoryName:"Operacional",notes:""});
    setAba("lancamentos"); load();
  };
  const fmt = (v:number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  const STATUS_C:any={pago:["#dcfce7","#15803d","✅ Pago"],recebido:["#dcfce7","#15803d","✅ Recebido"],em_aberto:["#fef9c3","#92400e","⏳ Em aberto"],vencido:["#fee2e2","#dc2626","🚨 Vencido"],previsto:["#dbeafe","#1e40af","📅 Previsto"],cancelado:["#f3f4f6","#6b7280","Cancelado"]};

  const AGING_BUCKETS = [
    { key:"corrente",  label:"A vencer",      cor:"#1d4ed8", bg:"#dbeafe" },
    { key:"ate30",     label:"1–30 dias",      cor:"#d97706", bg:"#fef9c3" },
    { key:"de31a60",   label:"31–60 dias",     cor:"#c2410c", bg:"#ffedd5" },
    { key:"de61a90",   label:"61–90 dias",     cor:"#dc2626", bg:"#fee2e2" },
    { key:"acima90",   label:"+90 dias",       cor:"#991b1b", bg:"#fee2e2" },
  ];

  return (
    <div>
      <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>
        💰 Financeiro {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8}}>Demo</span>}
      </h1>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10,marginBottom:16}}>
        {[
          ["Receitas","R$ "+fmt(totais.totalReceitas),"💚","#15803d"],
          ["Despesas","R$ "+fmt(totais.totalDespesas),"🔴","#dc2626"],
          ["Saldo","R$ "+fmt(totais.saldo),"💰",totais.saldo>=0?"#1a7a4a":"#dc2626"],
          ["A Receber","R$ "+fmt(totalGeral),"📋","#1d4ed8"],
          ["Vencido","R$ "+fmt(totalVencido),"🚨",totalVencido>0?"#dc2626":"#15803d"],
        ].map(([l,v,i,c])=>(
          <div key={l as string} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",borderTop:`3px solid ${c}`}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span>{i}</span></div>
            <div style={{fontSize:17,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Alerta vencimento */}
      {totalVencido > 0 && (
        <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"9px 14px",marginBottom:14,fontSize:12,color:"#991b1b",fontWeight:600}}>
          🚨 Há <strong>R$ {fmt(totalVencido)}</strong> vencidos a receber — acesse a aba "Aging" para detalhes e cobranças
        </div>
      )}

      {/* Abas */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[["lancamentos","📋 Lançamentos"],["aging","📊 Aging A Receber"],["novo","+ Novo Lançamento"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAba(id as any)}
            style={{background:aba===id?"#0f5233":"transparent",color:aba===id?"#fff":"#374151",border:`1px solid ${aba===id?"#0f5233":"#d1d5db"}`,padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:aba===id?700:400}}>{l}</button>
        ))}
      </div>

      {/* AGING */}
      {aba==="aging" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:16}}>
            {AGING_BUCKETS.map(b=>{
              const bucket = aging[b.key]||{qtd:0,valor:0};
              return(
                <div key={b.key} style={{background:b.bg,border:`1px solid ${b.cor}33`,borderRadius:10,padding:"12px 14px",borderTop:`3px solid ${b.cor}`}}>
                  <div style={{fontSize:10,color:b.cor,fontWeight:700,textTransform:"uppercase",marginBottom:4}}>{b.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:b.cor}}>R$ {fmt(bucket.valor)}</div>
                  <div style={{fontSize:11,color:b.cor,opacity:.8}}>{bucket.qtd} título(s)</div>
                </div>
              );
            })}
          </div>

          {/* Barra de aging visual */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:"#374151",marginBottom:8}}>Distribuição do portfólio a receber</div>
            <div style={{display:"flex",height:24,borderRadius:8,overflow:"hidden",gap:1}}>
              {AGING_BUCKETS.map(b=>{
                const bucket = aging[b.key]||{valor:0};
                const pct = totalGeral > 0 ? (bucket.valor/totalGeral*100) : 0;
                return pct > 0 ? (
                  <div key={b.key} style={{width:`${pct}%`,background:b.cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"#fff",fontWeight:700}} title={`${b.label}: ${pct.toFixed(0)}%`}>
                    {pct > 8 ? pct.toFixed(0)+"%" : ""}
                  </div>
                ) : null;
              })}
            </div>
            <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
              {AGING_BUCKETS.map(b=>{
                const bucket = aging[b.key]||{valor:0};
                const pct = totalGeral > 0 ? (bucket.valor/totalGeral*100).toFixed(0) : "0";
                return(
                  <div key={b.key} style={{display:"flex",alignItems:"center",gap:3,fontSize:9}}>
                    <div style={{width:8,height:8,background:b.cor,borderRadius:2}}/><span style={{color:"#6b7280"}}>{b.label}: {pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Itens vencidos detalhados */}
          {["ate30","de31a60","de61a90","acima90"].map(key=>{
            const bucket = aging[key]||{itens:[],valor:0};
            const b = AGING_BUCKETS.find(x=>x.key===key)!;
            if(!bucket.itens?.length) return null;
            return(
              <div key={key} style={{marginBottom:12}}>
                <h4 style={{color:b.cor,fontSize:12,fontWeight:700,marginBottom:8,display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{background:b.bg,padding:"2px 9px",borderRadius:8}}>⚠️ {b.label} — R$ {fmt(bucket.valor)}</span>
                </h4>
                {bucket.itens.map((item:any,i:number)=>(
                  <div key={i} style={{background:"#fff",border:`1px solid ${b.cor}44`,borderRadius:8,padding:"9px 12px",marginBottom:5,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#374151"}}>{item.description}</div>
                      <div style={{fontSize:10,color:"#6b7280"}}>
                        Vencimento: <strong style={{color:b.cor}}>{item.dueDate?new Date(item.dueDate).toLocaleDateString("pt-BR"):""}</strong>
                        {" · "}{Math.floor((new Date().getTime()-new Date(item.dueDate).getTime())/86400000)} dias em atraso
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:14,fontWeight:700,color:b.cor}}>R$ {fmt(Number(item.amount))}</div>
                      <a href="mailto:adm@verdelimp.com.br" style={{fontSize:9,color:"#1d4ed8",textDecoration:"none"}}>📧 Cobrar</a>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* LANÇAMENTOS */}
      {aba==="lancamentos" && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {data.map((e:any,i:number)=>{
            const [sbg,sco,stxt]=STATUS_C[e.status]||["#f3f4f6","#6b7280",e.status];
            const isReceita = e.category?.type==="receita"||e.description?.toLowerCase().includes("receita");
            return(
              <div key={e.id||i} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:12,color:"#374151"}}>{e.description}</div>
                  <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>
                    {e.category?.name||""} · Venc: {e.dueDate?new Date(e.dueDate).toLocaleDateString("pt-BR"):"—"} · {e.competence||""}
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{background:sbg,color:sco,padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{stxt}</span>
                  <span style={{fontWeight:700,fontSize:13,color:isReceita?"#15803d":"#dc2626"}}>{isReceita?"+":"-"} R$ {fmt(Number(e.amount))}</span>
                </div>
              </div>
            );
          })}
          {data.length===0&&<div style={{textAlign:"center",padding:30,color:"#9ca3af"}}>Nenhum lançamento encontrado</div>}
        </div>
      )}

      {/* NOVO LANÇAMENTO */}
      {aba==="novo" && (
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18}}>
          <h3 style={{color:"#0f5233",fontSize:14,fontWeight:700,marginBottom:14}}>+ Novo Lançamento</h3>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Descrição *</label><input style={IS} value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/></div>
            <div><label style={LS}>Valor (R$) *</label><input type="number" step="0.01" style={IS} value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            <div><label style={LS}>Vencimento *</label><input type="date" style={IS} value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))}/></div>
            <div><label style={LS}>Status</label>
              <select style={IS} value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                <option value="previsto">📅 Previsto</option><option value="em_aberto">⏳ Em aberto</option><option value="pago">✅ Pago</option><option value="recebido">✅ Recebido</option><option value="vencido">🚨 Vencido</option>
              </select>
            </div>
            <div><label style={LS}>Categoria</label><input style={IS} value={form.categoryName} onChange={e=>setForm(p=>({...p,categoryName:e.target.value}))}/></div>
          </div>
          <div style={{marginBottom:14}}><label style={LS}>Observações</label><textarea style={{...IS,height:50}} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></div>
          <button onClick={salvar} disabled={!form.description||!form.amount||!form.dueDate} style={{background:"#0f5233",color:"#fff",border:"none",padding:"10px 28px",borderRadius:8,cursor:"pointer",fontWeight:700}}>💾 Salvar Lançamento</button>
        </div>
      )}
    </div>
  );
}
