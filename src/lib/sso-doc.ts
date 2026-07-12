/**
 * Verdelimp ERP — Documentação SSO (Saúde e Segurança do Trabalho)
 * Gera o dossiê mensal (por funcionário ou consolidado) seguindo a
 * "Relação dos Documentos de Saúde e Segurança do Trabalho" exigida
 * pelas contratantes (modelo Grupo SADA – Matriz Betim/MG, 19 itens).
 * HTML pronto para impressão (Ctrl+P → Salvar como PDF).
 */

export interface TreinamentoSso {
  tipo: string;         // NR-06, NR-12, NR-35, ASO, FISPQ…
  emissao?: string;     // dd/mm/aaaa
  validade?: string;    // dd/mm/aaaa
  instituicao?: string;
  status: "valido" | "a_vencer" | "vencido";
}

export interface EntregaEpiSso {
  item: string;
  quantidade: number;
  dataEntrega: string;
  ca?: string;
  validadeCa?: string;
}

export interface DocumentoFuncSso {
  tipo: string;
  validade?: string;
  status: "valido" | "a_vencer" | "vencido";
}

export interface FuncionarioSso {
  nome: string;
  cpf?: string;
  funcao: string;
  admissao?: string;
  status: string;
  treinamentos: TreinamentoSso[];
  epis: EntregaEpiSso[];
  documentos: DocumentoFuncSso[];
  aso?: TreinamentoSso[]; // ASOs reais (tabela AsoExam); preferido quando presente
}

export interface SsoDocData {
  competencia: string;      // "Julho/2026"
  atividade: string;        // "JARDINAGEM"
  contratante?: string;     // "Grupo SADA – Matriz, Betim/MG"
  empresa: { razaoSocial: string; cnpj: string; endereco: string; telefone: string; email: string };
  contatoEmergencia?: string;
  responsavelSesmt?: string;
  indicadores?: { homensHora?: string; desvios?: string; incidentes?: string; tfsa?: string; tfca?: string };
  funcionarios: FuncionarioSso[];
  consolidado: boolean;     // true = documento geral com todos os trabalhadores
}

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const badge = (status: string) => {
  const cfg: Record<string, [string, string, string]> = {
    valido: ["ATENDE", "#dcfce7", "#15803d"],
    a_vencer: ["A VENCER", "#fef3c7", "#92400e"],
    vencido: ["VENCIDO", "#fee2e2", "#991b1b"],
    pendente: ["PENDENTE", "#fee2e2", "#991b1b"],
    manual: ["ANEXAR", "#e0e7ff", "#3730a3"],
    na: ["N/A", "#f3f4f6", "#6b7280"],
  };
  const [label, bg, cor] = cfg[status] || cfg.manual;
  return `<span class="badge" style="background:${bg};color:${cor}">${label}</span>`;
};

function statusGeral(lista: { status: string }[]): string {
  if (lista.length === 0) return "pendente";
  if (lista.some((x) => x.status === "vencido")) return "vencido";
  if (lista.some((x) => x.status === "a_vencer")) return "a_vencer";
  return "valido";
}

export function gerarHtmlSso(d: SsoDocData): string {
  const rodape = `${esc(d.empresa.razaoSocial)} | CNPJ ${esc(d.empresa.cnpj)} | Documentação SSO – ${esc(d.competencia)}`;

  const secaoFuncionario = (f: FuncionarioSso) => {
    // ASO real (tabela AsoExam) tem prioridade; só cai no texto de treinamentos/docs
    // como compatibilidade com cadastros antigos.
    const asos = (f.aso && f.aso.length) ? f.aso
      : f.treinamentos.filter((t) => t.tipo.toUpperCase().includes("ASO")).concat(
        f.documentos.filter((x) => x.tipo.toUpperCase().includes("ASO")).map((x) => ({ tipo: x.tipo, validade: x.validade, status: x.status } as TreinamentoSso)));
    const nrs = f.treinamentos.filter((t) => t.tipo.toUpperCase().startsWith("NR"));
    const nrMaquinas = nrs.filter((t) => ["NR-12", "NR-06"].includes(t.tipo.toUpperCase()));
    const nr35 = nrs.filter((t) => t.tipo.toUpperCase() === "NR-35");
    const fispq = f.treinamentos.filter((t) => t.tipo.toUpperCase().includes("FISPQ"));

    const linhaChecklist = (num: number, texto: string, status: string, evidencia: string) => `
      <tr><td class="c"><b>${num}</b></td><td>${texto}</td><td class="c">${badge(status)}</td><td class="small">${evidencia}</td></tr>`;

    return `
    <div class="page">
      <div class="topo">
        <div class="marca">🌿 VERDELIMP <span>SERVIÇOS</span></div>
        <div class="doc-tit">DOCUMENTAÇÃO DE SAÚDE E SEGURANÇA DO TRABALHO</div>
        <div class="doc-sub">Competência: <b>${esc(d.competencia)}</b> &nbsp;|&nbsp; Atividade: <b>${esc(d.atividade)}</b>${d.contratante ? ` &nbsp;|&nbsp; Contratante: <b>${esc(d.contratante)}</b>` : ""}</div>
      </div>

      <h2 class="sec">IDENTIFICAÇÃO DO TRABALHADOR (Itens 1 e 2)</h2>
      <table>
        <tbody>
          <tr><td style="width:30%"><b>Nome</b></td><td>${esc(f.nome)}</td></tr>
          <tr><td><b>CPF</b></td><td>${esc(f.cpf || "A preencher")}</td></tr>
          <tr><td><b>Função</b></td><td>${esc(f.funcao)}</td></tr>
          <tr><td><b>Admissão (vínculo)</b></td><td>${esc(f.admissao || "—")}</td></tr>
          <tr><td><b>Situação</b></td><td>${esc(f.status.toUpperCase())}</td></tr>
          <tr><td><b>Empregador</b></td><td>${esc(d.empresa.razaoSocial)} – CNPJ ${esc(d.empresa.cnpj)}</td></tr>
        </tbody>
      </table>

      <h2 class="sec">CHECKLIST DOS REQUISITOS SSO (Relação da contratante – 19 itens)</h2>
      <table>
        <thead><tr><th style="width:6%" class="c">ITEM</th><th style="width:47%">REQUISITO</th><th style="width:13%" class="c">SITUAÇÃO</th><th>EVIDÊNCIA / OBSERVAÇÃO</th></tr></thead>
        <tbody>
          ${linhaChecklist(1, "Relação dos trabalhadores ativos (nome, CPF, RG e função)", "valido", `Constante neste dossiê — ${esc(f.nome)}, ${esc(f.funcao)}`)}
          ${linhaChecklist(2, "Ficha de registro do trabalhador (vínculo com a empresa)", f.admissao ? "valido" : "pendente", f.admissao ? `Registro ativo desde ${esc(f.admissao)}` : "Anexar ficha de registro")}
          ${linhaChecklist(3, "PGR e PCMSO", "manual", "Programas da empresa — anexar versão vigente")}
          ${linhaChecklist(4, "Procedimentos detalhados e assinados pelos trabalhadores", "manual", "Anexar procedimento operacional assinado")}
          ${linhaChecklist(5, "ASO do trabalhador", statusGeral(asos), asos.length ? asos.map((a) => `ASO válido até ${esc(a.validade || "—")}`).join("; ") : "Sem ASO cadastrado no sistema")}
          ${linhaChecklist(6, "Ordem de Serviço do trabalhador", "manual", "Emitir OS conforme função e riscos da atividade")}
          ${linhaChecklist(7, "Certificados de treinamentos válidos conforme NRs aplicáveis", statusGeral(nrs), nrs.length ? nrs.map((t) => `${esc(t.tipo)} até ${esc(t.validade || "—")}`).join("; ") : "Sem treinamentos NR cadastrados")}
          ${linhaChecklist(8, "Treinamento para Motosserra, Motopoda e Roçadeira (NR-12/NR-06)", nrMaquinas.length ? statusGeral(nrMaquinas) : "pendente", nrMaquinas.length ? nrMaquinas.map((t) => `${esc(t.tipo)} até ${esc(t.validade || "—")}`).join("; ") : "Aplicável a operadores — verificar")}
          ${linhaChecklist(9, "Treinamento de trabalho em altura NR-35 (caso aplicável)", nr35.length ? statusGeral(nr35) : "na", nr35.length ? nr35.map((t) => `NR-35 até ${esc(t.validade || "—")}`).join("; ") : "Não aplicável à função ou não cadastrado")}
          ${linhaChecklist(10, "Autorização de Trabalho em altura (NR-35), enviada também por e-mail", nr35.length ? "manual" : "na", nr35.length ? "Emitir autorização do empregador" : "Não aplicável")}
          ${linhaChecklist(11, "Treinamento FISPQ para atividades com produtos químicos", fispq.length ? statusGeral(fispq) : "na", fispq.length ? fispq.map((t) => `${esc(t.tipo)} até ${esc(t.validade || "—")}`).join("; ") : "Aplicável a quem manuseia químicos")}
          ${linhaChecklist(12, "Ficha de entrega dos EPI", f.epis.length ? "valido" : "pendente", f.epis.length ? `${f.epis.length} entrega(s) registrada(s) — detalhamento abaixo` : "Sem entregas de EPI registradas")}
          ${linhaChecklist(13, "Nome e telefone para contato em caso de emergência", d.contatoEmergencia ? "valido" : "pendente", esc(d.contatoEmergencia || "Informar contato de emergência"))}
          ${linhaChecklist(14, "Responsável SESMT e coordenador operacional (nome e telefone)", d.responsavelSesmt ? "valido" : "pendente", esc(d.responsavelSesmt || "Informar responsável SESMT"))}
          ${linhaChecklist(15, "Indicadores de segurança mensais (até 5º dia útil): HH, Desvios, Incidentes, TFSA, TFCA", d.indicadores ? "valido" : "manual", d.indicadores ? `HH: ${esc(d.indicadores.homensHora || "—")} | Desvios: ${esc(d.indicadores.desvios || "—")} | Incidentes: ${esc(d.indicadores.incidentes || "—")} | TFSA: ${esc(d.indicadores.tfsa || "—")} | TFCA: ${esc(d.indicadores.tfca || "—")}` : "Preencher indicadores do mês")}
          ${linhaChecklist(16, "Acompanhamento mensal dos programas: PGR, PCMSO, AET, treinamentos, DDSS", "manual", "Evidenciar por atas/listas de presença do mês")}
          ${linhaChecklist(17, "Treinamento de integração próprio para o local de trabalho", "manual", "Anexar certificado de integração da VERDELIMP")}
          ${linhaChecklist(18, "Treinamento de integração da contratante antes de iniciar os serviços", "manual", "Registrar participação na integração da contratante")}
          ${linhaChecklist(19, "Plano de Preparação e Resposta a Emergência (PPRE) da contratante — para ciência", "valido", "Ciência registrada — seguir PPRE vigente")}
        </tbody>
      </table>

      ${f.epis.length > 0 ? `
      <h2 class="sec">FICHA DE ENTREGA DE EPI (Item 12 — detalhamento)</h2>
      <table>
        <thead><tr><th>EPI</th><th class="c">QTD</th><th class="c">ENTREGA</th><th class="c">CA</th><th class="c">VALIDADE CA</th></tr></thead>
        <tbody>${f.epis.map((e) => `<tr><td>${esc(e.item)}</td><td class="c">${e.quantidade}</td><td class="c">${esc(e.dataEntrega)}</td><td class="c">${esc(e.ca || "—")}</td><td class="c">${esc(e.validadeCa || "—")}</td></tr>`).join("")}</tbody>
      </table>` : ""}

      ${f.treinamentos.length > 0 ? `
      <h2 class="sec">TREINAMENTOS E CAPACITAÇÕES (Itens 7 a 11 — detalhamento)</h2>
      <table>
        <thead><tr><th>TREINAMENTO</th><th class="c">EMISSÃO</th><th class="c">VALIDADE</th><th>INSTITUIÇÃO</th><th class="c">SITUAÇÃO</th></tr></thead>
        <tbody>${f.treinamentos.map((t) => `<tr><td><b>${esc(t.tipo)}</b></td><td class="c">${esc(t.emissao || "—")}</td><td class="c">${esc(t.validade || "—")}</td><td>${esc(t.instituicao || "—")}</td><td class="c">${badge(t.status)}</td></tr>`).join("")}</tbody>
      </table>` : ""}

      <div class="assin">
        <div><div class="linha"></div>Trabalhador<br><span>${esc(f.nome)}</span></div>
        <div><div class="linha"></div>Responsável SESMT / Empregador<br><span>${esc(d.empresa.razaoSocial)}</span></div>
      </div>
      <div class="rodape">${rodape}</div>
    </div>`;
  };

  const capaConsolidada = !d.consolidado ? "" : `
    <div class="page">
      <div class="topo">
        <div class="marca">🌿 VERDELIMP <span>SERVIÇOS</span></div>
        <div class="doc-tit">RELAÇÃO DOS DOCUMENTOS DE SAÚDE E SEGURANÇA DO TRABALHO</div>
        <div class="doc-sub">${d.contratante ? `Para atividades em: <b>${esc(d.contratante)}</b> &nbsp;|&nbsp; ` : ""}Atividade: <b>${esc(d.atividade)}</b> &nbsp;|&nbsp; Competência: <b>${esc(d.competencia)}</b></div>
      </div>
      <h2 class="sec">ITEM 1 — RELAÇÃO DOS TRABALHADORES ATIVOS</h2>
      <table>
        <thead><tr><th style="width:5%" class="c">Nº</th><th>NOME</th><th class="c">CPF</th><th>FUNÇÃO</th><th class="c">ADMISSÃO</th></tr></thead>
        <tbody>${d.funcionarios.map((f, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(f.nome)}</b></td><td class="c">${esc(f.cpf || "—")}</td><td>${esc(f.funcao)}</td><td class="c">${esc(f.admissao || "—")}</td></tr>`).join("")}</tbody>
      </table>
      <h2 class="sec">CONTATOS (Itens 13 e 14)</h2>
      <table>
        <tbody>
          <tr><td style="width:40%"><b>Contato de emergência</b></td><td>${esc(d.contatoEmergencia || "A preencher")}</td></tr>
          <tr><td><b>Responsável SESMT / Coordenador operacional</b></td><td>${esc(d.responsavelSesmt || "A preencher")}</td></tr>
          <tr><td><b>Empregador</b></td><td>${esc(d.empresa.razaoSocial)} — ${esc(d.empresa.telefone)} — ${esc(d.empresa.email)}</td></tr>
        </tbody>
      </table>
      ${d.indicadores ? `
      <h2 class="sec">ITEM 15 — INDICADORES DE SEGURANÇA DO MÊS</h2>
      <table>
        <thead><tr><th class="c">HOMENS HORA</th><th class="c">DESVIOS</th><th class="c">INCIDENTES</th><th class="c">TFSA</th><th class="c">TFCA</th></tr></thead>
        <tbody><tr>
          <td class="c">${esc(d.indicadores.homensHora || "—")}</td><td class="c">${esc(d.indicadores.desvios || "—")}</td>
          <td class="c">${esc(d.indicadores.incidentes || "—")}</td><td class="c">${esc(d.indicadores.tfsa || "—")}</td>
          <td class="c">${esc(d.indicadores.tfca || "—")}</td>
        </tr></tbody>
      </table>` : ""}
      <p class="nota">As páginas seguintes apresentam o dossiê individual de cada trabalhador, com o checklist completo dos 19 requisitos, treinamentos, ASO e fichas de EPI.</p>
      <div class="rodape">${rodape}</div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Documentação SSO — ${esc(d.competencia)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#f3f4f6;font-size:11px;line-height:1.45}
  @media print{
    body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none!important}
    .page{box-shadow:none!important;margin:0 auto!important;page-break-after:always}
    .page:last-child{page-break-after:auto}
  }
  .page{width:210mm;min-height:280mm;margin:10px auto;padding:13mm 15mm 18mm;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.12);position:relative}
  .topo{border-bottom:3px solid #2e7d32;padding-bottom:10px;margin-bottom:14px}
  .marca{font-size:16px;font-weight:900;color:#334532}
  .marca span{font-weight:400;font-size:11px;color:#6b7280}
  .doc-tit{font-size:14px;font-weight:800;color:#2e7d32;margin-top:8px}
  .doc-sub{font-size:10.5px;color:#374151;margin-top:3px}
  h2.sec{font-size:11.5px;font-weight:800;color:#2e7d32;margin:14px 0 5px;text-transform:uppercase;letter-spacing:.3px}
  table{width:100%;border-collapse:collapse;margin:4px 0 10px}
  th{background:#2e7d32;color:#fff;font-size:9px;font-weight:700;padding:6px 8px;text-align:left;text-transform:uppercase}
  th.c,td.c{text-align:center}
  td{padding:5px 8px;font-size:10px;border:1px solid #e5e7eb;vertical-align:top}
  tbody tr:nth-child(even) td{background:#f7f9f7}
  td.small{font-size:9px;color:#4b5563}
  .badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:8.5px;font-weight:800;white-space:nowrap}
  .assin{display:flex;gap:40px;margin-top:40px;text-align:center;font-size:10px;color:#374151}
  .assin>div{flex:1}
  .assin .linha{border-top:1.4px solid #333;margin-bottom:5px}
  .assin span{font-weight:700}
  .nota{font-size:10px;color:#6b7280;font-style:italic;margin-top:10px}
  .rodape{position:absolute;bottom:8mm;left:15mm;right:15mm;text-align:center;font-size:8.5px;color:#b0b6bd}
  .printbar{position:sticky;top:0;background:#334532;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:9}
  .printbar button{background:#e8621a;border:none;color:#fff;font-weight:700;padding:8px 22px;border-radius:6px;cursor:pointer;font-size:13px}
</style>
</head>
<body>
<div class="printbar no-print">
  <span>🦺 Documentação SSO — ${esc(d.competencia)} — use <b>Imprimir → Salvar como PDF</b></span>
  <button onclick="window.print()">🖨️ Imprimir / PDF</button>
</div>
${capaConsolidada}
${d.funcionarios.map(secaoFuncionario).join("")}
</body>
</html>`;
}
