
"use client";
import { useState } from "react";

interface ItemOrca {
  id: string; descricao: string; unidade: string; quantidade: number;
  custoMO: number; encargos: number; custoMat: number; custoEq: number; terceiros: number;
}

const SERVICOS_DEFAULT: ItemOrca[] = [
  { id:"1", descricao:"Roçada manual c/ roçadeira costal", unidade:"m²", quantidade:10000, custoMO:0.25, encargos:0.70, custoMat:0.02, custoEq:0.08, terceiros:0 },
  { id:"2", descricao:"Capina química seletiva c/ tordon", unidade:"m²", quantidade:5000, custoMO:0.10, encargos:0.70, custoMat:0.55, custoEq:0.02, terceiros:0 },
  { id:"3", descricao:"Hidrossemeadura c/ mix de sementes", unidade:"m²", quantidade:3000, custoMO:0.40, encargos:0.70, custoMat:1.20, custoEq:0.80, terceiros:0 },
];

const BDI_DEFAULT = { ac:8, s:0.5, r:1.5, g:1, df:1.5, l:8, i:6.72 };

export default function PrecificacaoBdiPage() {
  const [itens, setItens] = useState<ItemOrca[]>(SERVICOS_DEFAULT);
  const [bdi, setBdi] = useState(BDI_DEFAULT);
  const [resultado, setResultado] = useState<any>(null);
  const [calculando, setCalculando] = useState(false);
  const [erro, setErro] = useState("");

  const fmt = (v: number) => v?.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt4 = (v: number) => v?.toLocaleString("pt-BR",{minimumFractionDigits:4,maximumFractionDigits:4});
  const IS: any = {padding:"5px 7px",border:"1px solid #d1d5db",borderRadius:6,fontSize:11,width:"100%"};

  const calcular = async () => {
    setCalculando(true); setErro("");
    try {
      const r = await fetch("/api/precificacao-bdi",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ itens, bdi })
      });
      const d = await r.json();
      if(!d.success) throw new Error(d.error||"Erro");
      setResultado(d);
    } catch(e:any){ setErro(e.message); }
    setCalculando(false);
  };

  const addItem = () => setItens(p=>[...p,{ id:String(Date.now()), descricao:"Novo serviço", unidade:"m²", quantidade:1000, custoMO:0.20, encargos:0.70, custoMat:0.10, custoEq:0.05, terceiros:0 }]);
  const removeItem = (id:string) => setItens(p=>p.filter(i=>i.id!==id));
  const updateItem = (id:string, field:string, value:any) => setItens(p=>p.map(i=>i.id===id?{...i,[field]:value}:i));
  const updateBdi = (field:string, value:number) => setBdi(p=>({...p,[field]:value}));

  return (
    <div>
      <div style={{marginBottom:16}}>
        <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:0}}>🧮 Precificação com BDI — Licitações Públicas</h1>
        <p style={{color:"#6b7280",fontSize:12,margin:"4px 0 0"}}>
          Composição de preço unitário conforme TCU Acórdão 2369/2011 — BDI + custos diretos
        </p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:14,marginBottom:14}}>
        {/* BDI */}
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
          <h3 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:12}}>
            📊 Composição do BDI
            {resultado&&<span style={{background:"#dcfce7",color:"#15803d",padding:"1px 8px",borderRadius:8,fontSize:11,fontWeight:700,marginLeft:8}}>BDI = {resultado.bdi.bdiFinal}%</span>}
          </h3>
          <div style={{fontSize:10,color:"#6b7280",marginBottom:10}}>Fórmula TCU: [(1+AC+S+R+G+DF) × (1+L)] / (1-I) - 1</div>
          {[
            ["ac","Administração Central (AC)","Overhead da empresa","8"],
            ["s","Seguro + Garantia (S+G)","Apólices e performance bond","0.5"],
            ["r","Riscos e Imprevistos (R)","Campo, clima, operacional","1.5"],
            ["g","Garantia de Execução (G)","5% contrato / vigência","1"],
            ["df","Despesas Financeiras (DF)","Capital de giro 30-45 dias","1.5"],
            ["l","Lucro (L)","Margem sobre o CD","8"],
            ["i","Impostos (I)","Simples Nacional 6,72%","6.72"],
          ].map(([k,label,hint,def])=>(
            <div key={k} style={{marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                <label style={{fontSize:11,fontWeight:700,color:"#374151"}}>{label}</label>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input type="number" step="0.01" min="0" max="100" value={(bdi as any)[k]}
                    onChange={e=>updateBdi(k,Number(e.target.value))}
                    style={{...IS,width:64,textAlign:"right"}}/>
                  <span style={{fontSize:11,color:"#6b7280"}}>%</span>
                </div>
              </div>
              <div style={{fontSize:9,color:"#9ca3af"}}>{hint}</div>
            </div>
          ))}
          {resultado&&(
            <div style={{background:"#e8f5ee",borderRadius:8,padding:"8px 10px",marginTop:10}}>
              <div style={{fontSize:10,color:"#6b7280",marginBottom:3}}>Fórmula aplicada:</div>
              <div style={{fontSize:11,fontWeight:700,color:"#0f5233"}}>{resultado.bdi.formula}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#0f5233",marginTop:4}}>BDI = {resultado.bdi.bdiFinal}%</div>
            </div>
          )}
        </div>

        {/* Itens de serviço */}
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <h3 style={{color:"#0f5233",fontSize:13,fontWeight:700,margin:0}}>📋 Composição de Preço Unitário por Item</h3>
            <button onClick={addItem} style={{background:"#e8f5ee",color:"#0f5233",border:"none",padding:"5px 12px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>+ Item</button>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#f9fafb"}}>
                  <th style={{padding:"6px 8px",textAlign:"left",color:"#6b7280",fontSize:10,fontWeight:700}}>Descrição do Serviço</th>
                  <th style={{padding:"6px 4px",textAlign:"center",color:"#6b7280",fontSize:10}}>Un</th>
                  <th style={{padding:"6px 4px",textAlign:"right",color:"#6b7280",fontSize:10}}>Quant.</th>
                  <th style={{padding:"6px 4px",textAlign:"right",color:"#7c3aed",fontSize:10}}>MO</th>
                  <th style={{padding:"6px 4px",textAlign:"right",color:"#dc2626",fontSize:10}}>Material</th>
                  <th style={{padding:"6px 4px",textAlign:"right",color:"#1e40af",fontSize:10}}>Equip.</th>
                  {resultado&&<th style={{padding:"6px 4px",textAlign:"right",color:"#0f5233",fontSize:10,fontWeight:700}}>P.Unit.(R$)</th>}
                  {resultado&&<th style={{padding:"6px 4px",textAlign:"right",color:"#0f5233",fontSize:10,fontWeight:700}}>Total (R$)</th>}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item,idx)=>{
                  const res = resultado?.itens?.find((i:any)=>i.id===item.id);
                  return(
                    <tr key={item.id} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td style={{padding:"5px 4px"}}><input style={IS} value={item.descricao} onChange={e=>updateItem(item.id,"descricao",e.target.value)}/></td>
                      <td style={{padding:"5px 4px"}}><input style={{...IS,width:40,textAlign:"center"}} value={item.unidade} onChange={e=>updateItem(item.id,"unidade",e.target.value)}/></td>
                      <td style={{padding:"5px 4px"}}><input type="number" style={{...IS,width:72,textAlign:"right"}} value={item.quantidade} onChange={e=>updateItem(item.id,"quantidade",Number(e.target.value))}/></td>
                      <td style={{padding:"5px 4px"}}><input type="number" step="0.01" style={{...IS,width:64,textAlign:"right"}} value={item.custoMO} onChange={e=>updateItem(item.id,"custoMO",Number(e.target.value))} title="Custo mão de obra por unidade (R$)"/></td>
                      <td style={{padding:"5px 4px"}}><input type="number" step="0.01" style={{...IS,width:64,textAlign:"right"}} value={item.custoMat} onChange={e=>updateItem(item.id,"custoMat",Number(e.target.value))}/></td>
                      <td style={{padding:"5px 4px"}}><input type="number" step="0.01" style={{...IS,width:64,textAlign:"right"}} value={item.custoEq} onChange={e=>updateItem(item.id,"custoEq",Number(e.target.value))}/></td>
                      {resultado&&<td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:"#0f5233"}}>{res?fmt(res.precoUnitario):"—"}</td>}
                      {resultado&&<td style={{padding:"5px 8px",textAlign:"right",fontWeight:700,color:"#0f5233"}}>{res?fmt(res.totalItem):"—"}</td>}
                      <td><button onClick={()=>removeItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#dc2626",fontSize:13}}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:9,color:"#9ca3af",marginTop:6}}>MO = Mão de obra (R$/un) · Encargos fixos 70% s/MO · Material, Equipamento (R$/un)</div>
        </div>
      </div>

      {erro&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"9px 14px",marginBottom:14,color:"#991b1b"}}>{erro}</div>}

      <button onClick={calcular} disabled={calculando}
        style={{background:calculando?"#6b7280":"#0f5233",color:"#fff",border:"none",padding:"12px 32px",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,marginBottom:14,display:"block"}}>
        {calculando?"⟳ Calculando...":"🧮 Calcular BDI e Preço Unitário"}
      </button>

      {/* Resultado */}
      {resultado&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:14}}>
            {[
              ["Custo direto total","R$"+fmt(resultado.totais.custoDirectoTotal),"#1d4ed8"],
              ["BDI total","R$"+fmt(resultado.totais.bdiValorTotal),"#d97706"],
              ["VALOR GLOBAL","R$"+fmt(resultado.totais.totalGeral),"#0f5233"],
              ["Margem real","R$"+fmt(resultado.totais.margemReal)+" ("+resultado.totais.margemPct+"%)","#15803d"],
            ].map(([l,v,c])=>(
              <div key={l as string} style={{background:"#fff",border:`2px solid ${c}`,borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</div>
                <div style={{fontSize:l==="VALOR GLOBAL"?18:15,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Planilha detalhada */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,overflowX:"auto"}}>
            <h4 style={{color:"#0f5233",fontSize:13,fontWeight:700,marginBottom:10}}>📋 Planilha Orçamentária — SINAPI/TCU</h4>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"#e8f5ee"}}>
                  <th style={{padding:"7px 10px",textAlign:"left",color:"#0f5233",fontSize:10,fontWeight:700}}>Descrição</th>
                  <th style={{padding:"7px 6px",textAlign:"center",color:"#0f5233",fontSize:10}}>Un</th>
                  <th style={{padding:"7px 6px",textAlign:"right",color:"#0f5233",fontSize:10}}>Quant.</th>
                  <th style={{padding:"7px 6px",textAlign:"right",color:"#1d4ed8",fontSize:10}}>Custo Dir. (R$)</th>
                  <th style={{padding:"7px 6px",textAlign:"right",color:"#d97706",fontSize:10}}>BDI ({resultado.bdi.bdiFinal}%)</th>
                  <th style={{padding:"7px 6px",textAlign:"right",color:"#0f5233",fontSize:10,fontWeight:700}}>P.Unit. (R$)</th>
                  <th style={{padding:"7px 10px",textAlign:"right",color:"#0f5233",fontSize:10,fontWeight:700}}>Total (R$)</th>
                </tr>
              </thead>
              <tbody>
                {resultado.itens.map((i:any,idx:number)=>(
                  <tr key={idx} style={{borderBottom:"1px solid #f3f4f6"}}>
                    <td style={{padding:"6px 10px",fontWeight:600}}>{i.descricao}</td>
                    <td style={{padding:"6px 6px",textAlign:"center",color:"#6b7280"}}>{i.unidade}</td>
                    <td style={{padding:"6px 6px",textAlign:"right"}}>{Number(i.quantidade).toLocaleString("pt-BR")}</td>
                    <td style={{padding:"6px 6px",textAlign:"right",color:"#1d4ed8"}}>{fmt(i.custoDirecto)}</td>
                    <td style={{padding:"6px 6px",textAlign:"right",color:"#d97706"}}>{fmt(i.valorBdi)}</td>
                    <td style={{padding:"6px 6px",textAlign:"right",fontWeight:700,color:"#0f5233"}}>{fmt(i.precoUnitario)}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontWeight:700,color:"#0f5233"}}>{fmt(i.totalItem)}</td>
                  </tr>
                ))}
                <tr style={{background:"#e8f5ee",fontWeight:700}}>
                  <td colSpan={5} style={{padding:"8px 10px",color:"#0f5233",textAlign:"right"}}>VALOR GLOBAL TOTAL DA PROPOSTA (R$)</td>
                  <td colSpan={2} style={{padding:"8px 10px",textAlign:"right",color:"#0f5233",fontSize:15}}>{fmt(resultado.totais.totalGeral)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
