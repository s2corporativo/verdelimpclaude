"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const moeda = (valor: unknown) => Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RHPage() {
  const [data, setData] = useState<any[]>([]);
  const [folhaTotal, setFolhaTotal] = useState(0);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      if (busca.trim()) params.set("busca", busca.trim());
      const response = await fetch(`/api/funcionarios?${params.toString()}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Não foi possível carregar os funcionários");
      setData(body.data || []);
      setFolhaTotal(Number(body.folhaTotal || 0));
      setStats(body.stats || {});
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar o RH");
    } finally {
      setLoading(false);
    }
  }, [busca]);

  useEffect(() => { carregar(); }, [carregar]);

  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
      <div>
        <h1 style={{ color: "#334532", fontSize: 21, fontWeight: 800, margin: 0 }}>Pessoas e RH</h1>
        <p style={{ color: "#6b7280", fontSize: 12, margin: "4px 0 0" }}>Cadastro real de colaboradores e pendências documentais e ocupacionais.</p>
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <Link href="/dashboard/rh-admissao" style={{ background: "#334532", color: "#fff", padding: "8px 13px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 12 }}>Admissão e desligamento</Link>
        <Link href="/dashboard/mobilizacoes" style={{ background: "#e8f5ee", color: "#334532", padding: "8px 13px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 12 }}>Mobilizações</Link>
        <Link href="/dashboard/treinamentos" style={{ background: "#f3e8ff", color: "#6d28d9", padding: "8px 13px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 12 }}>Treinamentos</Link>
        <Link href="/dashboard/folha-detalhada" style={{ background: "#dbeafe", color: "#1d4ed8", padding: "8px 13px", borderRadius: 8, textDecoration: "none", fontWeight: 700, fontSize: 12 }}>Folha detalhada</Link>
      </div>
    </div>

    {erro && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 9, padding: "10px 13px", marginBottom: 12, fontSize: 12 }}>{erro}</div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(135px,1fr))", gap: 9, marginBottom: 14 }}>
      {[
        ["Ativos", stats.ativos || 0],
        ["Folha nominal", moeda(folhaTotal)],
        ["Afastados", stats.afastados || 0],
        ["Em férias", stats.ferias || 0],
        ["Docs vencidos", stats.documentosVencidos || 0],
        ["Docs em 30 dias", stats.documentosVencendo || 0],
        ["Treinamentos vencidos", stats.treinamentosVencidos || 0],
        ["ASO vencidos", stats.asoVencidos || 0],
      ].map(([label, value]) => <div key={String(label)} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}><div style={{ fontSize: 9, color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>{label}</div><div style={{ fontSize: 19, fontWeight: 800, color: Number(value) > 0 && String(label).includes("vencid") ? "#dc2626" : "#334532", marginTop: 4 }}>{value}</div></div>)}
    </div>

    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <input value={busca} onChange={(event) => setBusca(event.target.value)} onKeyDown={(event) => event.key === "Enter" && carregar()} placeholder="Buscar por nome, função ou CPF" style={{ flex: 1, maxWidth: 430, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 8 }} />
      <button onClick={carregar} style={{ border: 0, borderRadius: 8, padding: "8px 14px", background: "#334532", color: "#fff", fontWeight: 700 }}>Buscar</button>
    </div>

    <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", marginBottom: 12, color: "#1e40af", fontSize: 11 }}>
      A folha nominal é a soma dos salários-base cadastrados. Encargos, adicionais, benefícios, provisões e tributos devem ser apurados na Folha Detalhada e validados conforme o enquadramento efetivo da empresa e do trabalhador.
    </div>

    {loading ? <div style={{ padding: 35, textAlign: "center", color: "#6b7280" }}>Carregando funcionários reais...</div> : data.length === 0 ? <div style={{ padding: 35, textAlign: "center", color: "#6b7280", background: "#fff", borderRadius: 12 }}>Nenhum funcionário encontrado.</div> : <div style={{ overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}><table style={{ borderCollapse: "collapse", width: "100%" }}><thead><tr style={{ background: "#e8f5ee" }}>{["Funcionário", "Função", "Admissão", "Salário-base", "Documentos", "Treinamentos", "ASO", "Status"].map((header) => <th key={header} style={{ padding: "9px 11px", textAlign: "left", fontSize: 10, color: "#334532" }}>{header}</th>)}</tr></thead><tbody>{data.map((employee) => { const now = new Date(); const docsVencidos = employee.docs?.filter((doc: any) => new Date(doc.expiresAt) < now).length || 0; const trainingsVencidos = employee.trainings?.filter((item: any) => new Date(item.expiresAt) < now).length || 0; const asoVencidos = employee.asoExams?.filter((item: any) => new Date(item.expiresAt) < now).length || 0; return <tr key={employee.id} style={{ borderBottom: "1px solid #f3f4f6" }}><td style={{ padding: "8px 11px", fontWeight: 700, fontSize: 12 }}>{employee.name}</td><td style={{ padding: "8px 11px", fontSize: 11, color: "#6b7280" }}>{employee.role || "—"}</td><td style={{ padding: "8px 11px", fontSize: 11 }}>{new Date(employee.admissionDate).toLocaleDateString("pt-BR")}</td><td style={{ padding: "8px 11px", fontWeight: 700, color: "#4a9410" }}>{moeda(employee.salary)}</td><td style={{ padding: "8px 11px", color: docsVencidos ? "#dc2626" : "#15803d", fontWeight: 700 }}>{docsVencidos ? `${docsVencidos} vencido(s)` : `${employee.docs?.length || 0} cadastrado(s)`}</td><td style={{ padding: "8px 11px", color: trainingsVencidos ? "#dc2626" : "#15803d", fontWeight: 700 }}>{trainingsVencidos ? `${trainingsVencidos} vencido(s)` : `${employee.trainings?.length || 0} cadastrado(s)`}</td><td style={{ padding: "8px 11px", color: asoVencidos ? "#dc2626" : "#15803d", fontWeight: 700 }}>{asoVencidos ? `${asoVencidos} vencido(s)` : `${employee.asoExams?.length || 0} cadastrado(s)`}</td><td style={{ padding: "8px 11px" }}><span style={{ background: employee.active ? "#dcfce7" : "#f3f4f6", color: employee.active ? "#15803d" : "#6b7280", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{employee.status || (employee.active ? "ativo" : "inativo")}</span></td></tr>; })}</tbody></table></div>}
  </div>;
}
