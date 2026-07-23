"use client";
import { useEffect, useState } from "react";

export default function Folha13Page() {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/folha/decimo-terceiro")
      .then(r => r.json())
      .then(setDados)
      .catch(() => setDados({ folha13: DEMO_13, totais: DEMO_TOTAIS, _demo: true }))
      .finally(() => setCarregando(false));
  }, []);

  const fmt = (v: number) => (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const folha = dados?.folha13 || [];
  const totais = dados?.totais || {};

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, margin: 0 }}>🎄 13º Salário — {dados?.ano || 2026}</h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "3px 0 0" }}>Projeção, cálculo e situação das parcelas por funcionário</p>
        </div>
      </div>

      {/* Totais */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          ["Total Bruto", `R$ ${fmt(totais.bruto)}`, "#334532"],
          ["Total INSS", `R$ ${fmt(totais.inss)}`, "#dc2626"],
          ["Total IRRF", `R$ ${fmt(totais.irrf)}`, "#dc2626"],
          ["Total FGTS (empresa)", `R$ ${fmt(totais.fgts)}`, "#d97706"],
          ["Total Líquido", `R$ ${fmt(totais.liquido)}`, "#15803d"],
        ].map(([label, valor, cor]) => (
          <div key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, borderTop: `3px solid ${cor}` }}>
            <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: cor, marginTop: 4 }}>{valor}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#334532", color: "#fff" }}>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Funcionário</th>
                <th style={{ padding: "10px 12px", textAlign: "left" }}>Função</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Salário Base</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Meses</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>13º Bruto</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>1ª Parcela</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Status 1ª</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>2ª Parcela</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Status 2ª</th>
              </tr>
            </thead>
            <tbody>
              {folha.map((f: any) => (
                <tr key={f.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600 }}>{f.nome}</td>
                  <td style={{ padding: "8px 12px", color: "#6b7280" }}>{f.funcao}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmt(f.salarioBase)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>{f.mesesTrabalhados}/12</td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#334532" }}>R$ {fmt(f.valor13Bruto)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmt(f.parcela1.valor)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <span style={{ background: f.parcela1.status === "pago" ? "#dcfce7" : f.parcela1.status === "descontado" ? "#dbeafe" : "#fef3c7", color: f.parcela1.status === "pago" ? "#15803d" : f.parcela1.status === "descontado" ? "#1d4ed8" : "#92400e", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                      {f.parcela1.status === "pago" ? "Pago" : f.parcela1.status === "descontado" ? "Descontado" : "Prevista"}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmt(f.parcela2.valor)}</td>
                  <td style={{ padding: "8px 12px", textAlign: "center" }}>
                    <span style={{ background: f.parcela2.status === "pago" ? "#dcfce7" : f.parcela2.status === "descontado" ? "#dbeafe" : "#fef3c7", color: f.parcela2.status === "pago" ? "#15803d" : f.parcela2.status === "descontado" ? "#1d4ed8" : "#92400e", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                      {f.parcela2.status === "pago" ? "Pago" : f.parcela2.status === "descontado" ? "Descontado" : "Prevista"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const DEMO_13 = [
  { id: "e1", nome: "Abrão Felipe", funcao: "Op. Roçadeira", salarioBase: 2500, mesesTrabalhados: 12, valor13Bruto: 2500, parcela1: { valor: 1015.63, status: "prevista" }, parcela2: { valor: 1015.63, status: "prevista" }, inssTotal: 234.38, irrfTotal: 234.38, fgtsEmpresa: 200 },
  { id: "e2", nome: "Ana Luiza Ribeiro", funcao: "Supervisora", salarioBase: 3500, mesesTrabalhados: 12, valor13Bruto: 3500, parcela1: { valor: 1441.08, status: "prevista" }, parcela2: { valor: 1441.08, status: "prevista" }, inssTotal: 308.93, irrfTotal: 308.93, fgtsEmpresa: 280 },
  { id: "e3", nome: "Gilberto Ferreira", funcao: "Op. Roçadeira", salarioBase: 2400, mesesTrabalhados: 12, valor13Bruto: 2400, parcela1: { valor: 972.60, status: "prevista" }, parcela2: { valor: 972.60, status: "prevista" }, inssTotal: 227.40, irrfTotal: 227.40, fgtsEmpresa: 192 },
];
const DEMO_TOTAIS = { bruto: 8400, inss: 770.71, irrf: 770.71, fgts: 672, liquido: 6858.58 };
