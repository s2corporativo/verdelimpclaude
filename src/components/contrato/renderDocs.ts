// src/components/contrato/renderDocs.ts
// Geração de HTML completo para impressão/PDF de documentos do contrato
// Extraído de novo-contrato/page.tsx para reduzir o bundle size

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
