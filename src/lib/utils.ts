export function occupancyPct(usados: number, cupo: number): number {
  if (!Number.isFinite(usados) || !Number.isFinite(cupo)) return 0;
  if (cupo <= 0) return 0;
  const pct = Math.round((usados / cupo) * 100);
  return Math.max(0, Math.min(100, pct));
}
