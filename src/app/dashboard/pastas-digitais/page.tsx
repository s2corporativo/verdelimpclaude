"use client";
import { useEffect, useState } from "react";

interface Pasta {
  code: string;
  nome: string;
  icon: string;
  subpastas: string[];
}

interface DocumentoControlar {
  code: string;
  item: string;
  obrigatoria: boolean;
}

export default function PastasDigitaisPage() {
  const [pastas, setPastas] = useState<Pasta[]>([]);
  const [docsControlar, setDocsControlar] = useState<DocumentoControlar[]>([]);
  const [padrao, setPadrao] = useState<any>(null);
  const [pastaExpandida, setPastaExpandida] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      try {
        const r = await fetch("/api/documentos/pastas");
        const d = await r.json();
        setPastas(d.pastas || DEMO_PASTAS);
        setDocsControlar(d.documentosAControlar || []);
        setPadrao(d.padraoNomenclatura || null);
      } catch {
        setPastas(DEMO_PASTAS);
      } finally { setCarregando(false); }
    };
    carregar();
  }, []);

  const togglePasta = (code: string) => setPastaExpandida(pastaExpandida === code ? null : code);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>📁 Organização de Pastas Digitais</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 20 }}>
        Estrutura padronizada de arquivos — manual de organização Verdelimp
      </p>

      {/* Grid de pastas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12, marginBottom: 28 }}>
        {pastas.map((pasta) => {
          const expanded = pastaExpandida === pasta.code;
          return (
            <div
              key={pasta.code}
              onClick={() => togglePasta(pasta.code)}
              style={{
                background: expanded ? "#f0fdf4" : "#fff",
                border: `2px solid ${expanded ? "#4a9410" : "#e5e7eb"}`,
                borderRadius: 12,
                padding: 16,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: expanded ? 10 : 0 }}>
                <span style={{ fontSize: 28 }}>{pasta.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#4a9410", fontWeight: 700 }}>{pasta.code}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#334532" }}>{pasta.nome}</div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{pasta.subpastas.length} subpastas</div>
                </div>
              </div>
              {expanded && (
                <div style={{ borderTop: "1px solid #d1d5db", paddingTop: 8 }}>
                  {pasta.subpastas.map((sub, i) => (
                    <div key={i} style={{ padding: "4px 0", fontSize: 12, color: "#334532", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#4a9410" }}>📁</span> {sub}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Padrão de Nomenclatura */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h2 style={{ color: "#334532", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📐 Padrão de Nomenclatura</h2>
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <code style={{ fontSize: 13, color: "#334532", fontWeight: 700 }}>
            {padrao?.padrao || "ANO-MÊS-DIA - CLIENTE - TIPO DE DOCUMENTO - DESCRIÇÃO"}
          </code>
        </div>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>Exemplos:</h3>
        <div style={{ display: "grid", gap: 6 }}>
          {(padrao?.exemplos || [
            "2026-06-30 - SADA - Nota Fiscal - Roçada Mirafiori",
            "2026-06-30 - MRV - Proposta - Plantio de Mudas",
            "2026-06-30 - Funcionário Sergio - Termo de Celular",
            "2026-06-30 - Verdelimp - Relatório Fotográfico - Pátio PVD",
          ]).map((ex: string, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#f9fafb", borderRadius: 6, fontSize: 12, color: "#334532" }}>
              <span style={{ color: "#4a9410", fontWeight: 700 }}>✓</span>
              <code style={{ fontFamily: "monospace" }}>{ex}</code>
            </div>
          ))}
        </div>
      </div>

      {/* Documentos a Controlar */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
        <h2 style={{ color: "#334532", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>📑 Documentos a Controlar ({docsControlar.length})</h2>
        <div style={{ display: "grid", gap: 4 }}>
          {docsControlar.map((doc) => (
            <div key={doc.code} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
              background: doc.obrigatoria ? "#fefce8" : "#f9fafb",
              borderRadius: 6, fontSize: 12,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#fff",
                background: doc.obrigatoria ? "#dc2626" : "#6b7280",
                padding: "2px 6px", borderRadius: 4, minWidth: 28, textAlign: "center",
              }}>
                {doc.code}
              </span>
              <span style={{ flex: 1, color: "#334532" }}>{doc.item}</span>
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: doc.obrigatoria ? "#dc2626" : "#6b7280",
              }}>
                {doc.obrigatoria ? "Obrigatório" : "Opcional"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const DEMO_PASTAS: Pasta[] = [
  { code: "01", nome: "Clientes", icon: "👥", subpastas: ["Contratos", "Serviços", "Propostas", "Notas Fiscais", "Relatórios"] },
  { code: "02", nome: "Contratos", icon: "📋", subpastas: ["Ativos", "Aditivos", "Propostas Aprovadas", "Documentos Relacionados"] },
  { code: "03", nome: "Funcionários", icon: "👷", subpastas: ["Por Funcionário (CPF/Nome)", "Documentos Pessoais", "Ficha Cadastral", "EPI", "ASO", "Certificados", "Termos"] },
  { code: "04", nome: "Financeiro", icon: "💰", subpastas: ["Ano-Mês", "Contas a Pagar", "Contas a Receber", "Notas Fiscais", "Comprovantes"] },
  { code: "05", nome: "Fornecedores", icon: "🏢", subpastas: ["Orçamentos", "Notas", "Contatos", "Dados Bancários", "Histórico de Compras"] },
  { code: "06", nome: "Segurança do Trabalho", icon: "🦺", subpastas: ["DDS", "EPI", "Ordens de Serviço", "Certificados", "Listas de Presença", "Documentos SST"] },
  { code: "07", nome: "Relatórios Fotográficos", icon: "📸", subpastas: ["Por Cliente", "Por Data", "Por Local"] },
  { code: "08", nome: "Propostas e Orçamentos", icon: "📝", subpastas: ["Enviadas", "Aprovadas", "Recusadas", "Pendentes"] },
];
