/**
 * Verdelimp ERP — Proposta Comercial Completa (modelo Vallourec)
 * Estrutura de 9 seções: capa, identificação, objeto, premissas, planilha
 * de preços por grupos, composição de BDI, detalhamento de custo das
 * equipes fixas, resumo financeiro, condições comerciais e declaração.
 * HTML pronto para impressão (Ctrl+P → Salvar como PDF), sem dependências.
 */

export interface ItemProposta {
  grupo: string;      // "1.0 CANTEIRO DE OBRAS"
  codigo: string;     // "1.1"
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
}

export interface EquipeProposta {
  nome: string;
  colaboradores: number;
  meses: number;
  bdiRate: number;
  componentes: { nome: string; valorMensal: number }[];
}

export interface ComposicaoBdi {
  total: number;
  componentes: { nome: string; pct: number; obs?: string }[];
}

export interface PropostaCompletaData {
  numero: string;
  titulo: string;          // "Manutenção de Áreas Verdes – Unidade Mineração"
  subtitulo?: string;      // "Vallourec Mineração S.A. – Mina Pau Branco"
  contratante: string;
  objeto: string;
  local?: string;
  vigenciaMeses?: number;
  dataProposta: string;    // "Betim/MG, 24 de abril de 2026"
  validadeDias: number;
  empresa: {
    razaoSocial: string; cnpj: string; porte?: string; cnae?: string;
    endereco: string; telefone: string; email: string; banco?: string;
  };
  premissas: string[];
  itens: ItemProposta[];
  bdiEquipes?: ComposicaoBdi;
  bdiSpot?: ComposicaoBdi;
  equipes: EquipeProposta[];
  condicoes: { condicao: string; especificacao: string }[];
  declaracoes?: string[];
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtR = (v: number) => `R$ ${fmt(v)}`;
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function gerarHtmlPropostaCompleta(p: PropostaCompletaData): string {
  // Agrupar itens preservando a ordem de entrada
  const grupos: { nome: string; itens: ItemProposta[] }[] = [];
  for (const item of p.itens) {
    let g = grupos.find((x) => x.nome === item.grupo);
    if (!g) { g = { nome: item.grupo, itens: [] }; grupos.push(g); }
    g.itens.push(item);
  }
  const subtotalGrupo = (g: { itens: ItemProposta[] }) => g.itens.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const valorGlobal = grupos.reduce((s, g) => s + subtotalGrupo(g), 0);
  const mediaMensal = p.vigenciaMeses ? valorGlobal / p.vigenciaMeses : null;

  const rodape = `${esc(p.empresa.razaoSocial)} | CNPJ ${esc(p.empresa.cnpj)} | Betim/MG | Proposta ${esc(p.contratante)} – ${esc(p.titulo)}`;

  const tabelaBdi = (titulo: string, c?: ComposicaoBdi) => !c ? "" : `
    <h3 class="sub">${esc(titulo)} – ${c.total.toFixed(2).replace(".", ",").replace(",00", "")}%</h3>
    <table>
      <thead><tr><th>COMPONENTE</th><th class="c">%</th><th class="c">OBSERVAÇÃO</th></tr></thead>
      <tbody>
        ${c.componentes.map((x) => `<tr><td>${esc(x.nome)}</td><td class="c">${x.pct.toFixed(2).replace(".", ",")}%</td><td class="c small">${esc(x.obs || "")}</td></tr>`).join("")}
        <tr class="total-row"><td>BDI TOTAL</td><td class="c">${c.total.toFixed(2).replace(".", ",")}%</td><td></td></tr>
      </tbody>
    </table>`;

  const tabelaEquipe = (e: EquipeProposta) => {
    const custoDireto = e.componentes.reduce((s, c) => s + c.valorMensal, 0);
    const bdi = custoDireto * (e.bdiRate / 100);
    const verbaMensal = custoDireto + bdi;
    return `
    <h3 class="sub">Equipe: ${esc(e.nome)} &nbsp;|&nbsp; ${e.colaboradores} colaboradores &nbsp;|&nbsp; ${e.meses} meses</h3>
    <table>
      <thead><tr><th>COMPONENTE DE CUSTO</th><th class="r">VALOR MENSAL (R$)</th><th class="c">% S/ TOTAL</th></tr></thead>
      <tbody>
        ${e.componentes.map((c) => `<tr><td>${esc(c.nome)}</td><td class="r">${fmtR(c.valorMensal)}</td><td class="c">${custoDireto > 0 ? ((c.valorMensal / custoDireto) * 100).toFixed(1) : "0.0"}%</td></tr>`).join("")}
        <tr class="subtotal-row"><td>SUBTOTAL CUSTO DIRETO</td><td class="r">${fmtR(custoDireto)}</td><td class="c">100%</td></tr>
        <tr class="bdi-row"><td>BDI (${e.bdiRate}% sobre custo direto)</td><td class="r">${fmtR(bdi)}</td><td class="c">${e.bdiRate}%</td></tr>
        <tr class="total-row"><td>VERBA MENSAL TOTAL</td><td class="r">${fmtR(verbaMensal)}</td><td class="r">${fmtR(verbaMensal * e.meses)} (${e.meses} m.)</td></tr>
      </tbody>
    </table>`;
  };

  const declaracoes = p.declaracoes && p.declaracoes.length > 0 ? p.declaracoes : [
    "Leu e compreendeu integralmente a documentação técnica e os anexos integrantes deste processo de consulta.",
    "Realizou (ou compromete-se a realizar antes da assinatura do contrato) a visita técnica ao local dos serviços.",
    "Aceita integralmente as regras de medição, retenção técnica e regime de comunicação estabelecidos pela contratante.",
    "Os valores desta proposta contemplam todos os custos de mão de obra, encargos sociais, benefícios, EPIs, uniformes, ferramentas, equipamentos, administração, BDI e tributos, não cabendo cobrança adicional por item já descrito.",
  ];

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta ${esc(p.numero)} — ${esc(p.contratante)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#f3f4f6;font-size:11px;line-height:1.45}
  @media print{
    body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none!important}
    .page{box-shadow:none!important;margin:0 auto!important;page-break-after:always}
    .page:last-child{page-break-after:auto}
  }
  .page{width:210mm;min-height:280mm;margin:10px auto;padding:14mm 16mm 18mm;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.12);position:relative}
  /* faixa superior */
  .brandbar{display:flex;margin:-14mm -16mm 0;height:34px}
  .brandbar .b1{flex:1;background:#2e7d32;color:#fff;display:flex;align-items:center;padding:0 16px;font-weight:800;font-size:13px;letter-spacing:.3px}
  .brandbar .b1 span{font-weight:400;font-size:10px;margin-left:5px;opacity:.9}
  .brandbar .b2{flex:1;background:#e8621a;color:#fff;display:flex;align-items:center;justify-content:flex-end;padding:0 16px;font-size:9px}
  .tricolor{display:flex;margin:14px -16mm 0;height:14px}
  .tricolor div:nth-child(1){flex:1;background:#2e7d32}
  .tricolor div:nth-child(2){flex:1;background:#5db54c}
  .tricolor div:nth-child(3){flex:1;background:#e8621a}
  .running{font-size:8.5px;color:#9ca3af;margin-bottom:8px}
  /* capa */
  .capa-titulo{text-align:center;margin:34px 0 6px;font-size:30px;font-weight:800;color:#2e7d32;letter-spacing:.5px}
  .capa-sub{text-align:center;font-size:16px;font-weight:700;color:#333}
  .capa-sub2{text-align:center;font-size:12px;color:#e8621a;font-style:italic;margin-top:3px}
  .bloco-partes{background:#fdf0e7;border-left:4px solid #e8621a;padding:16px 20px;margin:26px 0}
  .bloco-partes .rotulo{font-size:10px;font-weight:800;letter-spacing:.5px}
  .bloco-partes .rotulo.ct{color:#e8621a}
  .bloco-partes .rotulo.pp{color:#2e7d32;margin-top:14px}
  .bloco-partes .nome{font-size:14px;font-weight:800;color:#111;margin-top:2px}
  .bloco-partes .det{font-size:10px;color:#4b5563;margin-top:2px;line-height:1.5}
  /* tabelas */
  table{width:100%;border-collapse:collapse;margin:6px 0 14px}
  th{background:#2e7d32;color:#fff;font-size:9.5px;font-weight:700;padding:7px 9px;text-align:left;text-transform:uppercase;letter-spacing:.3px}
  th.c,td.c{text-align:center}
  th.r,td.r{text-align:right}
  td{padding:6px 9px;font-size:10.5px;border:1px solid #e5e7eb;vertical-align:top}
  tbody tr:nth-child(even) td{background:#f7f9f7}
  td.small{font-size:9.5px;color:#6b7280}
  .grupo-row td{background:#2e7d32!important;color:#fff;font-weight:800;font-size:10.5px;letter-spacing:.3px}
  .subtotal-row td{background:#e8f3e8!important;font-weight:800;color:#2e7d32}
  .bdi-row td{background:#eef7ee!important;font-weight:700}
  .total-row td{background:#2e7d32!important;color:#fff;font-weight:800}
  .global-row td{background:#1a1a1a!important;color:#fff;font-weight:800;font-size:12px}
  /* seções */
  h2.sec{font-size:14px;font-weight:800;color:#2e7d32;margin:16px 0 8px}
  h3.sub{font-size:11.5px;font-weight:800;color:#333;margin:14px 0 4px}
  p.texto{font-size:10.5px;color:#374151;text-align:justify;margin-bottom:8px}
  /* premissas numeradas */
  .premissa{display:flex;gap:0;border:1px solid #e5e7eb;margin-bottom:4px}
  .premissa .num{width:26px;background:#2e7d32;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;flex-shrink:0}
  .premissa .txt{padding:6px 9px;font-size:10px;color:#374151}
  /* declaração */
  .decl li{font-size:10.5px;color:#374151;margin-bottom:6px;margin-left:16px;text-align:justify}
  .assinatura{text-align:center;margin-top:46px}
  .assinatura .linha{border-top:1.5px solid #333;width:64%;margin:0 auto 6px}
  .assinatura .rz{font-weight:800;font-size:12px}
  .assinatura .dt{font-size:10.5px;color:#374151;margin-bottom:34px}
  .assinatura .det{font-size:9.5px;color:#6b7280;line-height:1.5}
  .rodape{position:absolute;bottom:8mm;left:16mm;right:16mm;text-align:center;font-size:8.5px;color:#b0b6bd}
  /* barra imprimir */
  .printbar{position:sticky;top:0;background:#0f5233;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:9}
  .printbar button{background:#e8621a;border:none;color:#fff;font-weight:700;padding:8px 22px;border-radius:6px;cursor:pointer;font-size:13px}
</style>
</head>
<body>
<div class="printbar no-print">
  <span>📄 Proposta ${esc(p.numero)} — use <b>Imprimir → Salvar como PDF</b></span>
  <button onclick="window.print()">🖨️ Imprimir / PDF</button>
</div>

<!-- PÁGINA 1 — CAPA -->
<div class="page">
  <div class="brandbar"><div class="b1">VERDELIMP <span>SERVIÇOS</span></div><div class="b2">CNPJ ${esc(p.empresa.cnpj)} &nbsp;|&nbsp; ${esc(p.empresa.porte || "EPP")}</div></div>
  <div class="tricolor"><div></div><div></div><div></div></div>
  <div class="capa-titulo">PROPOSTA COMERCIAL</div>
  <div class="capa-sub">${esc(p.titulo)}</div>
  ${p.subtitulo ? `<div class="capa-sub2">${esc(p.subtitulo)}</div>` : ""}
  <div class="bloco-partes">
    <div class="rotulo ct">CONTRATANTE</div>
    <div class="nome">${esc(p.contratante)}</div>
    <div class="rotulo pp">PROPONENTE</div>
    <div class="nome">${esc(p.empresa.razaoSocial)}</div>
    <div class="det">CNPJ: ${esc(p.empresa.cnpj)} – ${esc(p.empresa.porte || "EPP")} – Atividade principal: ${esc(p.empresa.cnae || "81.30-3-00 Paisagismo")}<br>
    ${esc(p.empresa.endereco)}<br>${esc(p.empresa.telefone)} &nbsp;|&nbsp; ${esc(p.empresa.email)}</div>
  </div>
  <table>
    <thead><tr><th style="width:38%">CAMPO</th><th>INFORMAÇÃO</th></tr></thead>
    <tbody>
      <tr><td><b>Objeto</b></td><td>${esc(p.objeto)}</td></tr>
      ${p.local ? `<tr><td><b>Local</b></td><td>${esc(p.local)}</td></tr>` : ""}
      ${p.vigenciaMeses ? `<tr><td><b>Vigência</b></td><td>${p.vigenciaMeses} meses</td></tr>` : ""}
      <tr><td><b>Data da Proposta</b></td><td>${esc(p.dataProposta)}</td></tr>
      <tr><td><b>Validade da Proposta</b></td><td>${p.validadeDias} (${extenso(p.validadeDias)}) dias corridos</td></tr>
      <tr class="total-row"><td>VALOR GLOBAL ESTIMADO</td><td><b>${fmtR(valorGlobal)}</b></td></tr>
    </tbody>
  </table>
  <div class="rodape">Página 1 | ${rodape}</div>
</div>

<!-- PÁGINA 2 — IDENTIFICAÇÃO / OBJETO / PREMISSAS -->
<div class="page">
  <div class="running">${rodape}</div>
  <h2 class="sec">1. IDENTIFICAÇÃO DA EMPRESA PROPONENTE</h2>
  <table>
    <tbody>
      <tr><td style="width:32%"><b>Razão Social</b></td><td>${esc(p.empresa.razaoSocial)}</td></tr>
      <tr><td><b>CNPJ</b></td><td>${esc(p.empresa.cnpj)}</td></tr>
      <tr><td><b>Endereço</b></td><td>${esc(p.empresa.endereco)}</td></tr>
      <tr><td><b>Telefone</b></td><td>${esc(p.empresa.telefone)}</td></tr>
      <tr><td><b>E-mail</b></td><td>${esc(p.empresa.email)}</td></tr>
      <tr><td><b>Banco / Agência / Conta</b></td><td>${esc(p.empresa.banco || "A preencher – Dados bancários da VERDELIMP")}</td></tr>
    </tbody>
  </table>
  <h2 class="sec">2. OBJETO DA CONTRATAÇÃO</h2>
  <p class="texto">${esc(p.objeto)}</p>
  ${p.premissas.length > 0 ? `
  <h2 class="sec">3. PREMISSAS TÉCNICAS ADOTADAS</h2>
  ${p.premissas.map((x, i) => `<div class="premissa"><div class="num">${i + 1}</div><div class="txt">${esc(x)}</div></div>`).join("")}` : ""}
  <div class="rodape">Página 2 | ${rodape}</div>
</div>

<!-- PLANILHA DE PREÇOS -->
<div class="page">
  <div class="running">${rodape}</div>
  <h2 class="sec">4. PLANILHA DE PREÇOS – PROPOSTA COMERCIAL</h2>
  <p class="texto" style="font-style:italic">${esc(p.objeto)}${p.vigenciaMeses ? ` | Vigência: ${p.vigenciaMeses} meses` : ""}</p>
  <table>
    <thead><tr>
      <th style="width:8%" class="c">ITEM</th><th style="width:42%">DESCRIÇÃO DO SERVIÇO</th>
      <th style="width:8%" class="c">UNID</th><th style="width:10%" class="c">QTD</th>
      <th style="width:16%" class="r">VALOR UNIT. (R$)</th><th style="width:16%" class="r">VALOR TOTAL (R$)</th>
    </tr></thead>
    <tbody>
      ${grupos.map((g, gi) => `
        <tr class="grupo-row"><td colspan="6">${esc(g.nome)}</td></tr>
        ${g.itens.map((i) => `<tr>
          <td class="c"><b>${esc(i.codigo)}</b></td><td>${esc(i.descricao)}</td>
          <td class="c">${esc(i.unidade)}</td><td class="c">${i.quantidade.toLocaleString("pt-BR")}</td>
          <td class="r">${fmtR(i.valorUnitario)}</td><td class="r"><b>${fmtR(i.quantidade * i.valorUnitario)}</b></td>
        </tr>`).join("")}
        <tr class="subtotal-row"><td colspan="5" class="r">SUBTOTAL ${esc(g.nome.split("–")[0].trim())}</td><td class="r">${fmtR(subtotalGrupo(g))}</td></tr>
      `).join("")}
      <tr class="global-row"><td colspan="5" class="r">VALOR GLOBAL TOTAL DA PROPOSTA${p.vigenciaMeses ? ` (${p.vigenciaMeses} MESES)` : ""}</td><td class="r">${fmtR(valorGlobal)}</td></tr>
    </tbody>
  </table>
  <div class="rodape">${rodape}</div>
</div>

${p.bdiEquipes || p.bdiSpot ? `
<!-- COMPOSIÇÃO DO BDI -->
<div class="page">
  <div class="running">${rodape}</div>
  <h2 class="sec">5. COMPOSIÇÃO DO BDI</h2>
  ${tabelaBdi("5.1 BDI aplicado às Verbas Mensais das Equipes", p.bdiEquipes)}
  ${tabelaBdi("5.2 BDI aplicado aos Itens de Preço Unitário (Spot)", p.bdiSpot)}
  <div class="rodape">${rodape}</div>
</div>` : ""}

${p.equipes.length > 0 ? `
<!-- DETALHAMENTO DE CUSTO DAS EQUIPES -->
<div class="page">
  <div class="running">${rodape}</div>
  <h2 class="sec">6. DETALHAMENTO DE CUSTO DAS EQUIPES FIXAS</h2>
  ${p.equipes.map(tabelaEquipe).join("")}
  <div class="rodape">${rodape}</div>
</div>` : ""}

<!-- RESUMO / CONDIÇÕES / DECLARAÇÃO -->
<div class="page">
  <div class="running">${rodape}</div>
  <h2 class="sec">7. RESUMO FINANCEIRO DO CONTRATO</h2>
  <table>
    <thead><tr><th>GRUPO DE SERVIÇOS</th><th class="r">VALOR TOTAL (R$)</th></tr></thead>
    <tbody>
      ${grupos.map((g) => `<tr><td>${esc(g.nome)}</td><td class="r"><b>${fmtR(subtotalGrupo(g))}</b></td></tr>`).join("")}
      <tr class="total-row"><td>VALOR GLOBAL TOTAL</td><td class="r">${fmtR(valorGlobal)}</td></tr>
      ${mediaMensal ? `<tr class="subtotal-row"><td>Média mensal estimada (${p.vigenciaMeses} meses)</td><td class="r">${fmtR(mediaMensal)}</td></tr>` : ""}
    </tbody>
  </table>
  ${p.condicoes.length > 0 ? `
  <h2 class="sec">8. CONDIÇÕES COMERCIAIS E JURÍDICAS</h2>
  <table>
    <thead><tr><th style="width:28%">CONDIÇÃO</th><th>ESPECIFICAÇÃO</th></tr></thead>
    <tbody>${p.condicoes.map((c) => `<tr><td><b>${esc(c.condicao)}</b></td><td>${esc(c.especificacao)}</td></tr>`).join("")}</tbody>
  </table>` : ""}
  <h2 class="sec">9. DECLARAÇÃO DE CONCORDÂNCIA</h2>
  <p class="texto">A ${esc(p.empresa.razaoSocial)} declara, para os devidos fins, que:</p>
  <ul class="decl">${declaracoes.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>
  <div class="assinatura">
    <div class="dt">${esc(p.dataProposta)}</div>
    <div class="linha"></div>
    <div class="rz">${esc(p.empresa.razaoSocial)}</div>
    <div class="det">CNPJ: ${esc(p.empresa.cnpj)} – Betim/MG<br>${esc(p.empresa.telefone)} | ${esc(p.empresa.email)}<br><i>Representante legal / Responsável técnico</i></div>
  </div>
  <div class="rodape">${rodape}</div>
</div>
</body>
</html>`;
}

function extenso(n: number): string {
  const mapa: Record<number, string> = { 10: "dez", 15: "quinze", 20: "vinte", 30: "trinta", 45: "quarenta e cinco", 60: "sessenta", 90: "noventa" };
  return mapa[n] || String(n);
}
