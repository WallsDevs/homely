/** 0.857 → «86 %». `null` (sin tareas) → «—». */
export function percent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)} %`;
}

/** Delta de porcentaje para un StatTile: «+12 %», «−5 %», «0 %». */
export function deltaOf(
  delta: number | null,
): { text: string; direction: 'up' | 'down' | 'flat' } | undefined {
  if (delta === null) return undefined;
  const points = Math.round(delta * 100);
  if (points === 0) return { text: 'igual que la anterior', direction: 'flat' };
  return {
    text: `${points > 0 ? '+' : '−'}${Math.abs(points)} % vs. anterior`,
    direction: points > 0 ? 'up' : 'down',
  };
}

/** Tono de la barra de cumplimiento. */
export function rateTone(rate: number | null): 'success' | 'warning' | 'danger' | 'accent' {
  if (rate === null) return 'accent';
  if (rate >= 1) return 'success';
  if (rate >= 0.6) return 'warning';
  return 'danger';
}
