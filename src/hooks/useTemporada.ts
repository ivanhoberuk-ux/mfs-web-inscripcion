// FILE: src/hooks/useTemporada.ts
// Hook central para el año activo y el modo de la temporada (misión / institucional).
import { useEffect, useState } from 'react';
import { fetchAñoActivo, fetchModoTemporada, type ModoTemporada } from '../lib/api';

export function useAñoActivo() {
  const [año, setAño] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await fetchAñoActivo();
        if (mounted) setAño(a);
      } catch (e) {
        console.warn('No se pudo obtener el año activo:', e);
        if (mounted) setAño(new Date().getFullYear());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { año, loading };
}

export function useTemporada() {
  const [modo, setModo] = useState<ModoTemporada>('mision');
  const [año, setAño] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetchModoTemporada();
        if (mounted) { setModo(r.modo); setAño(r.año); }
      } catch (e) {
        console.warn('No se pudo obtener el modo de temporada:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { modo, año, loading, esInstitucional: modo === 'institucional' };
}
