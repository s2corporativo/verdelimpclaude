"use client";
import { useEffect, useState } from "react";

const IS: any = { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 };
const LS: any = { fontSize: 11, fontWeight: 600, color: "#374151", display: "block", marginBottom: 3 };
const CARD: any = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 16 };
const TH: any = { padding: "9px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#334532" };
const TD: any = { padding: "8px 12px", fontSize: 12 };
const BTN: any = { border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600 };

const fmtData = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");

const ACOES_LABEL: Record<string, string> = {
  criar_usuario: "Criou usuário", editar_usuario: "Editou usuário", resetar_senha: "Resetou senha",
  desbloquear_usuario: "Desbloqueou usuário", criar_papel: "Criou papel", editar_papel: "Editou papel", excluir_papel: "Excluiu papel",
};

export default function AdminPage() {
  const [aba, setAba] = useState<"resumo" | "usuarios" | "papeis" | "auditoria">("resumo");
  const ABAS = [
    { id: "resumo", label: "📊 Visão Geral" },
    { id: "usuarios", label: "👤 Usuários" },
    { id: "papeis", label: "🛡️ Papéis & Permissões" },
    { id: "auditoria", label: "📜 Auditoria" },
  ] as const;

  return (
    <div>
      <h1 style={{ color: "#334532", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Administração do Sistema</h1>
      <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 14 }}>Usuários, papéis de acesso, permissões e trilha de auditoria.</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {ABAS.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)}
            style={{ ...BTN, padding: "8px 16px", fontSize: 12, background: aba === a.id ? "#334532" : "#fff", color: aba === a.id ? "#fff" : "#374151", border: aba === a.id ? "1px solid #334532" : "1px solid #d1d5db" }}>
            {a.label}
          </button>
        ))}
      </div>
      {aba === "resumo" && <AbaResumo />}
      {aba === "usuarios" && <AbaUsuarios />}
      {aba === "papeis" && <AbaPapeis />}
      {aba === "auditoria" && <AbaAuditoria />}
    </div>
  );
}

// ── Visão Geral ────────────────────────────────────────────────────
function AbaResumo() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { fetch("/api/admin/resumo").then((r) => r.json()).then(setD); }, []);
  if (!d) return <p style={{ fontSize: 13, color: "#6b7280" }}>Carregando…</p>;
  if (d.error) return <p style={{ fontSize: 13, color: "#991b1b" }}>{d.error}</p>;
  const K = ({ n, l, cor }: any) => (
    <div style={{ ...CARD, marginBottom: 0, textAlign: "center", padding: 14 }}>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: cor || "#334532" }}>{n}</p>
      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280" }}>{l}</p>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <K n={d.totalUsuarios} l="Usuários" />
        <K n={d.ativos} l="Ativos" cor="#059669" />
        <K n={d.inativos} l="Inativos" cor="#9ca3af" />
        <K n={d.bloqueados} l="Bloqueados" cor="#dc2626" />
        <K n={d.pendentesTroca} l="Senha provisória" cor="#d97706" />
        <K n={d.totalPapeis} l="Papéis" />
        <K n={d.eventos7d} l="Eventos 7 dias" />
      </div>
      <div style={CARD}>
        <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 10 }}>Últimos acessos</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr style={{ background: "#e8f5ee" }}>{["Usuário", "E-mail", "Último login"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
          <tbody>{(d.ultimosLogins || []).map((u: any) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ ...TD, fontWeight: 600 }}>{u.name}</td>
              <td style={TD}>{u.email}</td>
              <td style={TD}>{fmtData(u.lastLoginAt)}</td>
            </tr>
          ))}</tbody>
        </table>
        {(d.ultimosLogins || []).length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", margin: "10px 0 0" }}>Nenhum login registrado ainda.</p>}
      </div>
    </div>
  );
}

// ── Usuários ───────────────────────────────────────────────────────
function AbaUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [papeis, setPapeis] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", email: "", roleIds: [] as string[] });
  const [editando, setEditando] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);

  const load = () => {
    fetch("/api/admin/usuarios").then((r) => r.json()).then((d) => setUsuarios(d.data || []));
    fetch("/api/admin/papeis").then((r) => r.json()).then((d) => setPapeis(d.data || []));
  };
  useEffect(load, []);

  const togglePapel = (lista: string[], id: string) => lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];

  const criar = async () => {
    setMsg("");
    const r = await fetch("/api/admin/usuarios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (d.error) { setMsg("✗ " + d.error); return; }
    setSenhaGerada({ email: form.email, senha: d.senhaProvisoria });
    setForm({ name: "", email: "", roleIds: [] });
    setMsg("✓ Usuário criado");
    load();
  };

  const salvarEdicao = async () => {
    setMsg("");
    const r = await fetch(`/api/admin/usuarios/${editando.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editando.name, email: editando.email, active: editando.active, roleIds: editando.roleIds }),
    });
    const d = await r.json();
    if (d.error) { setMsg("✗ " + d.error); return; }
    setEditando(null); setMsg("✓ Alterações salvas"); load();
  };

  const acaoRapida = async (id: string, acao: string, email: string) => {
    const r = await fetch(`/api/admin/usuarios/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao }) });
    const d = await r.json();
    if (d.error) { setMsg("✗ " + d.error); return; }
    if (d.senhaProvisoria) setSenhaGerada({ email, senha: d.senhaProvisoria });
    setMsg("✓ Feito"); load();
  };

  const toggleAtivo = async (u: any) => {
    const r = await fetch(`/api/admin/usuarios/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !u.active }) });
    const d = await r.json();
    if (d.error) { setMsg("✗ " + d.error); return; }
    setMsg("✓ Feito"); load();
  };

  const CheckPapeis = ({ selecionados, onToggle }: { selecionados: string[]; onToggle: (id: string) => void }) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {papeis.map((p) => (
        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, background: selecionados.includes(p.id) ? "#e8f5ee" : "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "4px 8px", cursor: "pointer" }}>
          <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => onToggle(p.id)} />
          {p.name}
        </label>
      ))}
    </div>
  );

  return (
    <div>
      {senhaGerada && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
            🔑 Senha provisória de <b>{senhaGerada.email}</b>: <code style={{ background: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: 13 }}>{senhaGerada.senha}</code>
            {" "}— anote e repasse com segurança; ela não será exibida novamente. O usuário deverá trocá-la no primeiro acesso.
          </p>
          <button onClick={() => setSenhaGerada(null)} style={{ ...BTN, background: "#fef3c7", color: "#92400e", marginTop: 8 }}>Fechar</button>
        </div>
      )}

      <div style={CARD}>
        <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 12 }}>+ Novo Usuário</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={LS}>Nome*</label><input style={IS} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><label style={LS}>E-mail*</label><input style={IS} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
        </div>
        <label style={LS}>Papéis de acesso</label>
        <CheckPapeis selecionados={form.roleIds} onToggle={(id) => setForm((p) => ({ ...p, roleIds: togglePapel(p.roleIds, id) }))} />
        {msg && <p style={{ color: msg.startsWith("✓") ? "#059669" : "#dc2626", fontSize: 12, margin: "10px 0 0" }}>{msg}</p>}
        <button onClick={criar} disabled={!form.name || !form.email} style={{ ...BTN, background: "#4a9410", color: "#fff", padding: "9px 24px", marginTop: 10, fontSize: 13 }}>+ Criar usuário</button>
      </div>

      {editando && (
        <div style={{ ...CARD, border: "2px solid #334532" }}>
          <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 12 }}>✏️ Editando: {editando.email}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={LS}>Nome</label><input style={IS} value={editando.name} onChange={(e) => setEditando((p: any) => ({ ...p, name: e.target.value }))} /></div>
            <div><label style={LS}>E-mail</label><input style={IS} value={editando.email} onChange={(e) => setEditando((p: any) => ({ ...p, email: e.target.value }))} /></div>
          </div>
          <label style={LS}>Papéis de acesso</label>
          <CheckPapeis selecionados={editando.roleIds} onToggle={(id) => setEditando((p: any) => ({ ...p, roleIds: togglePapel(p.roleIds, id) }))} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={salvarEdicao} style={{ ...BTN, background: "#4a9410", color: "#fff", padding: "8px 20px", fontSize: 12 }}>Salvar</button>
            <button onClick={() => setEditando(null)} style={{ ...BTN, background: "#f3f4f6", color: "#374151", padding: "8px 20px", fontSize: 12 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <thead><tr style={{ background: "#e8f5ee" }}>{["Nome", "E-mail", "Papéis", "Status", "Último login", "Ações"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>{usuarios.map((u) => {
          const bloqueado = u.lockedUntil && new Date(u.lockedUntil) > new Date();
          return (
            <tr key={u.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: u.active ? 1 : 0.55 }}>
              <td style={{ ...TD, fontWeight: 600 }}>{u.name}{u.mustChangePass && <span title="Senha provisória pendente" style={{ marginLeft: 6 }}>🔑</span>}</td>
              <td style={TD}>{u.email}</td>
              <td style={TD}>{u.roles.map((r: any) => <span key={r.id} style={{ background: r.name === "ADMIN" ? "#fee2e2" : "#e0e7ff", color: r.name === "ADMIN" ? "#991b1b" : "#3730a3", padding: "2px 7px", borderRadius: 8, fontSize: 10, fontWeight: 700, marginRight: 4 }}>{r.name}</span>)}</td>
              <td style={TD}>
                {bloqueado
                  ? <span style={{ background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>BLOQUEADO</span>
                  : <span style={{ background: u.active ? "#dcfce7" : "#f3f4f6", color: u.active ? "#15803d" : "#6b7280", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{u.active ? "ATIVO" : "INATIVO"}</span>}
              </td>
              <td style={{ ...TD, fontSize: 11, color: "#6b7280" }}>{fmtData(u.lastLoginAt)}</td>
              <td style={TD}>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  <button onClick={() => setEditando({ id: u.id, name: u.name, email: u.email, active: u.active, roleIds: u.roles.map((r: any) => r.id) })} style={{ ...BTN, background: "#e0e7ff", color: "#3730a3" }}>Editar</button>
                  <button onClick={() => acaoRapida(u.id, "resetar_senha", u.email)} style={{ ...BTN, background: "#fef3c7", color: "#92400e" }}>Resetar senha</button>
                  {bloqueado && <button onClick={() => acaoRapida(u.id, "desbloquear", u.email)} style={{ ...BTN, background: "#dcfce7", color: "#15803d" }}>Desbloquear</button>}
                  <button onClick={() => toggleAtivo(u)} style={{ ...BTN, background: u.active ? "#fee2e2" : "#dcfce7", color: u.active ? "#991b1b" : "#15803d" }}>{u.active ? "Desativar" : "Reativar"}</button>
                </div>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

// ── Papéis & Permissões ────────────────────────────────────────────
function AbaPapeis() {
  const [papeis, setPapeis] = useState<any[]>([]);
  const [permissoes, setPermissoes] = useState<any[]>([]);
  const [novo, setNovo] = useState({ name: "", description: "" });
  const [sel, setSel] = useState<any>(null); // papel selecionado para editar permissões
  const [msg, setMsg] = useState("");

  const load = () => fetch("/api/admin/papeis").then((r) => r.json()).then((d) => { setPapeis(d.data || []); setPermissoes(d.permissoes || []); });
  useEffect(() => { load(); }, []);

  const modulos = Array.from(new Set(permissoes.map((p) => p.module)));
  const acoes = Array.from(new Set(permissoes.map((p) => p.action)));

  const criar = async () => {
    setMsg("");
    const r = await fetch("/api/admin/papeis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novo) });
    const d = await r.json();
    if (d.error) { setMsg("✗ " + d.error); return; }
    setNovo({ name: "", description: "" }); setMsg("✓ Papel criado"); load();
  };

  const salvarPermissoes = async () => {
    setMsg("");
    const r = await fetch(`/api/admin/papeis/${sel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: sel.description, permissionIds: sel.permissionIds }) });
    const d = await r.json();
    if (d.error) { setMsg("✗ " + d.error); return; }
    setSel(null); setMsg("✓ Permissões salvas"); load();
  };

  const excluir = async (p: any) => {
    if (!confirm(`Excluir o papel ${p.name}?`)) return;
    const r = await fetch(`/api/admin/papeis/${p.id}`, { method: "DELETE" });
    const d = await r.json();
    setMsg(d.error ? "✗ " + d.error : "✓ Papel excluído"); load();
  };

  const togglePerm = (id: string) => setSel((p: any) => ({ ...p, permissionIds: p.permissionIds.includes(id) ? p.permissionIds.filter((x: string) => x !== id) : [...p.permissionIds, id] }));

  return (
    <div>
      <div style={CARD}>
        <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 12 }}>+ Novo Papel</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
          <div><label style={LS}>Nome* (ex.: COMERCIAL)</label><input style={IS} value={novo.name} onChange={(e) => setNovo((p) => ({ ...p, name: e.target.value }))} /></div>
          <div><label style={LS}>Descrição</label><input style={IS} value={novo.description} onChange={(e) => setNovo((p) => ({ ...p, description: e.target.value }))} /></div>
        </div>
        {msg && <p style={{ color: msg.startsWith("✓") ? "#059669" : "#dc2626", fontSize: 12, marginBottom: 8 }}>{msg}</p>}
        <button onClick={criar} disabled={!novo.name} style={{ ...BTN, background: "#4a9410", color: "#fff", padding: "9px 24px", fontSize: 13 }}>+ Criar papel</button>
      </div>

      {sel && (
        <div style={{ ...CARD, border: "2px solid #334532" }}>
          <h3 style={{ color: "#334532", fontSize: 13, marginBottom: 10 }}>🛡️ Permissões do papel {sel.name}</h3>
          <div style={{ marginBottom: 10 }}><label style={LS}>Descrição</label><input style={IS} value={sel.description || ""} onChange={(e) => setSel((p: any) => ({ ...p, description: e.target.value }))} /></div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr style={{ background: "#e8f5ee" }}><th style={TH}>Módulo</th>{acoes.map((a) => <th key={a} style={{ ...TH, textAlign: "center" }}>{a}</th>)}</tr></thead>
              <tbody>{modulos.map((m) => (
                <tr key={m} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ ...TD, fontWeight: 600, textTransform: "capitalize" }}>{m}</td>
                  {acoes.map((a) => {
                    const perm = permissoes.find((p) => p.module === m && p.action === a);
                    return (
                      <td key={a} style={{ ...TD, textAlign: "center" }}>
                        {perm ? <input type="checkbox" checked={sel.permissionIds.includes(perm.id)} onChange={() => togglePerm(perm.id)} /> : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={salvarPermissoes} style={{ ...BTN, background: "#4a9410", color: "#fff", padding: "8px 20px", fontSize: 12 }}>Salvar permissões</button>
            <button onClick={() => setSel(null)} style={{ ...BTN, background: "#f3f4f6", color: "#374151", padding: "8px 20px", fontSize: 12 }}>Cancelar</button>
          </div>
        </div>
      )}

      <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <thead><tr style={{ background: "#e8f5ee" }}>{["Papel", "Descrição", "Usuários", "Permissões", "Ações"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>{papeis.map((p) => (
          <tr key={p.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
            <td style={{ ...TD, fontWeight: 700 }}>{p.name}</td>
            <td style={{ ...TD, color: "#6b7280" }}>{p.description || "—"}</td>
            <td style={TD}>{p.usuarios}</td>
            <td style={TD}>{p.permissionIds.length}</td>
            <td style={TD}>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setSel({ ...p, permissionIds: [...p.permissionIds] })} style={{ ...BTN, background: "#e0e7ff", color: "#3730a3" }}>Permissões</button>
                {p.name !== "ADMIN" && p.usuarios === 0 && <button onClick={() => excluir(p)} style={{ ...BTN, background: "#fee2e2", color: "#991b1b" }}>Excluir</button>}
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ── Auditoria ──────────────────────────────────────────────────────
function AbaAuditoria() {
  const [dados, setDados] = useState<any>({ data: [], total: 0, pagina: 1, paginas: 1, modulos: [] });
  const [filtro, setFiltro] = useState({ modulo: "", de: "", ate: "" });
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    const q = new URLSearchParams({ pagina: String(pagina) });
    if (filtro.modulo) q.set("modulo", filtro.modulo);
    if (filtro.de) q.set("de", filtro.de);
    if (filtro.ate) q.set("ate", filtro.ate);
    fetch(`/api/admin/auditoria?${q}`).then((r) => r.json()).then((d) => { if (!d.error) setDados(d); });
  }, [pagina, filtro]);

  return (
    <div>
      <div style={{ ...CARD, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div><label style={LS}>Módulo</label>
          <select style={{ ...IS, width: 180 }} value={filtro.modulo} onChange={(e) => { setPagina(1); setFiltro((p) => ({ ...p, modulo: e.target.value })); }}>
            <option value="">Todos</option>
            {dados.modulos.map((m: string) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div><label style={LS}>De</label><input type="date" style={{ ...IS, width: 150 }} value={filtro.de} onChange={(e) => { setPagina(1); setFiltro((p) => ({ ...p, de: e.target.value })); }} /></div>
        <div><label style={LS}>Até</label><input type="date" style={{ ...IS, width: 150 }} value={filtro.ate} onChange={(e) => { setPagina(1); setFiltro((p) => ({ ...p, ate: e.target.value })); }} /></div>
        <span style={{ fontSize: 11, color: "#6b7280", paddingBottom: 8 }}>{dados.total} evento(s)</span>
      </div>

      <table style={{ borderCollapse: "collapse", width: "100%", background: "#fff", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
        <thead><tr style={{ background: "#e8f5ee" }}>{["Data/Hora", "Usuário", "Ação", "Módulo", "Entidade"].map((h) => <th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>{dados.data.map((l: any) => (
          <tr key={l.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
            <td style={{ ...TD, fontSize: 11, whiteSpace: "nowrap" }}>{fmtData(l.createdAt)}</td>
            <td style={{ ...TD, fontWeight: 600 }}>{l.user?.name || "Sistema"}</td>
            <td style={TD}>{ACOES_LABEL[l.action] || l.action}</td>
            <td style={TD}><span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 8, fontSize: 10, fontWeight: 700 }}>{l.module}</span></td>
            <td style={{ ...TD, fontSize: 11, color: "#6b7280" }}>{l.entityType ? `${l.entityType} ${l.entityId ? "· " + l.entityId.slice(0, 10) : ""}` : "—"}</td>
          </tr>
        ))}</tbody>
      </table>
      {dados.data.length === 0 && <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12 }}>Nenhum evento de auditoria com esses filtros.</p>}

      {dados.paginas > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14, alignItems: "center" }}>
          <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} style={{ ...BTN, background: "#fff", border: "1px solid #d1d5db", color: "#374151" }}>← Anterior</button>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Página {dados.pagina} de {dados.paginas}</span>
          <button disabled={pagina >= dados.paginas} onClick={() => setPagina((p) => p + 1)} style={{ ...BTN, background: "#fff", border: "1px solid #d1d5db", color: "#374151" }}>Próxima →</button>
        </div>
      )}
    </div>
  );
}
