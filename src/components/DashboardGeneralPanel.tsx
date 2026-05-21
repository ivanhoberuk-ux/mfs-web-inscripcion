// FILE: src/components/DashboardGeneralPanel.tsx
// Dashboard general para super administradores: métricas completas de inscripciones.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Modal } from 'react-native';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { supabase } from '../lib/supabase';
import { s } from '../lib/theme';
import * as XLSX from 'xlsx-js-style';
import { fileStamp, humanDate } from '../lib/excel';
import { shareOrDownload } from '../lib/sharing';
import { Alert } from 'react-native';

type RegistroDash = {
  id: string;
  pueblo_id: string;
  nombres: string;
  apellidos: string;
  nacimiento: string | null;
  rol: 'Tio' | 'Misionero' | 'Hijo';
  es_jefe: boolean;
  pertenece_schoenstatt: boolean;
  rama_schoenstatt: string | null;
  misiono_antes: boolean;
  talle_remera: string | null;
  estado: string;
  created_at: string;
  año: number;
};
type Pueblo = { id: string; nombre: string; cupo_max: number };

const COLORS = ['#0a7ea4', '#7c3aed', '#0b9850', '#f59e0b', '#dc2626', '#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#3b82f6', '#84cc16'];

function ageOn(nac: string | null, refDate: Date): number | null {
  if (!nac) return null;
  const b = new Date(nac);
  if (isNaN(b.getTime())) return null;
  let age = refDate.getFullYear() - b.getFullYear();
  const m = refDate.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && refDate.getDate() < b.getDate())) age--;
  return age;
}

function BarRow({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 13, color: '#374151', flex: 1 }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>{value}{suffix || ''}</Text>
      </View>
      <View style={{ height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
      </View>
    </View>
  );
}

function StatCard({ label, value, color, emoji }: { label: string; value: number | string; color: string; emoji: string }) {
  return (
    <View style={{
      flex: 1, minWidth: 130, padding: 14, borderRadius: 12,
      backgroundColor: 'white', borderLeftWidth: 4, borderLeftColor: color,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1,
    }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Section({ title, emoji, children }: any) {
  return (
    <View style={[s.card, { marginBottom: 12 }]}>
      <Text style={[s.subtitle, { marginBottom: 12 }]}>{emoji} {title}</Text>
      {children}
    </View>
  );
}

export function DashboardGeneralPanel() {
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<RegistroDash[]>([]);
  const [pueblos, setPueblos] = useState<Pueblo[]>([]);
  const [puebloFiltro, setPuebloFiltro] = useState<string>('all');
  const [year, setYear] = useState<number>(new Date().getFullYear() < 2026 ? 2026 : new Date().getFullYear());

  async function load() {
    try {
      setLoading(true);
      // Cargar pueblos
      const { data: pbs, error: e2 } = await supabase
        .from('pueblos').select('id, nombre, cupo_max').order('nombre');
      if (e2) throw e2;

      // Cargar registros paginando (Supabase tiene límite de 1000 filas por request)
      const PAGE = 1000;
      const allRegs: any[] = [];
      let offset = 0;
      // Loop hasta que una página devuelva menos de PAGE filas
      // Seguridad: tope de 20 páginas (20.000 registros)
      for (let i = 0; i < 20; i++) {
        const { data: chunk, error: e1 } = await supabase
          .from('registros')
          .select('id, pueblo_id, nombres, apellidos, nacimiento, rol, es_jefe, pertenece_schoenstatt, rama_schoenstatt, misiono_antes, talle_remera, estado, created_at, año')
          .is('deleted_at', null)
          .eq('año', year)
          .order('created_at', { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (e1) throw e1;
        const got = chunk || [];
        allRegs.push(...got);
        if (got.length < PAGE) break;
        offset += PAGE;
      }
      setRegistros(allRegs as any);
      setPueblos((pbs || []) as any);
    } catch (e: any) {
      console.error('Dashboard load error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [year]);

  const puebloMap = useMemo(() => {
    const m: Record<string, Pueblo> = {};
    pueblos.forEach(p => { m[p.id] = p; });
    return m;
  }, [pueblos]);

  const filtered = useMemo(() => {
    return puebloFiltro === 'all' ? registros : registros.filter(r => r.pueblo_id === puebloFiltro);
  }, [registros, puebloFiltro]);

  // ===== Totales globales =====
  const totales = useMemo(() => {
    const confirmados = filtered.filter(r => r.estado === 'confirmado').length;
    const espera = filtered.filter(r => r.estado === 'lista_espera').length;
    const cancelados = filtered.filter(r => r.estado === 'cancelado').length;
    const hijos = filtered.filter(r => r.rol === 'Hijo').length;
    const jefes = filtered.filter(r => r.es_jefe).length;
    const schoenstatt = filtered.filter(r => r.pertenece_schoenstatt).length;
    const veteranos = filtered.filter(r => r.misiono_antes).length;
    return { total: filtered.length, confirmados, espera, cancelados, hijos, jefes, schoenstatt, veteranos };
  }, [filtered]);

  // ===== Por pueblo =====
  const porPueblo = useMemo(() => {
    const map: Record<string, { nombre: string; total: number; confirmados: number; espera: number; hijos: number; cupo_max: number }> = {};
    pueblos.forEach(p => {
      map[p.id] = { nombre: p.nombre, total: 0, confirmados: 0, espera: 0, hijos: 0, cupo_max: p.cupo_max };
    });
    registros.forEach(r => {
      const k = map[r.pueblo_id]; if (!k) return;
      k.total++;
      if (r.estado === 'confirmado') k.confirmados++;
      if (r.estado === 'lista_espera') k.espera++;
      if (r.rol === 'Hijo') k.hijos++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [registros, pueblos]);

  // ===== Edades exactas por rol =====
  const edadesPorRol = useMemo(() => {
    const refDate = new Date(year, 0, 1);
    const roles: Array<'Hijo' | 'Misionero' | 'Tio'> = ['Hijo', 'Misionero', 'Tio'];
    const result: Record<string, { entries: { edad: number; count: number }[]; sinFecha: number; total: number }> = {};
    roles.forEach(rol => {
      const counts: Record<number, number> = {};
      let sinFecha = 0;
      let total = 0;
      filtered.filter(r => r.rol === rol).forEach(r => {
        total++;
        const a = ageOn(r.nacimiento, refDate);
        if (a == null) { sinFecha++; return; }
        counts[a] = (counts[a] || 0) + 1;
      });
      const entries = Object.entries(counts)
        .map(([edad, count]) => ({ edad: Number(edad), count }))
        .sort((a, b) => a.edad - b.edad);
      result[rol] = { entries, sinFecha, total };
    });
    return result;
  }, [filtered, year]);

  // ===== Por rol =====
  const porRol = useMemo(() => {
    const m: Record<string, number> = { Tio: 0, Misionero: 0, Hijo: 0 };
    filtered.forEach(r => { m[r.rol] = (m[r.rol] || 0) + 1; });
    return [
      { label: '👨‍🏫 Tíos', value: m.Tio, color: '#7c3aed' },
      { label: '✨ Misioneros', value: m.Misionero, color: '#0a7ea4' },
      { label: '👶 Hijos', value: m.Hijo, color: '#0b9850' },
    ];
  }, [filtered]);

  // ===== Rama Schoenstatt =====
  const porRama = useMemo(() => {
    const RAMA_ORDER = [
      'Pioneros',
      'Apóstoles de María',
      'Juventud Masculina',
      'Juventud Femenina',
      'Discernimiento',
      'Colaboradores',
      'Liga Apostólica',
      'Federación Apostólica',
      'Instituto Secular',
    ];
    const m: Record<string, number> = {};
    filtered.forEach(r => {
      if (!r.pertenece_schoenstatt) return;
      const k = (r.rama_schoenstatt || 'Sin especificar').trim();
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => {
        const ai = RAMA_ORDER.indexOf(a.label);
        const bi = RAMA_ORDER.indexOf(b.label);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return b.value - a.value;
      });
  }, [filtered]);

  // ===== Inscripciones por día (últimos 30 días) =====
  const porDia = useMemo(() => {
    const days: Record<string, number> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    filtered.forEach(r => {
      const k = r.created_at.slice(0, 10);
      if (k in days) days[k]++;
    });
    return Object.entries(days).map(([fecha, count]) => ({ fecha, count }));
  }, [filtered]);

  // ===== Talles remera =====
  const porTalle = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach(r => {
      const k = (r.talle_remera || 'Sin definir').trim();
      m[k] = (m[k] || 0) + 1;
    });
    const order = ['PP', 'XS', 'P', 'S', 'M', 'G', 'L', 'XL', 'XXL', 'Sin definir'];
    return Object.entries(m).map(([label, value]) => ({ label, value }))
      .sort((a, b) => {
        const ai = order.indexOf(a.label); const bi = order.indexOf(b.label);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
  }, [filtered]);

  // ===== Misionó antes =====
  const porExperiencia = useMemo(() => {
    const v = filtered.filter(r => r.misiono_antes).length;
    const n = filtered.length - v;
    return [
      { label: '🎖️ Misionó antes', value: v, color: '#0b9850' },
      { label: '🆕 Nuevos', value: n, color: '#0a7ea4' },
    ];
  }, [filtered]);

  if (loading) {
    return <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator /><Text style={{ marginTop: 8, color: '#666' }}>Cargando dashboard…</Text></View>;
  }

  const maxPueblo = Math.max(1, ...porPueblo.map(p => p.total));
  const maxEdadPorRol: Record<string, number> = {
    Hijo: Math.max(1, ...edadesPorRol.Hijo.entries.map(e => e.count)),
    Misionero: Math.max(1, ...edadesPorRol.Misionero.entries.map(e => e.count)),
    Tio: Math.max(1, ...edadesPorRol.Tio.entries.map(e => e.count)),
  };
  const maxRol = Math.max(1, ...porRol.map(r => r.value));
  const maxRama = Math.max(1, ...porRama.map(r => r.value));
  const maxTalle = Math.max(1, ...porTalle.map(r => r.value));
  const maxDia = Math.max(1, ...porDia.map(d => d.count));
  const maxExp = Math.max(1, ...porExperiencia.map(r => r.value));

  // ===== Exportar a Excel multi-hoja =====
  async function exportExcel() {
    try {
      const wb = XLSX.utils.book_new();
      const ctx = puebloFiltro === 'all' ? 'Todos los pueblos' : (puebloMap[puebloFiltro]?.nombre || 'Pueblo');

      const addSheet = (name: string, rows: any[][]) => {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        // header style
        const cols = rows[0]?.length || 0;
        for (let c = 0; c < cols; c++) {
          const ref = XLSX.utils.encode_cell({ r: 0, c });
          if (ws[ref]) ws[ref].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        }
        // auto-width
        const widths: number[] = [];
        rows.forEach(r => r.forEach((v, i) => {
          const len = String(v ?? '').length + 2;
          if (len > (widths[i] || 0)) widths[i] = Math.min(50, len);
        }));
        ws['!cols'] = widths.map(w => ({ wch: Math.max(10, w) }));
        ws['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
        ws['!views'] = [{ state: 'frozen', ySplit: 1 }] as any;
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      };

      // Resumen
      addSheet('Resumen', [
        ['Métrica', 'Valor'],
        ['Año', year],
        ['Contexto', ctx],
        ['Generado', humanDate()],
        ['Total inscriptos', totales.total],
        ['Confirmados', totales.confirmados],
        ['Lista de espera', totales.espera],
        ['Cancelados', totales.cancelados],
        ['Hijos', totales.hijos],
        ['Jefes', totales.jefes],
        ['De Schoenstatt', totales.schoenstatt],
        ['Misionaron antes', totales.veteranos],
      ]);

      // Por pueblo
      addSheet('Por pueblo', [
        ['Pueblo', 'Total', 'Confirmados', 'Lista espera', 'Hijos', 'Cupo máx', 'Ocupación %'],
        ...porPueblo.map(p => [
          p.nombre, p.total, p.confirmados, p.espera, p.hijos, p.cupo_max,
          p.cupo_max > 0 ? Math.round((p.confirmados / p.cupo_max) * 100) : 0,
        ]),
      ]);

      // Edades por rol
      (['Hijo', 'Misionero', 'Tio'] as const).forEach(rol => {
        const data = edadesPorRol[rol];
        const rows: any[][] = [['Edad', 'Cantidad'], ...data.entries.map(e => [e.edad, e.count])];
        if (data.sinFecha > 0) rows.push(['Sin fecha', data.sinFecha]);
        addSheet(`Edades ${rol}s`, rows);
      });

      // Por rol
      addSheet('Por rol', [['Rol', 'Cantidad'], ...porRol.map(r => [r.label.replace(/^\S+\s/, ''), r.value])]);

      // Schoenstatt - ramas
      addSheet('Ramas Schoenstatt', [['Rama', 'Cantidad'], ...porRama.map(r => [r.label, r.value])]);

      // Por día
      addSheet('Inscripciones por día', [
        ['Fecha', 'Cantidad'],
        ...porDia.map(d => [d.fecha, d.count]),
        ['Total 30 días', porDia.reduce((a, b) => a + b.count, 0)],
        ['Promedio diario', Number((porDia.reduce((a, b) => a + b.count, 0) / 30).toFixed(2))],
      ]);

      // Talles
      addSheet('Talles remera', [['Talle', 'Cantidad'], ...porTalle.map(t => [t.label, t.value])]);

      // Experiencia
      addSheet('Experiencia', [['Experiencia', 'Cantidad'], ...porExperiencia.map(r => [r.label.replace(/^\S+\s/, ''), r.value])]);

      // Hijos por pueblo
      addSheet('Hijos por pueblo', [
        ['Pueblo', 'Hijos'],
        ...porPueblo.filter(p => p.hijos > 0).map(p => [p.nombre, p.hijos]),
      ]);

      const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `MFS_dashboard_${year}_${puebloFiltro === 'all' ? 'todos' : 'pueblo'}_${fileStamp()}.xlsx`;
      await shareOrDownload(blob, fileName);
    } catch (e: any) {
      Alert.alert('No se pudo exportar', e?.message ?? String(e));
    }
  }

  return (
    <View style={{ gap: 8 }}>
      {/* Filtros */}
      <View style={[s.card, { marginBottom: 4 }]}>
        <Text style={[s.subtitle, { marginBottom: 8 }]}>📊 Dashboard General — Año {year}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {[2025, 2026, 2027].map(y => (
            <Pressable key={y} onPress={() => setYear(y)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: y === year ? '#0a7ea4' : '#f3f4f6' }}>
              <Text style={{ color: y === year ? 'white' : '#374151', fontWeight: '700' }}>{y}</Text>
            </Pressable>
          ))}
          <Pressable onPress={exportExcel} style={{ marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1E40AF' }}>
            <Text style={{ color: 'white', fontWeight: '700' }}>📥 Exportar Excel</Text>
          </Pressable>
          <Pressable onPress={load} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#0b9850' }}>
            <Text style={{ color: 'white', fontWeight: '700' }}>🔄 Actualizar</Text>
          </Pressable>
        </View>
        <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Filtrar por pueblo:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <Pressable onPress={() => setPuebloFiltro('all')}
            style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: puebloFiltro === 'all' ? '#0a7ea4' : '#f3f4f6' }}>
            <Text style={{ color: puebloFiltro === 'all' ? 'white' : '#374151', fontSize: 12, fontWeight: '700' }}>🌐 Todos</Text>
          </Pressable>
          {pueblos.map(p => (
            <Pressable key={p.id} onPress={() => setPuebloFiltro(p.id)}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: puebloFiltro === p.id ? '#0a7ea4' : '#f3f4f6' }}>
              <Text style={{ color: puebloFiltro === p.id ? 'white' : '#374151', fontSize: 12, fontWeight: '700' }}>{p.nombre}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* KPIs principales */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <StatCard label="Total inscriptos" value={totales.total} color="#0a7ea4" emoji="👥" />
        <StatCard label="Confirmados" value={totales.confirmados} color="#0b9850" emoji="✅" />
        <StatCard label="Lista de espera" value={totales.espera} color="#f59e0b" emoji="⏳" />
        <StatCard label="Cancelados" value={totales.cancelados} color="#dc2626" emoji="❌" />
        <StatCard label="Hijos" value={totales.hijos} color="#06b6d4" emoji="👶" />
        <StatCard label="Jefes" value={totales.jefes} color="#7c3aed" emoji="⭐" />
        <StatCard label="De Schoenstatt" value={totales.schoenstatt} color="#ec4899" emoji="💗" />
        <StatCard label="Misionaron antes" value={totales.veteranos} color="#10b981" emoji="🎖️" />
      </View>

      {/* Por pueblo */}
      {puebloFiltro === 'all' && (
        <Section title="Inscriptos por pueblo" emoji="🏘️">
          {porPueblo.map((p, i) => {
            const ocupacionPct = p.cupo_max > 0 ? Math.round((p.confirmados / p.cupo_max) * 100) : 0;
            return (
              <BarRow
                key={p.nombre}
                label={`${p.nombre} (${p.confirmados}/${p.cupo_max} cupo · ${ocupacionPct}%)`}
                value={p.total}
                max={maxPueblo}
                color={ocupacionPct >= 100 ? '#dc2626' : ocupacionPct >= 70 ? '#f59e0b' : COLORS[i % COLORS.length]}
              />
            );
          })}
        </Section>
      )}

      {/* Rol */}
      <Section title="Distribución por rol" emoji="🎭">
        {porRol.map(r => (
          <BarRow key={r.label} label={r.label} value={r.value} max={maxRol} color={r.color} />
        ))}
      </Section>

      {/* Edades exactas por rol */}
      {(['Hijo', 'Misionero', 'Tio'] as const).map(rol => {
        const data = edadesPorRol[rol];
        const maxE = maxEdadPorRol[rol];
        const emoji = rol === 'Hijo' ? '👶' : rol === 'Misionero' ? '✨' : '👨‍🏫';
        const titulo = rol === 'Hijo' ? 'Hijos' : rol === 'Misionero' ? 'Misioneros' : 'Tíos';
        return (
          <Section key={rol} title={`Edades — ${titulo} (al 1° de enero del año) · ${data.total} en total`} emoji={emoji}>
            {data.entries.map((e, i) => (
              <BarRow key={e.edad} label={`${e.edad} años`} value={e.count} max={maxE} color={COLORS[i % COLORS.length]} />
            ))}
            {data.sinFecha > 0 && (
              <BarRow label="Sin fecha de nacimiento" value={data.sinFecha} max={maxE} color="#9ca3af" />
            )}
            {data.entries.length === 0 && data.sinFecha === 0 && (
              <Text style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin {titulo.toLowerCase()} inscriptos</Text>
            )}
          </Section>
        );
      })}

      {/* Pertenencia al movimiento */}
      <Section title="Pertenencia al Movimiento de Schoenstatt" emoji="💗">
        <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          {totales.schoenstatt} de {totales.total} pertenecen al movimiento ({totales.total > 0 ? Math.round(totales.schoenstatt / totales.total * 100) : 0}%)
        </Text>
        {porRama.length === 0
          ? <Text style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin datos de ramas</Text>
          : porRama.map((r, i) => <BarRow key={r.label} label={r.label} value={r.value} max={maxRama} color={COLORS[i % COLORS.length]} />)}
      </Section>

      {/* Inscripciones por día */}
      <Section title="Inscripciones por día (últimos 30 días)" emoji="📅">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140, paddingTop: 8 }}>
            {porDia.map(d => {
              const h = (d.count / maxDia) * 110;
              const day = d.fecha.slice(8, 10);
              const month = d.fecha.slice(5, 7);
              return (
                <View key={d.fecha} style={{ alignItems: 'center', width: 28 }}>
                  <Text style={{ fontSize: 9, color: '#374151', fontWeight: '700' }}>{d.count || ''}</Text>
                  <View style={{ width: 18, height: Math.max(2, h), backgroundColor: d.count > 0 ? '#0a7ea4' : '#e5e7eb', borderRadius: 3, marginTop: 2 }} />
                  <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{day}/{month}</Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
        <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          Promedio: {(porDia.reduce((a, b) => a + b.count, 0) / 30).toFixed(1)} por día · Total 30 días: {porDia.reduce((a, b) => a + b.count, 0)}
        </Text>
      </Section>

      {/* Hijos por pueblo */}
      {puebloFiltro === 'all' && (
        <Section title="Hijos por pueblo" emoji="👶">
          {porPueblo.filter(p => p.hijos > 0).map((p, i) => (
            <BarRow key={p.nombre} label={p.nombre} value={p.hijos} max={Math.max(1, ...porPueblo.map(x => x.hijos))} color={COLORS[i % COLORS.length]} />
          ))}
          {porPueblo.every(p => p.hijos === 0) && <Text style={{ color: '#9ca3af', fontStyle: 'italic' }}>Sin hijos inscriptos</Text>}
        </Section>
      )}

      {/* Talles remera */}
      <Section title="Talles de remera" emoji="👕">
        {porTalle.map((t, i) => (
          <BarRow key={t.label} label={t.label} value={t.value} max={maxTalle} color={COLORS[i % COLORS.length]} />
        ))}
      </Section>

      {/* Experiencia */}
      <Section title="Experiencia previa en MFS" emoji="🎖️">
        {porExperiencia.map(r => (
          <BarRow key={r.label} label={r.label} value={r.value} max={maxExp} color={r.color} />
        ))}
      </Section>
    </View>
  );
}
