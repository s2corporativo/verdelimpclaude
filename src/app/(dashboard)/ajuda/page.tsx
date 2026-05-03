"use client";
import { useState, useRef } from "react";

const FAQ = [
  { cat:"📋 Contratos", q:"Como cadastrar um contrato?", a:"Acesse ⚡ Novo Contrato no menu. Cole o texto do edital (IA extrai os dados) ou preencha manualmente. O sistema gera automaticamente tributos projetados, OS na logística e receitas no financeiro." },
  { cat:"📋 Contratos", q:"O contrato propaga em quais módulos?", a:"Ao confirmar: Cliente (se novo), Contrato numerado, DAS+ISS por mês de vigência no Fiscal, Receitas previstas no Financeiro, OSs no Diário de Obras, Mobilizações da equipe selecionada." },
  { cat:"💰 Financeiro", q:"O que é o Aging de contas a receber?", a:"É o vencimento do que você tem a receber. Classifica em 5 faixas: A vencer, 1-30 dias, 31-60, 61-90 e +90 dias vencidos. Acesse Financeiro → aba Aging." },
  { cat:"💰 Financeiro", q:"Como exportar os dados para o contador?", a:"No Dashboard há dois botões: 'Exportar backup (JSON)' exporta tudo, e 'Exportar financeiro (CSV)' exporta lançamentos para Excel. Também use Relatório Contador no menu." },
  { cat:"💸 Fiscal", q:"Como apurar os tributos do mês?", a:"Acesse Central Fiscal → aba Apuração Automática. Informe o faturamento e a competência. O sistema calcula e lança DAS (6,72%), FGTS (8%), INSS Patronal (7%), ISS Betim (5%) e CSRF." },
  { cat:"💸 Fiscal", q:"Qual a alíquota de ISS para paisagismo em Betim?", a:"5% conforme LC 33/2003, CNAE 81.30-3-00. O sistema já usa essa alíquota automaticamente em todas as NFS-e e apurações." },
  { cat:"🚜 Retroescavadeira", q:"Como calcular se um serviço de retro é viável?", a:"Retro → aba Calculadora. Informe tipo de serviço, quantidade (m³/m²) e distância da base. O sistema detalha os 6 custos: combustível, operador, depreciação, manutenção, seguro e transporte." },
  { cat:"🪲 Dedetização", q:"Quais documentos precisam ser entregues ao cliente?", a:"Certificado de dedetização, laudo técnico, FISPQ dos produtos, garantia por escrito. Para contratos públicos também ART CREA-MG. Veja Dedetização → aba Documentos." },
  { cat:"🏆 Licitações", q:"Como acompanhar um edital do PNCP?", a:"Radar Licitações → busque palavras-chave → clique '🏆 → Pipeline' no edital de interesse. Ele vai para o Kanban em Pipeline Licitações para você acompanhar o progresso." },
  { cat:"🏆 Licitações", q:"Como calcular o BDI para uma proposta pública?", a:"Acesse Precificação → aba BDI. Monte os itens da planilha com custos de MO, material e equipamento. O BDI é calculado pela fórmula TCU Acórdão 2369/2011." },
  { cat:"👷 RH", q:"Como alocar funcionários a um contrato?", a:"No fluxo Novo Contrato, etapa 4 (Equipe & Docs). O sistema mostra 3 cenários (mínima/recomendada/confortável) com custo e margem. Selecione manualmente e salve — as mobilizações são criadas automaticamente." },
  { cat:"👷 RH", q:"Onde ver quem está em qual contrato?", a:"Menu Mobilizações. Mostra todos os funcionários alocados, agrupados por contrato, com custo mensal e período de alocação." },
  { cat:"📦 Estoque", q:"Como registrar entrada/saída de material?", a:"Almoxarifado → clique no botão '± Mover' em qualquer item. Escolha tipo (entrada, saída ou ajuste), quantidade e motivo. O saldo é atualizado imediatamente." },
  { cat:"🔧 Equipamentos", q:"Como registrar manutenção de equipamento?", a:"Equipamentos → clique no card → botão '🔧 Registrar Manutenção'. Informe tipo (preventiva/corretiva), descrição, custo e próxima revisão. Alertas surgem automaticamente." },
];

export default function AjudaPage() {
  const [msgs, setMsgs] = useState<{role:string,text:string}[]>([
    {role:"assistant", text:"Olá! Sou o assistente do Verdelimp ERP. Pergunte qualquer coisa sobre o sistema ou consulte as perguntas frequentes abaixo. 👇"}
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [catAtiva, setCatAtiva] = useState<string|null>(null);
  const [faqAberta, setFaqAberta] = useState<number|null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const cats = [...new Set(FAQ.map(f=>f.cat))];
  const faqFiltrada = catAtiva ? FAQ.filter(f=>f.cat===catAtiva) : FAQ;

  const enviar = async (pergunta?: string) => {
    const texto = pergunta || input.trim();
    if (!texto) return;
    setInput("");
    const newMsgs = [...msgs, {role:"user",text:texto}];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:600,
          system:`Assistente do Verdelimp ERP para VERDELIMP SERVICOS E TERCEIRIZACAO LTDA, CNPJ 30.198.776/0001-29, Betim/MG, Simples Nacional, CNAE 81.30-3-00 (Paisagismo), 8 funcionários. Sistema com 37 módulos: contratos, fiscal (DAS 6,72%, ISS 5% Betim), logística, retroescavadeira, dedetização, pipeline licitações, precificação BDI (TCU 2369/2011), mobilizações, equipamentos, aging financeiro, backup JSON/CSV. Responda direto e prático em português, máx 3 parágrafos.`,
          messages: newMsgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}))
        })
      });
      const d = await r.json();
      setMsgs([...newMsgs, {role:"assistant",text:d.content?.[0]?.text||"Erro ao processar"}]);
    } catch {
      setMsgs([...newMsgs, {role:"assistant",text:"Erro de conexão. Verifique a chave ANTHROPIC_API_KEY nas configurações."}]);
    }
    setLoading(false);
    setTimeout(()=>chatRef.current?.scrollTo({top:9999,behavior:"smooth"}),100);
  };

  const IS: any = {flex:1,padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:"8px 0 0 8px",fontSize:13,outline:"none"};

  return (
    <div>
      <h1 style={{color:"#0f5233",fontSize:20,fontWeight:700,margin:"0 0 4px"}}>🤖 Central de Ajuda</h1>
      <p style={{color:"#6b7280",fontSize:12,margin:"0 0 16px"}}>Chat com IA especializada no Verdelimp ERP + perguntas frequentes</p>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* CHAT */}
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{background:"#0f5233",padding:"10px 14px",color:"#fff",fontSize:12,fontWeight:700}}>💬 Chat com IA</div>
          <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:12,maxHeight:400,display:"flex",flexDirection:"column",gap:8}}>
            {msgs.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{maxWidth:"85%",background:m.role==="user"?"#0f5233":"#f3f4f6",color:m.role==="user"?"#fff":"#1f2937",padding:"8px 11px",borderRadius:m.role==="user"?"10px 10px 0 10px":"10px 10px 10px 0",fontSize:12,lineHeight:1.5,whiteSpace:"pre-wrap"}}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading&&<div style={{display:"flex",justifyContent:"flex-start"}}><div style={{background:"#f3f4f6",padding:"8px 11px",borderRadius:"10px 10px 10px 0",fontSize:12,color:"#9ca3af"}}>⟳ Pensando...</div></div>}
          </div>

          {/* Sugestões rápidas */}
          <div style={{padding:"6px 10px",borderTop:"1px solid #f3f4f6",display:"flex",gap:4,flexWrap:"wrap"}}>
            {["Como usar o Novo Contrato?","Calcular BDI para licitação","Ver tributos do mês","Alocar equipe em contrato"].map(s=>(
              <button key={s} onClick={()=>enviar(s)} style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:10,color:"#15803d",fontWeight:600}}>{s}</button>
            ))}
          </div>

          <div style={{padding:"8px 10px",borderTop:"1px solid #f3f4f6",display:"flex"}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&enviar()} placeholder="Pergunte algo sobre o sistema..." style={IS}/>
            <button onClick={()=>enviar()} disabled={loading||!input.trim()} style={{background:loading||!input.trim()?"#9ca3af":"#0f5233",color:"#fff",border:"none",padding:"9px 16px",borderRadius:"0 8px 8px 0",cursor:"pointer",fontWeight:700,fontSize:13}}>→</button>
          </div>
        </div>

        {/* FAQ */}
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"}}>
          <div style={{background:"#0f5233",padding:"10px 14px",color:"#fff",fontSize:12,fontWeight:700}}>❓ Perguntas Frequentes</div>

          {/* Filtro por categoria */}
          <div style={{padding:"8px 10px",borderBottom:"1px solid #f3f4f6",display:"flex",gap:4,flexWrap:"wrap"}}>
            <button onClick={()=>setCatAtiva(null)} style={{background:!catAtiva?"#0f5233":"#f3f4f6",color:!catAtiva?"#fff":"#374151",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:10,fontWeight:600}}>Todas</button>
            {cats.map(c=>(
              <button key={c} onClick={()=>setCatAtiva(catAtiva===c?null:c)} style={{background:catAtiva===c?"#0f5233":"#f3f4f6",color:catAtiva===c?"#fff":"#374151",border:"none",borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:10,fontWeight:600}}>{c}</button>
            ))}
          </div>

          <div style={{maxHeight:400,overflowY:"auto"}}>
            {faqFiltrada.map((f,i)=>(
              <div key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                <button onClick={()=>setFaqAberta(faqAberta===i?null:i)} style={{width:"100%",background:"none",border:"none",padding:"10px 14px",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                  <span style={{fontSize:12,fontWeight:600,color:"#374151"}}>{f.q}</span>
                  <span style={{color:"#9ca3af",flexShrink:0,fontSize:11}}>{faqAberta===i?"▲":"▼"}</span>
                </button>
                {faqAberta===i&&(
                  <div style={{padding:"0 14px 12px",fontSize:11,color:"#6b7280",lineHeight:1.6,background:"#f9fafb"}}>
                    {f.a}
                    <button onClick={()=>enviar(f.q)} style={{display:"block",marginTop:6,background:"none",border:"none",color:"#1a7a4a",cursor:"pointer",fontSize:10,fontWeight:600,padding:0}}>
                      💬 Perguntar mais sobre isso →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
