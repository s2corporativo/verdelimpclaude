"use client";
import { useEffect, useState } from "react";

const URGENCY_STYLE: any = {
  critica: { bg: "#fee2e2", co: "#991b1b", border: "#fca5a5", icon: "🚨" },
  alta:    { bg: "#fef9c3", co: "#92400e", border: "#fde68a", icon: "⚠️" },
  media:   { bg: "#eff6ff", co: "#1e40af", border: "#bfdbfe", icon: "ℹ️" },
};

export function NotificacoesWidget() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const load = async () => {
    setLoading(true);
    setErro("");
    try {
      const r = await fetch("/api/notificacoes?unreadOnly=false", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Falha ao carregar notificações");
      setNotifs(d.data || []);
    } catch (e: any) {
      setNotifs([]);
      setErro(e.message || "Falha ao carregar notificações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const marcar = async (ids: string[], action: "mark_read" | "mark_unread" = "mark_read") => {
    if (!ids.length) return;
    const anteriores = notifs;
    setNotifs((atuais) => atuais.map((item) => ids.includes(item.id) ? { ...item, read: action === "mark_read" } : item));
    try {
      const r = await fetch("/api/notificacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Falha ao atualizar notificação");
    } catch (e: any) {
      setNotifs(anteriores);
      setErro(e.message || "Falha ao atualizar notificação");
    }
  };

  const abrirNotificacao = async (notificacao: any) => {
    if (!notificacao.read) await marcar([notificacao.id]);
    if (notificacao.href) window.location.href = notificacao.href;
  };

  const naoLidas = notifs.filter((n) => !n.read).length;
  const criticas = notifs.filter((n) => n.urgency === "critica" && !n.read).length;

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label="Notificações"
        style={{ background: criticas > 0 ? "#fef2f2" : naoLidas > 0 ? "#fffbeb" : "#f9fafb", border: `1px solid ${criticas > 0 ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
        🔔
        {naoLidas > 0 && (
          <span style={{ background: criticas > 0 ? "#dc2626" : "#d97706", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: "center" }}>
            {naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 380, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)", zIndex: 999 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#334532" }}>🔔 Notificações ({naoLidas} novas)</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {naoLidas > 0 && <button onClick={() => marcar(notifs.filter((n) => !n.read).map((n) => n.id))} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, color: "#4a9410", fontWeight: 700 }}>Marcar todas como lidas</button>}
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9ca3af" }}>✕</button>
            </div>
          </div>
          {erro && <div style={{ padding: "8px 16px", background: "#fef2f2", color: "#991b1b", fontSize: 11 }}>{erro}</div>}
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {loading ? <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>⟳ Verificando...</div>
            : notifs.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>✅ Nenhuma notificação pendente</div>
            : notifs.map((n) => {
              const s = URGENCY_STYLE[n.urgency] || URGENCY_STYLE.media;
              return (
                <button key={n.id} onClick={() => abrirNotificacao(n)} style={{ width: "100%", textAlign: "left", padding: "10px 16px", border: 0, borderBottom: "1px solid #f9fafb", background: n.read ? "#fafafa" : "#fff", cursor: n.href ? "pointer" : "default" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ flexShrink: 0, fontSize: 14 }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 12, color: s.co }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{n.message}</div>
                    </div>
                    <span style={{ background: s.bg, color: s.co, padding: "1px 6px", borderRadius: 8, fontSize: 9, fontWeight: 700, height: "fit-content", flexShrink: 0 }}>
                      {String(n.urgency || "media").toUpperCase()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ padding: "9px 16px", borderTop: "1px solid #f3f4f6" }}>
            <button onClick={load} style={{ width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 7, padding: "6px", cursor: "pointer", fontSize: 11, color: "#374151" }}>
              🔄 Atualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
