import { WEEKDAYS, type Weekday } from '@homely/shared';
import type { SelectOption } from '../ui/select.tsx';

const LOCALE = 'es';

/** Monedas que se muestran primero; el resto va después en orden alfabético. */
const PREFERRED_CURRENCIES = ['USD', 'EUR', 'COP', 'MXN', 'ARS', 'CLP', 'PEN', 'VES', 'BRL'];

let currencyCache: SelectOption[] | undefined;
let timezoneCache: SelectOption[] | undefined;

export function currencyOptions(): SelectOption[] {
  if (currencyCache) return currencyCache;
  const names = new Intl.DisplayNames(LOCALE, { type: 'currency' });
  const toOption = (code: string) => ({
    value: code,
    label: `${code} · ${names.of(code) ?? code}`,
  });
  const rest = Intl.supportedValuesOf('currency').filter((c) => !PREFERRED_CURRENCIES.includes(c));
  currencyCache = [...PREFERRED_CURRENCIES, ...rest].map(toOption);
  return currencyCache;
}

export function timezoneOptions(): SelectOption[] {
  timezoneCache ??= Intl.supportedValuesOf('timeZone').map((zone) => ({
    value: zone,
    label: zone.replaceAll('_', ' ').replace('/', ' / '),
  }));
  return timezoneCache;
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MON: 'Lunes',
  TUE: 'Martes',
  WED: 'Miércoles',
  THU: 'Jueves',
  FRI: 'Viernes',
  SAT: 'Sábado',
  SUN: 'Domingo',
};

export const weekStartOptions: SelectOption[] = WEEKDAYS.map((day) => ({
  value: day,
  label: WEEKDAY_LABELS[day],
}));
