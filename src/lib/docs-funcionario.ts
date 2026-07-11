/**
 * Verdelimp ERP — Geração automática de documentos por funcionário
 * Usado pelo Checklist de Documentos: cada item marcado vira um documento
 * pronto para impressão (um por página), preenchido com dados reais do
 * funcionário, da empresa e do contrato/escopo.
 * HTML autossuficiente (Ctrl+P → Salvar como PDF), sem dependências.
 */

export interface EmpresaDoc {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
}

export interface FuncionarioDoc {
  nome: string;
  cpf?: string;
  funcao: string;
  admissao?: string;   // dd/mm/aaaa
  epis: { item: string; quantidade: number; dataEntrega: string; ca?: string; validadeCa?: string }[];
  treinamentos: { tipo: string; validade?: string }[];
}

export interface EscopoDoc {
  tipoServico: string;
  contratante?: string;
  objeto?: string;
  local?: string;
  contratoNumero?: string;
}

// ── Perfil de risco por tipo de serviço (alimenta OS, procedimento e EPIs) ──
interface PerfilRisco {
  atividades: string[];
  riscos: string[];
  epis: string[];
  medidas: string[];
  usaNr35: boolean;
  usaQuimicos: boolean;
  usaMaquinas: boolean;
}

export function perfilDoServico(tipoServico: string): PerfilRisco {
  const t = (tipoServico || "").toLowerCase();
  const base: PerfilRisco = {
    atividades: ["Serviços gerais de conservação e limpeza de áreas"],
    riscos: ["Exposição ao sol e intempéries", "Postura inadequada e esforço físico", "Animais peçonhentos", "Piso irregular — quedas de mesmo nível"],
    epis: ["Uniforme com identificação", "Bota de segurança com biqueira", "Luvas de proteção", "Boné árabe / chapéu com proteção de nuca", "Protetor solar"],
    medidas: ["Hidratação frequente e pausas programadas", "Inspeção da área antes do início dos trabalhos", "Comunicação imediata de incidentes ao encarregado", "Proibido trabalhar sem os EPIs relacionados"],
    usaNr35: false, usaQuimicos: false, usaMaquinas: false,
  };
  if (t.includes("roçada") || t.includes("rocada") || t.includes("supress") || t.includes("aceiro")) {
    return {
      atividades: ["Roçada manual e mecanizada de vegetação", "Aceiros e limpeza de faixas", "Recolhimento e destinação de resíduos vegetais"],
      riscos: ["Projeção de partículas e fragmentos", "Ruído e vibração (roçadeira)", "Cortes e perfurações", "Animais peçonhentos", "Exposição ao sol"],
      epis: ["Protetor facial/viseira + óculos de proteção", "Protetor auricular tipo concha", "Perneira de segurança", "Luvas de raspa/vaqueta", "Bota de segurança", "Uniforme com identificação"],
      medidas: ["Raio mínimo de 15 m entre operadores e terceiros", "Inspeção diária da roçadeira (lâmina, protetor, cabo)", "Abastecimento somente com o motor desligado e frio", "Sinalização da frente de trabalho"],
      usaNr35: false, usaQuimicos: false, usaMaquinas: true,
    };
  }
  if (t.includes("poda") || t.includes("podação") || t.includes("árvore") || t.includes("arvore") || t.includes("altura")) {
    return {
      atividades: ["Poda e supressão de árvores", "Trabalho em altura com acesso por escada/plataforma", "Recolhimento de galhos e destinação"],
      riscos: ["Queda de altura", "Queda de galhos/materiais", "Cortes com motosserra/motopoda", "Contato com rede elétrica", "Animais peçonhentos"],
      epis: ["Cinto de segurança tipo paraquedista com talabarte", "Capacete com jugular", "Protetor facial e auricular", "Luvas de segurança", "Perneira", "Bota de segurança"],
      medidas: ["Análise Preliminar de Risco (APR) antes de cada frente", "Isolamento e sinalização da área de queda", "Verificação de redes elétricas próximas — acionar concessionária quando necessário", "Dupla checagem dos pontos de ancoragem (NR-35)"],
      usaNr35: true, usaQuimicos: false, usaMaquinas: true,
    };
  }
  if (t.includes("dedetiza") || t.includes("praga") || t.includes("capina química") || t.includes("quimic") || t.includes("químic") || t.includes("herbicida")) {
    return {
      atividades: ["Aplicação de produtos químicos/saneantes", "Preparo de calda conforme dosagem", "Controle de pragas urbanas ou capina química"],
      riscos: ["Exposição a agentes químicos (inalação/contato)", "Contaminação por respingos", "Intoxicação", "Exposição ao sol"],
      epis: ["Máscara com filtro químico (VO/GA)", "Luvas nitrílicas", "Óculos de proteção ampla visão", "Avental/macacão impermeável", "Bota impermeável"],
      medidas: ["Ler e seguir a FISPQ de cada produto", "Preparo de calda em área ventilada, com EPI completo", "Proibido comer, beber ou fumar durante a aplicação", "Higienização imediata em caso de contato — ver telefone de emergência", "Destinação correta de embalagens (tríplice lavagem)"],
      usaNr35: false, usaQuimicos: true, usaMaquinas: false,
    };
  }
  if (t.includes("retro") || t.includes("terraplan") || t.includes("escava") || t.includes("máquina") || t.includes("maquina")) {
    return {
      atividades: ["Operação de retroescavadeira", "Escavação, nivelamento e carregamento", "Deslocamento de máquina em vias internas"],
      riscos: ["Tombamento/capotamento da máquina", "Atropelamento de terceiros", "Ruído e vibração de corpo inteiro", "Contato com redes enterradas (água, energia, gás)"],
      epis: ["Capacete de segurança", "Protetor auricular", "Colete refletivo", "Bota de segurança", "Luvas"],
      medidas: ["Somente operador habilitado e autorizado (NR-11/NR-12)", "Check-list diário da máquina antes da operação", "Consultar cadastro de interferências antes de escavar", "Sinaleiro/observador em manobras com pedestres"],
      usaNr35: false, usaQuimicos: false, usaMaquinas: true,
    };
  }
  if (t.includes("jardin") || t.includes("paisag") || t.includes("plantio") || t.includes("grama")) {
    return {
      atividades: ["Manutenção de jardins e áreas verdes", "Plantio de mudas e gramíneas", "Irrigação, adubação e acabamento"],
      riscos: ["Cortes com ferramentas manuais", "Postura inadequada", "Animais peçonhentos", "Exposição ao sol", "Contato com adubos/defensivos"],
      epis: ["Luvas de proteção", "Bota de segurança", "Óculos de proteção", "Boné/chapéu", "Uniforme com identificação"],
      medidas: ["Inspeção da área antes do plantio/manutenção", "Uso de ferramentas em bom estado de conservação", "Adubos e defensivos apenas com luvas e máscara adequadas"],
      usaNr35: false, usaQuimicos: false, usaMaquinas: false,
    };
  }
  return base;
}

// ── Catálogo do checklist (por escopo) ──────────────────────────────
export interface ItemChecklist {
  key: string;
  titulo: string;
  descricao: string;
  categoria: "COLETIVO" | "FUNCIONARIO";
  geravel: boolean;      // o sistema gera automaticamente
  aplicavel: boolean;    // aplicável ao escopo selecionado
  itemSso?: number;      // nº do item na relação SST da contratante (1-19)
}

export function checklistDoEscopo(tipoServico: string): ItemChecklist[] {
  const p = perfilDoServico(tipoServico);
  return [
    { key: "relacao", titulo: "Relação de trabalhadores ativos", descricao: "Nome, CPF e função de toda a equipe (item 1 da relação SST)", categoria: "COLETIVO", geravel: true, aplicavel: true, itemSso: 1 },
    { key: "contatos", titulo: "Contatos de emergência e SESMT", descricao: "Declaração com contato de emergência e responsável SESMT (itens 13 e 14)", categoria: "COLETIVO", geravel: true, aplicavel: true, itemSso: 13 },
    { key: "ficha_registro", titulo: "Ficha de registro do trabalhador", descricao: "Comprova o vínculo com a empresa (item 2)", categoria: "FUNCIONARIO", geravel: true, aplicavel: true, itemSso: 2 },
    { key: "os", titulo: "Ordem de Serviço (NR-01)", descricao: "Riscos, EPIs e medidas preventivas da função (item 6)", categoria: "FUNCIONARIO", geravel: true, aplicavel: true, itemSso: 6 },
    { key: "procedimento", titulo: "Procedimento operacional assinado", descricao: "Procedimento detalhado da atividade com assinatura (item 4)", categoria: "FUNCIONARIO", geravel: true, aplicavel: true, itemSso: 4 },
    { key: "ficha_epi", titulo: "Ficha de entrega de EPI", descricao: "Entregas registradas + termo de responsabilidade (item 12)", categoria: "FUNCIONARIO", geravel: true, aplicavel: true, itemSso: 12 },
    { key: "nr35", titulo: "Autorização de trabalho em altura (NR-35)", descricao: "Autorização do empregador para trabalho em altura (item 10)", categoria: "FUNCIONARIO", geravel: true, aplicavel: p.usaNr35, itemSso: 10 },
    { key: "aso", titulo: "ASO — Atestado de Saúde Ocupacional", descricao: "Emitido por médico do trabalho — anexar cópia (item 5)", categoria: "FUNCIONARIO", geravel: false, aplicavel: true, itemSso: 5 },
    { key: "cert_nr", titulo: "Certificados de treinamento NR", descricao: p.usaMaquinas ? "NR-06 e NR-12 (roçadeira/motosserra/máquinas) — anexar certificados (itens 7 e 8)" : "Certificados NR aplicáveis à função — anexar (item 7)", categoria: "FUNCIONARIO", geravel: false, aplicavel: true, itemSso: 7 },
    { key: "cert_fispq", titulo: "Certificado de treinamento FISPQ", descricao: "Para quem manuseia produtos químicos — anexar (item 11)", categoria: "FUNCIONARIO", geravel: false, aplicavel: p.usaQuimicos, itemSso: 11 },
    { key: "pgr_pcmso", titulo: "PGR e PCMSO", descricao: "Programas da empresa — anexar versão vigente (item 3)", categoria: "COLETIVO", geravel: false, aplicavel: true, itemSso: 3 },
  ];
}

// ── Geração do pacote de documentos ─────────────────────────────────
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function gerarPacoteDocs(params: {
  empresa: EmpresaDoc;
  escopo: EscopoDoc;
  funcionarios: FuncionarioDoc[];
  itens: string[]; // keys marcadas
  contatoEmergencia?: string;
  responsavelSesmt?: string;
}): string {
  const { empresa, escopo, funcionarios, itens } = params;
  const p = perfilDoServico(escopo.tipoServico);
  const hoje = new Date().toLocaleDateString("pt-BR");
  const marcado = (k: string) => itens.includes(k);

  const cab = (titulo: string, subtitulo?: string) => `
    <div class="cab">
      <div class="marca">🌿 <b>VERDELIMP</b> SERVIÇOS</div>
      <div class="cab-emp">${esc(empresa.razaoSocial)} — CNPJ ${esc(empresa.cnpj)}<br>${esc(empresa.endereco)} — ${esc(empresa.telefone)} — ${esc(empresa.email)}</div>
      <h1>${esc(titulo)}</h1>
      ${subtitulo ? `<div class="cab-sub">${esc(subtitulo)}</div>` : ""}
    </div>`;

  const escopoLinha = [escopo.contratante && `Contratante: ${escopo.contratante}`, escopo.contratoNumero && `Contrato: ${escopo.contratoNumero}`, `Atividade: ${escopo.tipoServico}`, escopo.local && `Local: ${escopo.local}`].filter(Boolean).join("  |  ");

  const assinaturas = (esq: string, dir: string) => `
    <div class="assin">
      <div><div class="linha"></div>${esc(esq)}</div>
      <div><div class="linha"></div>${esc(dir)}</div>
    </div>
    <div class="data-doc">${escopo.local ? esc(escopo.local.split("–")[0].trim()) + ", " : ""}${hoje}</div>`;

  const paginas: string[] = [];

  // ── COLETIVO: Relação de trabalhadores (item 1) ──
  if (marcado("relacao")) {
    paginas.push(`<div class="page">
      ${cab("RELAÇÃO DE TRABALHADORES ATIVOS", "Item 1 da Relação de Documentos de Saúde e Segurança do Trabalho")}
      <p class="info">${esc(escopoLinha)}</p>
      <table>
        <thead><tr><th class="c" style="width:5%">Nº</th><th>NOME COMPLETO</th><th class="c">CPF</th><th>FUNÇÃO</th><th class="c">ADMISSÃO</th></tr></thead>
        <tbody>${funcionarios.map((f, i) => `<tr><td class="c">${i + 1}</td><td><b>${esc(f.nome)}</b></td><td class="c">${esc(f.cpf || "—")}</td><td>${esc(f.funcao)}</td><td class="c">${esc(f.admissao || "—")}</td></tr>`).join("")}</tbody>
      </table>
      <p class="nota">Declaramos que os trabalhadores acima possuem vínculo empregatício com esta empresa e estão autorizados a executar as atividades do escopo indicado.</p>
      ${assinaturas("Responsável pela empresa", "Responsável SESMT")}
    </div>`);
  }

  // ── COLETIVO: Contatos (itens 13 e 14) ──
  if (marcado("contatos")) {
    paginas.push(`<div class="page">
      ${cab("DECLARAÇÃO DE CONTATOS — EMERGÊNCIA E SESMT", "Itens 13 e 14 da Relação de Documentos de SST")}
      <p class="info">${esc(escopoLinha)}</p>
      <table>
        <tbody>
          <tr><td style="width:45%"><b>Contato em caso de emergência</b></td><td>${esc(params.contatoEmergencia || "A preencher: nome — telefone")}</td></tr>
          <tr><td><b>Responsável SESMT / coordenador operacional</b></td><td>${esc(params.responsavelSesmt || "A preencher: nome — telefone")}</td></tr>
          <tr><td><b>Empresa</b></td><td>${esc(empresa.razaoSocial)} — ${esc(empresa.telefone)} — ${esc(empresa.email)}</td></tr>
          <tr><td><b>Emergências (públicos)</b></td><td>SAMU 192 · Bombeiros 193 · Polícia 190</td></tr>
        </tbody>
      </table>
      ${assinaturas("Responsável pela empresa", "Responsável SESMT")}
    </div>`);
  }

  // ── POR FUNCIONÁRIO ──
  for (const f of funcionarios) {
    if (marcado("ficha_registro")) {
      paginas.push(`<div class="page">
        ${cab("FICHA DE REGISTRO DO TRABALHADOR", "Item 2 — comprova o vínculo com a empresa")}
        <table>
          <tbody>
            <tr><td style="width:35%"><b>Nome completo</b></td><td>${esc(f.nome)}</td></tr>
            <tr><td><b>CPF</b></td><td>${esc(f.cpf || "A preencher")}</td></tr>
            <tr><td><b>Função</b></td><td>${esc(f.funcao)}</td></tr>
            <tr><td><b>Data de admissão</b></td><td>${esc(f.admissao || "A preencher")}</td></tr>
            <tr><td><b>Empregador</b></td><td>${esc(empresa.razaoSocial)} — CNPJ ${esc(empresa.cnpj)}</td></tr>
            <tr><td><b>Regime</b></td><td>CLT — registro em carteira de trabalho (eSocial)</td></tr>
            ${escopo.contratante ? `<tr><td><b>Alocado em</b></td><td>${esc(escopo.contratante)}${escopo.local ? " — " + esc(escopo.local) : ""}</td></tr>` : ""}
          </tbody>
        </table>
        <p class="nota">Os dados completos do registro (livro/ficha eletrônica eSocial) encontram-se arquivados na sede da empresa e disponíveis para fiscalização.</p>
        ${assinaturas("Empregador", "Trabalhador: " + f.nome)}
      </div>`);
    }

    if (marcado("os")) {
      paginas.push(`<div class="page">
        ${cab("ORDEM DE SERVIÇO — SEGURANÇA E SAÚDE NO TRABALHO", "NR-01 — Item 6 da Relação de Documentos de SST")}
        <p class="info"><b>Trabalhador:</b> ${esc(f.nome)} &nbsp;|&nbsp; <b>Função:</b> ${esc(f.funcao)} &nbsp;|&nbsp; ${esc(escopoLinha)}</p>
        <h2>1. Atividades autorizadas</h2>
        <ul>${p.atividades.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
        <h2>2. Riscos ocupacionais da função</h2>
        <ul>${p.riscos.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
        <h2>3. EPIs de uso obrigatório</h2>
        <ul>${p.epis.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
        <h2>4. Medidas preventivas</h2>
        <ul>${p.medidas.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
        <h2>5. Obrigações do trabalhador (NR-01)</h2>
        <ul>
          <li>Cumprir as disposições legais e regulamentares sobre segurança e saúde no trabalho</li>
          <li>Usar e conservar os EPIs fornecidos, comunicando qualquer dano</li>
          <li>Comunicar imediatamente ao superior situações de risco grave e iminente</li>
          <li>Submeter-se aos exames médicos previstos no PCMSO</li>
        </ul>
        <p class="nota">Declaro ter recebido, lido e compreendido esta Ordem de Serviço, comprometendo-me a cumpri-la integralmente.</p>
        ${assinaturas("Empregador / SESMT", "Trabalhador: " + f.nome)}
      </div>`);
    }

    if (marcado("procedimento")) {
      paginas.push(`<div class="page">
        ${cab("PROCEDIMENTO OPERACIONAL — " + escopo.tipoServico.toUpperCase(), "Item 4 — procedimento detalhado e assinado pelo trabalhador")}
        <p class="info"><b>Trabalhador:</b> ${esc(f.nome)} &nbsp;|&nbsp; <b>Função:</b> ${esc(f.funcao)}</p>
        <h2>Antes de iniciar</h2>
        <ul>
          <li>Participar do DDS (Diálogo Diário de Segurança) da frente de trabalho</li>
          <li>Vestir todos os EPIs obrigatórios: ${esc(p.epis.slice(0, 4).join(", "))}</li>
          <li>Inspecionar ferramentas e equipamentos — reportar qualquer defeito</li>
          <li>Verificar a sinalização e o isolamento da área</li>
        </ul>
        <h2>Durante a execução</h2>
        <ul>${p.medidas.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
        <h2>Ao encerrar</h2>
        <ul>
          <li>Recolher ferramentas, resíduos e sinalização</li>
          <li>Higienizar e guardar os EPIs</li>
          <li>Registrar as atividades no diário de obras e reportar ocorrências</li>
        </ul>
        <p class="nota">Declaro que li, compreendi e me comprometo a executar as atividades conforme este procedimento.</p>
        ${assinaturas("Encarregado / SESMT", "Trabalhador: " + f.nome)}
      </div>`);
    }

    if (marcado("ficha_epi")) {
      const linhasVazias = Math.max(0, 8 - f.epis.length);
      paginas.push(`<div class="page">
        ${cab("FICHA DE CONTROLE DE ENTREGA DE EPI", "NR-06 — Item 12 da Relação de Documentos de SST")}
        <p class="info"><b>Trabalhador:</b> ${esc(f.nome)} &nbsp;|&nbsp; <b>CPF:</b> ${esc(f.cpf || "—")} &nbsp;|&nbsp; <b>Função:</b> ${esc(f.funcao)}</p>
        <table>
          <thead><tr><th>EPI</th><th class="c">QTD</th><th class="c">Nº CA</th><th class="c">ENTREGA</th><th class="c">VALIDADE CA</th><th class="c">ASSINATURA</th></tr></thead>
          <tbody>
            ${f.epis.map((e) => `<tr><td>${esc(e.item)}</td><td class="c">${e.quantidade}</td><td class="c">${esc(e.ca || "—")}</td><td class="c">${esc(e.dataEntrega)}</td><td class="c">${esc(e.validadeCa || "—")}</td><td></td></tr>`).join("")}
            ${Array.from({ length: linhasVazias }, () => `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`).join("")}
          </tbody>
        </table>
        <h2>Termo de responsabilidade</h2>
        <p class="nota">Declaro ter recebido gratuitamente os EPIs relacionados, com orientação de uso, guarda e conservação (NR-06). Comprometo-me a usá-los apenas para a finalidade a que se destinam, comunicar qualquer alteração que os torne impróprios e devolvê-los quando solicitado. Estou ciente de que o descumprimento constitui ato faltoso.</p>
        ${assinaturas("Empregador", "Trabalhador: " + f.nome)}
      </div>`);
    }

    if (marcado("nr35") && p.usaNr35) {
      const nr35 = f.treinamentos.find((t) => t.tipo.toUpperCase().includes("NR-35") || t.tipo.toUpperCase().includes("NR35"));
      paginas.push(`<div class="page">
        ${cab("AUTORIZAÇÃO PARA TRABALHO EM ALTURA", "NR-35 — Item 10 da Relação de Documentos de SST")}
        <p class="info">${esc(escopoLinha)}</p>
        <table>
          <tbody>
            <tr><td style="width:40%"><b>Trabalhador autorizado</b></td><td>${esc(f.nome)}</td></tr>
            <tr><td><b>CPF</b></td><td>${esc(f.cpf || "—")}</td></tr>
            <tr><td><b>Função</b></td><td>${esc(f.funcao)}</td></tr>
            <tr><td><b>Treinamento NR-35</b></td><td>${nr35 ? `Válido até ${esc(nr35.validade || "—")}` : "⚠️ Anexar certificado NR-35 vigente"}</td></tr>
            <tr><td><b>Aptidão (ASO)</b></td><td>Apto para trabalho em altura, conforme ASO vigente</td></tr>
          </tbody>
        </table>
        <p class="nota">Nos termos do item 35.4.1 da NR-35, autorizamos o trabalhador acima identificado a executar trabalho em altura, condicionado ao uso do cinto tipo paraquedista com talabarte, à Análise Preliminar de Risco da frente de trabalho e à supervisão do encarregado. Esta autorização também é enviada por e-mail à contratante.</p>
        ${assinaturas("Empregador (responsável pela autorização)", "Trabalhador: " + f.nome)}
      </div>`);
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Documentos — ${esc(escopo.tipoServico)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#f3f4f6;font-size:11.5px;line-height:1.5}
  @media print{
    body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none!important}
    .page{box-shadow:none!important;margin:0 auto!important;page-break-after:always}
    .page:last-child{page-break-after:auto}
  }
  .page{width:210mm;min-height:280mm;margin:10px auto;padding:16mm 18mm;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.12);position:relative}
  .cab{border-bottom:3px solid #2e7d32;padding-bottom:10px;margin-bottom:14px}
  .marca{font-size:15px;color:#334532}
  .cab-emp{font-size:9px;color:#6b7280;margin-top:3px;line-height:1.5}
  .cab h1{font-size:15px;font-weight:800;color:#2e7d32;margin-top:10px}
  .cab-sub{font-size:10px;color:#6b7280;margin-top:2px}
  .info{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:7px 11px;font-size:10.5px;color:#166534;margin-bottom:12px}
  h2{font-size:11.5px;font-weight:800;color:#334532;margin:12px 0 5px;text-transform:uppercase}
  ul{margin:0 0 4px 18px}
  li{margin:3px 0;font-size:11px}
  table{width:100%;border-collapse:collapse;margin:6px 0 12px}
  th{background:#2e7d32;color:#fff;font-size:9px;font-weight:700;padding:6px 8px;text-align:left;text-transform:uppercase}
  th.c,td.c{text-align:center}
  td{padding:6px 8px;font-size:10.5px;border:1px solid #e5e7eb;vertical-align:top}
  tbody tr:nth-child(even) td{background:#f7f9f7}
  .nota{font-size:10.5px;color:#374151;text-align:justify;background:#f9fafb;border-left:3px solid #2e7d32;padding:8px 12px;margin:10px 0}
  .assin{display:flex;gap:40px;margin-top:44px;text-align:center;font-size:10.5px;color:#374151}
  .assin>div{flex:1}
  .assin .linha{border-top:1.4px solid #333;margin-bottom:5px}
  .data-doc{text-align:center;font-size:10.5px;color:#6b7280;margin-top:18px}
  .printbar{position:sticky;top:0;background:#334532;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;z-index:9}
  .printbar button{background:#e8621a;border:none;color:#fff;font-weight:700;padding:8px 22px;border-radius:6px;cursor:pointer;font-size:13px}
</style>
</head>
<body>
<div class="printbar no-print">
  <span>📑 ${paginas.length} documento(s) — ${esc(escopo.tipoServico)} — use <b>Imprimir → Salvar como PDF</b></span>
  <button onclick="window.print()">🖨️ Imprimir / PDF</button>
</div>
${paginas.join("\n")}
</body>
</html>`;
}
