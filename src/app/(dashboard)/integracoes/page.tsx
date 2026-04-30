
"use client";
import { useEffect, useState } from "react";
export default function IntegracoesPage() {
  const [ibge, setIbge] = useState<any>(null);
  const [feriados, setFeriados] = useState<any[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = (msg:string) => setLogs(l=>[new Date().toLocaleTimeString("pt-BR")+" → "+msg,...l].slice(0,30));
  useEffect(()=>{
    fetch("/api/integracoes/publicas/feriados?ano=2026").then(r=>r.json()).then(d=>{setFeriados(d.feriados||[]);addLog("✓ Feriados 2026: "+d.feriados?.length+" datas"+(d.cached?" (cache)":""));});
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios/3106705").then(r=>r.json()).then(d=>{setIbge(d);addLog("✓ IBGE: "+d.nome+"/"+d?.microrregiao?.mesorregiao?.UF?.sigla);}).catch(()=>addLog("✗ IBGE: offline"));
  },[]);
  const APIS = [
    {nome:"ViaCEP",url:"viacep.com.br",status:"ativa",uso:"Endereços automáticos",modulos:"Clientes · Fornecedores",auth:"Não"},
    {nome:"BrasilAPI CNPJ",url:"brasilapi.com.br/api/cnpj",status:"ativa",uso:"Dados cadastrais de empresas",modulos:"Clientes · Fornecedores",auth:"Não"},
    {nome:"IBGE Municípios",url:"servicodados.ibge.gov.br",status:"ativa",uso:"Dados municipais para NFS-e",modulos:"Dashboard · NFS-e",auth:"Não"},
    {nome:"Feriados BrasilAPI",url:"brasilapi.com.br/api/feriados",status:"ativa",uso:"Calendário fiscal",modulos:"Dashboard · Fiscal",auth:"Não"},
    {nome:"ISS Betim LC33/2003",url:"Tabela local",status:"ativa",uso:"Alíquota automática ISS",modulos:"NFS-e · Apuração",auth:"Não"},
    {nome:"Apuração Tributária",url:"api/fiscal/apuracao",status:"ativa",uso:"DAS/FGTS/INSS/ISS auto",modulos:"Central Fiscal",auth:"Sessão"},
    {nome:"NF-e SEFAZ",url:"nfe.fazenda.gov.br",status:"pendente",uso:"Consulta e manifestação",modulos:"Fiscal",auth:"Cert. A1"},
    {nome:"eSocial",url:"esocial.gov.br",status:"pendente",uso:"Obrigações trabalhistas",modulos:"RH",auth:"Cert. A1"},
    {nome:"Anthropic Claude IA",url:"api.anthropic.com",status:"ativa",uso:"Assistente especializado",modulos:"Precificação",auth:"Server-side"},
  ];
  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Central de Integrações</h1>
    <div style={{background:"#1e1b4b",color:"#a5b4fc",padding:"10px 16px",borderRadius:8,marginBottom:16,fontSize:11}}>
      🔐 Todas as credenciais em variáveis de ambiente. APIs públicas funcionam sem token. Certificado digital somente com cofre seguro (SEFAZ_CERTIFICATE_ENABLED=false).
    </div>
    {ibge&&<div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:"8px 13px",marginBottom:12,fontSize:12,color:"#1e40af"}}>
      IBGE: <strong>{ibge.nome}</strong> — Código: {ibge.id} — Mesorregião: {ibge.microrregiao?.mesorregiao?.nome}/{ibge.microrregiao?.mesorregiao?.UF?.sigla}
    </div>}
    {APIS.map(a=><div key={a.nome} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 16px",marginBottom:8,borderLeft:"4px solid "+(a.status==="ativa"?"#1a7a4a":"#d97706")}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
            <strong style={{fontSize:13}}>{a.nome}</strong>
            <span style={{background:a.status==="ativa"?"#dcfce7":"#fef9c3",color:a.status==="ativa"?"#15803d":"#92400e",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>{a.status==="ativa"?"● Ativa":"○ Pendente"}</span>
            {a.auth==="Não"&&<span style={{background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>🌐 Pública</span>}
            {a.auth==="Cert. A1"&&<span style={{background:"#fce7f3",color:"#9d174d",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700}}>🔐 Certificado</span>}
          </div>
          <div style={{fontSize:11,color:"#6b7280"}}>{a.url} · {a.uso}</div>
          <div style={{fontSize:10,color:"#1a7a4a",marginTop:2}}>Módulos: {a.modulos}</div>
        </div>
      </div>
    </div>)}
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:16,marginTop:16}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:10}}>Log de chamadas ({logs.length})</h3>
      <div style={{background:"#f9fafb",borderRadius:8,padding:10,maxHeight:200,overflowY:"auto"}}>
        {logs.length===0?<p style={{fontSize:11,color:"#9ca3af"}}>Aguardando chamadas...</p>:logs.map((l,i)=><div key={i} style={{fontSize:11,padding:"3px 0",borderBottom:"1px solid #f3f4f6",color:l.includes("✓")?"#15803d":l.includes("✗")?"#dc2626":"#374151"}}>{l}</div>)}
      </div>
    </div>
    {feriados.length>0&&(<div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,padding:16,marginTop:12}}>
      <h3 style={{color:"#0f5233",fontSize:13,marginBottom:10}}>Feriados 2026 ({feriados.length} datas)</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,maxHeight:180,overflowY:"auto"}}>
        {feriados.map((f:any,i:number)=><div key={i} style={{background:"#f9fafb",borderRadius:7,padding:"6px 9px"}}><div style={{fontSize:10,color:"#9ca3af"}}>{f.date?.split("-").reverse().join("/")}</div><div style={{fontSize:11,fontWeight:500}}>{f.name}</div></div>)}
      </div>
    </div>)}
  </div>);
}
