"use client";
import { useState } from "react";

const HOJE = new Date();
const DIA_MES = HOJE.getDate();
const MES_ANO = `${HOJE.getFullYear()}-${String(HOJE.getMonth() + 1).padStart(2, "0")}`;
const MES_LABEL = HOJE.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

const CHECKLIST_SADA = [
  { id: "s01", titulo: "Emitir NFS-e SADA Betim (R$ 66.000)", descricao: "Nota fiscal de serviços mensal — Portal NFS-e", prazo: "Dia 01", status: "pendente", tipo: "nfse" },
  { id: "s02", titulo: "Emitir NFS-e SADA Igarapé (R$ 12.000)", descricao: "Nota fiscal de serviços mensal — Portal NFS-e", prazo: "Dia 01", status: "pendente", tipo: "nfse" },
  { id: "s03", titulo: "Solicitar folhas de ponto", descricao: "Solicitar folha de ponto dos funcionários assinadas", prazo: "Dia 05", status: "pendente", tipo: "doc" },
  { id: "s04", titulo: "Separar contracheques assinados", descricao: "Contracheques do mês anterior assinados por cada funcionário", prazo: "Dia 05", status: "pendente", tipo: "doc" },
  { id: "s05", titulo: "Comprovantes quitação salários", descricao: "Comprovantes de pagamento de salários (extrato bancário/PIX)", prazo: "Dia 05", status: "pendente", tipo: "doc" },
  { id: "s06", titulo: "Comprovantes VA Refeição", descricao: "Comprovantes de crédito VR dos funcionários", prazo: "Dia 05", status: "pendente", tipo: "doc" },
  { id: "s07", titulo: "Comprovantes FGTS", descricao: "Comprovantes de recolhimento FGTS do mês", prazo: "Dia 05", status: "pendente", tipo: "doc" },
  { id: "s08", titulo: "Contatar Tatiana (Domínio Contábil)", descricao: "Solicitar documentos contábeis e RH complementares — Tel: (31) 9734-4941", prazo: "Dia 05", status: "pendente", tipo: "contato" },
  { id: "s09", titulo: "Receber docs da Tatiana", descricao: "Receber e conferir documentos enviados pela Domínio Contábil", prazo: "Dia 07", status: "pendente", tipo: "doc" },
  { id: "s10", titulo: "Conferir documentação completa", descricao: "Verificar se todos os documentos estão corretos e completos", prazo: "Dia 08", status: "pendente", tipo: "doc" },
  { id: "s11", titulo: "Enviar documentação para SADA", descricao: "Enviar pacote documental completo por e-mail ou sistema da SADA", prazo: "Dia 10", status: "pendente", tipo: "envio" },
  { id: "s12", titulo: "Confirmar recebimento SADA", descricao: "Confirmar que a SADA recebeu e validou a documentação", prazo: "Dia 10", status: "pendente", tipo: "contato" },
];

const STATUS_CORES: Record<string, { bg: string; color: string; label: string }> = {
  pendente: { bg: "#fef3c7", color: "#92400e", label: "Pendente" },
  "em andamento": { bg: "#dbeafe", color: "#1d4ed8", label: "Em Andamento" },
  concluido: { bg: "#dcfce7", color: "#15803d", label: "Concluído" },
  atrasado: { bg: "#fee2e2", color: "#991b1b", label: "Atrasado" },
};

const TIPO_CORES: Record<string, string> = {
  nfse: "#dc2626",
  doc: "#d97706",
  contato: "#2563eb",
  envio: "#059669",
};

export default function SadaPage() {
  const [checklist, setChecklist] = useState(CHECKLIST_SADA);
  const [filtro, setFiltro] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    setChecklist((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const ordem = ["pendente", "em andamento", "concluido"];
      const idx = ordem.indexOf(item.status);
      const proximo = ordem[(idx + 1) % ordem.length];
      return { ...item, status: proximo };
    }));
  };

  const checklistFiltrado = filtro ? checklist.filter((i) => i.tipo === filtro) : checklist;
  const concluidas = checklist.filter((i) => i.status === "concluido").length;
  const progresso = Math.round((concluidas / checklist.length) * 100);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>📋 Controle SADA Transportes</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 16 }}>{MES_LABEL} — Workflow de documentação mensal para SADA (dia 01 a 10)</p>

      {/* Resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #dc2626" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>NFS-e</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>R$ 78.000</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>Betim 66k + Igarapé 12k</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #d97706" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>DOCUMENTOS</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#d97706" }}>{concluidas}/{checklist.length}</div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>itens concluídos</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #2563eb" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>PROGRESSO</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#2563eb" }}>{progresso}%</div>
          <div style={{ background: "#e5e7eb", borderRadius: 4, height: 5, marginTop: 4 }}>
            <div style={{ background: progresso === 100 ? "#15803d" : "#2563eb", height: 5, borderRadius: 4, width: `${progresso}%` }} />
          </div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: "3px solid #059669" }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>PRAZO</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: DIA_MES > 10 ? "#dc2626" : "#059669" }}>
            {DIA_MES <= 10 ? `${10 - DIA_MES} dias restantes` : "Prazo encerrado"}
          </div>
          <div style={{ fontSize: 10, color: "#6b7280" }}>envio até dia 10</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setFiltro(null)} style={{ background: !filtro ? "#334532" : "#f3f4f6", color: !filtro ? "#fff" : "#374151", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
          Todos ({checklist.length})
        </button>
        {Object.entries(TIPO_CORES).map(([tipo, cor]) => (
          <button key={tipo} onClick={() => setFiltro(filtro === tipo ? null : tipo)} style={{ background: filtro === tipo ? cor : "#f3f4f6", color: filtro === tipo ? "#fff" : "#374151", border: "none", padding: "4px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
            {tipo === "nfse" ? "NFS-e" : tipo === "doc" ? "Documentos" : tipo === "contato" ? "Contatos" : "Envio"}
          </button>
        ))}
      </div>

      {/* Checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {checklistFiltrado.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleStatus(item.id)}
            style={{
              background: "#fff", border: "1px solid #e5e7eb",
              borderLeft: `4px solid ${TIPO_CORES[item.tipo] || "#9ca3af"}`,
              borderRadius: 8, padding: "10px 14px", cursor: "pointer",
              display: "flex", alignItems: "flex-start", gap: 10,
              opacity: item.status === "concluido" ? 0.7 : 1,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
              border: `2px solid ${STATUS_CORES[item.status]?.color || "#d1d5db"}`,
              background: item.status === "concluido" ? "#15803d" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "#fff", fontWeight: 700,
            }}>
              {item.status === "concluido" ? "✓" : ""}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: item.status === "concluido" ? "#6b7280" : "#1f2937", textDecoration: item.status === "concluido" ? "line-through" : "none" }}>
                  {item.titulo}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#fff", background: TIPO_CORES[item.tipo], padding: "1px 6px", borderRadius: 4 }}>
                  {item.tipo === "nfse" ? "NFS-e" : item.tipo === "doc" ? "DOC" : item.tipo === "contato" ? "CONTATO" : "ENVIO"}
                </span>
                <span style={{ fontSize: 10, color: "#6b7280", background: "#f3f4f6", padding: "1px 6px", borderRadius: 4 }}>
                  {item.prazo}
                </span>
                <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_CORES[item.status]?.color, background: STATUS_CORES[item.status]?.bg, padding: "1px 6px", borderRadius: 4 }}>
                  {STATUS_CORES[item.status]?.label}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "#6b7280", margin: "3px 0 0", lineHeight: 1.4 }}>{item.descricao}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Contatos */}
      <div style={{ marginTop: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <h3 style={{ color: "#334532", fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📞 Contatos Relevantes</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {[
            { nome: "Tatiana", empresa: "Domínio Contábil", funcao: "RH / Admissão / Rescisão", tel: "(31) 9734-4941", cor: "#e11d48" },
            { nome: "Matheus", empresa: "Domínio Contábil", funcao: "Notas Fiscais / Fiscal", tel: "(31) 3323-8268", cor: "#dc2626" },
            { nome: "Samara", empresa: "Gecontrol", funcao: "Agendamento ASO / Portal SOC", tel: "(31) 97141-7004", cor: "#0d9488" },
          ].map((c, i) => (
            <div key={i} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, borderLeft: `3px solid ${c.cor}` }}>
              <div style={{ fontWeight: 700, color: "#1f2937", fontSize: 13 }}>{c.nome}</div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>{c.empresa}</div>
              <div style={{ fontSize: 11, color: c.cor, fontWeight: 600, marginTop: 2 }}>{c.funcao}</div>
              <div style={{ fontSize: 12, color: "#1d4ed8", marginTop: 4 }}>{c.tel}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Regras de negócio */}
      <div style={{ marginTop: 14, background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 12, padding: 16 }}>
        <h3 style={{ color: "#92400e", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>⚠️ Regras Importantes</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#78350f" }}>
          <li>NFS-e Betim (R$ 66.000) e Igarapé (R$ 12.000) devem ser emitidas todo dia 01</li>
          <li>Documentação deve ser enviada entre dia 05 e dia 10</li>
          <li>Solicitar documentos complementares à Tatiana todo dia 05</li>
          <li>Qualquer dúvida, ligar para a empresa terceirizada correspondente</li>
        </ul>
      </div>
    </div>
  );
}
