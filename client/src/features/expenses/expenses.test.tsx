import type { Expense, Goal, Session } from '@homely/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { sessionKey } from '@/features/auth/api/session.ts';
import { AmountInput, ToastProvider } from '@/shared/ui/index.ts';
import { ExpenseRow } from './components/expense-row.tsx';
import { ExpenseUIContext } from './components/expense-ui.ts';
import { GoalCard } from './components/goal-card.tsx';

const iveth = { id: 'm-iveth', displayName: 'Iveth', color: '#E07A5F' };
const luis = { id: 'm-luis', displayName: 'Luis', color: '#5B8DEF' };

function session(currency = 'USD'): Session {
  return {
    user: { id: 'u1', email: 'x@test.dev', name: 'Luis' },
    household: { id: 'h1', name: 'Casa', currency, timezone: 'UTC', weekStartsOn: 'MON' },
    membership: {
      ...luis,
      userId: 'u1',
      avatarUrl: null,
      role: 'MEMBER',
      isActive: true,
      joinedAt: '',
    },
  };
}

function wrap(children: ReactNode, canEdit: (expense: Expense) => boolean = () => true) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(sessionKey, session());
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ExpenseUIContext
          value={{ canEdit, openCreate: () => undefined, openEdit: () => undefined }}
        >
          <ul>{children}</ul>
        </ExpenseUIContext>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const expense = (overrides: Partial<Expense>): Expense => ({
  id: 'e1',
  amount: '60.00',
  date: '2026-10-19',
  description: 'Mercado semanal',
  paymentMethod: null,
  category: { id: 'c1', name: 'Comida', color: '#7D9B5B', icon: 'shopping-cart' },
  paidBy: luis,
  registeredBy: luis,
  createdAt: '',
  ...overrides,
});

describe('AmountInput', () => {
  function Harness() {
    const [value, setValue] = useState('');
    return (
      <>
        <AmountInput
          label="Monto"
          currencySymbol="$"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <output>{value}</output>
      </>
    );
  }

  it('acepta coma como separador decimal y descarta letras', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Monto'), '12,5x0');
    expect(screen.getByRole('status')).toHaveTextContent('12.50');
  });
});

describe('ExpenseRow', () => {
  it('muestra descripción, categoría, quién pagó y el monto', () => {
    wrap(<ExpenseRow expense={expense({})} />);
    expect(screen.getByText('Mercado semanal')).toBeInTheDocument();
    expect(screen.getByText('Comida · pagó Luis')).toBeInTheDocument();
    expect(screen.getByText(/60,00/)).toBeInTheDocument();
  });

  it('solo es editable si quien mira lo registró (o es admin)', () => {
    wrap(
      <>
        <ExpenseRow expense={expense({ id: 'mine', description: 'Mío' })} />
        <ExpenseRow
          expense={expense({ id: 'other', description: 'De Iveth', registeredBy: iveth })}
        />
      </>,
      (e) => e.registeredBy?.id === luis.id,
    );
    expect(screen.getByRole('button', { name: /Mío/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /De Iveth/ })).not.toBeInTheDocument();
  });
});

describe('GoalCard', () => {
  const goal = (ratio: number, status: Goal['progress']['status']): Goal => ({
    id: 'g1',
    category: { id: 'c1', name: 'Comida', color: '#7D9B5B', icon: 'shopping-cart' },
    period: 'MONTHLY',
    amount: '300.00',
    progress: {
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      spent: (300 * ratio).toFixed(2),
      ratio,
      status,
    },
  });

  it('muestra gastado de meta, porcentaje y estado', () => {
    wrap(<GoalCard goal={goal(0.883, 'WARNING')} />);
    expect(screen.getByText(/de .*300,00.* este mes/)).toBeInTheDocument();
    expect(screen.getByText('Cerca · 88 %')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '88');
  });

  it('una meta excedida llena la barra y lo dice', () => {
    wrap(<GoalCard goal={goal(1.2, 'EXCEEDED')} />);
    expect(screen.getByText('Excedida · 120 %')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '100');
  });
});
