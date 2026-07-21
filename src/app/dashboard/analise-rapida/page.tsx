"use client";
// Página simplificada de Análise Rápida de Contrato/Cotação com IA
// Usuário cola o texto do documento e o sistema extrai automaticamente:
// - equipe necessária
// - materiais/insumos
// - mobilização/desmobilização
// - documentação exigida (empresa e funcionários)
import { useState } from "react";

export default function AnaliseRapidaPage() {
  const [texto, setTexto] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("contrato");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");

  const analisar = async () => {
    if (!texto.trim()) {
      setErro("Cole o texto do contrato ou cotação para análise.");
      return;
    }
    setCarregando(true);
    setErro("");
    setResultado(null);

    try {
      const r = await fetch("/api/analise-contrato-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, tipoDocumento }),
      });
      const j = await r.json();
      if (j.error) {
        setErro(j.error);
      } else {
        setResultado(j);
      }
    } catch (e: any) {
      setErro(e.message || "Erro ao conectar com servidor");
    } finally {
      setCarregando(false);
    }
  };

  const limpar = () => {
    setTexto("");
    setResultado(null);
    setErro("");
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: "#334532", marginBottom: 8 }}>
        🤖 Análise Rápida de Contrato/Cotação com IA
      </h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 20 }}>
        Cole o texto do contrato, edital ou cotação e a IA vai extrair automaticamente: 
        equipe necessária, materiais, mobilização, e toda documentação exigida da empresa e dos funcionários.
      </p>

      {/* Área de entrada */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>
          Tipo de documento
        </label>
        <select 
          value={tipoDocumento} 
          onChange={(e) => setTipoDocumento(e.target.value)}
          style={{ padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, marginBottom: 12, width: "100%", maxWidth: 300 }}
        >
          <option value="contrato">Contrato</option>
          <option value="cotacao">Cotação / Orçamento Solicitado</option>
          <option value="edital">Edital de Licitação</option>
          <option value="termo">Termo de Referência</option>
        </select>

        <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 8 }}>
          Texto do documento
        </label>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui o texto completo do documento..."
          rows={12}
          style={{ 
            width: "100%", 
            padding: 12, 
            border: "1px solid #d1d5db", 
            borderRadius: 8, 
            fontSize: 13, 
            fontFamily: "monospace",
            resize: "vertical"
          }}
        />
        <p style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
          Dica: você pode copiar o texto de um PDF ou documento Word e colar aqui.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={analisar}
            disabled={carregando}
            style={{ 
              background: carregando ? "#9ca3af" : "#4a9410", 
              color: "#fff", 
              border: "none", 
              padding: "11px 24px", 
              borderRadius: 8, 
              fontSize: 14, 
              fontWeight: 700, 
              cursor: carregando ? "not-allowed" : "pointer" 
            }}
          >
            {carregando ? "⏳ Analisando..." : "✨ Analisar com IA"}
          </button>
          <button
            onClick={limpar}
            style={{ 
              background: "#f3f4f6", 
              color: "#374151", 
              border: "1px solid #d1d5db", 
              padding: "11px 24px", 
              borderRadius: 8, 
              fontSize: 14, 
              fontWeight: 600, 
              cursor: "pointer" 
            }}
          >
            Limpar
          </button>
        </div>
      </div>

      {erro && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <p style={{ margin: 0, color: "#991b1b", fontSize: 13, fontWeight: 700 }}>⚠️ Erro na análise</p>
          <p style={{ margin: "6px 0 0", color: "#991b1b", fontSize: 13 }}>{erro}</p>
        </div>
      )}

      {carregando && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ fontSize: 16, color: "#6b7280" }}>🤖 A IA está lendo e analisando o documento...</p>
          <p style={{ fontSize: 13, color: "#9ca3af" }}>Isso pode levar alguns segundos.</p>
        </div>
      )}

      {resultado && (
        <>
          {/* Resumo inicial */}
          <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>📋 Resumo do Documento</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200, 1fr))", gap: 12 }}>
              {resultado.cliente && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Cliente / Contratante</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{resultado.cliente}</p>
                </div>
              )}
              {resultado.objeto && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Objeto</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#374151" }}>{resultado.objeto}</p>
                </div>
              )}
              {resultado.local && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Local de Execução</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#374151" }}>{resultado.local}</p>
                </div>
              )}
              {resultado.areaM2 && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Área Estimada</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{resultado.areaM2.toLocaleString("pt-BR")} m²</p>
                </div>
              )}
              {resultado.prazoDias && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Prazo (dias)</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{resultado.prazoDias} dias</p>
                </div>
              )}
              {resultado.tipoServico && (
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Tipo de Serviço</p>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#374151" }}>{resultado.tipoServico}</p>
                </div>
              )}
            </div>
            {resultado.observacoes && (
              <div style={{ marginTop: 12, padding: "10px 12px", background: "#fef3c7", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 600 }}>⚠️ Observações Importantes</p>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#78350f" }}>{resultado.observacoes}</p>
              </div>
            )}
          </div>

          {/* Equipe necessária */}
          {resultado.equipeNecessaria && resultado.equipeNecessaria.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>
                👷 Equipe Necessária — Total: {resultado.equipeNecessaria.reduce((acc: number, e: any) => acc + e.quantidade, 0)} pessoas
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Função</th>
                    <th style={{ padding: 8 }}>Quantidade</th>
                    <th style={{ padding: 8 }}>Salário Sugerido</th>
                    <th style={{ padding: 8 }}>Custo Mensal Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.equipeNecessaria.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{item.funcao}</td>
                      <td style={{ padding: 8 }}>{item.quantidade}</td>
                      <td style={{ padding: 8 }}>R$ {item.salarioSugerido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: 8, fontWeight: 700, color: "#4a9410" }}>
                        R$ {(item.salarioSugerido * item.quantidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Materiais e insumos */}
          {resultado.materiais && resultado.materiais.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>🧰 Materiais e Insumos</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Item</th>
                    <th style={{ padding: 8 }}>Quantidade</th>
                    <th style={{ padding: 8 }}>Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.materiais.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>{item.item}</td>
                      <td style={{ padding: 8 }}>{item.quantidade ?? "—"}</td>
                      <td style={{ padding: 8 }}>{item.unidade ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobilização */}
          {resultado.mobilizacao && resultado.mobilizacao.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>🚚 Mobilização</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Item</th>
                    <th style={{ padding: 8 }}>Custo Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.mobilizacao.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>{item.item}</td>
                      <td style={{ padding: 8, fontWeight: 700, color: "#4a9410" }}>
                        R$ {item.custoEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Desmobilização */}
          {resultado.desmobilizacao && resultado.desmobilizacao.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>📦 Desmobilização</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Item</th>
                    <th style={{ padding: 8 }}>Custo Estimado</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.desmobilizacao.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8 }}>{item.item}</td>
                      <td style={{ padding: 8, fontWeight: 700, color: "#4a9410" }}>
                        R$ {item.custoEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Documentação da Empresa */}
          {resultado.documentacaoEmpresa && resultado.documentacaoEmpresa.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>🏢 Documentação Exigida da EMPRESA</h2>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                Verifique em <strong>Monitor de Documentação → Documentos da Empresa</strong> quais estão pendentes ou vencidas.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Documento</th>
                    <th style={{ padding: 8 }}>Obrigatório</th>
                    <th style={{ padding: 8 }}>Validade</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.documentacaoEmpresa.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{item.documento}</td>
                      <td style={{ padding: 8 }}>
                        {item.obrigatorio ? (
                          <span style={{ color: "#991b1b", fontWeight: 700 }}>SIM</span>
                        ) : (
                          <span style={{ color: "#6b7280" }}>Não</span>
                        )}
                      </td>
                      <td style={{ padding: 8 }}>
                        {item.validadeDias ? `${item.validadeDias} dias` : "Sem validade"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Documentação dos Funcionários */}
          {resultado.documentacaoFuncionario && resultado.documentacaoFuncionario.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#334532", margin: "0 0 12px" }}>
                👷 Documentação Exigida dos FUNCIONÁRIOS
              </h2>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                Verifique em <strong>Monitor de Documentação → Matriz por Funcionário</strong> quais estão pendentes ou vencidos para cada funcionário mobilizado.
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: 8 }}>Documento</th>
                    <th style={{ padding: 8 }}>Obrigatório</th>
                    <th style={{ padding: 8 }}>Validade</th>
                    <th style={{ padding: 8 }}>Norma</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.documentacaoFuncionario.map((item: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: 8, fontWeight: 600 }}>{item.documento}</td>
                      <td style={{ padding: 8 }}>
                        {item.obrigatorio ? (
                          <span style={{ color: "#991b1b", fontWeight: 700 }}>SIM</span>
                        ) : (
                          <span style={{ color: "#6b7280" }}>Não</span>
                        )}
                      </td>
                      <td style={{ padding: 8 }}>
                        {item.validadeDias ? `${item.validadeDias} dias` : "Sem validade"}
                      </td>
                      <td style={{ padding: 8 }}>
                        {item.norma ? (
                          <span style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            {item.norma}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Botões de ação */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.href = "/dashboard/contratos/novo"}
              style={{ 
                background: "#4a9410", 
                color: "#fff", 
                border: "none", 
                padding: "11px 24px", 
                borderRadius: 8, 
                fontSize: 14, 
                fontWeight: 700, 
                cursor: "pointer" 
              }}
            >
              ➕ Criar Contrato a partir desta análise
            </button>
            <button
              onClick={() => window.location.href = "/dashboard/monitor-docs"}
              style={{ 
                background: "#f3f4f6", 
                color: "#374151", 
                border: "1px solid #d1d5db", 
                padding: "11px 24px", 
                borderRadius: 8, 
                fontSize: 14, 
                fontWeight: 600, 
                cursor: "pointer" 
              }}
            >
              🚦 Verificar Documentação Pendente
            </button>
          </div>
        </>
      )}
    </div>
  );
}
