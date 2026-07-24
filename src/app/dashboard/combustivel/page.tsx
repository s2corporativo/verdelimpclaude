"use client";

import { useCallback, useEffect, useState } from "react";
import { Botao, KpiCard, KpiGrid, TabelaHead } from "@/components/ui";
import { estiloInput, estiloLabel } from "@/lib/estilos";

const hoje = () => new Date().toISOString().slice(0, 10);
const moeda = (valor: unknown) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CombustivelPage() {
  const [registros, setRegistros] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMes: 0, totalLitros: 0, totalPeriodo: 0, precoMedioLitro: 0 });
  const [form, setForm] = useState({ vehicleId: "", date: hoje(), odometer: "", liters: "", pricePerLiter: "", fuelType: "Gasolina", station: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const response = await fetch("/api/combustivel", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os abastecimentos");
      setRegistros(data.data || []);
      setVeiculos(data.veiculos || []);
      setStats({
        totalMes: Number(data.totalMes || 0),
        totalLitros: Number(data.totalLitros || 0),
        totalPeriodo: Number(data.totalPeriodo || 0),
        precoMedioLitro: Number(data.precoMedioLitro || 0),
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar o combustível");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setBusy(true);
    setErro("");
    setMensagem("");
    try {
      const response = await fetch("/api/combustivel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, odometer: Number(form.odometer), liters: Number(form.liters), pricePerLiter: Number(form.pricePerLiter) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível registrar o abastecimento");
      setMensagem("Abastecimento registrado e vinculado ao histórico do veículo.");
      setForm({ vehicleId: "", date: hoje(), odometer: "", liters: "", pricePerLiter: "", fuelType: "Gasolina", station: "", notes: "" });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao registrar o abastecimento");
    } finally {
      setBusy(false);
    }
  };

  const mediaKmLitro = (() => {
    const porVeiculo: Record<string, { odometros: number[]; litros: number }> = {};
    for (const registro of registros) {
      const key = registro.vehicle?.id || registro.vehicleId || "?";
      const atual = porVeiculo[key] || { odometros: [], litros: 0 };
      atual.odometros.push(Number(registro.odometer || 0));
      atual.litros += Number(registro.liters || 0);
      porVeiculo[key] = atual;
    }
    const medias = Object.values(porVeiculo)
      .map((item) => {
        if (item.odometros.length < 2 || item.litros <= 0) return NaN;
        return (Math.max(...item.odometros) - Math.min(...item.odometros)) / item.litros;
      })
      .filter(Number.isFinite);
    return medias.length ? (medias.reduce((soma, media) => soma + media, 0) / medias.length).toFixed(1) : "—";
  })();

  return <div>
    <h1 style={{ color: "#334532", fontSize: 21, fontWeight: 800, marginBottom: 4 }}>Controle de combustível</h1>
    <p style={{ color: "#6b7280", fontSize: 12, margin: "0 0 13px" }}>Abastecimentos reais, sequência de hodômetro e custos por veículo.</p>

    {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 12 }}>{erro}</div>}
    {mensagem && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 12 }}>{mensagem}</div>}

    <KpiGrid colunas={5}>
      <KpiCard label="Custo no mês" valor={moeda(stats.totalMes)} cor="#dc2626" icone="⛽" />
      <KpiCard label="Litros no mês" valor={`${stats.totalLitros.toFixed(1)} L`} cor="#4a9410" icone="🛢️" />
      <KpiCard label="Preço médio/L" valor={moeda(stats.precoMedioLitro)} cor="#d97706" icone="💲" />
      <KpiCard label="Média da frota" valor={mediaKmLitro === "—" ? "—" : `${mediaKmLitro} km/L`} cor="#1d4ed8" icone="🚗" />
      <KpiCard label="Veículos ativos" valor={veiculos.length} cor="#7c3aed" icone="🚙" />
    </KpiGrid>

    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, margin: "14px 0" }}>
      <h2 style={{ color: "#334532", fontSize: 13, margin: "0 0 11px" }}>Registrar abastecimento</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
        <div><label style={estiloLabel}>Veículo *</label><select style={estiloInput} value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}><option value="">Selecione</option>{veiculos.map((veiculo) => <option key={veiculo.id} value={veiculo.id}>{veiculo.plate} — {veiculo.model}</option>)}</select></div>
        <div><label style={estiloLabel}>Data *</label><input type="date" style={estiloInput} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div><label style={estiloLabel}>Hodômetro *</label><input type="number" style={estiloInput} value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} /></div>
        <div><label style={estiloLabel}>Litros *</label><input type="number" step="0.01" style={estiloInput} value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} /></div>
        <div><label style={estiloLabel}>Preço por litro *</label><input type="number" step="0.001" style={estiloInput} value={form.pricePerLiter} onChange={(e) => setForm({ ...form, pricePerLiter: e.target.value })} /></div>
        <div><label style={estiloLabel}>Combustível</label><select style={estiloInput} value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })}>{["Gasolina", "Diesel S10", "Diesel S500", "Etanol", "GNV"].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div><label style={estiloLabel}>Posto</label><input style={estiloInput} value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} /></div>
        <div><label style={estiloLabel}>Total calculado</label><input readOnly style={{ ...estiloInput, background: "#f0fdf4", fontWeight: 700 }} value={form.liters && form.pricePerLiter ? moeda(Number(form.liters) * Number(form.pricePerLiter)) : ""} /></div>
        <div style={{ gridColumn: "span 2" }}><label style={estiloLabel}>Observações</label><input style={estiloInput} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <Botao onClick={salvar} disabled={busy || !form.vehicleId || !form.odometer || !form.liters || !form.pricePerLiter} style={{ marginTop: 10, padding: "8px 18px" }}>{busy ? "Salvando..." : "Registrar abastecimento"}</Botao>
    </div>

    {loading ? <div style={{ padding: 30, textAlign: "center", color: "#6b7280" }}>Carregando abastecimentos reais...</div> : registros.length === 0 ? <div style={{ padding: 35, textAlign: "center", background: "#fff", borderRadius: 12, color: "#6b7280" }}>Nenhum abastecimento registrado.</div> : <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}><table style={{ borderCollapse: "collapse", width: "100%" }}><TabelaHead colunas={["Data", "Veículo", "Hodômetro", "Litros", "Preço/L", "Total", "Tipo", "Posto"]} /><tbody>{registros.map((registro) => <tr key={registro.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 12px", fontSize: 11 }}>{new Date(registro.date).toLocaleDateString("pt-BR")}</td><td style={{ padding: "8px 12px", fontWeight: 600, fontSize: 12 }}>{registro.vehicle?.plate} <span style={{ fontSize: 10, color: "#9ca3af" }}>— {registro.vehicle?.model}</span></td><td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{Number(registro.odometer).toLocaleString("pt-BR")} km</td><td style={{ padding: "8px 12px", fontWeight: 700, color: "#4a9410" }}>{Number(registro.liters).toFixed(1)} L</td><td style={{ padding: "8px 12px" }}>{moeda(registro.pricePerLiter)}</td><td style={{ padding: "8px 12px", fontWeight: 700 }}>{moeda(registro.totalCost)}</td><td style={{ padding: "8px 12px", fontSize: 11 }}>{registro.fuelType}</td><td style={{ padding: "8px 12px", fontSize: 11, color: "#6b7280" }}>{registro.station || "—"}</td></tr>)}</tbody></table></div>}
  </div>;
}
