"use client";
import { useEffect, useState } from "react";

export default function Folha13Page() {
  const [dados, setDados] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const response = await fetch("/api/folha/decimo-terceiro", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Falha ao carregar o 13º salário");
      setDados(body);
    } catch (e: any) {
      setDados(null);
      setErro(e.message || "Falha ao carregar o 13º salário");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const fmt = (value: number) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  const folha = dados?.folha13 || [];
  const totais = dados?.totais || {};
  const ano = dados?.ano || new Date().getFullYear();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ color: "#334532", fontSize: 22, fontWeight: 700, margin: 0 }}>🎄 13º Salário — {ano}</h1>
          <p style={{ color: "#6b7280", fontSize: 12, margin: "3px 0 0" }}>Projeção calculada a partir dos funcionários e lançamentos reais do sistema</p>
        </div>
        <button onClick={carregar} disabled={carregando} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12 }}>
          {carregando ? "⟳ Atualizando..." : "🔄 Atualizar"}
        </button>
      </div>

      {erro && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 12 }}>
          {erro}. Nenhum valor demonstrativo foi exibido.
        </div>
      )}

      {carregando && !dados ? (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 40, textAlign: "center", color: "#6b7280" }}>⟳ Calculando projeção...</div>
      ) : dados ? (
        <>
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 13px", marginBottom: 14, fontSize: 11, color: "#1e40af" }}>
            Projeção gerencial. Antes do pagamento, valide bases, médias remuneratórias, afastamentos, convenção coletiva e cálculos com a contabilidade.
          </div>

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
                  {folha.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.nome}</td>
                      <td style={{ padding: "8px 12px", color: "#6b7280" }}>{item.funcao}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmt(item.salarioBase)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{item.mesesTrabalhados}/12</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#334532" }}>R$ {fmt(item.valor13Bruto)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmt(item.parcela1.valor)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}><Status status={item.parcela1.status} /></td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>R$ {fmt(item.parcela2.valor)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}><Status status={item.parcela2.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {folha.length === 0 && <div style={{ padding: 30, textAlign: "center", color: "#9ca3af" }}>Nenhum funcionário ativo encontrado para a projeção.</div>}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Status({ status }: { status: string }) {
  const pago = status === "pago";
  const descontado = status === "descontado";
  return (
    <span style={{ background: pago ? "#dcfce7" : descontado ? "#dbeafe" : "#fef3c7", color: pago ? "#15803d" : descontado ? "#1d4ed8" : "#92400e", padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
      {pago ? "Pago" : descontado ? "Descontado" : "Prevista"}
    </span>
  );
}
