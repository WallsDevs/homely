import { useMemo } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { currencySymbol, formatMoney } from '@/shared/lib/money.ts';

/** Formateador con la moneda del hogar. `compact` quita decimales (tiles, gráficos). */
export function useMoney() {
  const { household } = useHouseholdSession();
  const { currency } = household;
  return useMemo(
    () => ({
      currency,
      symbol: currencySymbol(currency),
      format: (amount: string | number, compact = false) => formatMoney(amount, currency, compact),
    }),
    [currency],
  );
}
