"use client";
import { useState, useEffect } from "react";

// ── Aba 1: Calculadora rápida com IA ─────────────────────────────
function AbaCalculadora() {
  const [form,setForm]=useState({servico:"Roçada Manual",area:"10000",unit:"m²",dias:"10",workers:"3",custoMO:"1.20",custoMat:"0.15",custoEquip:"0.25",encargos:"70",admin:"10",risco:"5",impostos:"8",margem:"30"});
  const [analiseIA,setAnaliseIA]=useState("");const [loadingIA,setLoadingIA]=useState(false);
  const c={mo:Number(form.custoMO),mat:Number(form.custoMat),eq:Number(form.custoEquip)};
  const custo=c.mo+c.mat+c.eq;const enc=custo*(Number(form.encargos)/100);
  const adm=(custo+enc)*(Number(form.admin)/100);const ris=(custo+enc)*(Number(form.risco)/100);
  const imp=(custo+enc+adm+ris)*(Number(form.impostos)/100);const mar=(custo+enc+adm+ris)*(Number(form.margem)/100);
  const unit=custo+enc+adm+ris+imp+mar;const total=unit*Number(form.area);
  const bdi=(custo>0?((unit/custo-1)*100):0).toFixed(1);
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  const analisar=async()=>{
    setLoadingIA("...");
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:700,system:"Especialista em precificação de serviços ambientais e paisagismo para licitações públicas em MG. Analise o preço e dê feedback objetivo. Seja prático e direto.",messages:[{role:"user",content:`Serviço: ${form.servico} em ${form.area} ${form.unit}\nCusto unit.: MO R$${fmt(c.mo)} + Mat R$${fmt(c.mat)} + Equip R$${fmt(c.eq)} = R$${fmt(custo)}/${form.unit}\nPreço calculado: R$${fmt(unit)}/${form.unit} (BDI ${bdi}%)\nTotal: R$${fmt(total)}\nParâmetros: Encargos ${form.encargos}% | Admin ${form.admin}% | Risco ${form.risco}% | Impostos ${form.impostos}% | Margem ${form.margem}%\nAnalise: competitividade em MG, adequação do BDI, risco de perder para preço, sugestão de ajuste.`}]})});
      const d=await r.json();setAnaliseIA(d.content?.[0]?.text||"Erro");
    }catch{setAnaliseIA("Erro de conexão com IA");}
    setLoadingIA("");
  };
  return(
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
        <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>📋 Parâmetros do serviço</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div style={{gridColumn:"1/-1"}}><label style={LS}>Tipo de serviço</label>
            <select style={IS} value={form.servico} onChange={e=>setForm(p=>({...p,servico:e.target.value}))}>
              {["Roçada Manual","Roçada Mecanizada","Jardinagem Mensal","PRADA/PTRF","Limpeza","Podação","Hidrossemeadura","Controle de Formigas","Desinsetização","Desratização","Descupinização","Serviço de Retro","Outro"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          {[["area","Área/Quantidade"],["unit","Unidade"],["dias","Dias exec."],["workers","Funcionários"]].map(([k,l])=>(
            <div key={k}><label style={LS}>{l}</label><input style={IS} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>
          ))}
        </div>
        <h4 style={{fontSize:11,color:"#6b7280",fontWeight:700,textTransform:"uppercase",margin:"10px 0 8px"}}>Custos Unitários (R$/unidade)</h4>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[["custoMO","MO Direta"],["custoMat","Materiais"],["custoEquip","Equipamentos"]].map(([k,l])=>(
            <div key={k}><label style={LS}>{l}</label><input type="number" step="0.01" style={IS} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>
          ))}
        </div>
        <h4 style={{fontSize:11,color:"#6b7280",fontWeight:700,textTransform:"uppercase",margin:"10px 0 8px"}}>Parâmetros de composição (%)</h4>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6}}>
          {[["encargos","Encargos"],["admin","Admin"],["risco","Risco"],["impostos","Impostos"],["margem","Margem"]].map(([k,l])=>(
            <div key={k}><label style={LS}>{l}</label><input type="number" step="0.5" style={IS} value={(form as any)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))}/></div>
          ))}
        </div>
      </div>
      <div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:10}}>
          <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>📊 Resultado</h3>
          {[[`Custo direto (${form.unit})`,fmt(custo),"#374151"],[`Encargos (${form.encargos}%)`,fmt(enc),"#6b7280"],[`Admin (${form.admin}%)`,fmt(adm),"#6b7280"],[`Risco (${form.risco}%)`,fmt(ris),"#6b7280"],[`Impostos (${form.impostos}%)`,fmt(imp),"#dc2626"],[`Margem (${form.margem}%)`,fmt(mar),"#15803d"]].map(([l,v,c])=>(
            <div key={l as string} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f3f4f6",fontSize:11}}>
              <span style={{color:c as string}}>{l}</span><span style={{fontWeight:600,color:c as string}}>R$ {v}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 4px",fontSize:14,fontWeight:700,color:"#0f5233"}}>
            <span>Preço unitário (R$/{form.unit})</span><span>R$ {fmt(unit)}</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#6b7280"}}>
            <span>BDI implícito</span><span style={{fontWeight:700}}>{bdi}%</span>
          </div>
          <div style={{background:"#e8f5ee",borderRadius:8,padding:"10px 12px",marginTop:10}}>
            <div style={{fontSize:11,color:"#6b7280"}}>Valor total da proposta ({Number(form.area).toLocaleString("pt-BR")} {form.unit})</div>
            <div style={{fontSize:22,fontWeight:700,color:"#0f5233"}}>R$ {fmt(total)}</div>
          </div>
        </div>
        <button onClick={analisar} disabled={!!loadingIA} style={{width:"100%",background:loadingIA?"#6b7280":"#7c3aed",color:"#fff",border:"none",padding:"11px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13}}>
          {loadingIA?"⟳ IA analisando...":"🤖 Analisar competitividade com IA"}
        </button>
        {analiseIA&&<div style={{background:"#f3e8ff",border:"1px solid #c4b5fd",borderRadius:10,padding:12,marginTop:10,fontSize:12,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{analiseIA}</div>}
      </div>
    </div>
  );
}

// ── Aba 2: Tabela de referência de mercado ─────────────────────────
function AbaTabelaReferencia() {
  const [data,setData]=useState<any[]>([]);const [editando,setEditando]=useState<any>(null);
  const load=()=>fetch("/api/precificacao-regras").then(r=>r.json()).then(d=>setData(d.data||[]));
  useEffect(()=>{load();},[]);
  const salvar=async()=>{if(!editando)return;await fetch("/api/precificacao-regras",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(editando)});setEditando(null);load();};
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={padding:"5px 7px",border:"1px solid #d1d5db",borderRadius:6,fontSize:11,width:"100%"};
  return(
    <div>
      <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 13px",marginBottom:14,fontSize:11,color:"#92400e"}}>⚠️ Valores de referência de mercado MG — ajuste conforme contratos reais da Verdelimp.</div>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr style={{background:"#e8f5ee"}}>{["Serviço","Un","Custo/Un","Margem","Mín Mercado","Máx Mercado","Referência","Ação"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:h==="Serviço"?"left":"right",fontSize:11,fontWeight:700,color:"#0f5233"}}>{h}</th>)}</tr></thead>
          <tbody>{data.map((r:any,i:number)=>(
            <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
              <td style={{padding:"8px 12px",fontWeight:600,fontSize:12}}>{r.serviceType}</td>
              <td style={{padding:"8px 12px",textAlign:"right",fontSize:11,color:"#6b7280"}}>{r.unit}</td>
              {editando?.id===r.id?<>
                <td style={{padding:"4px 8px"}}><input type="number" step="0.01" value={editando.costPerM2} onChange={e=>setEditando((p:any)=>({...p,costPerM2:Number(e.target.value)}))} style={IS}/></td>
                <td style={{padding:"4px 8px"}}><input type="number" step="1" value={editando.profitMargin} onChange={e=>setEditando((p:any)=>({...p,profitMargin:Number(e.target.value)}))} style={IS}/></td>
                <td style={{padding:"4px 8px"}}><input type="number" step="0.01" value={editando.minPrice||0} onChange={e=>setEditando((p:any)=>({...p,minPrice:Number(e.target.value)}))} style={IS}/></td>
                <td style={{padding:"4px 8px"}}><input type="number" step="0.01" value={editando.maxPrice||0} onChange={e=>setEditando((p:any)=>({...p,maxPrice:Number(e.target.value)}))} style={IS}/></td>
                <td style={{padding:"4px 8px"}}><input value={editando.marketReference||""} onChange={e=>setEditando((p:any)=>({...p,marketReference:e.target.value}))} style={IS}/></td>
                <td style={{padding:"4px 8px"}}><button onClick={salvar} style={{background:"#0f5233",color:"#fff",border:"none",padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>✓</button>{" "}<button onClick={()=>setEditando(null)} style={{background:"#f3f4f6",border:"none",padding:"4px 8px",borderRadius:6,cursor:"pointer",fontSize:11}}>✕</button></td>
              </>:<>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#1a7a4a"}}>R${fmt(r.costPerM2)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontWeight:700,color:"#7c3aed"}}>{r.profitMargin}%</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#6b7280",fontSize:11}}>R${fmt(r.minPrice||0)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",color:"#6b7280",fontSize:11}}>R${fmt(r.maxPrice||0)}</td>
                <td style={{padding:"8px 12px",textAlign:"right",fontSize:11,color:"#374151"}}>{r.marketReference||"—"}</td>
                <td style={{padding:"8px 12px",textAlign:"right"}}><button onClick={()=>setEditando({...r})} style={{background:"#f3f4f6",border:"none",padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:11}}>✏️</button></td>
              </>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── Aba 3: BDI TCU ────────────────────────────────────────────────
function AbaBDI() {
  const [itens,setItens]=useState([
    {id:"1",descricao:"Roçada manual c/ roçadeira costal",unidade:"m²",quantidade:10000,custoMO:0.25,encargos:0.70,custoMat:0.02,custoEq:0.08,terceiros:0},
    {id:"2",descricao:"Capina química seletiva c/ tordon",unidade:"m²",quantidade:5000,custoMO:0.10,encargos:0.70,custoMat:0.55,custoEq:0.02,terceiros:0},
    {id:"3",descricao:"Hidrossemeadura c/ mix de sementes",unidade:"m²",quantidade:3000,custoMO:0.40,encargos:0.70,custoMat:1.20,custoEq:0.80,terceiros:0},
  ]);
  const [bdi,setBdi]=useState({ac:8,s:0.5,r:1.5,g:1,df:1.5,l:8,i:6.72});
  const [resultado,setResultado]=useState<any>(null);const [calculando,setCalculando]=useState(false);
  const fmt=(v:number)=>v.toLocaleString("pt-BR",{minimumFractionDigits:2});
  const IS:any={padding:"5px 7px",border:"1px solid #d1d5db",borderRadius:6,fontSize:11,width:"100%"};
  const calcular=async()=>{
    setCalculando(true);
    const r=await fetch("/api/precificacao-bdi",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({itens,bdi})});
    const d=await r.json();if(d.success)setResultado(d);
    setCalculando(false);
  };
  const addItem=()=>setItens(p=>[...p,{id:String(Date.now()),descricao:"Novo serviço",unidade:"m²",quantidade:1000,custoMO:0.20,encargos:0.70,custoMat:0.10,custoEq:0.05,terceiros:0}]);
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14,marginBottom:14}}>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:14}}>
          <h4 style={{color:"#0f5233",fontSize:12,fontWeight:700,marginBottom:10}}>BDI — Fórmula TCU Acórdão 2369/2011</h4>
          <div style={{fontSize:9,color:"#6b7280",marginBottom:10}}>[(1+AC+S+R+G+DF)×(1+L)] / (1-I) - 1</div>
          {[["ac","Adm. Central (AC)","8"],["s","Seguro (S)","0.5"],["r","Riscos (R)","1.5"],["g","Garantia (G)","1"],["df","Desp. Financeiras","1.5"],["l","Lucro (L)","8"],["i","Impostos (I)","6.72"]].map(([k,l])=>(
            <div key={k} style={{marginBottom:7}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                <label style={{fontSize:10,fontWeight:600,color:"#374151"}}>{l}</label>
                <div style={{display:"flex",alignItems:"center",gap:3}}>
                  <input type="number" step="0.01" value={(bdi as any)[k]} onChange={e=>setBdi(p=>({...p,[k as any]:Number(e.target.value)}))} style={{...IS,width:58,textAlign:"right"}}/>
                  <span style={{fontSize:10,color:"#6b7280"}}>%</span>
                </div>
              </div>
            </div>
          ))}
          {resultado&&<div style={{background:"#e8f5ee",borderRadius:8,padding:"8px 10px",marginTop:10,textAlign:"center"}}>
            <div style={{fontSize:10,color:"#6b7280"}}>BDI calculado</div>
            <div style={{fontSize:20,fontWeight:700,color:"#0f5233"}}>{resultado.bdi.bdiFinal}%</div>
          </div>}
        </div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <h4 style={{color:"#0f5233",fontSize:12,fontWeight:700,margin:0}}>Planilha de composição</h4>
            <button onClick={addItem} style={{background:"#e8f5ee",color:"#0f5233",border:"none",padding:"4px 10px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:700}}>+ Item</button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
              <thead><tr style={{background:"#f9fafb"}}>{["Descrição","Un","Qtd","MO","Mat","Equip",resultado?"P.Unit":"",""].map(h=><th key={h} style={{padding:"5px 6px",textAlign:"left",color:"#6b7280"}}>{h}</th>)}</tr></thead>
              <tbody>{itens.map((item,idx)=>{
                const res=resultado?.itens?.find((i:any)=>i.id===item.id);
                return(<tr key={item.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                  <td><input style={IS} value={item.descricao} onChange={e=>setItens(p=>p.map(i=>i.id===item.id?{...i,descricao:e.target.value}:i))}/></td>
                  <td><input style={{...IS,width:36}} value={item.unidade} onChange={e=>setItens(p=>p.map(i=>i.id===item.id?{...i,unidade:e.target.value}:i))}/></td>
                  <td><input type="number" style={{...IS,width:64}} value={item.quantidade} onChange={e=>setItens(p=>p.map(i=>i.id===item.id?{...i,quantidade:Number(e.target.value)}:i))}/></td>
                  <td><input type="number" step="0.01" style={{...IS,width:56}} value={item.custoMO} onChange={e=>setItens(p=>p.map(i=>i.id===item.id?{...i,custoMO:Number(e.target.value)}:i))}/></td>
                  <td><input type="number" step="0.01" style={{...IS,width:56}} value={item.custoMat} onChange={e=>setItens(p=>p.map(i=>i.id===item.id?{...i,custoMat:Number(e.target.value)}:i))}/></td>
                  <td><input type="number" step="0.01" style={{...IS,width:56}} value={item.custoEq} onChange={e=>setItens(p=>p.map(i=>i.id===item.id?{...i,custoEq:Number(e.target.value)}:i))}/></td>
                  {resultado&&<td style={{fontWeight:700,color:"#0f5233",padding:"0 6px",fontSize:11}}>{res?fmt(res.precoUnitario):"—"}</td>}
                  <td><button onClick={()=>setItens(p=>p.filter(i=>i.id!==item.id))} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:12}}>✕</button></td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        </div>
      </div>
      <button onClick={calcular} disabled={calculando} style={{background:calculando?"#6b7280":"#0f5233",color:"#fff",border:"none",padding:"11px 32px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:13,marginBottom:14}}>
        {calculando?"⟳ Calculando...":"🧮 Calcular BDI e Preço Unitário"}
      </button>
      {resultado&&(
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:14,overflowX:"auto"}}>
          <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
            {[["Custo direto",resultado.totais.custoDirectoTotal,"#1d4ed8"],["BDI total",resultado.totais.bdiValorTotal,"#d97706"],["VALOR GLOBAL",resultado.totais.totalGeral,"#0f5233"],["Margem real",`R$ ${fmt(resultado.totais.margemReal)} (${resultado.totais.margemPct}%)`, "#15803d"]].map(([l,v,c])=>(
              <div key={l as string} style={{background:"#f9fafb",borderRadius:8,padding:"8px 12px",borderLeft:`3px solid ${c}`}}>
                <div style={{fontSize:9,color:"#6b7280",textTransform:"uppercase"}}>{l}</div>
                <div style={{fontSize:l==="VALOR GLOBAL"?16:13,fontWeight:700,color:c as string,marginTop:2}}>R$ {typeof v==="number"?fmt(v):v}</div>
              </div>
            ))}
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#e8f5ee"}}>{["Descrição","Un","Qtd","Custo Dir.","BDI","P.Unit (R$)","Total (R$)"].map(h=><th key={h} style={{padding:"6px 8px",textAlign:h==="Descrição"?"left":"right",color:"#0f5233",fontSize:10,fontWeight:700}}>{h}</th>)}</tr></thead>
            <tbody>{resultado.itens.map((i:any,idx:number)=>(
              <tr key={idx} style={{borderBottom:"1px solid #f3f4f6"}}>
                <td style={{padding:"6px 8px",fontWeight:600}}>{i.descricao}</td>
                <td style={{padding:"6px 8px",textAlign:"right",color:"#6b7280"}}>{i.unidade}</td>
                <td style={{padding:"6px 8px",textAlign:"right"}}>{Number(i.quantidade).toLocaleString("pt-BR")}</td>
                <td style={{padding:"6px 8px",textAlign:"right",color:"#1d4ed8"}}>{fmt(i.custoDirecto)}</td>
                <td style={{padding:"6px 8px",textAlign:"right",color:"#d97706"}}>{fmt(i.valorBdi)}</td>
                <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:"#0f5233"}}>{fmt(i.precoUnitario)}</td>
                <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:"#0f5233"}}>{fmt(i.totalItem)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Página Central ─────────────────────────────────────────────────
export default function PrecificacaoCentralPage() {
  const [aba,setAba]=useState<"calc"|"tabela"|"bdi">("calc");
  return(
    <div>
      <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:"0 0 4px"}}>🧮 Precificação</h1>
      <p style={{color:"#6b7280",fontSize:12,margin:"0 0 14px"}}>Calculadora com IA · Tabela de referência de mercado · BDI para licitações públicas (TCU)</p>
      <div style={{display:"flex",gap:8,marginBottom:16,borderBottom:"2px solid #e5e7eb",paddingBottom:8}}>
        {[["calc","⚡ Calculadora + IA"],["tabela","📋 Tabela de Referência"],["bdi","🏛️ BDI / TCU (licitações)"]].map(([id,l])=>(
          <button key={id} onClick={()=>setAba(id as any)}
            style={{background:aba===id?"#0f5233":"transparent",color:aba===id?"#fff":"#6b7280",border:`1px solid ${aba===id?"#0f5233":"transparent"}`,padding:"8px 16px",borderRadius:8,cursor:"pointer",fontWeight:aba===id?700:500,fontSize:13}}>
            {l}
          </button>
        ))}
      </div>
      {aba==="calc"&&<AbaCalculadora/>}
      {aba==="tabela"&&<AbaTabelaReferencia/>}
      {aba==="bdi"&&<AbaBDI/>}
    </div>
  );
}
