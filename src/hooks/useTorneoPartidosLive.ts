// FILE: src/hooks/useTorneoPartidosLive.ts
// Realtime eficiente de torneo_partidos: en UPDATE se vuelve a pedir SOLO el partido cambiado
// (con debounce de 500 ms); en INSERT/DELETE se recarga la lista completa.
import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchPartidosPorId, type TorneoPartido } from '../lib/torneo';

export function useTorneoPartidosLive(opts: {
  enabled: boolean;
  channel: string;
  setPartidos: React.Dispatch<React.SetStateAction<TorneoPartido[]>>;
  reloadAll: () => void | Promise<void>;
}) {
  const { enabled, channel, setPartidos, reloadAll } = opts;
  const pendientes = useRef<Set<string>>(new Set());
  const recargarTodo = useRef(false);
  const timer = useRef<any>(null);
  const reloadRef = useRef(reloadAll);
  reloadRef.current = reloadAll;

  const flush = useCallback(async () => {
    timer.current = null;
    if (recargarTodo.current) {
      recargarTodo.current = false;
      pendientes.current.clear();
      await reloadRef.current();
      return;
    }
    const ids = Array.from(pendientes.current);
    pendientes.current.clear();
    if (!ids.length) return;
    try {
      const filas = await fetchPartidosPorId(ids);
      const map = new Map(filas.map((f) => [f.id, f]));
      setPartidos((prev) => prev.map((p) => map.get(p.id) ?? p));
    } catch { /* se reintenta con el próximo cambio */ }
  }, [setPartidos]);

  const programar = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 500);
  }, [flush]);

  /** Pedir de nuevo un partido puntual (por ej. después de guardar). */
  const refrescar = useCallback((id: string) => { pendientes.current.add(id); programar(); }, [programar]);

  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel(channel)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'torneo_partidos' }, (payload: any) => {
        if (payload.eventType === 'UPDATE' && payload.new?.id) pendientes.current.add(payload.new.id);
        else recargarTodo.current = true;
        programar();
      })
      .subscribe();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(ch);
    };
  }, [enabled, channel, programar]);

  return { refrescar };
}
