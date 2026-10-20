/** EX-06: umbrales de estado de metas, como fracción del monto. */
export const GOAL_WARNING_RATIO = 0.8;
export const GOAL_EXCEEDED_RATIO = 1;

export const PAGINATION_DEFAULT_LIMIT = 50;
export const PAGINATION_MAX_LIMIT = 100;

/** PL-04: cuántas semanas hacia adelante se materializan de forma perezosa. */
export const LAZY_GENERATION_MAX_WEEKS_AHEAD = 4;

export const INVITATION_DEFAULT_TTL_DAYS = 7;
export const INVITATION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Paleta de identidad de miembros (06-diseno-ui.md). */
export const MEMBER_COLORS = [
  '#E07A5F',
  '#5B8DEF',
  '#8E7CC3',
  '#D4A942',
  '#4FA3A5',
  '#C86B9B',
  '#7D9B5B',
  '#A47A5A',
] as const;
