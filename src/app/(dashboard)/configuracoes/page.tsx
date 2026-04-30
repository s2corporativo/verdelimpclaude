
"use client";
import { useState } from "react";
export default function ConfiguracoesPage() {
  const [saved, setSaved] = useState(false);
  const IS:any={width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:13};
  const LS:any={fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  return (<div>
    <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,marginBottom:14}}>Configurações</h1>
    <div style={{background:"#1e1b4b",color:"#a5b4fc",padding:"10px 16px",borderRadius:8,marginBottom:16,fontSize:11}}>
      🔐 Credenciais sensíveis ficam exclusivamente em variáveis de ambiente no Render. Configure em: Dashboard → Service → Environment Variables.
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16}}>
        <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>Dados da Empresa</h3>
        {[["Razão Social","VERDELIMP SERVICOS E TERCEIRIZACAO LTDA"],["CNPJ","30.198.776/0001-29"],["Porte","EPP"],["Regime","Simples Nacional"],["CNAE Principal","81.30-3-00"],["Município","Betim/MG"],["E-mail","ADM@VERDELIMP.COM.BR"],["Telefone","(31) 3591-4546"]].map(([l,v])=>(<div key={l} style={{marginBottom:8}}><label style={LS}>{l}</label><input style={IS} defaultValue={v} /></div>))}
        <button onClick={()=>setSaved(true)} style={{background:"#1a7a4a",color:"#fff",border:"none",padding:"9px 24px",borderRadius:8,cursor:"pointer",fontWeight:600}}>{saved?"✓ Salvo!":"💾 Salvar Configurações"}</button>
      </div>
      <div>
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,padding:16,marginBottom:14}}>
          <h3 style={{color:"#0f5233",fontSize:13,marginBottom:12}}>Alíquotas Fiscais (Gerencial)</h3>
          <div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:7,padding:"7px 11px",marginBottom:10,fontSize:10,color:"#92400e"}}>Apoio gerencial — validar com contador</div>
          {[["Alíquota DAS (Simples)","6,72%"],["ISS Betim (LC 33/2003)","5,00%"],["INSS Patronal","7,00%"],["FGTS","8,00%"],["IRRF Serviços","1,50%"]].map(([l,v])=>(<div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f3f4f6",fontSize:12}}><span style={{color:"#6b7280"}}>{l}</span><strong>{v}</strong></div>))}
        </div>
        <div style={{background:"#fce7f3",border:"1px solid #f9a8d4",borderRadius:12,padding:16}}>
          <h3 style={{color:"#9d174d",fontSize:13,marginBottom:10}}>🔐 Certificado Digital A1</h3>
          <p style={{fontSize:11,color:"#831843"}}>Certificado digital somente deve ser armazenado com <strong>cofre seguro</strong> (Vault, AWS Secrets Manager), criptografia, controle de acesso e logs de uso. SEFAZ_CERTIFICATE_ENABLED=false nesta fase.</p>
        </div>
      </div>
    </div>
  </div>);
}
