"use client";
import { useEffect, useState } from "react";

const IS: any = { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 };
const LS: any = { fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 };
const CARD: any = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 };

const TIPOS = [
  "Roçada Manual/Mecanizada", "Jardinagem e Paisagismo", "Poda de Árvores (altura)",
  "Limpeza de Terreno", "Dedetização / Capina Química", "Retroescavadeira / Terraplanagem",
  "Limpeza Pós-Obra", "Serviços de conservação e limpeza",
];

export default function ChecklistDocsPage() {
  const [contratos, setContratos] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [contratoInfo, setContratoInfo] = useState<any>(null);

  const [contratoId, setContratoId] = useState("");
  const [tipoServico, setTipoServico] = useState(TIPOS[0]);
  const [contratante, setContratante] = useState("");
  const [local, setLocal] = useState("");
  const [contatoEmergencia, setContatoEmergencia] = useState("");
  const [responsavelSesmt, setResponsavelSesmt] = useState("");

  const [marcados, setMarcados] = useState<string[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);

  // Recarrega o checklist sempre que o escopo muda — o sistema reconhece os documentos
  const carregarEscopo = async (cid: string, tipo: string) => {
    setCarregando(true);
    const q = new URLSearchParams();
    if (cid) q.set("contratoId", cid); else q.set("tipoServico", tipo);
    const d = await fetch(`/api/checklist-docs?${q}`).then((r) => r.json());
    setChecklist(d.checklist || []);
    setFuncionarios(d.funcionarios || []);
    if (d.contratos) setContratos(d.contratos);
    setContratoInfo(d.contrato || null);
    if (d.contrato?.contratante) setContratante(d.contrato.contratante);
    // pré-marca tudo que é aplicável e gerável (intuitivo: já vem pronto)
    setMarcados((d.checklist || []).filter((i: any) => i.aplicavel && i.geravel).map((i: any) => i.key));
    // pré-seleciona mobilizados do contrato, se houver; senão ninguém
    const mob = (d.funcionarios || []).filter((f: any) => f.mobilizado).map((f: any) => f.id);
    setSelecionados(mob);
    setCarregando(false);
  };

  useEffect(() => { carregarEscopo("", TIPOS[0]); }, []);

  const toggle = (lista: string[], set: any, id: string) => set(lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  const docsGeraveis = checklist.filter((i) => i.aplicavel && i.geravel);
  const docsAnexar = checklist.filter((i) => i.aplicavel && !i.geravel);
  const porFuncionario = marcados.filter((k) => docsGeraveis.find((i) => i.key === k)?.categoria === "FUNCIONARIO").length;
  const coletivos = marcados.filter((k) => docsGeraveis.find((i) => i.key === k)?.categoria === "COLETIVO").length;
  const totalDocs = coletivos + porFuncionario * selecionados.length;

  const gerar = (apenasId?: string) => {
    const ids = apenasId ? [apenasId] : selecionados;
    if (marcados.length === 0 || ids.length === 0) return;
    const q = new URLSearchParams({ itens: marcados.join(","), funcionarios: ids.join(",") });
    if (contratoId) q.set("contratoId", contratoId); else q.set("tipoServico", tipoServico);
    if (contratante) q.set("contratante", contratante);
    if (local) q.set("local", local);
    if (contatoEmergencia) q.set("contatoEmergencia", contatoEmergencia);
    if (responsavelSesmt) q.set("responsavelSesmt", responsavelSesmt);
    window.open(`/api/checklist-docs/documento?${q}`, "_blank", "width=980,height=760");
  };

  const Passo = ({ n, t }: { n: number; t: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 10px" }}>
      <span style={{ background: "#334532", color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{n}</span>
      <h3 style={{ color: "#334532", fontSize: 14, fontWeight: 700 }}>{t}</h3>
    </div>
  );

  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>📑 Checklist de Documentos</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 14 }}>
        Escolha o contrato ou o tipo de serviço — o sistema reconhece os documentos exigidos (incluindo a relação SST da contratante), você marca e ele gera tudo automaticamente, por funcionário.
      </p>

      {/* PASSO 1 — ESCOPO */}
      <div style={CARD}>
        <Passo n={1} t="Escolha o escopo" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={LS}>Contrato existente</label>
            <select style={IS} value={contratoId} onChange={(e) => { setContratoId(e.target.value); carregarEscopo(e.target.value, tipoServico); }}>
              <option value="">— sem contrato (escolher tipo de serviço) —</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.numero} — {c.contratante || "sem cliente"} — {c.objeto?.slice(0, 50)}</option>)}
            </select>
          </div>
          <div>
            <label style={LS}>Tipo de serviço {contratoId && "(do contrato)"}</label>
            <select style={IS} value={tipoServico} disabled={!!contratoId} onChange={(e) => { setTipoServico(e.target.value); carregarEscopo("", e.target.value); }}>
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
              {contratoId && contratoInfo?.objeto && <option>{contratoInfo.objeto}</option>}
            </select>
          </div>
          <div><label style={LS}>Contratante / cliente</label><input style={IS} value={contratante} onChange={(e) => setContratante(e.target.value)} placeholder="Ex.: Grupo SADA – Matriz, Betim/MG" /></div>
          <div><label style={LS}>Local dos serviços</label><input style={IS} value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex.: Betim/MG" /></div>
          <div><label style={LS}>Contato de emergência (p/ declaração)</label><input style={IS} value={contatoEmergencia} onChange={(e) => setContatoEmergencia(e.target.value)} placeholder="Nome — (31) 9…" /></div>
          <div><label style={LS}>Responsável SESMT (p/ declaração)</label><input style={IS} value={responsavelSesmt} onChange={(e) => setResponsavelSesmt(e.target.value)} placeholder="Nome — (31) 9…" /></div>
        </div>
      </div>

      {/* PASSO 2 — CHECKLIST */}
      <div style={CARD}>
        <Passo n={2} t={`Marque os documentos ${carregando ? "…" : `(o sistema reconheceu ${docsGeraveis.length} geráveis para este escopo)`}`} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#15803d", marginBottom: 6 }}>✏️ GERADOS AUTOMATICAMENTE PELO SISTEMA</p>
            {docsGeraveis.map((i) => (
              <label key={i.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: marcados.includes(i.key) ? "#f0fdf4" : "#f9fafb", border: `1px solid ${marcados.includes(i.key) ? "#86efac" : "#e5e7eb"}`, borderRadius: 9, marginBottom: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={marcados.includes(i.key)} onChange={() => toggle(marcados, setMarcados, i.key)} style={{ marginTop: 2, accentColor: "#334532" }} />
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{i.titulo}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "#6b7280" }}>{i.descricao}</span>
                </span>
                <span style={{ background: i.categoria === "FUNCIONARIO" ? "#e0e7ff" : "#fef3c7", color: i.categoria === "FUNCIONARIO" ? "#3730a3" : "#92400e", padding: "1px 7px", borderRadius: 7, fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>
                  {i.categoria === "FUNCIONARIO" ? "POR FUNCIONÁRIO" : "COLETIVO"}
                </span>
              </label>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#92400e", marginBottom: 6 }}>📎 ANEXAR EXTERNAMENTE (o sistema não emite)</p>
            {docsAnexar.map((i) => (
              <div key={i.key} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 9, marginBottom: 6 }}>
                <span style={{ fontSize: 12 }}>📎</span>
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111" }}>{i.titulo}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "#6b7280" }}>{i.descricao}</span>
                </span>
              </div>
            ))}
            <p style={{ fontSize: 10.5, color: "#6b7280", marginTop: 8 }}>
              💡 Anexe ASOs, certificados NR e PGR/PCMSO no módulo <b>Documentos (GED)</b>. O status de validade de cada funcionário aparece na <b>Documentação SSO</b>.
            </p>
          </div>
        </div>
      </div>

      {/* PASSO 3 — FUNCIONÁRIOS */}
      <div style={CARD}>
        <Passo n={3} t="Selecione os funcionários (todos, alguns ou um só)" />
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => setSelecionados(funcionarios.map((f) => f.id))} style={{ background: "#e8f5ee", color: "#334532", border: "1px solid #bbf7d0", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Selecionar todos ({funcionarios.length})</button>
          {contratoInfo && <button onClick={() => setSelecionados(funcionarios.filter((f) => f.mobilizado).map((f) => f.id))} style={{ background: "#e0e7ff", color: "#3730a3", border: "1px solid #c7d2fe", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Só mobilizados no contrato</button>}
          <button onClick={() => setSelecionados([])} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Limpar</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
          {funcionarios.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: selecionados.includes(f.id) ? "#f0fdf4" : "#f9fafb", border: `1px solid ${selecionados.includes(f.id) ? "#86efac" : "#e5e7eb"}`, borderRadius: 9 }}>
              <input type="checkbox" checked={selecionados.includes(f.id)} onChange={() => toggle(selecionados, setSelecionados, f.id)} style={{ accentColor: "#334532" }} />
              <span style={{ flex: 1, cursor: "pointer" }} onClick={() => toggle(selecionados, setSelecionados, f.id)}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{f.name}</span>
                <span style={{ display: "block", fontSize: 10, color: "#6b7280" }}>{f.role}{f.mobilizado ? " · 🦺 mobilizado" : ""}</span>
              </span>
              <button onClick={() => gerar(f.id)} title="Gerar documentos só deste funcionário"
                style={{ background: "#e0e7ff", color: "#3730a3", border: "none", padding: "4px 9px", borderRadius: 7, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>📄 Só ele</button>
            </div>
          ))}
        </div>
      </div>

      {/* GERAR */}
      <div style={{ ...CARD, background: "#334532", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "#fff", fontSize: 13 }}>
          <b>{totalDocs} documento(s)</b> serão gerados — {coletivos} coletivo(s) + {porFuncionario} por funcionário × {selecionados.length} funcionário(s)
        </div>
        <button onClick={() => gerar()} disabled={totalDocs === 0}
          style={{ background: totalDocs === 0 ? "#6b7280" : "#e8621a", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 9, cursor: totalDocs === 0 ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 800 }}>
          ⚡ Gerar documentos automaticamente
        </button>
      </div>
    </div>
  );
}
