"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { estiloInput, estiloLabel } from "@/lib/estilos";

type ImportRow = {
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: "previsto" | "em_aberto" | "pago" | "recebido" | "vencido" | "cancelado";
  categoryName: string | null;
  supplierName: string | null;
  supplierCnpj: string | null;
  competence: string | null;
  costCenter: string | null;
  contractNumber: string | null;
  notes: string | null;
  sourceLine: number;
};

type PreviewRow = {
  sourceLine?: number;
  description: string;
  amount: number;
  dueDate: string;
  categoryName?: string | null;
  supplierName?: string | null;
  contractNumber?: string | null;
  state: "valid" | "duplicate_file" | "duplicate_database" | "error";
  error?: string | null;
};

type PreviewResult = {
  summary: {
    total: number;
    valid: number;
    duplicatesFile: number;
    duplicatesDatabase: number;
    errors: number;
    amountValid: number;
  };
  preview: PreviewRow[];
};

type ImportResult = {
  batchId: string;
  imported: number;
  duplicates: number;
  validationErrors: number;
  errors: Array<{ line?: number; description: string; error: string }>;
  canRollback: boolean;
};

const iso = () => new Date().toISOString().slice(0, 10);
const empty: Record<string, any> = {
  description: "",
  amount: "",
  recurrence: "MONTHLY",
  dueDay: new Date().getDate(),
  startDate: iso(),
  nextDueDate: iso(),
  active: true,
};

const aliases: Record<string, string[]> = {
  description: ["descricao", "historico", "despesa", "nome", "lancamento"],
  amount: ["valor", "valorbruto", "total", "valordespesa"],
  dueDate: ["vencimento", "datavencimento", "data", "datadovencimento"],
  paidAt: ["pagamento", "datapagamento", "datadopagamento"],
  status: ["status", "situacao"],
  categoryName: ["categoria", "grupo", "natureza"],
  supplierName: ["fornecedor", "favorecido", "credor"],
  supplierCnpj: ["cnpj", "cnpjfornecedor", "documentofornecedor"],
  competence: ["competencia", "mes", "periodo"],
  costCenter: ["centrodecusto", "centrocustos", "obra"],
  contractNumber: ["contrato", "numerocontrato"],
  notes: ["observacao", "observacoes", "nota"],
};

const painel: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e4e9e5",
  borderRadius: 14,
};

function money(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function norm(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAmount(value: string) {
  const clean = value.replace(/R\$/gi, "").replace(/\s/g, "");
  if (!clean) return NaN;
  if (clean.includes(",")) return Number(clean.replace(/\./g, "").replace(",", "."));
  return Number(clean);
}

function normalizeDate(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return text;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function normalizeStatus(value: string, paidAt: string | null): ImportRow["status"] {
  if (paidAt) return "pago";
  const text = norm(value);
  if (["pago", "quitado", "baixado"].includes(text)) return "pago";
  if (["recebido"].includes(text)) return "recebido";
  if (["vencido", "atrasado"].includes(text)) return "vencido";
  if (["cancelado", "cancelada"].includes(text)) return "cancelado";
  if (["previsto", "previsao"].includes(text)) return "previsto";
  return "em_aberto";
}

function splitCsvLine(line: string, separator: string) {
  const output: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      output.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  output.push(current.trim());
  return output;
}

function parseCSV(text: string): { rows: ImportRow[]; warnings: string[] } {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { rows: [], warnings: ["O arquivo não contém linhas de dados."] };
  const first = lines[0];
  const separator = first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  const headers = splitCsvLine(first, separator).map(norm);
  const indexes: Record<string, number> = {};
  for (const [key, names] of Object.entries(aliases)) indexes[key] = headers.findIndex((header) => names.includes(header));
  const warnings: string[] = [];
  for (const required of ["description", "amount", "dueDate"]) {
    if (indexes[required] < 0) warnings.push(`Coluna obrigatória não localizada: ${required}.`);
  }
  const value = (columns: string[], key: string) => indexes[key] >= 0 ? columns[indexes[key]] || "" : "";

  const rows = lines.slice(1).map((line, index) => {
    const columns = splitCsvLine(line, separator);
    const paidAt = normalizeDate(value(columns, "paidAt")) || null;
    return {
      description: value(columns, "description").trim(),
      amount: parseAmount(value(columns, "amount")),
      dueDate: normalizeDate(value(columns, "dueDate")),
      paidAt,
      status: normalizeStatus(value(columns, "status"), paidAt),
      categoryName: value(columns, "categoryName").trim() || null,
      supplierName: value(columns, "supplierName").trim() || null,
      supplierCnpj: value(columns, "supplierCnpj").trim() || null,
      competence: value(columns, "competence").trim() || null,
      costCenter: value(columns, "costCenter").trim() || null,
      contractNumber: value(columns, "contractNumber").trim() || null,
      notes: value(columns, "notes").trim() || null,
      sourceLine: index + 2,
    } satisfies ImportRow;
  });
  return { rows, warnings };
}

export default function FinanceiroAvancado() {
  const [tab, setTab] = useState("rec");
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, any>>(empty);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [ai, setAi] = useState<any>(null);
  const [docText, setDocText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => fetch("/api/financeiro/recorrencias").then((response) => response.json()).then((json) => setRules(json.rules || []));
  useEffect(() => { load(); }, []);
  const set = (key: string, value: any) => setForm((previous) => ({ ...previous, [key]: value }));

  const save = async () => {
    setBusy("Salvando regra...");
    const response = await fetch("/api/financeiro/recorrencias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, action: "save", amount: Number(form.amount), dueDay: Number(form.dueDay) }) });
    const json = await response.json();
    setBusy("");
    setMessage(response.ok ? "Conta recorrente salva." : json.error || "Erro ao salvar regra.");
    if (response.ok) { setForm(empty); load(); }
  };

  const generate = async () => {
    const until = new Date();
    until.setMonth(until.getMonth() + 3);
    setBusy("Gerando lançamentos...");
    const response = await fetch("/api/financeiro/recorrencias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "generate", until: until.toISOString().slice(0, 10) }) });
    const json = await response.json();
    setBusy("");
    setMessage(response.ok ? `${json.generated} lançamento(s) gerado(s).` : json.error || "Erro ao gerar lançamentos.");
  };

  const requestPreview = async (parsedRows: ImportRow[], name: string) => {
    setBusy("Validando datas, valores e duplicidades...");
    setPreview(null);
    setImportResult(null);
    const response = await fetch("/api/financeiro/importar-despesas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "preview", rows: parsedRows, fileName: name }) });
    const json = await response.json();
    setBusy("");
    if (!response.ok) { setMessage(json.error || "Não foi possível validar a planilha."); return; }
    setPreview(json);
    setMessage(`${json.summary.valid} linha(s) apta(s) para importação.`);
  };

  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMessage("");
    const parsed = parseCSV(await file.text());
    setRows(parsed.rows);
    if (parsed.warnings.length) {
      setPreview(null);
      setMessage(parsed.warnings.join(" "));
      return;
    }
    await requestPreview(parsed.rows, file.name);
  };

  const importRows = async () => {
    if (!preview?.summary.valid) return;
    setBusy("Importando lote e registrando auditoria...");
    const response = await fetch("/api/financeiro/importar-despesas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "import", rows, fileName }) });
    const json = await response.json();
    setBusy("");
    if (!response.ok && response.status !== 207) { setMessage(json.error || "Falha na importação."); return; }
    setImportResult(json);
    setMessage(`Lote ${json.batchId}: ${json.imported} despesa(s) importada(s), ${json.duplicates} duplicidade(s).`);
    setPreview(null);
  };

  const rollback = async () => {
    if (!importResult?.batchId || !window.confirm("Reverter este lote? Os lançamentos importados serão removidos das telas, mas o histórico de auditoria será preservado.")) return;
    setBusy("Revertendo lote...");
    const response = await fetch("/api/financeiro/importar-despesas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rollback", batchId: importResult.batchId }) });
    const json = await response.json();
    setBusy("");
    setMessage(response.ok ? `${json.reversed} lançamento(s) revertido(s) no lote ${json.batchId}.` : json.error || "Falha ao reverter lote.");
    if (response.ok) setImportResult((previous) => previous ? { ...previous, canRollback: false } : previous);
  };

  const downloadTemplate = () => {
    const content = "descricao;valor;vencimento;pagamento;status;categoria;fornecedor;cnpj;competencia;centro de custo;contrato;observacoes\nExemplo de despesa;1250,00;31/07/2026;;em_aberto;Operacional;Fornecedor Exemplo;;07/2026;Administrativo;;\n";
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "modelo-importacao-despesas-verdelimp.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const extract = async () => {
    setAi(null);
    setBusy("Analisando documento...");
    const response = await fetch("/api/ia/extrair-documento-financeiro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: docText, sourceName: "texto colado" }) });
    const json = await response.json();
    setBusy("");
    if (!response.ok) { setMessage(json.error || "Erro na análise."); return; }
    setAi(json);
  };

  const edit = (rule: any) => setForm({ id: rule.id, description: rule.description, amount: Number(rule.amount), recurrence: rule.recurrence, dueDay: rule.due_day, startDate: new Date(rule.start_date).toISOString().slice(0, 10), endDate: rule.end_date ? new Date(rule.end_date).toISOString().slice(0, 10) : "", nextDueDate: new Date(rule.next_due_date).toISOString().slice(0, 10), costCenter: rule.cost_center || "", competencePrefix: rule.competence_prefix || "", defaultNotes: rule.default_notes || "", active: rule.active });
  const statusCount = useMemo(() => preview ? {
    duplicate: preview.summary.duplicatesFile + preview.summary.duplicatesDatabase,
    invalid: preview.summary.errors,
  } : { duplicate: 0, invalid: 0 }, [preview]);

  return (
    <div style={{ maxWidth: 1250, margin: "0 auto" }}>
      <header style={{ marginBottom: 14 }}><p style={{ color: "#e05008", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 5 }}>Controle e automação financeira</p><h1 style={{ margin: 0, color: "#263827", fontSize: 24 }}>Financeiro avançado</h1><p style={{ fontSize: 11, color: "#6f7972", marginTop: 5 }}>Recorrências, importação auditável e leitura assistida de documentos.</p></header>

      <div style={{ display: "flex", gap: 7, marginBottom: 12, overflowX: "auto" }}>{[["rec", "Recorrências"], ["import", "Importar planilha"], ["ia", "Ler boleto ou NF"]].map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} style={{ flex: "0 0 auto", background: tab === id ? "#334532" : "#fff", color: tab === id ? "#fff" : "#526056", border: "1px solid #d9dfda", borderRadius: 9, padding: "8px 13px", cursor: "pointer", fontSize: 10, fontWeight: 800 }}>{label}</button>)}</div>
      {busy && <div style={{ background: "#edf5fb", color: "#27547d", padding: "9px 11px", borderRadius: 9, marginBottom: 10, fontSize: 10 }}>⟳ {busy}</div>}
      {message && <div style={{ background: "#fff9e9", color: "#805b0d", padding: "9px 11px", borderRadius: 9, marginBottom: 10, fontSize: 10 }}>{message}</div>}

      {tab === "rec" && <><section style={{ ...painel, padding: 15, marginBottom: 12 }}><div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 100px", gap: 9 }}><div><label style={estiloLabel}>Descrição</label><input style={estiloInput} value={form.description} onChange={(event) => set("description", event.target.value)} /></div><div><label style={estiloLabel}>Valor</label><input type="number" style={estiloInput} value={form.amount} onChange={(event) => set("amount", event.target.value)} /></div><div><label style={estiloLabel}>Recorrência</label><select style={estiloInput} value={form.recurrence} onChange={(event) => set("recurrence", event.target.value)}><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option><option value="QUARTERLY">Trimestral</option><option value="YEARLY">Anual</option></select></div><div><label style={estiloLabel}>Dia</label><input type="number" min="1" max="31" style={estiloInput} value={form.dueDay} onChange={(event) => set("dueDay", event.target.value)} /></div></div><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9, marginTop: 9 }}><div><label style={estiloLabel}>Início</label><input type="date" style={estiloInput} value={form.startDate} onChange={(event) => set("startDate", event.target.value)} /></div><div><label style={estiloLabel}>Próximo vencimento</label><input type="date" style={estiloInput} value={form.nextDueDate} onChange={(event) => set("nextDueDate", event.target.value)} /></div><div><label style={estiloLabel}>Término</label><input type="date" style={estiloInput} value={form.endDate || ""} onChange={(event) => set("endDate", event.target.value)} /></div><div><label style={estiloLabel}>Centro de custos</label><input style={estiloInput} value={form.costCenter || ""} onChange={(event) => set("costCenter", event.target.value)} /></div></div><div style={{ display: "flex", gap: 8, marginTop: 10 }}><button type="button" onClick={save} disabled={!form.description || !form.amount || !!busy} style={{ background: "#4a9410", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontWeight: 800, fontSize: 10 }}>Salvar regra</button><button type="button" onClick={generate} disabled={!!busy} style={{ background: "#67508c", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontWeight: 800, fontSize: 10 }}>Gerar próximos 3 meses</button></div></section><section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 9 }}>{rules.map((rule) => <article key={rule.id} style={{ ...painel, padding: 12 }}><strong style={{ color: "#263827", fontSize: 11 }}>{rule.description}</strong><div style={{ fontSize: 18, fontWeight: 850, color: "#ad450f", marginTop: 4 }}>{money(rule.amount)}</div><div style={{ fontSize: 9, color: "#77827a" }}>{rule.recurrence} · próximo {new Date(rule.next_due_date).toLocaleDateString("pt-BR")} · {rule.cost_center || "sem centro de custos"}</div><button type="button" onClick={() => edit(rule)} style={{ marginTop: 7, border: "1px solid #dfe4df", background: "#fff", borderRadius: 6, padding: "4px 8px", fontSize: 9 }}>Editar</button></article>)}</section></>}

      {tab === "import" && <section style={{ ...painel, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}><div><h2 style={{ fontSize: 15, color: "#263827", margin: 0 }}>Importar despesas em lote</h2><p style={{ fontSize: 10, color: "#6f7972", marginTop: 4, maxWidth: 720, lineHeight: 1.45 }}>Exporte a planilha do Excel como CSV. O sistema valida campos, datas e duplicidades antes de gravar. Cada importação recebe um identificador e pode ser revertida.</p></div><button type="button" onClick={downloadTemplate} style={{ border: "1px solid #d9dfda", borderRadius: 8, padding: "7px 10px", background: "#fff", color: "#334532", fontSize: 9, fontWeight: 800, cursor: "pointer" }}>Baixar modelo CSV</button></div><div style={{ marginTop: 13, padding: 13, border: "1px dashed #bfc9c1", borderRadius: 11, background: "#fafbfa" }}><input ref={fileRef} type="file" accept=".csv,text/csv" onChange={selectFile} /><p style={{ color: "#89938c", fontSize: 9, marginTop: 6 }}>Obrigatórias: descrição, valor e vencimento. O limite é de 5.000 linhas por lote.</p></div>{preview && <><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 13 }}>{[["Aptas", preview.summary.valid, "#2f702e"], ["Valor válido", money(preview.summary.amountValid), "#334532"], ["Duplicadas", statusCount.duplicate, "#ad650e"], ["Inválidas", statusCount.invalid, statusCount.invalid ? "#b9380a" : "#2f702e"]].map(([label, value, color]) => <div key={String(label)} style={{ border: "1px solid #e5e9e5", borderTop: `3px solid ${color}`, borderRadius: 10, padding: 10 }}><span style={{ display: "block", color: "#7a847d", fontSize: 8, fontWeight: 800, textTransform: "uppercase" }}>{label}</span><strong style={{ display: "block", color: String(color), fontSize: 17, marginTop: 3 }}>{value}</strong></div>)}</div><div style={{ overflowX: "auto", marginTop: 12 }}><table style={{ width: "100%", minWidth: 850, fontSize: 9, borderCollapse: "collapse" }}><thead><tr>{["Linha", "Situação", "Descrição", "Valor", "Vencimento", "Categoria", "Fornecedor", "Observação"].map((label) => <th key={label} style={{ padding: 7, textAlign: "left", background: "#edf3ed", color: "#445047" }}>{label}</th>)}</tr></thead><tbody>{preview.preview.slice(0, 100).map((item, index) => { const color = item.state === "valid" ? "#2f702e" : item.state === "error" ? "#b9380a" : "#ad650e"; return <tr key={`${item.sourceLine}-${index}`} style={{ borderBottom: "1px solid #edf0ed" }}><td style={{ padding: 7 }}>{item.sourceLine || "—"}</td><td style={{ color, fontWeight: 800 }}>{item.state === "valid" ? "Apta" : item.state === "error" ? "Inválida" : "Duplicada"}</td><td>{item.description}</td><td>{money(item.amount)}</td><td>{item.dueDate}</td><td>{item.categoryName || "—"}</td><td>{item.supplierName || "—"}</td><td style={{ color }}>{item.error || "—"}</td></tr>; })}</tbody></table></div>{preview.preview.length > 100 && <p style={{ color: "#7a847d", fontSize: 9, marginTop: 6 }}>Exibindo as primeiras 100 de {preview.preview.length} linhas analisadas.</p>}<button type="button" onClick={importRows} disabled={!preview.summary.valid || !!busy} style={{ marginTop: 12, background: "#4a9410", color: "#fff", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 850, fontSize: 10, cursor: "pointer" }}>Confirmar {preview.summary.valid} lançamento(s)</button></>}{importResult && <div style={{ marginTop: 13, border: "1px solid #d8e7d2", borderRadius: 10, padding: 12, background: "#f4faf1" }}><strong style={{ display: "block", color: "#334532", fontSize: 11 }}>Lote {importResult.batchId}</strong><span style={{ display: "block", color: "#647068", fontSize: 9, marginTop: 3 }}>{importResult.imported} importados · {importResult.duplicates} duplicados · {importResult.errors.length} falhas de gravação</span>{importResult.canRollback && <button type="button" onClick={rollback} disabled={!!busy} style={{ marginTop: 8, border: "1px solid #efc7b8", borderRadius: 7, padding: "6px 9px", background: "#fff7f3", color: "#a23b12", fontSize: 9, fontWeight: 800, cursor: "pointer" }}>Reverter este lote</button>}</div>}</section>}

      {tab === "ia" && <section style={{ ...painel, padding: 16 }}><h2 style={{ fontSize: 15, color: "#263827", margin: 0 }}>Leitura estruturada com validação humana</h2><p style={{ fontSize: 10, color: "#6f7972", marginTop: 4, marginBottom: 10 }}>Cole o texto de boleto, nota ou comprovante. Nenhum lançamento é criado sem revisão.</p><textarea style={{ ...estiloInput, minHeight: 180 }} value={docText} onChange={(event) => setDocText(event.target.value)} /><button type="button" onClick={extract} disabled={docText.length < 20 || !!busy} style={{ marginTop: 9, background: "#67508c", color: "#fff", border: 0, borderRadius: 8, padding: "9px 16px", fontWeight: 800, fontSize: 10 }}>Analisar documento</button>{ai && <div style={{ marginTop: 12, background: "#f9fafb", borderRadius: 9, padding: 12 }}><strong style={{ fontSize: 11 }}>{ai.data.documentType}</strong> · confiança {ai.data.confidence}%<pre style={{ fontSize: 10, whiteSpace: "pre-wrap" }}>{JSON.stringify(ai.data, null, 2)}</pre>{ai.requiresReview && <div style={{ color: "#991b1b", fontWeight: 800, fontSize: 10 }}>Revisão humana obrigatória antes do lançamento.</div>}</div>}</section>}
    </div>
  );
}
