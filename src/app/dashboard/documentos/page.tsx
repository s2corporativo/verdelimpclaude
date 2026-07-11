
"use client";
import { useEffect, useState, useRef } from "react";

const CAT_ICON: any = {
  contrato:"📋", fiscal:"💸", rh:"👷", juridico:"⚖️",
  licitacao:"🏛️", tecnico:"🔧", outro:"📁"
};
const CAT_COR: any = {
  contrato:"#1d4ed8", fiscal:"#d97706", rh:"#7c3aed",
  juridico:"#dc2626", licitacao:"#334532", tecnico:"#0369a1", outro:"#6b7280"
};
const CAT_LABEL: any = {
  contrato:"Contratos", fiscal:"Fiscal", rh:"RH", juridico:"Jurídico",
  licitacao:"Licitações", tecnico:"Técnico", outro:"Outros"
};
const STATUS_STYLE: any = {
  ativo:       ["#dcfce7","#15803d","✅ Ativo"],
  vencido:     ["#fee2e2","#dc2626","🚨 Vencido"],
  substituido: ["#f3f4f6","#6b7280","📦 Substituído"],
  arquivado:   ["#f3f4f6","#9ca3af","🗄️ Arquivado"],
};
const MIME_ICON: any = {
  "application/pdf":"📄", "image/jpeg":"🖼️", "image/png":"🖼️",
  "application/msword":"📝", "application/vnd.openxmlformats-officedocument":"📝",
  "application/vnd.ms-excel":"📊", "application/zip":"🗜️",
};
const mimeIcon = (m: string) => {
  if(!m) return "📁";
  for(const [k,v] of Object.entries(MIME_ICON)) if(m.startsWith(k)) return v;
  return "📁";
};

const CATEGORIAS_LIST = ["contrato","fiscal","rh","juridico","licitacao","tecnico","outro"];
const SUBCATEGORIAS: any = {
  contrato:  ["Contrato Assinado","Aditivo","Ata de Reunião","Ordem de Serviço","Medição","Proposta"],
  fiscal:    ["NFS-e","DAS","Certidão CND","Certidão FGTS","Certidão INSS","Certidão Municipal","Certidão Trabalhista"],
  rh:        ["Contrato de Trabalho","ASO","CTPS","Ficha EPI","Certificado NR","Holerite","Afastamento"],
  juridico:  ["Contrato Social","Procuração","Certidão Junta Comercial","Ata de Assembleia","Declaração"],
  licitacao: ["Edital","Proposta Enviada","Habilitação","Ata de Julgamento","Impugnação","Recurso"],
  tecnico:   ["ART","POP","PCMSO","PPRA/PGR","Laudo","Plano de Trabalho","Certificado de Dedetização","Foto de Serviço"],
  outro:     ["Correspondência","Nota Fiscal Entrada","Orçamento Fornecedor","Comprovante Pagamento"],
};

interface Doc { id:string; nome:string; descricao?:string; categoria:string; subcategoria?:string; tags?:string; estrategia:string; urlArquivo?:string; mimeType?:string; tamanhoKb?:number; validade?:string; status:string; versao:number; confidencial:boolean; uploadBy?:string; createdAt:string; }

export default function DocumentosPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [total, setTotal] = useState(0);
  const [vencidos, setVencidos] = useState(0);
  const [vencendo30, setVencendo30] = useState(0);
  const [statsCat, setStatsCat] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [catAtiva, setCatAtiva] = useState<string|null>(null);
  const [busca, setBusca] = useState("");
  const [view, setView] = useState<"grid"|"lista">("lista");
  const [showUpload, setShowUpload] = useState(false);
  const [docSelecionado, setDocSelecionado] = useState<Doc|null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);

  const [form, setForm] = useState<any>({
    categoria:"contrato", estrategia:"url", confidencial:false, versao:1
  });

  // Upload real para o servidor (grava em /uploads, servido por /api/arquivos)
  const onArquivoServidor = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setErro("Arquivo acima de 25MB"); return; }
    setEnviandoArquivo(true); setErro("");
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await r.json();
    setEnviandoArquivo(false);
    if (!d.success) { setErro(d.error || "Falha no upload"); return; }
    setForm((p:any) => ({ ...p, urlArquivo: d.url, mimeType: d.mimeType, tamanhoKb: d.tamanhoKb, nome: p.nome || d.nome, base64Data: undefined }));
  };

  const load = (cat?: string|null, q?: string) => {
    const params = new URLSearchParams();
    if(cat) params.set("categoria", cat);
    if(q) params.set("busca", q);
    params.set("limit","100");
    fetch(`/api/documentos?${params}`).then(r=>r.json()).then(d=>{
      setDocs(d.docs||[]); setTotal(d.total||0);
      setVencidos(d.vencidos||0); setVencendo30(d.vencendo30||0);
      setStatsCat(d.statsCat||[]); setDemo(!!d._demo);
    });
  };

  useEffect(()=>{ load(catAtiva, busca||undefined); }, [catAtiva]);

  const buscarHandler = (e: React.FormEvent) => { e.preventDefault(); load(catAtiva, busca||undefined); };

  // Ler arquivo e converter para base64
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxMb = 2;
    if (file.size > maxMb * 1024 * 1024) {
      setErro(`Arquivo muito grande (máx ${maxMb}MB). Use um link externo.`);
      return;
    }
    setErro("");
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(",")[1];
      setForm((p:any) => ({ ...p, base64Data:b64, mimeType:file.type, tamanhoKb:Math.round(file.size/1024), estrategia:"base64", nome:p.nome||file.name }));
    };
    reader.readAsDataURL(file);
  };

  const salvar = async () => {
    if(!form.nome||!form.categoria) { setErro("Nome e categoria obrigatórios"); return; }
    if(form.estrategia==="url"&&!form.urlArquivo) { setErro("Informe a URL do documento"); return; }
    if(form.estrategia==="arquivo"&&!form.urlArquivo) { setErro("Envie um arquivo para o servidor"); return; }
    if(form.estrategia==="base64"&&!form.base64Data) { setErro("Selecione um arquivo"); return; }
    setSalvando(true); setErro("");
    const r = await fetch("/api/documentos",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
    const d = await r.json();
    setSalvando(false);
    if(d.success){ setOk("✅ Documento salvo!"); setShowUpload(false); setForm({categoria:"contrato",estrategia:"url",confidencial:false}); load(catAtiva); setTimeout(()=>setOk(""),3000); }
    else setErro(d.error||"Erro ao salvar");
  };

  const arquivar = async (id:string) => {
    await fetch("/api/documentos",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({action:"arquivar",id}) });
    load(catAtiva);
  };

  const downloadDoc = async (doc:Doc) => {
    if(doc.urlArquivo) { window.open(doc.urlArquivo,"_blank"); return; }
    if(doc.estrategia==="base64") {
      const r = await fetch("/api/documentos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"download",id:doc.id})});
      const d = await r.json();
      if(d.doc?.base64Data) {
        const a = document.createElement("a");
        a.href = `data:${doc.mimeType||"application/octet-stream"};base64,${d.doc.base64Data}`;
        a.download = doc.nome;
        a.click();
      }
    }
  };

  const IS:any = {width:"100%",padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:8,fontSize:12};
  const LS:any = {fontSize:11,fontWeight:600,color:"#374151",display:"block",marginBottom:3};
  const hoje = new Date();
  const fmt = (d:string) => new Date(d).toLocaleDateString("pt-BR");

  // Stats
  const totalDocs = statsCat.reduce((s:number,c:any)=>s+c._count.id,0)||total;

  return (
    <div>
      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:10}}>
        <div>
          <h1 style={{color:"#334532",fontSize:20,fontWeight:700,margin:0}}>
            📁 Gerenciador de Documentos
            {demo&&<span style={{fontSize:11,background:"#e0e7ff",color:"#3730a3",padding:"2px 8px",borderRadius:8,marginLeft:8}}>Demo</span>}
          </h1>
          <p style={{color:"#6b7280",fontSize:12,margin:"4px 0 0"}}>
            GED integrado — Contratos, Fiscal, RH, Jurídico, Licitações, Técnico
          </p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setView(v=>v==="lista"?"grid":"lista")} style={{background:"#f3f4f6",border:"none",padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:12}}>
            {view==="lista"?"⊞ Grid":"☰ Lista"}
          </button>
          <button onClick={()=>setShowUpload(f=>!f)} style={{background:"#334532",color:"#fff",border:"none",padding:"8px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
            + Adicionar Documento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:14}}>
        {[
          ["Total docs",totalDocs,"📁","#4a9410"],
          ["Vencidos",vencidos,"🚨","#dc2626"],
          ["Vencendo (30d)",vencendo30,"⚠️","#d97706"],
          ...CATEGORIAS_LIST.map(c=>[ CAT_LABEL[c], statsCat.find((s:any)=>s.categoria===c)?._count?.id||0, CAT_ICON[c], CAT_COR[c] ])
        ].map(([l,v,i,c])=>(
          <div key={l as string} onClick={()=>CATEGORIAS_LIST.includes(l as string)?setCatAtiva(catAtiva===l?null:l as string):null}
            style={{background:"#fff",border:`1px solid ${catAtiva===l?"#334532":"#e5e7eb"}`,borderRadius:10,padding:"10px 12px",borderTop:`3px solid ${c}`,cursor:CATEGORIAS_LIST.includes(l as string)?"pointer":"default",transition:"border .15s"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:10,color:"#6b7280",fontWeight:600,textTransform:"uppercase"}}>{l}</span><span style={{fontSize:13}}>{i}</span></div>
            <div style={{fontSize:18,fontWeight:700,color:c as string,marginTop:4}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {vencidos>0&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:"8px 14px",marginBottom:10,fontSize:12,color:"#991b1b",fontWeight:600}}>🚨 {vencidos} documento(s) vencido(s) — renove e faça upload da versão atualizada</div>}
      {vencendo30>0&&<div style={{background:"#fef9c3",border:"1px solid #fde68a",borderRadius:8,padding:"8px 14px",marginBottom:10,fontSize:12,color:"#92400e",fontWeight:600}}>⚠️ {vencendo30} documento(s) vencem nos próximos 30 dias</div>}
      {ok&&<div style={{background:"#dcfce7",border:"1px solid #86efac",borderRadius:8,padding:"8px 14px",marginBottom:10,fontSize:12,color:"#15803d",fontWeight:700}}>{ok}</div>}

      {/* FILTROS */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <form onSubmit={buscarHandler} style={{display:"flex",gap:6,flex:1,minWidth:200}}>
          <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar por nome, tag, descrição..." style={{...IS,flex:1}}/>
          <button type="submit" style={{background:"#334532",color:"#fff",border:"none",padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12}}>🔍</button>
        </form>
        {catAtiva&&<button onClick={()=>setCatAtiva(null)} style={{background:"#fee2e2",color:"#991b1b",border:"none",padding:"6px 12px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700}}>✕ {CAT_LABEL[catAtiva]}</button>}
      </div>

      {/* FORM UPLOAD */}
      {showUpload&&(
        <div style={{background:"#fff",border:"2px solid #334532",borderRadius:14,padding:20,marginBottom:16}}>
          <h3 style={{color:"#334532",fontSize:14,fontWeight:700,marginBottom:14}}>+ Adicionar Documento</h3>
          {erro&&<div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:7,padding:"7px 12px",fontSize:11,color:"#991b1b",marginBottom:10}}>{erro}</div>}

          {/* Estratégia */}
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["arquivo","🗄️ Enviar arquivo ao servidor (até 25MB)"],["url","🔗 Link externo (Google Drive, OneDrive, etc.)"],["base64","📤 Embutido no banco (até 2MB)"]].map(([v,l])=>(
              <button key={v} onClick={()=>setForm((p:any)=>({...p,estrategia:v,base64Data:undefined,urlArquivo:undefined}))}
                style={{flex:1,background:form.estrategia===v?"#334532":"#f9fafb",color:form.estrategia===v?"#fff":"#374151",border:`1px solid ${form.estrategia===v?"#334532":"#e5e7eb"}`,padding:"9px",borderRadius:9,cursor:"pointer",fontSize:12,fontWeight:600}}>
                {l}
              </button>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Nome do documento *</label><input style={IS} value={form.nome||""} onChange={e=>setForm((p:any)=>({...p,nome:e.target.value}))} placeholder="Ex: Contrato CEMIG PRADA 2026 — Assinado"/></div>
            <div><label style={LS}>Categoria *</label>
              <select style={IS} value={form.categoria} onChange={e=>setForm((p:any)=>({...p,categoria:e.target.value,subcategoria:""}))}> 
                {CATEGORIAS_LIST.map(c=><option key={c} value={c}>{CAT_ICON[c]} {CAT_LABEL[c]}</option>)}
              </select>
            </div>
            <div><label style={LS}>Subcategoria</label>
              <select style={IS} value={form.subcategoria||""} onChange={e=>setForm((p:any)=>({...p,subcategoria:e.target.value}))}>
                <option value="">— selecionar —</option>
                {(SUBCATEGORIAS[form.categoria]||[]).map((s:string)=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {form.estrategia==="arquivo"?(
            <div style={{marginBottom:10}}>
              <label style={LS}>Arquivo (PDF, imagem, Word, Excel — até 25MB)</label>
              <input ref={arquivoRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.xml,.zip" onChange={onArquivoServidor} style={{display:"none"}}/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>arquivoRef.current?.click()} disabled={enviandoArquivo} style={{background:"#f3f4f6",border:"1px solid #d1d5db",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>
                  {enviandoArquivo?"⏳ Enviando…":"📎 Selecionar e enviar arquivo"}
                </button>
                {form.urlArquivo&&form.estrategia==="arquivo"&&<span style={{fontSize:11,color:"#15803d",fontWeight:600}}>✅ Enviado ({form.tamanhoKb}kb)</span>}
              </div>
              <p style={{fontSize:10,color:"#9ca3af",margin:"4px 0 0"}}>O arquivo fica no servidor da VPS (volume de uploads, coberto pelo backup).</p>
            </div>
          ):form.estrategia==="url"?(
            <div style={{marginBottom:10}}>
              <label style={LS}>URL do documento *</label>
              <input style={IS} value={form.urlArquivo||""} onChange={e=>setForm((p:any)=>({...p,urlArquivo:e.target.value}))} placeholder="https://drive.google.com/file/d/... ou qualquer link"/>
              <p style={{fontSize:10,color:"#9ca3af",margin:"3px 0 0"}}>💡 Google Drive: abra o arquivo → Compartilhar → Copiar link</p>
            </div>
          ):(
            <div style={{marginBottom:10}}>
              <label style={LS}>Arquivo (máx 2MB)</label>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.zip" onChange={onFile} style={{display:"none"}}/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <button onClick={()=>fileRef.current?.click()} style={{background:"#f3f4f6",border:"1px solid #d1d5db",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>
                  📎 Selecionar arquivo
                </button>
                {form.base64Data&&<span style={{fontSize:11,color:"#15803d",fontWeight:600}}>✅ {form.nome} ({form.tamanhoKb}kb)</span>}
              </div>
              <p style={{fontSize:10,color:"#9ca3af",margin:"4px 0 0"}}>PDF, imagens, Word, Excel, ZIP. Para arquivos maiores use link externo.</p>
            </div>
          )}

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={LS}>Tags (separadas por vírgula)</label><input style={IS} value={form.tags||""} onChange={e=>setForm((p:any)=>({...p,tags:e.target.value}))} placeholder="cemig,prada,2026"/></div>
            <div><label style={LS}>Validade / Vencimento</label><input type="date" style={IS} value={form.validade||""} onChange={e=>setForm((p:any)=>({...p,validade:e.target.value}))}/></div>
            <div><label style={LS}>Responsável</label><input style={IS} value={form.uploadBy||""} onChange={e=>setForm((p:any)=>({...p,uploadBy:e.target.value}))} placeholder="Quem fez o upload"/></div>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
              <label style={{...LS,display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                <input type="checkbox" checked={!!form.confidencial} onChange={e=>setForm((p:any)=>({...p,confidencial:e.target.checked}))} style={{accentColor:"#dc2626"}}/>
                <span>🔒 Confidencial</span>
              </label>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={LS}>Descrição (opcional)</label>
            <textarea style={{...IS,height:50}} value={form.descricao||""} onChange={e=>setForm((p:any)=>({...p,descricao:e.target.value}))} placeholder="Notas sobre o documento..."/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={salvar} disabled={salvando} style={{background:salvando?"#6b7280":"#334532",color:"#fff",border:"none",padding:"10px 28px",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:13}}>
              {salvando?"⟳ Salvando...":"💾 Salvar Documento"}
            </button>
            <button onClick={()=>setShowUpload(false)} style={{background:"#f3f4f6",border:"none",padding:"10px 18px",borderRadius:9,cursor:"pointer",color:"#374151"}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* LISTA DE DOCUMENTOS */}
      {view==="lista"?(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {docs.filter(d=>d.status!=="arquivado").map(doc=>{
            const [sbg,sco,stxt] = STATUS_STYLE[doc.status]||STATUS_STYLE.ativo;
            const catCor = CAT_COR[doc.categoria]||"#6b7280";
            const isVencendo = doc.validade && new Date(doc.validade) > hoje && (new Date(doc.validade).getTime()-hoje.getTime()) < 30*86400000;
            const isVencido = doc.validade && new Date(doc.validade) < hoje;
            const sel = docSelecionado?.id === doc.id;
            return(
              <div key={doc.id} onClick={()=>setDocSelecionado(sel?null:doc)}
                style={{background:"#fff",border:`1px solid ${sel?"#334532":isVencido?"#fca5a5":isVencendo?"#fde68a":"#e5e7eb"}`,borderRadius:12,padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${catCor}`}}>
                <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:5}}>
                      <span style={{fontSize:16}}>{mimeIcon(doc.mimeType||"")}</span>
                      <span style={{fontWeight:700,fontSize:13,color:"#334532"}}>{doc.nome}</span>
                      {doc.versao>1&&<span style={{fontSize:9,background:"#dbeafe",color:"#1e40af",padding:"1px 6px",borderRadius:6,fontWeight:700}}>v{doc.versao}</span>}
                      {doc.confidencial&&<span style={{fontSize:10}}>🔒</span>}
                      <span style={{background:sbg,color:sco,padding:"1px 7px",borderRadius:8,fontSize:9,fontWeight:700}}>{stxt}</span>
                      <span style={{background:catCor+"18",color:catCor,padding:"1px 7px",borderRadius:8,fontSize:9,fontWeight:700}}>{CAT_ICON[doc.categoria]} {CAT_LABEL[doc.categoria]}{doc.subcategoria?` · ${doc.subcategoria}`:""}</span>
                    </div>
                    <div style={{display:"flex",gap:12,fontSize:10,color:"#6b7280",flexWrap:"wrap"}}>
                      {doc.descricao&&<span>{doc.descricao.slice(0,60)}{doc.descricao.length>60?"...":""}</span>}
                      {doc.tags&&doc.tags.split(",").map(t=><span key={t} style={{background:"#f3f4f6",padding:"1px 5px",borderRadius:4,fontSize:9}}>#{t.trim()}</span>)}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {doc.validade&&<div style={{fontSize:11,fontWeight:700,color:isVencido?"#dc2626":isVencendo?"#d97706":"#6b7280"}}>
                      {isVencido?"🚨":"⏰"} Val: {fmt(doc.validade)}
                    </div>}
                    {doc.tamanhoKb&&<div style={{fontSize:9,color:"#9ca3af",marginTop:2}}>{doc.tamanhoKb}kb</div>}
                    <div style={{fontSize:9,color:"#9ca3af"}}>{new Date(doc.createdAt).toLocaleDateString("pt-BR")}</div>
                  </div>
                </div>

                {sel&&(
                  <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap",borderTop:"1px solid #f3f4f6",paddingTop:8}}>
                    <button onClick={e=>{e.stopPropagation();downloadDoc(doc);}}
                      style={{background:"#334532",color:"#fff",border:"none",padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                      {doc.urlArquivo?"🔗 Abrir documento":"⬇️ Download"}
                    </button>
                    <button onClick={e=>{e.stopPropagation();setForm({...doc,documentoPaiId:doc.id,versao:(doc.versao||1)+1,base64Data:undefined});setShowUpload(true);}}
                      style={{background:"#dbeafe",color:"#1e40af",border:"none",padding:"6px 14px",borderRadius:7,cursor:"pointer",fontSize:11,fontWeight:700}}>
                      📤 Nova versão
                    </button>
                    <button onClick={e=>{e.stopPropagation();arquivar(doc.id);setDocSelecionado(null);}}
                      style={{background:"#f3f4f6",color:"#6b7280",border:"none",padding:"6px 12px",borderRadius:7,cursor:"pointer",fontSize:11}}>
                      🗄️ Arquivar
                    </button>
                    {doc.uploadBy&&<span style={{fontSize:10,color:"#9ca3af",padding:"6px 4px"}}>por {doc.uploadBy}</span>}
                  </div>
                )}
              </div>
            );
          })}
          {docs.length===0&&(
            <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>
              <div style={{fontSize:40,marginBottom:8}}>📁</div>
              <div style={{fontWeight:600,color:"#374151"}}>Nenhum documento encontrado</div>
              <div style={{fontSize:12,marginTop:4}}>Clique em "+ Adicionar Documento" para começar</div>
            </div>
          )}
        </div>
      ):(
        /* GRID VIEW */
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {docs.filter(d=>d.status!=="arquivado").map(doc=>{
            const catCor = CAT_COR[doc.categoria]||"#6b7280";
            const isVencido = doc.validade && new Date(doc.validade) < hoje;
            return(
              <div key={doc.id} style={{background:"#fff",border:`1px solid ${isVencido?"#fca5a5":"#e5e7eb"}`,borderRadius:12,padding:14,cursor:"pointer",borderTop:`3px solid ${catCor}`}}
                onClick={()=>doc.urlArquivo?window.open(doc.urlArquivo,"_blank"):downloadDoc(doc)}>
                <div style={{fontSize:28,marginBottom:8,textAlign:"center"}}>{mimeIcon(doc.mimeType||"")}</div>
                <div style={{fontWeight:700,fontSize:12,color:"#334532",marginBottom:4,lineHeight:1.3}}>{doc.nome}</div>
                <div style={{fontSize:10,color:catCor,fontWeight:600,marginBottom:4}}>{CAT_ICON[doc.categoria]} {doc.subcategoria||CAT_LABEL[doc.categoria]}</div>
                {doc.validade&&<div style={{fontSize:9,color:isVencido?"#dc2626":"#9ca3af",fontWeight:isVencido?700:400}}>Val: {fmt(doc.validade)}</div>}
                {doc.confidencial&&<div style={{fontSize:10,marginTop:4}}>🔒</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
