const formatters = new Map<string, Intl.NumberFormat>();

export function moneyFormatter(currency: string, compact = false): Intl.NumberFormat {
  const key = `${currency}:${compact}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      ...(compact ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2 }),
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** El dinero viaja como string decimal (`"60.00"`); solo se convierte a número para mostrarlo. */
export function formatMoney(amount: string | number, currency: string, compact = false): string {
  return moneyFormatter(currency, compact).format(Number(amount));
}

export function currencySymbol(currency: string): string {
  return (
    moneyFormatter(currency, true)
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  );
}
