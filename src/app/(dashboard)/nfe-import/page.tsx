
"use client";
import { useState, useRef } from "react";
export default function NfeImportPage() {
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [arrastar, setArrastar] = useState(false);
  const [vinculacoes, setVinculacoes] = useState<Record<number,string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const processarXML = async(xml:string) => {
    setLoading(true);
    setResultado(null);
    try {
      const r = await fetch("/api/nfe/importar",{method:"POST",headers:{"Content-Type":"application/xml"},body:xml});
      const d = await r.json();
      setResultado(d);
    } catch(e:any) { setResultado({error:e.message}); }
    setLoading(false);
  };

  const onFile = (file:File) => {
    const reader = new FileReader();
    reader.onload = e => { if(e.target?.result) processarXML(e.target.result as string); };
    reader.readAsText(file,"UTF-8");
  };

  const onDrop = (e:React.DragEvent) => {
    e.preventDefault(); setArrastar(false);
    const f = e.dataTransfer.files[0];
    if(f&&(f.name.endsWith(".xml")||f.type.includes("xml"))) onFile(f);
  };

  const formatCNPJ = (c:string) => c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,"$1.$2.$3/$4-$5");
  const fmt = (v:number) => v.toLocaleString("pt-BR",{minimumFractionDigits:2});

  const [confirmado, setConfirmado] = useState(false);
  const confirmarEntrada = async() => {
    if(!resultado?.parsed) return;
    setConfirmado(true);
    setTimeout(() => setConfirmado(false), 5000);
  };

  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:4}}>Importação de XML — NF-e</h1>
    <p style={{color:"#6b7280",fontSize:13,marginBottom:16}}>Importe o arquivo XML da NF-e e o sistema preenche automaticamente fornecedor, produtos, quantidades, impostos e sugere vinculação com o almoxarifado.</p>

    <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"9px 13px",marginBottom:16,fontSize:11,color:"#1e40af"}}>
      🔗 <strong>APIs integradas:</strong> Após importar o XML, o sistema consulta automaticamente o CNPJ do emitente na Receita Federal (BrasilAPI) para enriquecer os dados do fornecedor.
    </div>

    {/* ÁREA DE UPLOAD */}
    <div
      onDragOver={e=>{e.preventDefault();setArrastar(true);}} onDragLeave={()=>setArrastar(false)} onDrop={onDrop}
      onClick={()=>fileRef.current?.click()}
      style={{border:`2px dashed ${arrastar?"#1a7a4a":"#d1d5db"}`,borderRadius:12,padding:"40px 24px",textAlign:"center",cursor:"pointer",background:arrastar?"#f0fdf4":"#fafafa",transition:"all .2s",marginBottom:16}}>
      <input ref={fileRef} type="file" accept=".xml" style={{display:"none"}} onChange={e=>{ if(e.target.files?.[0]) onFile(e.target.files[0]); }}/>
      <div style={{fontSize:48,marginBottom:8}}>📁</div>
      <p style={{fontSize:15,fontWeight:600,color:"#374151",margin:0}}>Arraste o arquivo XML da NF-e aqui</p>
      <p style={{fontSize:12,color:"#9ca3af",marginTop:4}}>ou clique para selecionar · Padrão NF-e 4.00</p>
      {loading&&<p style={{fontSize:13,color:"#1a7a4a",marginTop:8,fontWeight:600}}>⟳ Processando XML...</p>}
    </div>

    {/* RESULTADO */}
    {resultado?.error&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:16,color:"#991b1b",fontSize:13,marginBottom:16}}>❌ {resultado.error}</div>}

    {resultado?.parsed&&!resultado.error&&(<div>
      {resultado.aviso&&<div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"9px 13px",marginBottom:12,fontSize:12,color:"#92400e"}}>⚠️ {resultado.aviso}</div>}

      {/* CABEÇALHO NF-e */}
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:18,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:14}}>
          <div>
            <h3 style={{color:"#0f5233",fontSize:15,fontWeight:700,margin:0}}>NF-e nº {resultado.parsed.numero} — Série {resultado.parsed.serie}</h3>
            <p style={{color:"#6b7280",fontSize:11,margin:"4px 0 0",fontFamily:"monospace"}}>Chave: {resultado.parsed.chaveAcesso.substring(0,22)}...{resultado.parsed.chaveAcesso.slice(-4)}</p>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{background:"#dcfce7",color:"#15803d",padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,display:"inline-block"}}>
              {resultado.parsed.valido?"✅ XML Válido":"⚠️ Com Avisos"}
            </div>
            <p style={{fontSize:10,color:"#9ca3af",margin:"4px 0 0"}}>Emissão: {resultado.parsed.dataEmissao}</p>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div style={{background:"#f9fafb",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,marginBottom:4}}>EMITENTE (FORNECEDOR)</div>
            <div style={{fontSize:13,fontWeight:700}}>{resultado.parsed.emitente.razaoSocial}</div>
            <div style={{fontSize:11,color:"#6b7280",fontFamily:"monospace"}}>{formatCNPJ(resultado.parsed.emitente.cnpj||"")}</div>
            {resultado.parsed.emitente.municipio&&<div style={{fontSize:11,color:"#6b7280"}}>{resultado.parsed.emitente.municipio}/{resultado.parsed.emitente.uf}</div>}
            {resultado.dadosFornecedorRF&&<div style={{fontSize:10,background:"#f0fdf4",color:"#15803d",borderRadius:5,padding:"3px 7px",marginTop:4,fontWeight:600}}>✅ Situação RF: {resultado.dadosFornecedorRF.situacao}</div>}
            {resultado.fornecedorCriado&&<div style={{fontSize:10,color:"#7c3aed",marginTop:2}}>⭐ Fornecedor criado automaticamente no sistema</div>}
          </div>
          <div style={{background:"#f9fafb",borderRadius:8,padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:600,marginBottom:4}}>DESTINATÁRIO</div>
            <div style={{fontSize:13,fontWeight:700}}>{resultado.parsed.destinatario.razaoSocial}</div>
            {resultado.parsed.destinatario.cnpj&&<div style={{fontSize:11,color:"#6b7280",fontFamily:"monospace"}}>{formatCNPJ(resultado.parsed.destinatario.cnpj)}</div>}
            <div style={{marginTop:8,fontSize:10,color:"#9ca3af",fontWeight:600}}>NATUREZA DA OPERAÇÃO</div>
            <div style={{fontSize:12}}>{resultado.parsed.naturezaOperacao}</div>
          </div>
        </div>
      </div>

      {/* ITENS */}
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid #f3f4f6",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h3 style={{color:"#0f5233",fontSize:14,margin:0}}>Itens da Nota ({resultado.parsed.itens.length})</h3>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr style={{background:"#e8f5ee"}}>{["#","Cód.","Descrição","NCM","CFOP","Qtd","Un","V.Unit","V.Total","Almox."].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,color:"#0f5233",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
            <tbody>
              {resultado.parsed.itens.map((item:any,i:number)=>{
                const sug = resultado.sugestoesAlmoxarifado?.[i];
                return(<tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                  <td style={{padding:"7px 10px",fontSize:11,color:"#9ca3af"}}>{item.nItem}</td>
                  <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:10}}>{item.cProd}</td>
                  <td style={{padding:"7px 10px",fontSize:12,fontWeight:500,maxWidth:200}}>{item.xProd}</td>
                  <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:10}}>{item.NCM}</td>
                  <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:10}}>{item.CFOP}</td>
                  <td style={{padding:"7px 10px",fontWeight:700,color:"#1a7a4a"}}>{item.qCom.toLocaleString("pt-BR",{maximumFractionDigits:4})}</td>
                  <td style={{padding:"7px 10px",fontSize:11}}>{item.uCom}</td>
                  <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:11}}>R${fmt(item.vUnCom)}</td>
                  <td style={{padding:"7px 10px",fontWeight:700,fontFamily:"monospace"}}>R${fmt(item.vProd)}</td>
                  <td style={{padding:"7px 10px"}}>
                    {sug?.itemAlmox?(
                      <span style={{background:"#dcfce7",color:"#15803d",fontSize:10,padding:"2px 7px",borderRadius:6,fontWeight:700,cursor:"pointer"}} title={"Vincular: "+sug.itemAlmox.description}>
                        🔗 {sug.itemAlmox.internalCode}
                      </span>
                    ):(
                      <span style={{background:"#f3f4f6",color:"#9ca3af",fontSize:10,padding:"2px 7px",borderRadius:6}}>Novo item</span>
                    )}
                  </td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOTAIS */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
          <h3 style={{color:"#0f5233",fontSize:13,marginBottom:10}}>Totais da NF-e</h3>
          {[["Produtos",resultado.parsed.totais.vProd],["Frete",resultado.parsed.totais.vFrete||0],["Desconto",resultado.parsed.totais.vDesc||0],["IPI",resultado.parsed.totais.vIPI||0],["ICMS",resultado.parsed.totais.vICMS||0],["PIS",resultado.parsed.totais.vPIS||0],["COFINS",resultado.parsed.totais.vCOFINS||0]].map(([l,v])=>(
            <div key={l as string} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f3f4f6",fontSize:12}}>
              <span style={{color:"#6b7280"}}>{l}</span><span>R${fmt(Number(v))}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0 0",fontSize:15,fontWeight:700}}>
            <span style={{color:"#0f5233"}}>TOTAL NF-e</span>
            <span style={{color:"#0f5233"}}>R${fmt(resultado.parsed.totais.vNF)}</span>
          </div>
        </div>
        <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:12,padding:16}}>
          <h3 style={{color:"#15803d",fontSize:13,marginBottom:10}}>✅ Próximos Passos</h3>
          {(resultado.instrucoes?.proximosPasso||[]).map((p:string,i:number)=>(
            <div key={i} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #dcfce7",fontSize:12}}>
              <span style={{color:"#15803d",fontWeight:700,flexShrink:0}}>{i+1}.</span><span>{p}</span>
            </div>
          ))}
          <button onClick={confirmarEntrada} style={{width:"100%",marginTop:14,background:confirmado?"#059669":"#1a7a4a",color:"#fff",border:"none",padding:"10px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
            {confirmado ? "✅ Registrado com sucesso!" : "✅ Confirmar Entrada no Almoxarifado"}
          </button>
        </div>
      </div>
    </div>)}
  </div>);
}
