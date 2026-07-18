"use client";
/**
 * useRecurso<T> — fetch de API com o trio que faltava em ~45 telas:
 *   • AbortController: trocar de filtro/rota cancela a requisição anterior
 *     (sem ele, resposta velha podia sobrescrever a nova — race real);
 *   • loading: estado de carregamento pronto para spinner/skeleton;
 *   • erro: falha de rede/servidor vira mensagem, nunca silêncio.
 *
 * Uso:
 *   const { data, loading, erro, reload } = useRecurso<{ data: Cliente[] }>("/api/clientes");
 *   const clientes = data?.data ?? [];
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface EstadoRecurso<T> {
  data: T | null;
  loading: boolean;
  erro: string | null;
  /** Recarrega do servidor (ex.: após salvar um formulário). */
  reload: () => void;
}

export function useRecurso<T = any>(url: string | null, opts?: { pausado?: boolean }): EstadoRecurso<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url && !opts?.pausado);
  const [erro, setErro] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url || opts?.pausado) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setErro(null);

    fetch(url, { signal: ctrl.signal })
      .then(async (r) => {
        const corpo = await r.json().catch(() => null);
        if (!r.ok) throw new Error(corpo?.error || `Falha ao carregar (HTTP ${r.status})`);
        setData(corpo);
      })
      .catch((e: any) => {
        if (e?.name === "AbortError") return; // requisição substituída — não é erro
        setErro(e?.message || "Falha de rede");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [url, tick, opts?.pausado]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, erro, reload };
}
