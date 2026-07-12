"use client";
import { useEffect, useState } from "react";

export default function MedicaoPage() {
  const [data, setData] = useState<any[]>([]);
  const [demo, setDemo] = useState(false);
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [gedOk, setGedOk] = useState<string | null>(null);
  const [approvedByInput, setApprovedByInput] = useState("");
  const [showApproveModal, setShowApproveModal] = useState<any>(null);

  const load = () => fetch("/api/medicao").then(r=>r.json()).then(d=>{ setData(d.data||[]); setDemo(!!d._demo); });
  useEffect(() => { load(); }, []);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const SC: any = {
    em_elaboracao: ["#f3f4f6","#374151","📝 Em Elaboração"],
    enviada:       ["#dbeafe","#1e40af","📤 Enviada p/ Aprovação"],
    aprovada:      ["#dcfce7","#15803d","✅ Aprovada"],
    glosada:       ["#fee2e2","#991b1b","⛔ Glosada"],
    faturada:      ["#f3e8ff","#6d28d9","🧾 Faturada"],
  };

  const mudarStatus = async (id: string, status: string, approvedBy?: string) => {
    setAprovando(id);
    try {
      const r = await fetch("/api/medicao", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, approvedBy }),
      });
      const d = await r.json();
      if (d.success) {
        load();
        if (status === "aprovada") {
          setGedOk(id);
          setTimeout(() => setGedOk(null), 5000);
        }
      } else {
        alert(d.error || "Não foi possível atualizar a medição (registros de demonstração não são gravados).");
      }
    } catch (e: any) { alert(e.message || "Erro de rede ao atualizar a medição."); }
    finally { setAprovando(null); setShowApproveModal(null); setApprovedByInput(""); }
  };

  const faturar = async (m: any) => {
    if (!confirm(`Faturar a medição de ${m.contract?.number || ""} (${m.period})?\n\nIsso lança a NFS-e no sistema (registro gerencial) e a receita no financeiro. A emissão OFICIAL da nota exige certificado + homologação com o contador.`)) return;
    setAprovando(m.id);
    try {
      const r = await fetch("/api/medicao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "faturar", id: m.id }) });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "Não foi possível faturar."); }
      else { alert(d.mensagem || "Medição faturada."); load(); }
    } catch (e: any) { alert(e.message || "Erro de rede ao faturar."); }
    setAprovando(null);
    setShowApproveModal(null);
    setApprovedByInput("");
  };

  const IS: any = { width:"100%", padding:"8px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13 };

  return (
    <div>
      <h1 style={{ color:"#334532", fontSize:20, fontWeight:700, margin:"0 0 6px" }}>
        📏 Medição Mensal
        {demo && <span style={{ fontSize:11, background:"#e0e7ff", color:"#3730a3", padding:"2px 8px", borderRadius:8, marginLeft:8 }}>Demo</span>}
      </h1>
      <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:8, padding:"8px 13px", marginBottom:14, fontSize:11, color:"#1e40af" }}>
        📋 Medições registradas do dia 21 ao dia 20. Após aprovação, o sistema salva automaticamente no <strong>GED</strong> e libera emissão da NFS-e.
      </div>

      {data.map((m: any) => {
        const [bg, co, stxt] = SC[m.status] || ["#f3f4f6","#374151",m.status];
        const isAprovando = aprovando === m.id;
        const foiAprovada = gedOk === m.id;

        return (
          <div key={m.id} style={{ background:"#fff", border:`1px solid ${m.status==="aprovada"?"#86efac":"#e5e7eb"}`, borderRadius:12, padding:16, marginBottom:12 }}>
            {/* Cabeçalho */}
            <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:10 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:14, color:"#334532", marginBottom:3 }}>{m.contract?.object}</div>
                <div style={{ fontSize:11, color:"#6b7280" }}>
                  Contrato: <strong>{m.contract?.number}</strong> · Período: <strong>{m.period}</strong>
                  {m.startDate && ` · ${new Date(m.startDate).toLocaleDateString("pt-BR")} a ${new Date(m.endDate).toLocaleDateString("pt-BR")}`}
                </div>
                {m.approvedBy && (
                  <div style={{ marginTop:5, fontSize:11, color:"#15803d", fontWeight:600 }}>
                    ✅ Aprovado por: {m.approvedBy} {m.approvedAt ? `em ${new Date(m.approvedAt).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                )}
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:22, fontWeight:700, color:"#4a9410" }}>R$ {fmt(Number(m.value))}</div>
                <span style={{ background:bg, color:co, padding:"2px 9px", borderRadius:8, fontSize:10, fontWeight:700 }}>{stxt}</span>
              </div>
            </div>

            {/* Itens */}
            {m.items?.length > 0 && (
              <table style={{ borderCollapse:"collapse", width:"100%", marginBottom:10 }}>
                <thead>
                  <tr style={{ background:"#e8f5ee" }}>
                    {["Descrição","Un.","Qtd.","V.Unit.","Total"].map(h => (
                      <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:"#334532" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.items.map((i: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom:"1px solid #f3f4f6" }}>
                      <td style={{ padding:"6px 10px", fontSize:12 }}>{i.description}</td>
                      <td style={{ padding:"6px 10px", fontSize:11, color:"#6b7280" }}>{i.unit}</td>
                      <td style={{ padding:"6px 10px", fontWeight:600 }}>{Number(i.quantity).toLocaleString("pt-BR", { maximumFractionDigits:2 })}</td>
                      <td style={{ padding:"6px 10px" }}>R$ {fmt(Number(i.unitValue))}</td>
                      <td style={{ padding:"6px 10px", fontWeight:700, color:"#4a9410" }}>R$ {fmt(Number(i.totalValue))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* GED feedback */}
            {foiAprovada && (
              <div style={{ background:"#dcfce7", border:"1px solid #86efac", borderRadius:8, padding:"8px 12px", marginBottom:10, fontSize:12, color:"#15803d", fontWeight:600 }}>
                ✅ Medição aprovada e salva no GED automaticamente! {" "}
                <a href="/dashboard/documentos" style={{ color:"#334532", fontWeight:700 }}>Ver no GED →</a>
              </div>
            )}

            {/* Ações por status */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {m.status === "em_elaboracao" && (
                <button
                  onClick={() => mudarStatus(m.id, "enviada")}
                  disabled={isAprovando}
                  style={{ background:"#1d4ed8", color:"#fff", border:"none", padding:"7px 16px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                  📤 Enviar para aprovação
                </button>
              )}
              {m.status === "enviada" && (
                <>
                  <button
                    onClick={() => setShowApproveModal(m)}
                    disabled={isAprovando}
                    style={{ background:"#15803d", color:"#fff", border:"none", padding:"7px 16px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                    {isAprovando ? "⟳ Aprovando..." : "✅ Aprovar Medição"}
                  </button>
                  <button
                    onClick={() => mudarStatus(m.id, "glosada")}
                    disabled={isAprovando}
                    style={{ background:"#fef2f2", color:"#991b1b", border:"1px solid #fca5a5", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:12 }}>
                    ⛔ Glosar
                  </button>
                </>
              )}
              {m.status === "aprovada" && (
                <button onClick={()=>faturar(m)} disabled={isAprovando}
                  style={{ background:"#f3e8ff", color:"#6d28d9", border:"1px solid #c4b5fd", padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700 }}>
                  🧾 Faturar (lançar NFS-e + receita)
                </button>
              )}
              {m.status === "faturada" && (
                <span style={{ background:"#dcfce7", color:"#15803d", padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700 }}>✅ Faturada</span>
              )}
            </div>
          </div>
        );
      })}

      {data.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"#9ca3af" }}>Nenhuma medição encontrada</div>
      )}

      {/* Modal de aprovação */}
      {showApproveModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}
          onClick={e => { if (e.target === e.currentTarget) setShowApproveModal(null); }}>
          <div style={{ background:"#fff", borderRadius:14, padding:24, maxWidth:420, width:"95%", boxShadow:"0 8px 32px rgba(0,0,0,.2)" }}>
            <h3 style={{ color:"#334532", fontSize:15, fontWeight:700, marginBottom:4 }}>✅ Aprovar Medição</h3>
            <p style={{ color:"#6b7280", fontSize:12, margin:"0 0 16px" }}>
              <strong>{showApproveModal.contract?.number}</strong> · {showApproveModal.period} · R$ {fmt(Number(showApproveModal.value))}
            </p>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>
                Aprovado por (nome do fiscal / representante do cliente)
              </label>
              <input
                value={approvedByInput}
                onChange={e => setApprovedByInput(e.target.value)}
                placeholder="Ex: João Silva — PBH / Engenheiro Fiscal"
                style={IS}
                autoFocus
                onKeyDown={e => e.key === "Enter" && mudarStatus(showApproveModal.id, "aprovada", approvedByInput)}
              />
            </div>
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px", marginBottom:16, fontSize:11, color:"#15803d" }}>
              📁 Ao aprovar, o sistema salva automaticamente um registro no <strong>GED</strong> com os dados desta medição.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => mudarStatus(showApproveModal.id, "aprovada", approvedByInput)}
                disabled={!approvedByInput || aprovando === showApproveModal.id}
                style={{ flex:1, background: !approvedByInput ? "#9ca3af" : "#15803d", color:"#fff", border:"none", padding:"11px", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:14 }}>
                {aprovando === showApproveModal.id ? "⟳ Aprovando..." : "✅ Confirmar Aprovação"}
              </button>
              <button
                onClick={() => setShowApproveModal(null)}
                style={{ background:"#f3f4f6", border:"none", padding:"11px 16px", borderRadius:9, cursor:"pointer", color:"#374151" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
