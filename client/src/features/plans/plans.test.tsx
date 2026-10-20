import type { Weekday } from '@homely/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { describeWeekdays } from '@/shared/lib/weekdays.ts';
import { WeekdayChips } from '@/shared/ui/index.ts';

describe('describeWeekdays', () => {
  it('describe los días en lenguaje natural', () => {
    expect(describeWeekdays(['WED', 'SAT'])).toBe('miércoles y sábado');
    expect(describeWeekdays(['FRI', 'MON', 'WED'])).toBe('lunes, miércoles y viernes');
    expect(describeWeekdays(['SUN'])).toBe('domingo');
    expect(describeWeekdays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).toBe(
      'todos los días',
    );
  });
});

describe('WeekdayChips', () => {
  function Harness({ initial }: { initial: Weekday[] }) {
    const [days, setDays] = useState<Weekday[]>(initial);
    return (
      <>
        <WeekdayChips label="Se repite los" value={days} onChange={setDays} />
        <output>{days.join(',')}</output>
      </>
    );
  }

  it('alterna días y los mantiene en orden de lunes a domingo', async () => {
    render(<Harness initial={['SAT']} />);

    await userEvent.click(screen.getByRole('checkbox', { name: 'miércoles' }));
    expect(screen.getByRole('status')).toHaveTextContent('WED,SAT');

    await userEvent.click(screen.getByRole('checkbox', { name: 'sábado' }));
    expect(screen.getByRole('status')).toHaveTextContent('WED');
    expect(screen.getByRole('checkbox', { name: 'sábado' })).not.toBeChecked();
  });

  it('en modo lectura anuncia los días como texto', () => {
    render(<WeekdayChips value={['WED', 'SAT']} />);
    expect(screen.getByLabelText('miércoles y sábado')).toBeInTheDocument();
  });
});
