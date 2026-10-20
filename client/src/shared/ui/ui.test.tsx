import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { initials } from '../lib/initials.ts';
import { Button } from './button.tsx';
import { Input } from './input.tsx';
import { Sheet } from './sheet.tsx';

describe('Button', () => {
  it('ejecuta onClick y es type="button" por defecto', async () => {
    const onClick = vi.fn<() => void>();
    render(<Button onClick={onClick}>Guardar</Button>);

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('en loading queda deshabilitado y marcado como ocupado', () => {
    render(<Button loading>Guardar</Button>);

    const button = screen.getByRole('button', { name: 'Guardar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Input', () => {
  it('asocia label y error al campo de forma accesible', () => {
    render(<Input label="Monto" error="El monto debe ser mayor que 0" />);

    const input = screen.getByLabelText('Monto');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('El monto debe ser mayor que 0');
  });
});

describe('initials', () => {
  it('toma la inicial del primer y último nombre', () => {
    expect(initials('Iveth')).toBe('I');
    expect(initials('Luis Pérez')).toBe('LP');
    expect(initials('  ana maría gómez ')).toBe('AG');
  });
});

describe('Sheet', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Abrir</Button>
        <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo gasto">
          <p>Contenido</p>
        </Sheet>
      </>
    );
  }

  it('se abre como diálogo etiquetado y se cierra con el botón Cerrar', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog', { name: 'Nuevo gasto' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
