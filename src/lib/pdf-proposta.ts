/**
 * Verdelimp ERP — Gerador de HTML para PDF de Propostas
 * Usa CSS @media print — sem dependências externas
 * O browser converte para PDF via window.print() ou Ctrl+P
 */

export interface PropostaData {
  numero: string;
  data: string;
  validade: string;
  cliente: { nome: string; cnpj?: string; municipio?: string; uf?: string; email?: string };
  empresa: { razaoSocial: string; cnpj: string; endereco: string; municipio: string; telefone: string; email: string };
  servico: { tipo?: string; objeto: string; local?: string; area?: number; unit?: string; dias?: number; workers?: number };
  valores: {
    custoMO: number; custo: number; encargos: number; encargosRate: number;
    admin: number; adminRate: number; risco: number; riscoRate: number;
    impostos: number; impostosRate: number; margem: number; marginRate: number;
    total: number; bdi: number;
  };
  condicoes?: string;
  observacoes?: string;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtR = (v: number) => `R$ ${fmt(v)}`;

export function gerarHtmlProposta(p: PropostaData): string {
  const totalBDI = p.valores.total;
  const pct = (v: number) => `${v.toFixed(2)}%`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta ${p.numero} — ${p.cliente.nome}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,sans-serif;color:#1a1a1a;background:#fff;font-size:12px;line-height:1.5}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none!important}
    .page-break{page-break-before:always}
  }
  .page{max-width:210mm;margin:0 auto;padding:12mm 14mm;background:#fff}
  /* HEADER */
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #1a7a4a;margin-bottom:18px}
  .logo-area h1{font-size:22px;font-weight:900;color:#0f5233;letter-spacing:-0.5px}
  .logo-area p{font-size:10px;color:#6b7280;margin-top:2px}
  .header-right{text-align:right}
  .header-right .prop-num{font-size:20px;font-weight:700;color:#1a7a4a}
  .header-right .prop-data{font-size:10px;color:#6b7280;margin-top:3px}
  /* SEÇÃO */
  .section{margin-bottom:16px}
  .section-title{font-size:10px;font-weight:700;color:#0f5233;text-transform:uppercase;letter-spacing:.8px;border-bottom:1.5px solid #e8f5ee;padding-bottom:4px;margin-bottom:9px}
  /* GRID DADOS */
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
  .campo{background:#f9fafb;border-radius:5px;padding:7px 9px;border-left:2px solid #1a7a4a}
  .campo label{font-size:9px;color:#9ca3af;font-weight:600;display:block;margin-bottom:2px;text-transform:uppercase}
  .campo span{font-size:12px;font-weight:600;color:#111}
  /* TABELA BDI */
  table{width:100%;border-collapse:collapse}
  th{background:#0f5233;color:#fff;font-size:10px;font-weight:600;padding:7px 10px;text-align:left}
  td{padding:7px 10px;font-size:11px;border-bottom:1px solid #f3f4f6}
  tr:nth-child(even) td{background:#f9fafb}
  .td-right{text-align:right;font-family:monospace}
  .td-bold{font-weight:700}
  .td-green{color:#0f5233;font-weight:700}
  /* TOTAL BOX */
  .total-box{background:linear-gradient(135deg,#0f5233,#1a7a4a);color:#fff;border-radius:10px;padding:16px 20px;margin:16px 0;display:flex;justify-content:space-between;align-items:center}
  .total-box .label{font-size:11px;opacity:.85}
  .total-box .valor{font-size:28px;font-weight:900;letter-spacing:-1px}
  .total-box .bdi{font-size:11px;opacity:.75;margin-top:2px}
  /* CONDICOES */
  .cond-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
  .cond-item{display:flex;gap:8px;align-items:flex-start;padding:6px 9px;background:#f9fafb;border-radius:5px}
  .cond-item .icon{font-size:13px;flex-shrink:0;margin-top:1px}
  .cond-item .text{font-size:11px;color:#374151}
  .cond-item .text strong{display:block;font-size:10px;color:#0f5233;font-weight:700;text-transform:uppercase;margin-bottom:2px}
  /* AVISO FISCAL */
  .aviso{background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:8px 11px;font-size:10px;color:#92400e;margin-top:12px}
  /* ASSINATURA */
  .assinatura{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb}
  .assin-box{text-align:center}
  .assin-line{border-top:1px solid #374151;margin-bottom:6px;margin-top:36px}
  .assin-name{font-size:11px;font-weight:700}
  .assin-cargo{font-size:10px;color:#6b7280}
  /* FOOTER */
  .footer{margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af}
  /* BUTTON PRINT */
  .btn-print{background:#1a7a4a;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:10px}
  .btn-close{background:#f3f4f6;color:#374151;border:none;padding:12px 20px;border-radius:8px;font-size:14px;cursor:pointer}
  .print-bar{background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 24px;display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.06)}
  .print-bar h2{font-size:14px;font-weight:700;color:#0f5233;flex:1}
</style>
</head>
<body>

<div class="no-print print-bar">
  <h2>🌿 Proposta ${p.numero} — ${p.cliente.nome}</h2>
  <button class="btn-print" onclick="window.print()">🖨️ Gerar PDF / Imprimir</button>
  <button class="btn-close" onclick="window.close()">✕ Fechar</button>
</div>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-area">
      <h1>🌿 VERDELIMP</h1>
      <p>${p.empresa.razaoSocial}</p>
      <p>CNPJ: ${p.empresa.cnpj}</p>
      <p>${p.empresa.endereco} — ${p.empresa.municipio}</p>
      <p>${p.empresa.telefone} · ${p.empresa.email}</p>
    </div>
    <div class="header-right">
      <div class="prop-num">PROPOSTA Nº ${p.numero}</div>
      <div class="prop-data">Data: ${p.data}</div>
      <div class="prop-data">Validade: ${p.validade}</div>
      <div style="margin-top:6px;background:#e8f5ee;color:#0f5233;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:700;display:inline-block">PROPOSTA COMERCIAL</div>
    </div>
  </div>

  <!-- CLIENTE -->
  <div class="section">
    <div class="section-title">Dados do Contratante</div>
    <div class="grid2">
      <div class="campo"><label>Razão Social</label><span>${p.cliente.nome}</span></div>
      ${p.cliente.cnpj ? `<div class="campo"><label>CNPJ</label><span>${p.cliente.cnpj}</span></div>` : ""}
      ${p.cliente.municipio ? `<div class="campo"><label>Município/UF</label><span>${p.cliente.municipio}/${p.cliente.uf || ""}</span></div>` : ""}
      ${p.cliente.email ? `<div class="campo"><label>E-mail</label><span>${p.cliente.email}</span></div>` : ""}
    </div>
  </div>

  <!-- OBJETO -->
  <div class="section">
    <div class="section-title">Objeto e Escopo do Serviço</div>
    <div class="grid3">
      <div class="campo" style="grid-column:1/-1"><label>Objeto</label><span>${p.servico.objeto}</span></div>
      ${p.servico.tipo ? `<div class="campo"><label>Tipo de Serviço</label><span>${p.servico.tipo}</span></div>` : ""}
      ${p.servico.local ? `<div class="campo"><label>Local de Execução</label><span>${p.servico.local}</span></div>` : ""}
      ${p.servico.area ? `<div class="campo"><label>Área / Quantidade</label><span>${p.servico.area.toLocaleString("pt-BR")} ${p.servico.unit || ""}</span></div>` : ""}
      ${p.servico.dias ? `<div class="campo"><label>Prazo de Execução</label><span>${p.servico.dias} dias</span></div>` : ""}
      ${p.servico.workers ? `<div class="campo"><label>Equipe</label><span>${p.servico.workers} colaboradores</span></div>` : ""}
    </div>
  </div>

  <!-- COMPOSIÇÃO DE PREÇO -->
  <div class="section">
    <div class="section-title">Composição de Preço — BDI Detalhado</div>
    <table>
      <thead>
        <tr>
          <th>Componente</th>
          <th style="text-align:center">% Aplicada</th>
          <th style="text-align:right">Valor (R$)</th>
          <th style="text-align:right">% s/ Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="td-bold">Custo Direto — Mão de Obra</td>
          <td style="text-align:center">—</td>
          <td class="td-right">${fmtR(p.valores.custo)}</td>
          <td class="td-right">${pct(totalBDI > 0 ? p.valores.custo / totalBDI * 100 : 0)}</td>
        </tr>
        <tr>
          <td>Encargos Sociais CLT</td>
          <td style="text-align:center">${pct(p.valores.encargosRate)}</td>
          <td class="td-right">${fmtR(p.valores.encargos)}</td>
          <td class="td-right">${pct(totalBDI > 0 ? p.valores.encargos / totalBDI * 100 : 0)}</td>
        </tr>
        <tr>
          <td>Despesas Administrativas</td>
          <td style="text-align:center">${pct(p.valores.adminRate)}</td>
          <td class="td-right">${fmtR(p.valores.admin)}</td>
          <td class="td-right">${pct(totalBDI > 0 ? p.valores.admin / totalBDI * 100 : 0)}</td>
        </tr>
        <tr>
          <td>Riscos e Imprevistos</td>
          <td style="text-align:center">${pct(p.valores.riscoRate)}</td>
          <td class="td-right">${fmtR(p.valores.risco)}</td>
          <td class="td-right">${pct(totalBDI > 0 ? p.valores.risco / totalBDI * 100 : 0)}</td>
        </tr>
        <tr>
          <td>Tributos e Impostos (Simples Nacional)</td>
          <td style="text-align:center">${pct(p.valores.impostosRate)}</td>
          <td class="td-right">${fmtR(p.valores.impostos)}</td>
          <td class="td-right">${pct(totalBDI > 0 ? p.valores.impostos / totalBDI * 100 : 0)}</td>
        </tr>
        <tr>
          <td class="td-bold td-green">Margem / Lucro Bruto</td>
          <td style="text-align:center;font-weight:700;color:#0f5233">${pct(p.valores.marginRate)}</td>
          <td class="td-right td-green">${fmtR(p.valores.margem)}</td>
          <td class="td-right td-green">${pct(totalBDI > 0 ? p.valores.margem / totalBDI * 100 : 0)}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="background:#e8f5ee">
          <td colspan="2" style="font-weight:700;color:#0f5233;padding:9px 10px">VALOR TOTAL DA PROPOSTA</td>
          <td class="td-right" style="font-weight:700;color:#0f5233;font-size:14px">${fmtR(totalBDI)}</td>
          <td class="td-right" style="font-weight:700;color:#0f5233">100%</td>
        </tr>
      </tfoot>
    </table>
    <div class="aviso">⚠️ Apoio gerencial — valores calculados com base no BDI informado. Validar tributação com contador responsável. ISS e demais tributos sujeitos a retenção na fonte pelo contratante.</div>
  </div>

  <!-- TOTAL -->
  <div class="total-box">
    <div>
      <div class="label">VALOR GLOBAL DA PROPOSTA</div>
      <div class="valor">${fmtR(totalBDI)}</div>
      <div class="bdi">BDI total: ${pct(p.valores.bdi)} · Validade: ${p.validade}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Proposta nº</div>
      <div style="font-size:18px;font-weight:700">${p.numero}</div>
      <div class="bdi">${p.data}</div>
    </div>
  </div>

  <!-- CONDIÇÕES COMERCIAIS -->
  <div class="section">
    <div class="section-title">Condições Comerciais</div>
    <div class="cond-grid">
      <div class="cond-item"><div class="icon">💳</div><div class="text"><strong>Forma de Pagamento</strong>${p.condicoes || "Faturamento mensal mediante medição aprovada"}</div></div>
      <div class="cond-item"><div class="icon">📅</div><div class="text"><strong>Prazo de Pagamento</strong>Até 30 dias após aprovação da medição</div></div>
      <div class="cond-item"><div class="icon">⏰</div><div class="text"><strong>Validade da Proposta</strong>${p.validade}</div></div>
      <div class="cond-item"><div class="icon">📋</div><div class="text"><strong>Reajuste</strong>Anual pelo INPC/IBGE a partir do 13º mês</div></div>
      <div class="cond-item"><div class="icon">🔐</div><div class="text"><strong>Seguro Garantia</strong>5% do contrato — custo incluído no BDI</div></div>
      <div class="cond-item"><div class="icon">📍</div><div class="text"><strong>Foro</strong>Comarca de Betim/MG</div></div>
    </div>
    ${p.observacoes ? `<div style="margin-top:10px;padding:9px 11px;background:#f9fafb;border-radius:6px;font-size:11px"><strong>Observações:</strong> ${p.observacoes}</div>` : ""}
  </div>

  <!-- ASSINATURA -->
  <div class="assinatura">
    <div class="assin-box">
      <div class="assin-line"></div>
      <div class="assin-name">${p.empresa.razaoSocial}</div>
      <div class="assin-cargo">Proponente — CNPJ ${p.empresa.cnpj}</div>
    </div>
    <div class="assin-box">
      <div class="assin-line"></div>
      <div class="assin-name">${p.cliente.nome}</div>
      <div class="assin-cargo">Contratante${p.cliente.cnpj ? ` — CNPJ ${p.cliente.cnpj}` : ""}</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span>${p.empresa.razaoSocial} · CNPJ ${p.empresa.cnpj} · ${p.empresa.municipio}</span>
    <span>Proposta ${p.numero} · Emitida em ${p.data} · Válida até ${p.validade}</span>
  </div>

</div>

<script>
  // Auto-trigger print se aberto com ?print=1
  if(new URLSearchParams(window.location.search).get('print')==='1'){
    window.addEventListener('load',()=>setTimeout(()=>window.print(),400));
  }
</script>
</body>
</html>`;
}
