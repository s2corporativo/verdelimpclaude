
"use client";
import { useState } from "react";

function renderDocsHtml(d: any, contrato: any): string {
  const dataAtual = new Date().toLocaleDateString("pt-BR");
  const empresa = d.empresa;
  const fmt = (v: number) => v?.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Documentos do Contrato</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#1a1a1a;font-size:11pt;line-height:1.5}
.toolbar{position:sticky;top:0;background:#0f5233;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:100}
.toolbar h1{font-size:14pt}
.toolbar button{background:#fff;color:#0f5233;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:700}
.page{max-width:21cm;margin:14pt auto;padding:1.5cm;background:#fff;box-shadow:0 0 8px rgba(0,0,0,0.1);page-break-after:always}
.page:last-child{page-break-after:auto}
h1{color:#0f5233;font-size:16pt;border-bottom:2px solid #1a7a4a;padding-bottom:6pt;margin-bottom:14pt}
h2{color:#0f5233;font-size:13pt;margin:14pt 0 8pt}
h3{color:#374151;font-size:11pt;margin:10pt 0 5pt}
.header-empresa{text-align:center;border-bottom:1px solid #1a7a4a;padding-bottom:9pt;margin-bottom:14pt}
.header-empresa h2{color:#0f5233;font-size:13pt}
.header-empresa p{font-size:9pt;color:#6b7280;margin:2pt 0}
table{width:100%;border-collapse:collapse;margin:8pt 0}
th{background:#e8f5ee;color:#0f5233;padding:6pt 8pt;text-align:left;font-size:9pt;font-weight:700;border:1px solid #d1d5db}
td{padding:5pt 8pt;border:1px solid #e5e7eb;font-size:10pt}
.checklist{background:#f9fafb;padding:9pt;border-radius:5pt;margin-bottom:6pt;border-left:3px solid #1a7a4a}
.assinatura{margin-top:30pt;text-align:center}
.assinatura .linha{border-top:1px solid #1a1a1a;width:60%;margin:0 auto;padding-top:4pt}
.box{border:1px solid #e5e7eb;border-radius:5pt;padding:10pt;margin:8pt 0;background:#f9fafb}
ul{margin-left:14pt}
li{margin:3pt 0}
@media print{
  .toolbar{display:none}
  body{background:#fff}
  .page{box-shadow:none;margin:0;padding:1.5cm}
}
.tag{display:inline-block;background:#dcfce7;color:#15803d;padding:2pt 7pt;border-radius:9pt;font-size:8pt;font-weight:700;margin:0 3pt}
.tag-warn{background:#fef9c3;color:#92400e}
.tag-info{background:#dbeafe;color:#1e40af}
</style></head><body>

<div class="toolbar">
  <h1>📄 Documentos do Contrato — ${empresa.razaoSocial}</h1>
  <button onclick="window.print()">🖨️ Imprimir / PDF</button>
</div>

<!-- ÍNDICE GERAL -->
<div class="page">
  <div class="header-empresa">
    <h2>${empresa.razaoSocial}</h2>
    <p>CNPJ: ${empresa.cnpj} · ${empresa.regime} · ${empresa.porte}</p>
    <p>${empresa.endereco}</p>
    <p>${empresa.telefone} · ${empresa.email}</p>
  </div>
  <h1>📋 Lista de Documentos do Contrato</h1>
  <p style="margin-bottom:14pt">${contrato.objeto || "Contrato"} — ${contrato.clienteNome || ""}</p>

  <h2>📊 Resumo</h2>
  <div class="box">
    <p><strong>Total de documentos:</strong> ${d.stats.total}</p>
    <p><strong>Documentos da empresa:</strong> ${d.stats.empresa}</p>
    <p><strong>Documentos por funcionário:</strong> ${d.stats.funcionarios} (${d.funcionarios.length} funcionários × ~${Math.round(d.stats.funcionarios / Math.max(d.funcionarios.length,1))} docs cada)</p>
    <p><strong>Documentos do contrato/obra:</strong> ${d.stats.contrato}</p>
    <p style="margin-top:6pt">📝 <strong>${d.stats.gerados}</strong> gerados pelo sistema · 📂 <strong>${d.stats.externos}</strong> obtidos externamente</p>
  </div>

  <h2>📂 Documentos da Empresa</h2>
  <table>
    <thead><tr><th>#</th><th>Documento</th><th>Origem</th><th>Validade</th><th>Como obter</th></tr></thead>
    <tbody>
    ${d.documentos.filter((doc: any) => doc.categoria === "EMPRESA").map((doc: any, i: number) => `
      <tr>
        <td>${i+1}</td>
        <td><strong>${doc.titulo}</strong><br><span style="font-size:9pt;color:#6b7280">${doc.descricao}</span></td>
        <td>${doc.origem || "—"}</td>
        <td>${doc.validade_meses ? doc.validade_meses + " meses" : "—"}</td>
        <td style="font-size:8pt">${doc.como_obter || ""}</td>
      </tr>
    `).join("")}
    </tbody>
  </table>

  <h2>👷 Documentos por Funcionário (${d.funcionarios.length} funcionários)</h2>
  <table>
    <thead><tr><th>#</th><th>Funcionário</th><th>Documento</th><th>Validade</th></tr></thead>
    <tbody>
    ${d.documentos.filter((doc: any) => doc.categoria === "FUNCIONARIO").map((doc: any, i: number) => `
      <tr>
        <td>${i+1}</td>
        <td>${doc.funcionarioNome}</td>
        <td>${doc.titulo.replace(" — " + doc.funcionarioNome, "")}</td>
        <td>${doc.validade_meses ? doc.validade_meses + " meses" : "—"}</td>
      </tr>
    `).join("")}
    </tbody>
  </table>

  <h2>🚧 Documentos do Contrato/Obra</h2>
  <table>
    <thead><tr><th>#</th><th>Documento</th><th>Tipo</th></tr></thead>
    <tbody>
    ${d.documentos.filter((doc: any) => doc.categoria === "CONTRATO").map((doc: any, i: number) => `
      <tr>
        <td>${i+1}</td>
        <td><strong>${doc.titulo}</strong><br><span style="font-size:9pt;color:#6b7280">${doc.descricao}</span></td>
        <td>${doc.tipo === "gerado" ? '<span class="tag">Gerado</span>' : '<span class="tag tag-info">Obtido externamente</span>'}</td>
      </tr>
    `).join("")}
    </tbody>
  </table>
</div>

<!-- DECLARAÇÃO DE NÃO EMPREGO DE MENOR -->
<div class="page">
  <div class="header-empresa">
    <h2>${empresa.razaoSocial}</h2>
    <p>CNPJ: ${empresa.cnpj}</p>
  </div>
  <h1>DECLARAÇÃO — NÃO EMPREGO DE MENOR</h1>
  <p style="margin:14pt 0">A <strong>${empresa.razaoSocial}</strong>, inscrita no CNPJ sob o nº ${empresa.cnpj}, com sede em ${empresa.endereco}, por intermédio de seu representante legal, <strong>DECLARA</strong>, para fins do disposto no inciso V do artigo 27 da Lei nº 8.666 de 21 de junho de 1993 e no inciso VI do art. 68 da Lei nº 14.133 de 1º de abril de 2021, acrescido pela Lei nº 9.854 de 27 de outubro de 1999, que NÃO emprega menor de dezoito anos em trabalho noturno, perigoso ou insalubre, e NÃO emprega menor de dezesseis anos.</p>
  <p>Ressalva: ( ) emprega menor, a partir de quatorze anos, na condição de aprendiz.</p>
  <p style="margin-top:20pt">Betim/MG, ${dataAtual}</p>
  <div class="assinatura">
    <div class="linha">${empresa.razaoSocial}</div>
    <p style="font-size:9pt;color:#6b7280;margin-top:3pt">CNPJ: ${empresa.cnpj}</p>
    <p style="font-size:9pt;color:#6b7280">Representante Legal</p>
  </div>
</div>

<!-- DECLARAÇÃO INEXISTÊNCIA FATO IMPEDITIVO -->
<div class="page">
  <div class="header-empresa">
    <h2>${empresa.razaoSocial}</h2>
    <p>CNPJ: ${empresa.cnpj}</p>
  </div>
  <h1>DECLARAÇÃO — INEXISTÊNCIA DE FATO IMPEDITIVO</h1>
  <p style="margin:14pt 0">A <strong>${empresa.razaoSocial}</strong>, inscrita no CNPJ sob o nº ${empresa.cnpj}, por seu representante legal infra-assinado, <strong>DECLARA</strong>, sob as penas da lei, que:</p>
  <ul style="margin:10pt 14pt">
    <li>Não está suspensa, declarada inidônea ou impedida de licitar e contratar com a Administração Pública;</li>
    <li>Inexistem fatos impeditivos para sua habilitação no presente certame, ciente da obrigatoriedade de declarar ocorrências posteriores;</li>
    <li>Cumpre plenamente os requisitos de habilitação;</li>
    <li>Não há em seu quadro de pessoal servidor público no exercício de suas funções, conforme veda o artigo 9º, inciso III, da Lei nº 14.133/2021.</li>
  </ul>
  <p style="margin-top:20pt">Betim/MG, ${dataAtual}</p>
  <div class="assinatura">
    <div class="linha">${empresa.razaoSocial}</div>
    <p style="font-size:9pt;color:#6b7280;margin-top:3pt">CNPJ: ${empresa.cnpj} · Representante Legal</p>
  </div>
</div>

<!-- ANEXO I — EQUIPE TÉCNICA -->
<div class="page">
  <div class="header-empresa">
    <h2>${empresa.razaoSocial}</h2>
    <p>CNPJ: ${empresa.cnpj}</p>
  </div>
  <h1>ANEXO I — EQUIPE TÉCNICA MOBILIZADA</h1>
  <p style="margin-bottom:9pt"><strong>Contrato:</strong> ${contrato.objeto || "—"}</p>
  <p style="margin-bottom:14pt"><strong>Cliente:</strong> ${contrato.clienteNome || "—"}</p>
  <table>
    <thead><tr><th>#</th><th>Nome</th><th>Função</th><th>CPF</th><th>Data Admissão</th></tr></thead>
    <tbody>
    ${d.funcionarios.map((f: any, i: number) => `
      <tr>
        <td>${i+1}</td>
        <td>${f.name}</td>
        <td>${f.role}</td>
        <td>${f.cpf || "—"}</td>
        <td>${f.admissionDate ? new Date(f.admissionDate).toLocaleDateString("pt-BR") : "—"}</td>
      </tr>
    `).join("")}
    </tbody>
  </table>
  <p style="margin-top:20pt;font-size:9pt;color:#6b7280">A empresa declara que os profissionais relacionados acima possuem os treinamentos e qualificações necessários para a execução dos serviços contratados, conforme legislação trabalhista e Normas Regulamentadoras aplicáveis.</p>
  <p style="margin-top:20pt">Betim/MG, ${dataAtual}</p>
  <div class="assinatura">
    <div class="linha">Responsável Técnico</div>
  </div>
</div>

<!-- FICHAS DE FUNCIONÁRIO + EPI -->
${d.funcionarios.map((f: any, idx: number) => `
<div class="page">
  <div class="header-empresa">
    <h2>${empresa.razaoSocial}</h2>
    <p>CNPJ: ${empresa.cnpj}</p>
  </div>
  <h1>FICHA DE REGISTRO DE EMPREGADO</h1>
  <h2 style="margin-top:0">${f.name}</h2>
  <table style="margin-top:9pt">
    <tbody>
      <tr><td style="width:35%;background:#f9fafb;font-weight:700">Nome completo</td><td>${f.name}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:700">CPF</td><td>${f.cpf || "—"}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:700">Função</td><td>${f.role}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:700">Data de admissão</td><td>${f.admissionDate ? new Date(f.admissionDate).toLocaleDateString("pt-BR") : "—"}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:700">Salário base</td><td>R$ ${fmt(Number(f.salary || 0))}</td></tr>
      <tr><td style="background:#f9fafb;font-weight:700">Regime</td><td>CLT</td></tr>
      <tr><td style="background:#f9fafb;font-weight:700">Treinamentos válidos</td><td>${(f.treinamentos || []).join(", ") || "Em regularização"}</td></tr>
    </tbody>
  </table>
  <h2>FICHA DE ENTREGA DE EPI — Conforme NR-06</h2>
  <table>
    <thead><tr><th>EPI</th><th>Nº CA</th><th>Quantidade</th><th>Data entrega</th><th>Próx. troca</th></tr></thead>
    <tbody>
      <tr><td>Capacete de Segurança Classe A</td><td>25.028</td><td>1 un</td><td>${dataAtual}</td><td>+ 24 meses</td></tr>
      <tr><td>Óculos de Proteção</td><td>39.010</td><td>1 un</td><td>${dataAtual}</td><td>+ 12 meses</td></tr>
      <tr><td>Protetor Auricular Plug</td><td>11.119</td><td>2 pares</td><td>${dataAtual}</td><td>Conforme uso</td></tr>
      <tr><td>Luva Nitrílica</td><td>39.010</td><td>2 pares</td><td>${dataAtual}</td><td>Conforme uso</td></tr>
      <tr><td>Bota de Segurança</td><td>40.161</td><td>1 par</td><td>${dataAtual}</td><td>+ 12 meses</td></tr>
      <tr><td>Uniforme (calça e camisa manga longa)</td><td>—</td><td>2 conjuntos</td><td>${dataAtual}</td><td>+ 12 meses</td></tr>
    </tbody>
  </table>
  <p style="margin-top:14pt;font-size:9pt">Declaro ter recebido os EPIs acima descritos em perfeito estado, comprometendo-me a usá-los, conservá-los e devolvê-los conforme orientações da empresa.</p>
  <div class="assinatura" style="margin-top:34pt">
    <div class="linha">${f.name} — CPF ${f.cpf || ""}</div>
  </div>
</div>
`).join("")}

<!-- PLANO DE TRABALHO -->
<div class="page">
  <div class="header-empresa">
    <h2>${empresa.razaoSocial}</h2>
    <p>CNPJ: ${empresa.cnpj}</p>
  </div>
  <h1>PLANO DE TRABALHO</h1>
  <p style="margin-bottom:14pt"><strong>Objeto:</strong> ${contrato.objeto || "—"}</p>
  <h2>1. Cliente</h2>
  <div class="box">
    <p>${contrato.clienteNome || "—"} ${contrato.clienteCnpj ? "— CNPJ " + contrato.clienteCnpj : ""}</p>
    <p>Local de execução: ${contrato.municipio || ""}/${contrato.uf || ""}</p>
  </div>
  <h2>2. Vigência</h2>
  <div class="box">
    <p><strong>Início:</strong> ${contrato.dataInicio ? new Date(contrato.dataInicio).toLocaleDateString("pt-BR") : "—"}</p>
    <p><strong>Vigência:</strong> ${contrato.vigenciaMeses} meses</p>
    <p><strong>Reajuste:</strong> ${contrato.indiceReajuste || "INPC"} a partir do 13º mês</p>
  </div>
  <h2>3. Tipo de Serviço</h2>
  <div class="box"><p>${contrato.tipoServico} ${contrato.areaM2 ? "— Área estimada: " + Number(contrato.areaM2).toLocaleString("pt-BR") + " m²" : ""}</p></div>
  <h2>4. Equipe Técnica</h2>
  <div class="box">
    <p>Total de profissionais: <strong>${d.funcionarios.length}</strong></p>
    <ul>${d.funcionarios.map((f: any) => `<li>${f.name} — ${f.role}</li>`).join("")}</ul>
  </div>
  <h2>5. Equipamentos e Veículos a Mobilizar</h2>
  <div class="box">
    <ul>
      <li>Roçadeiras costais a gasolina (capacidade conforme NR-12)</li>
      <li>Sopradores de folhas / Costais</li>
      <li>Ferramentas manuais: enxadas, pás, foices, alicates</li>
      <li>Veículos: Pickup Toyota Hilux 4x4 (placa QWE-1234)</li>
      <li>Veículos: Caminhão Iveco com carroceria (placa ASD-5678) — para transporte de equipe e equipamentos</li>
      <li>EPIs completos para toda a equipe — conforme Anexo de EPI</li>
    </ul>
  </div>
  <h2>6. Metodologia</h2>
  <div class="box">
    <p>Os serviços serão executados com observância às Normas Regulamentadoras aplicáveis (NR-06, NR-12, NR-35), em horário comercial (07:00-17:00), de segunda a sexta-feira, com supervisão técnica permanente.</p>
    <p>Frequência de execução: ${contrato.diasExecucao || 4} vez(es) por mês conforme cronograma físico-financeiro anexo.</p>
  </div>
  <p style="margin-top:20pt">Betim/MG, ${dataAtual}</p>
  <div class="assinatura"><div class="linha">Responsável Técnico — ${empresa.razaoSocial}</div></div>
</div>

</body></html>`;
}

export default function NovoContratoPage() {
  const [aba, setAba] = useState<"input"|"impacto"|"cronograma"|"equipe"|"sucesso">("input");
  const [modoEntrada, setModoEntrada] = useState<"manual"|"colar">("manual");
  const [textoColado, setTextoColado] = useState("");
  const [extraindo, setExtraindo] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [impacto, setImpacto] = useState<any>(null);
  const [resultado, setResultado] = useState<any>(null);
  const [cronograma, setCronograma] = useState<any>(null);
  const [gerandoCronograma, setGerandoCronograma] = useState(false);
  const [equipeAnalise, setEquipeAnalise] = useState<any>(null);
  const [analisandoEquipe, setAnalisandoEquipe] = useState(false);
  const [cenarioSelecionado, setCenarioSelecionado] = useState<"minima"|"recomendada"|"confortavel">("recomendada");
  const [funcSelecionados, setFuncSelecionados] = useState<string[]>([]);
  const [docs, setDocs] = useState<any>(null);
  const [gerandoDocs, setGerandoDocs] = useState(false);
  const [erro, setErro] = useState("");

  const [c, setC] = useState({
    objeto: "",
    clienteNome: "",
    clienteCnpj: "",
    valorMensal: "",
    valorTotal: "",
    vigenciaMeses: "12",
    dataInicio: "",
    dataFim: "",
    tipoServico: "Roçada Manual",
    areaM2: "",
    diasExecucao: "4",
    equipeMinima: "",
    municipio: "Betim",
    uf: "MG",
    enderecos: "",
    modalidadeLicitacao: "",
    indiceReajuste: "INPC",
    observacoes: "",
  });

  const fmt = (v: number) => v?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = (v: number) => v?.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const extrairTexto = async () => {
    if (textoColado.length < 30) { setErro("Cole pelo menos 30 caracteres do edital/contrato"); return; }
    setExtraindo(true); setErro("");
    try {
      const r = await fetch("/api/extrair-edital", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: textoColado }) });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      const e = d.dados;
      setC(prev => ({
        ...prev,
        objeto: e.objeto || prev.objeto,
        clienteNome: e.clienteNome || prev.clienteNome,
        clienteCnpj: e.clienteCnpj || prev.clienteCnpj,
        valorMensal: String(e.valorMensal || prev.valorMensal || ""),
        valorTotal: String(e.valorTotal || prev.valorTotal || ""),
        vigenciaMeses: String(e.vigenciaMeses || prev.vigenciaMeses || "12"),
        dataInicio: e.dataInicio || prev.dataInicio,
        dataFim: e.dataFim || prev.dataFim,
        tipoServico: e.tipoServico || prev.tipoServico,
        areaM2: String(e.areaM2 || prev.areaM2 || ""),
        diasExecucao: String(e.diasExecucao || prev.diasExecucao || "4"),
        equipeMinima: String(e.equipeMinima || prev.equipeMinima || ""),
        municipio: e.municipio || prev.municipio,
        uf: e.uf || prev.uf,
        enderecos: Array.isArray(e.enderecos) ? e.enderecos.join("\n") : prev.enderecos,
        modalidadeLicitacao: e.modalidadeLicitacao || prev.modalidadeLicitacao,
        indiceReajuste: e.indiceReajuste || prev.indiceReajuste,
        observacoes: e.observacoes || prev.observacoes,
      }));
      setModoEntrada("manual"); // mostra os dados extraídos no formulário
    } catch (e: any) { setErro(e.message); }
    setExtraindo(false);
  };

  const gerarCronograma = async () => {
    setGerandoCronograma(true); setErro("");
    try {
      const r = await fetch("/api/cronograma-contrato", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato: {
            ...c,
            valorMensal: Number(c.valorMensal),
            vigenciaMeses: Number(c.vigenciaMeses),
            areaM2: Number(c.areaM2) || undefined,
          },
          impacto,
          usarIA: true,
        })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      setCronograma(d.cronograma);
      setAba("cronograma");
    } catch (e: any) { setErro(e.message); }
    setGerandoCronograma(false);
  };

const analisarEquipe = async () => {
    setAnalisandoEquipe(true); setErro("");
    try {
      const r = await fetch("/api/equipe-otimizada", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato: {
            ...c,
            valorMensal: Number(c.valorMensal),
            vigenciaMeses: Number(c.vigenciaMeses),
            areaM2: Number(c.areaM2) || undefined,
            diasExecucao: Number(c.diasExecucao) || undefined,
          }
        })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      setEquipeAnalise(d);
      // Pré-selecionar a equipe recomendada
      const recomendada = d.cenarios.recomendada.funcionarios.map((f: any) => f.id);
      setFuncSelecionados(recomendada);
      setAba("equipe");
    } catch (e: any) { setErro(e.message); }
    setAnalisandoEquipe(false);
  };

  const toggleCenario = (cen: "minima"|"recomendada"|"confortavel") => {
    setCenarioSelecionado(cen);
    if (equipeAnalise?.cenarios[cen]) {
      const ids = equipeAnalise.cenarios[cen].funcionarios.map((f: any) => f.id);
      setFuncSelecionados(ids);
    }
  };

  const toggleFunc = (id: string) => {
    setFuncSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const gerarDocs = async () => {
    if (!funcSelecionados.length) { setErro("Selecione ao menos um funcionário"); return; }
    setGerandoDocs(true); setErro("");
    try {
      const funcs = equipeAnalise?.funcionariosTodos.filter((f: any) => funcSelecionados.includes(f.id)) || [];
      const r = await fetch("/api/docs-gerar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato: { ...c, valorMensal: Number(c.valorMensal), vigenciaMeses: Number(c.vigenciaMeses) },
          funcionarios: funcs,
          tipoServico: c.tipoServico,
        })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      setDocs(d);
    } catch (e: any) { setErro(e.message); }
    setGerandoDocs(false);
  };

  const imprimirDocsHtml = () => {
    if (!docs) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const html = renderDocsHtml(docs, c);
    w.document.write(html);
    w.document.close();
  };

  const calcularImpacto = async () => {
    if (!c.valorMensal || !c.vigenciaMeses) { setErro("Preencha valor mensal e vigência"); return; }
    setCalculando(true); setErro("");
    try {
      const r = await fetch("/api/contrato-impacto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...c,
          valorMensal: Number(c.valorMensal),
          valorTotal: Number(c.valorTotal) || Number(c.valorMensal) * Number(c.vigenciaMeses),
          vigenciaMeses: Number(c.vigenciaMeses),
          areaM2: Number(c.areaM2) || undefined,
          diasExecucao: Number(c.diasExecucao) || undefined,
          equipeMinima: Number(c.equipeMinima) || undefined,
        })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      setImpacto(d);
      setAba("impacto");
    } catch (e: any) { setErro(e.message); }
    setCalculando(false);
  };

  const propagarContrato = async () => {
    setSalvando(true); setErro("");
    try {
      const r = await fetch("/api/contrato-propagar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrato: {
            ...c,
            valorMensal: Number(c.valorMensal),
            valorTotal: Number(c.valorTotal) || Number(c.valorMensal) * Number(c.vigenciaMeses),
            vigenciaMeses: Number(c.vigenciaMeses),
            areaM2: Number(c.areaM2) || undefined,
            enderecos: c.enderecos ? c.enderecos.split("\n").filter(Boolean) : [],
          },
          impacto,
        })
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Erro");
      
      // Se houver funcionários selecionados, criar mobilizações
      if (d.contratoId && funcSelecionados.length > 0 && equipeAnalise) {
        try {
          const funcs = equipeAnalise.funcionariosTodos.filter((f: any) => funcSelecionados.includes(f.id));
          await fetch("/api/mobilizacoes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contractId: d.contratoId,
              mobilizacoes: funcs.map((f: any) => ({
                employeeId: f.id,
                role: f.role,
                salary: f.salary,
                startDate: c.dataInicio,
                endDate: c.dataFim,
                hoursDay: 8,
                daysWeek: 5,
                notes: "Mobilização criada automaticamente ao salvar contrato",
              })),
            }),
          });
          d.mobilizadosCriados = funcs.length;
        } catch (e) { console.error("Erro mobilizações:", e); }
      }
      
      setResultado(d);
      setAba("sucesso");
    } catch (e: any) { setErro(e.message); }
    setSalvando(false);
  };

  const IS: any = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:8, fontSize:13 };
  const LS: any = { fontSize:11, fontWeight:600, color:"#374151", display:"block", marginBottom:3 };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: "#0f5233", fontSize: 22, fontWeight: 700, margin: 0 }}>📋 Cadastrar Contrato/Cotação</h1>
        <p style={{ color: "#6b7280", fontSize: 13, margin: "4px 0 0" }}>
          Ao salvar, o sistema propaga automaticamente em <strong>Logística</strong>, <strong>Tributário</strong>, <strong>Financeiro</strong>, <strong>RH</strong>, <strong>DRE</strong> e <strong>Almoxarifado</strong>.
        </p>
      </div>

      {/* Barra de etapas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 6 }}>
        {[
          ["input", "1. Dados"],
          ["impacto", "2. Impacto"],
          ["cronograma", "3. Cronograma"],
          ["equipe", "4. Equipe + Docs"],
          ["sucesso", "5. Confirmação"],
        ].map(([id, l], i) => (
          <div key={id} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: aba === id ? "#0f5233" : "#f9fafb", color: aba === id ? "#fff" : "#6b7280", fontWeight: 600, fontSize: 12, textAlign: "center" }}>
            {l}
          </div>
        ))}
      </div>

      {erro && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "9px 14px", marginBottom: 14, color: "#991b1b", fontSize: 13 }}>❌ {erro}</div>}

      {/* ═══════════ ABA 1: ENTRADA DE DADOS ═══════════════════════ */}
      {aba === "input" && (
        <div>
          {/* Toggle modo entrada */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Como você quer informar os dados?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setModoEntrada("manual")}
                style={{ background: modoEntrada === "manual" ? "#0f5233" : "#f3f4f6", color: modoEntrada === "manual" ? "#fff" : "#374151", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                ✍️ Preencher manualmente
              </button>
              <button onClick={() => setModoEntrada("colar")}
                style={{ background: modoEntrada === "colar" ? "#7c3aed" : "#f3f4f6", color: modoEntrada === "colar" ? "#fff" : "#374151", border: "none", padding: "9px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                🤖 Colar texto do edital — IA extrai
              </button>
            </div>
          </div>

          {/* Modo: colar texto */}
          {modoEntrada === "colar" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <h3 style={{ color: "#7c3aed", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🤖 IA — Extrair dados de edital/contrato</h3>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>Cole o texto do edital, contrato ou cotação. A IA extrai automaticamente: cliente, CNPJ, valor, vigência, área, tipo de serviço, modalidade, etc.</p>
              <textarea style={{ ...IS, height: 200, resize: "vertical", fontFamily: "system-ui" }} value={textoColado} onChange={e => setTextoColado(e.target.value)}
                placeholder="Cole aqui o texto do edital, contrato ou cotação..." />
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{textoColado.length} caracteres</p>
              <button onClick={extrairTexto} disabled={extraindo || textoColado.length < 30}
                style={{ background: extraindo ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, marginTop: 8, opacity: textoColado.length < 30 ? 0.5 : 1 }}>
                {extraindo ? "⟳ IA analisando..." : "🤖 Extrair dados com IA"}
              </button>
            </div>
          )}

          {/* Formulário */}
          {modoEntrada === "manual" && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 18, marginBottom: 14 }}>
              <h3 style={{ color: "#0f5233", fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📝 Dados do Contrato</h3>

              {/* Cliente */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Cliente / Contratante *</label><input style={IS} value={c.clienteNome} onChange={e => setC(p => ({...p, clienteNome: e.target.value}))} placeholder="Ex: Prefeitura de Belo Horizonte"/></div>
                <div><label style={LS}>CNPJ</label><input style={IS} value={c.clienteCnpj} onChange={e => setC(p => ({...p, clienteCnpj: e.target.value}))} placeholder="00.000.000/0000-00"/></div>
              </div>

              {/* Objeto */}
              <div style={{ marginBottom: 10 }}>
                <label style={LS}>Objeto do contrato *</label>
                <input style={IS} value={c.objeto} onChange={e => setC(p => ({...p, objeto: e.target.value}))} placeholder="Ex: Roçada manual e mecanizada de canteiros..."/>
              </div>

              {/* Valores */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Valor mensal (R$) *</label><input type="number" step="0.01" style={IS} value={c.valorMensal} onChange={e => setC(p => ({...p, valorMensal: e.target.value, valorTotal: String(Number(e.target.value) * Number(p.vigenciaMeses || 12))}))}/></div>
                <div><label style={LS}>Vigência (meses) *</label><input type="number" style={IS} value={c.vigenciaMeses} onChange={e => setC(p => ({...p, vigenciaMeses: e.target.value, valorTotal: String(Number(p.valorMensal || 0) * Number(e.target.value))}))}/></div>
                <div><label style={LS}>Valor total (R$)</label><input type="number" step="0.01" style={{...IS, background: "#f9fafb"}} value={c.valorTotal} onChange={e => setC(p => ({...p, valorTotal: e.target.value}))}/></div>
                <div><label style={LS}>Início *</label><input type="date" style={IS} value={c.dataInicio} onChange={e => setC(p => ({...p, dataInicio: e.target.value}))}/></div>
                <div><label style={LS}>Reajuste</label><select style={IS} value={c.indiceReajuste} onChange={e => setC(p => ({...p, indiceReajuste: e.target.value}))}>
                  {["INPC","IPCA","IGPM","Sem reajuste"].map(x => <option key={x}>{x}</option>)}
                </select></div>
              </div>

              {/* Serviço */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Tipo de serviço</label><select style={IS} value={c.tipoServico} onChange={e => setC(p => ({...p, tipoServico: e.target.value}))}>
                  {["Roçada Manual","Roçada Mecanizada","Jardinagem Mensal","PRADA/PTRF","Limpeza","Podação","Hidrossemeadura","Controle de Formigas","Outro"].map(x => <option key={x}>{x}</option>)}
                </select></div>
                <div><label style={LS}>Área (m²)</label><input type="number" style={IS} value={c.areaM2} onChange={e => setC(p => ({...p, areaM2: e.target.value}))}/></div>
                <div><label style={LS}>Dias execução / mês</label><input type="number" style={IS} value={c.diasExecucao} onChange={e => setC(p => ({...p, diasExecucao: e.target.value}))}/></div>
                <div><label style={LS}>Equipe mínima</label><input type="number" style={IS} value={c.equipeMinima} onChange={e => setC(p => ({...p, equipeMinima: e.target.value}))} placeholder="auto"/></div>
                <div><label style={LS}>Modalidade</label><select style={IS} value={c.modalidadeLicitacao} onChange={e => setC(p => ({...p, modalidadeLicitacao: e.target.value}))}>
                  <option value="">— escolher —</option>
                  {["Pregão Eletrônico","Concorrência","Dispensa","Direto","Privado"].map(x => <option key={x}>{x}</option>)}
                </select></div>
              </div>

              {/* Endereço */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={LS}>Município</label><input style={IS} value={c.municipio} onChange={e => setC(p => ({...p, municipio: e.target.value}))}/></div>
                <div><label style={LS}>UF</label><input style={IS} value={c.uf} onChange={e => setC(p => ({...p, uf: e.target.value}))}/></div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={LS}>Endereços de execução (um por linha)</label>
                <textarea style={{ ...IS, height: 60 }} value={c.enderecos} onChange={e => setC(p => ({...p, enderecos: e.target.value}))} placeholder="Av. Vilarinho, s/n — Canteiros&#10;R. Floriano Peixoto, 2100"/>
              </div>

              {/* Observações */}
              <div style={{ marginBottom: 14 }}>
                <label style={LS}>Observações / Equipamentos / Restrições</label>
                <textarea style={{ ...IS, height: 70 }} value={c.observacoes} onChange={e => setC(p => ({...p, observacoes: e.target.value}))}/>
              </div>

              <button onClick={calcularImpacto} disabled={calculando || !c.valorMensal || !c.vigenciaMeses}
                style={{ background: calculando ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: (!c.valorMensal || !c.vigenciaMeses) ? 0.5 : 1 }}>
                {calculando ? "⟳ Calculando impacto em todos os módulos..." : "🚀 Calcular Impacto Total →"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ABA 2: IMPACTO NOS MÓDULOS ═══════════════════ */}
      {aba === "impacto" && impacto && (
        <div>
          {/* Resumo executivo */}
          <div style={{ background: "linear-gradient(135deg, #0f5233, #1a7a4a)", color: "#fff", borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>💼 {c.objeto || "Contrato"}</h3>
            <p style={{ fontSize: 12, opacity: 0.9, margin: "0 0 10px" }}>{c.clienteNome} · {c.municipio}/{c.uf} · Vigência {c.vigenciaMeses} meses</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              {[
                ["Receita total", "R$ " + fmt0(impacto.contrato.valorTotal)],
                ["Receita mensal", "R$ " + fmt0(impacto.contrato.valorMensal)],
                ["Margem mensal", "R$ " + fmt0(impacto.dre.margemMensal) + " (" + impacto.dre.margemPct + "%)"],
                ["Margem total", "R$ " + fmt0(impacto.dre.margemTotal)],
              ].map(([l, v]) => (
                <div key={l as string} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, opacity: 0.75, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          {impacto.alertas?.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 12 }}>
              <h4 style={{ color: "#991b1b", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>🚨 Alertas</h4>
              {impacto.alertas.map((a: string, i: number) => <p key={i} style={{ color: "#991b1b", fontSize: 12, margin: "3px 0" }}>{a}</p>)}
            </div>
          )}
          {impacto.recomendacoes?.length > 0 && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
              <h4 style={{ color: "#15803d", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>💡 Recomendações</h4>
              {impacto.recomendacoes.map((r: string, i: number) => <p key={i} style={{ color: "#15803d", fontSize: 12, margin: "3px 0" }}>{r}</p>)}
            </div>
          )}

          {/* Grid de módulos impactados */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12, marginBottom: 14 }}>
            {/* TRIBUTÁRIO */}
            <div style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#92400e", fontSize: 13, fontWeight: 700, margin: 0 }}>💸 Tributário</h4>
                <span style={{ background: "#fef9c3", color: "#92400e", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>+{c.vigenciaMeses * 2} lançamentos</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>DAS / mês (6,72%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#92400e" }}>R$ {fmt(impacto.tributario.dasMensal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>ISS Betim / mês (5%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#92400e" }}>R$ {fmt(impacto.tributario.issMensal)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Total tributos / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R$ {fmt(impacto.tributario.tributosMensal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>R$ {fmt0(impacto.tributario.tributosTotal)}</td></tr>
                  <tr><td colSpan={2} style={{ paddingTop: 6, fontSize: 10, color: "#92400e" }}>Alíquota efetiva: <strong>{impacto.tributario.aliquotaEfetiva}%</strong></td></tr>
                </tbody>
              </table>
            </div>

            {/* RH / FOLHA */}
            <div style={{ background: "#fff", border: "1px solid #ddd6fe", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#6d28d9", fontSize: 13, fontWeight: 700, margin: 0 }}>👷 RH / Folha</h4>
                <span style={{ background: "#f3e8ff", color: "#6d28d9", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{impacto.rh.equipeNecessaria} pessoas</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>1 supervisor + {impacto.rh.operacionais} operacionais</td><td style={{ textAlign: "right" }}></td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Folha bruta / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.rh.folhaBruta)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>INSS patronal (7%)</td><td style={{ textAlign: "right" }}>R$ {fmt(impacto.rh.inssPatronal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>FGTS (8%)</td><td style={{ textAlign: "right" }}>R$ {fmt(impacto.rh.fgts)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Custo folha total / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#6d28d9" }}>R$ {fmt(impacto.rh.custoFolhaTotal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#6d28d9" }}>R$ {fmt0(impacto.rh.custoFolhaContrato)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* LOGÍSTICA */}
            <div style={{ background: "#fff", border: "1px solid #bfdbfe", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#1e40af", fontSize: 13, fontWeight: 700, margin: 0 }}>🚛 Logística</h4>
                <span style={{ background: "#dbeafe", color: "#1e40af", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>+{impacto.logistica.osPrevistasTotal} OS</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Distância da base</td><td style={{ textAlign: "right", fontWeight: 700 }}>{impacto.logistica.distBase} km</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>OS previstas / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>{impacto.logistica.osPrevistasMes}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Km / mês</td><td style={{ textAlign: "right" }}>{fmt0(impacto.logistica.kmMes)} km</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Custo combustível / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.logistica.custoKmMes)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Horas operacionais / mês</td><td style={{ textAlign: "right" }}>{impacto.logistica.horasOperacionaisMes}h</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Custo logística contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#1e40af" }}>R$ {fmt0(impacto.logistica.custoKmTotal)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* ALMOXARIFADO */}
            <div style={{ background: "#fff", border: "1px solid #fed7aa", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#c2410c", fontSize: 13, fontWeight: 700, margin: 0 }}>📦 Almoxarifado / EPI</h4>
                <span style={{ background: "#ffedd5", color: "#c2410c", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>{impacto.rh.equipeNecessaria} kits EPI</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Material / mês (3% receita)</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.almoxarifado.materialMes)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>EPI / mês ({impacto.rh.equipeNecessaria} pessoas)</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.almoxarifado.epiMes)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#c2410c" }}>R$ {fmt0(impacto.almoxarifado.materialTotal + impacto.almoxarifado.epiTotal)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* PRECIFICAÇÃO */}
            <div style={{ background: "#fff", border: `1px solid ${impacto.precificacao.competitividade === "lucrativo" ? "#86efac" : impacto.precificacao.competitividade === "apertado" ? "#fde68a" : "#fca5a5"}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, margin: 0 }}>🧮 Precificação</h4>
                <span style={{ background: impacto.precificacao.competitividade === "lucrativo" ? "#dcfce7" : impacto.precificacao.competitividade === "apertado" ? "#fef9c3" : "#fee2e2", color: impacto.precificacao.competitividade === "lucrativo" ? "#15803d" : impacto.precificacao.competitividade === "apertado" ? "#92400e" : "#991b1b", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>
                  {impacto.precificacao.competitividade.toUpperCase()}
                </span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Valor contratado / mês</td><td style={{ textAlign: "right", fontWeight: 700 }}>R$ {fmt(impacto.precificacao.valorContratado)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Valor ideal (markup 25%)</td><td style={{ textAlign: "right", fontWeight: 700, color: "#0f5233" }}>R$ {fmt(impacto.precificacao.valorIdeal)}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Diferença</td><td style={{ textAlign: "right", fontWeight: 700, color: impacto.precificacao.diferenca >= 0 ? "#15803d" : "#dc2626" }}>{impacto.precificacao.diferenca >= 0 ? "+" : ""}R$ {fmt(impacto.precificacao.diferenca)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* DRE */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, gridColumn: "span 1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, margin: 0 }}>📊 DRE Mensal</h4>
                <span style={{ background: impacto.dre.margemPct >= 25 ? "#dcfce7" : impacto.dre.margemPct >= 15 ? "#fef9c3" : "#fee2e2", color: impacto.dre.margemPct >= 25 ? "#15803d" : impacto.dre.margemPct >= 15 ? "#92400e" : "#991b1b", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>
                  Margem {impacto.dre.margemPct}%
                </span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ padding: "3px 0", fontWeight: 700, color: "#15803d" }}>(+) Receita</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt(impacto.dre.receitaMensal)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Tributos</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.tributos)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Folha</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.folha)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Deslocamento</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.deslocamento)}</td></tr>
                  <tr><td style={{ padding: "3px 0", color: "#dc2626" }}>(−) Material + EPI</td><td style={{ textAlign: "right", color: "#dc2626" }}>R$ {fmt(impacto.dre.material + impacto.dre.epi)}</td></tr>
                  <tr style={{ borderTop: "2px solid #0f5233" }}><td style={{ padding: "6px 0", fontWeight: 700 }}>(=) Margem líquida</td><td style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: impacto.dre.margemPct >= 15 ? "#15803d" : "#dc2626" }}>R$ {fmt(impacto.dre.margemMensal)}</td></tr>
                </tbody>
              </table>
            </div>

            {/* FINANCEIRO */}
            <div style={{ background: "#fff", border: "1px solid #86efac", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h4 style={{ color: "#15803d", fontSize: 13, fontWeight: 700, margin: 0 }}>💰 Financeiro</h4>
                <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>+{Math.min(c.vigenciaMeses, 24)} receitas</span>
              </div>
              <table style={{ width: "100%", fontSize: 11 }}>
                <tbody>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Receita / mês</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt(impacto.financeiro.receitaMensal)}</td></tr>
                  <tr><td style={{ color: "#6b7280", padding: "3px 0" }}>Dia padrão pagamento</td><td style={{ textAlign: "right", fontWeight: 700 }}>Dia {impacto.financeiro.diaPagamento}</td></tr>
                  <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Receita total contrato</td><td style={{ textAlign: "right", fontWeight: 700, color: "#15803d" }}>R$ {fmt0(impacto.financeiro.receitaTotal)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 16 }}>
            <button onClick={() => setAba("input")} style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Voltar e ajustar</button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={gerarCronograma} disabled={gerandoCronograma}
                style={{ background: gerandoCronograma ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {gerandoCronograma ? "⟳ Gerando cronograma com IA..." : "📅 Gerar Cronograma →"}
              </button>
              <button onClick={propagarContrato} disabled={salvando}
                style={{ background: salvando ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                {salvando ? "⟳ Salvando..." : "✅ Confirmar e Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ═══════════ ABA 3: CRONOGRAMA ═══════════════════════════ */}
      {aba === "cronograma" && cronograma && (
        <div>
          {/* Resumo executivo */}
          <div style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, margin: "0 0 8px" }}>📅 Cronograma de Execução — {c.objeto}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
              {[
                ["Total execuções", cronograma.resumo.totalExecucoes + " OS"],
                ["Total horas", cronograma.resumo.totalHoras + "h"],
                ["Qualidade média", cronograma.resumo.mediaQualidade + "%"],
                ["Mês ideal", cronograma.resumo.mesIdeal || "—"],
                ["Mês crítico", cronograma.resumo.mesCritico || "—"],
              ].map(([l, v]) => (
                <div key={l as string} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 10px" }}>
                  <div style={{ fontSize: 9, opacity: 0.75, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas */}
          {cronograma.alertas?.length > 0 && (
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
              <h4 style={{ color: "#92400e", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>⚠️ Pontos de atenção</h4>
              {cronograma.alertas.map((a: string, i: number) => <p key={i} style={{ color: "#92400e", fontSize: 12, margin: "3px 0" }}>{a}</p>)}
            </div>
          )}

          {/* Análise IA */}
          {cronograma.analiseIA && (
            <div style={{ background: "#fff", border: "1px solid #c4b5fd", borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <h4 style={{ color: "#7c3aed", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>🤖 Análise estratégica da IA</h4>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap" }}>{cronograma.analiseIA}</div>
            </div>
          )}

          {/* Linha do tempo mensal */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📊 Visão geral por mês — {cronograma.meses.length} meses</h4>
            <div style={{ display: "flex", overflowX: "auto", gap: 4, paddingBottom: 8 }}>
              {cronograma.meses.map((m: any, idx: number) => {
                const cor = m.qualidadeClimaPct >= 85 ? "#15803d"
                          : m.qualidadeClimaPct >= 70 ? "#65a30d"
                          : m.qualidadeClimaPct >= 60 ? "#d97706"
                          : "#dc2626";
                return (
                  <div key={idx} style={{ minWidth: 90, flex: 1, padding: "8px 6px", background: "#f9fafb", borderRadius: 8, borderTop: `3px solid ${cor}`, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>{m.nomeMes}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: cor }}>{m.qualidadeClimaPct}%</div>
                    <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>{m.execucoes.length} OS</div>
                    <div style={{ fontSize: 10, color: "#6b7280" }}>{Math.round(m.horasTotais)}h</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 8, textAlign: "center" }}>
              🟢 ≥85% ideal · 🟡 70–84% bom · 🟠 60–69% atenção · 🔴 abaixo crítico
            </div>
          </div>

          {/* Detalhamento por mês */}
          <div style={{ marginBottom: 14 }}>
            <h4 style={{ color: "#0f5233", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📋 Cronograma detalhado</h4>
            {cronograma.meses.map((m: any, mi: number) => (
              <div key={mi} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                <div style={{ background: "#e8f5ee", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: "#0f5233", fontSize: 14 }}>{m.nomeMes}</span>
                    <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>{m.execucoes.length} execuções · {Math.round(m.horasTotais)}h equipe</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#6b7280" }}>Qualidade clima:</span>
                    <span style={{ background: m.qualidadeClimaPct >= 85 ? "#dcfce7" : m.qualidadeClimaPct >= 70 ? "#fef9c3" : "#fee2e2", color: m.qualidadeClimaPct >= 85 ? "#15803d" : m.qualidadeClimaPct >= 70 ? "#92400e" : "#991b1b", padding: "2px 9px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                      {m.qualidadeClimaPct}%
                    </span>
                  </div>
                </div>
                <div style={{ background: "#fffbeb", padding: "6px 14px", fontSize: 11, color: "#92400e", borderBottom: "1px solid #f3f4f6" }}>
                  ☁️ {m.observacaoClima}
                </div>
                <div style={{ padding: 12 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: "#6b7280" }}>#</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: "#6b7280" }}>Data</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: "#6b7280" }}>Dia</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: "#6b7280" }}>Horário</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", color: "#6b7280" }}>Equipe</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", color: "#6b7280" }}>Área (m²)</th>
                        <th style={{ padding: "6px 10px", textAlign: "right", color: "#6b7280" }}>Horas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.execucoes.map((e: any, ei: number) => (
                        <tr key={ei} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 700, color: "#7c3aed" }}>{e.ordem}</td>
                          <td style={{ padding: "6px 10px", fontWeight: 600 }}>{new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                          <td style={{ padding: "6px 10px", color: "#6b7280" }}>{e.diaSemana}</td>
                          <td style={{ padding: "6px 10px" }}>{e.horarioInicio}–{e.horarioFim}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{e.equipe} pessoas</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{e.areaPrevista?.toLocaleString("pt-BR") || "—"}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700, color: "#15803d" }}>{e.horasEstimadas}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Botões */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 16 }}>
            <button onClick={() => setAba("impacto")} style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Voltar para impacto</button>
            <button onClick={analisarEquipe} disabled={analisandoEquipe}
              style={{ background: analisandoEquipe ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px 28px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              {analisandoEquipe ? "⟳ Analisando equipe ideal..." : "👷 Analisar Equipe & Documentos →"}
            </button>
          </div>
        </div>
      )}


      {/* ═══════════ ABA 4: EQUIPE & DOCS ═══════════════════════════ */}
      {aba === "equipe" && equipeAnalise && (
        <div>
          {/* Resumo: 3 cenários comparativos */}
          <div style={{ background: "linear-gradient(135deg,#0f5233,#1a7a4a)", color: "#fff", borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, margin: "0 0 4px" }}>👷 Equipe Otimizada para o Contrato</h3>
            <p style={{ fontSize: 12, opacity: 0.9, margin: 0 }}>
              Equipe mínima necessária: <strong>{equipeAnalise.pessoasMinimas} pessoas</strong> · {equipeAnalise.totalDisponiveis} disponíveis · Qualificações: {equipeAnalise.qualificacoesRequeridas.obrigatorias.join(", ")}
            </p>
          </div>

          {/* 3 Cenários */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 14 }}>
            {(["minima","recomendada","confortavel"] as const).map(key => {
              const cen = equipeAnalise.cenarios[key];
              const ativo = cenarioSelecionado === key;
              const cor = key === "minima" ? "#15803d" : key === "recomendada" ? "#1d4ed8" : "#7c3aed";
              return (
                <div key={key} onClick={() => toggleCenario(key)}
                  style={{ background: ativo ? "#fff" : "#f9fafb", border: `2px solid ${ativo ? cor : "#e5e7eb"}`, borderRadius: 12, padding: 16, cursor: "pointer", boxShadow: ativo ? `0 4px 12px ${cor}33` : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: cor, margin: 0 }}>{cen.label}</h4>
                    {ativo && <span style={{ background: cor, color: "#fff", padding: "2px 8px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>SELECIONADO</span>}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: cor }}>{cen.qtdPessoas}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>pessoas alocadas</div>
                  <table style={{ width: "100%", fontSize: 11 }}>
                    <tbody>
                      <tr><td style={{ color: "#6b7280", padding: "2px 0" }}>Folha bruta/mês</td><td style={{ textAlign: "right", fontWeight: 600 }}>R$ {fmt0(cen.folhaBruta)}</td></tr>
                      <tr><td style={{ color: "#6b7280", padding: "2px 0" }}>Encargos (70%)</td><td style={{ textAlign: "right" }}>R$ {fmt0(cen.encargos)}</td></tr>
                      <tr style={{ borderTop: "1px solid #f3f4f6" }}><td style={{ padding: "5px 0", fontWeight: 700 }}>Custo/mês</td><td style={{ textAlign: "right", fontWeight: 700, color: cor }}>R$ {fmt0(cen.custoMensal)}</td></tr>
                      <tr><td style={{ color: "#6b7280", padding: "2px 0" }}>Total contrato</td><td style={{ textAlign: "right", fontWeight: 600 }}>R$ {fmt0(cen.custoTotal)}</td></tr>
                      <tr><td style={{ color: "#6b7280", padding: "2px 0" }}>Margem mensal</td><td style={{ textAlign: "right", fontWeight: 700, color: cen.margemPct > 15 ? "#15803d" : cen.margemPct > 0 ? "#d97706" : "#dc2626" }}>{cen.margemPct}%</td></tr>
                    </tbody>
                  </table>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    {cen.cobreArea ? <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>✅ Cobre área</span> : <span style={{ background: "#fee2e2", color: "#991b1b", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>⛔ Insuficiente</span>}
                    {cen.todosTreinados && <span style={{ background: "#dbeafe", color: "#1e40af", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>🦺 NRs OK</span>}
                    {cen.viavel ? <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>Viável</span> : <span style={{ background: "#fee2e2", color: "#991b1b", padding: "1px 7px", borderRadius: 8, fontSize: 9, fontWeight: 700 }}>Inviável</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Economia */}
          <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400e" }}>
            💰 <strong>Economia ao escolher a Equipe Mínima vs Recomendada:</strong> R$ {fmt0(equipeAnalise.economia.minimaVsRecomendada)} no contrato inteiro · 
            <strong>vs Confortável:</strong> R$ {fmt0(equipeAnalise.economia.minimaVsRecomendada + equipeAnalise.economia.recomendadaVsConfortavel)} de economia
          </div>

          {/* Lista de funcionários para selecionar manualmente */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
              <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, margin: 0 }}>
                Selecione os funcionários a mobilizar ({funcSelecionados.length} selecionados)
              </h4>
              <span style={{ fontSize: 11, color: "#6b7280" }}>
                Qualificações exigidas: {equipeAnalise.qualificacoesRequeridas.obrigatorias.map((q: string) => <span key={q} style={{ background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 6, fontSize: 10, marginLeft: 4, fontWeight: 700 }}>{q}</span>)}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 8 }}>
              {equipeAnalise.funcionariosTodos.map((f: any) => {
                const sel = funcSelecionados.includes(f.id);
                const recomendado = f.score >= 30;
                return (
                  <div key={f.id} onClick={() => toggleFunc(f.id)}
                    style={{ background: sel ? "#f0fdf4" : "#fff", border: `2px solid ${sel ? "#15803d" : recomendado ? "#bbf7d0" : f.score < 0 ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 10, padding: 10, cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <input type="checkbox" checked={sel} onChange={() => {}} style={{ marginTop: 4, accentColor: "#15803d" }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 12 }}>{f.name}</div>
                      <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 4 }}>{f.role}</div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {f.qualif?.ok?.map((q: string) => <span key={q} style={{ background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>{q}</span>)}
                        {f.qualif?.falta?.map((q: string) => <span key={q} style={{ background: "#fee2e2", color: "#991b1b", padding: "1px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>⛔ {q}</span>)}
                        {!f.disponivel && <span style={{ background: "#fef9c3", color: "#92400e", padding: "1px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>⚠️ Em outro contrato</span>}
                      </div>
                      <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>R$ {fmt0(f.salary || 2500)} salário · custo total R$ {fmt0((f.salary || 2500) * 1.7)}/mês</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Geração de documentos */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <h4 style={{ color: "#0f5233", fontSize: 13, fontWeight: 700, margin: 0 }}>📄 Documentos do Contrato</h4>
              <button onClick={gerarDocs} disabled={gerandoDocs || !funcSelecionados.length}
                style={{ background: gerandoDocs ? "#6b7280" : "#7c3aed", color: "#fff", border: "none", padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, opacity: !funcSelecionados.length ? 0.5 : 1 }}>
                {gerandoDocs ? "⟳ Gerando..." : "📋 Gerar lista de documentos"}
              </button>
            </div>

            {!docs && <p style={{ fontSize: 12, color: "#6b7280" }}>Após selecionar a equipe, clique em "Gerar" para listar todos os documentos exigidos: empresa, funcionários e contrato.</p>}

            {docs && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 14 }}>
                  {[
                    ["Total docs", docs.stats.total, "#0f5233"],
                    ["📂 Empresa", docs.stats.empresa, "#1a7a4a"],
                    ["👷 Funcionários", docs.stats.funcionarios, "#7c3aed"],
                    ["🚧 Contrato", docs.stats.contrato, "#1d4ed8"],
                    ["✏️ Gerados", docs.stats.gerados, "#15803d"],
                    ["📥 Externos", docs.stats.externos, "#d97706"],
                  ].map(([l, v, c]) => (
                    <div key={l as string} style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 10px", borderLeft: `3px solid ${c}` }}>
                      <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c as string, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <button onClick={imprimirDocsHtml}
                  style={{ width: "100%", background: "#0f5233", color: "#fff", border: "none", padding: "12px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                  🖨️ Abrir TODOS os Documentos para Impressão / PDF
                </button>

                <details>
                  <summary style={{ cursor: "pointer", fontSize: 12, color: "#0f5233", fontWeight: 700, padding: "6px 0" }}>Ver lista completa de documentos →</summary>
                  <div style={{ marginTop: 10, maxHeight: 400, overflowY: "auto" }}>
                    {["EMPRESA","FUNCIONARIO","CONTRATO"].map(cat => (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <h5 style={{ color: "#0f5233", fontSize: 12, fontWeight: 700, padding: "6px 8px", background: "#e8f5ee", borderRadius: 5 }}>
                          {cat === "EMPRESA" ? "📂 EMPRESA" : cat === "FUNCIONARIO" ? "👷 POR FUNCIONÁRIO" : "🚧 CONTRATO"}
                        </h5>
                        {docs.documentos.filter((d: any) => d.categoria === cat).map((d: any, i: number) => (
                          <div key={i} style={{ display: "flex", gap: 8, padding: "5px 8px", borderBottom: "1px solid #f3f4f6", fontSize: 11 }}>
                            <span style={{ color: "#9ca3af", minWidth: 22 }}>{i+1}.</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>{d.titulo}</div>
                              {d.descricao && <div style={{ fontSize: 10, color: "#6b7280" }}>{d.descricao}</div>}
                            </div>
                            <span style={{ background: d.tipo === "gerado" ? "#dcfce7" : "#dbeafe", color: d.tipo === "gerado" ? "#15803d" : "#1e40af", padding: "1px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700, height: "fit-content" }}>
                              {d.tipo === "gerado" ? "✏️ Gerado" : "📥 Externo"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Botões de ação final */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 16 }}>
            <button onClick={() => setAba("cronograma")} style={{ background: "#f3f4f6", color: "#374151", border: "none", padding: "11px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>← Voltar para cronograma</button>
            <button onClick={propagarContrato} disabled={salvando || !funcSelecionados.length}
              style={{ background: salvando ? "#6b7280" : "#0f5233", color: "#fff", border: "none", padding: "12px 32px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: !funcSelecionados.length ? 0.5 : 1 }}>
              {salvando ? "⟳ Salvando contrato + mobilizando equipe..." : "✅ Confirmar Contrato + Mobilizar " + funcSelecionados.length + " Funcionário(s) →"}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════ ABA 5: SUCESSO ════════════════════════════════ */}
      {aba === "sucesso" && resultado && (
        <div style={{ background: "#fff", border: "2px solid #15803d", borderRadius: 14, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
          <h2 style={{ color: "#15803d", fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>{resultado.mensagem}</h2>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 22px" }}>
            Contrato <strong style={{ color: "#0f5233", fontFamily: "monospace" }}>{resultado.contratoNumero}</strong> criado e propagado.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 22 }}>
            {[
              ["Cliente", resultado.propagacao.clienteCriado ? "✅ Cadastrado" : "✓ Já existia", "#0f5233"],
              ["Contrato", "✅ Criado", "#0f5233"],
              ["Tributos projetados", "✅ " + resultado.propagacao.tributosProjetados + " lançamentos", "#92400e"],
              ["Receitas projetadas", "✅ " + resultado.propagacao.receitasProjetadas + " no caixa", "#15803d"],
              ["OS na logística", "✅ " + resultado.propagacao.osProjetadas + " geradas", "#1e40af"],
              ["Equipe mobilizada", "🦺 " + (resultado.mobilizadosCriados || 0) + " funcionários", "#7c3aed"],
            ].map(([l, v, c], i) => (
              <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${c}` }}>
                <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", fontWeight: 600 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 3, color: c as string }}>{v}</div>
              </div>
            ))}
          </div>
          {resultado.propagacao.avisos?.length > 0 && (
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: 12, marginBottom: 16, textAlign: "left" }}>
              <strong style={{ color: "#92400e", fontSize: 12 }}>⚠️ Avisos:</strong>
              {resultado.propagacao.avisos.map((a: string, i: number) => <p key={i} style={{ color: "#92400e", fontSize: 11, margin: "3px 0" }}>• {a}</p>)}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/dashboard/contratos" style={{ background: "#0f5233", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>📋 Ver Contratos</a>
            <button onClick={()=>setAba("cronograma")} style={{ background: "#7c3aed", color: "#fff", padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>📅 Ver Cronograma</button>
            <a href="/dashboard/logistica" style={{ background: "#1e40af", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>🚛 Ver na Logística</a>
            <a href="/dashboard/fiscal" style={{ background: "#92400e", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>💸 Ver Tributos</a>
            <a href="/dashboard/dre" style={{ background: "#6d28d9", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>📊 Ver DRE</a>
            <a href="/dashboard/mobilizacoes" style={{ background: "#7c3aed", color: "#fff", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>🦺 Ver Mobilizações</a>
            <a href="/dashboard/novo-contrato" style={{ background: "#f3f4f6", color: "#374151", padding: "10px 20px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 13 }}>+ Novo Contrato</a>
          </div>
        </div>
      )}
    </div>
  );
}
