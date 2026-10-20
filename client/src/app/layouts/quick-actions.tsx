import { CircleCheckBig, Plus, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sheet, useToast } from '@/shared/ui/index.ts';

type QuickActionsProps = { open: boolean; onClose: () => void };

/** Acciones rápidas (TK-09, EX-01): crear tarea o gasto en un toque desde cualquier pantalla. */
export function QuickActions({ open, onClose }: QuickActionsProps) {
  const toast = useToast();

  const pick = (what: string, phase: number) => {
    onClose();
    toast.show({ message: `${what} estará disponible en la Fase ${phase}.` });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Crear">
      <div className="grid grid-cols-2 gap-3 pb-2">
        <ActionTile
          icon={<CircleCheckBig className="size-6" strokeWidth={1.75} />}
          label="Nueva tarea"
          onClick={() => pick('Crear tareas', 2)}
        />
        <ActionTile
          icon={<Wallet className="size-6" strokeWidth={1.75} />}
          label="Nuevo gasto"
          onClick={() => pick('Registrar gastos', 4)}
        />
      </div>
    </Sheet>
  );
}

function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-28 flex-col items-center justify-center gap-2 rounded-md border border-line bg-surface text-body font-medium transition-colors active:bg-surface-2 hover-pointer:bg-surface-2"
    >
      <span className="text-accent">{icon}</span>
      {label}
    </button>
  );
}

/** Botón flotante en móvil y tablet. En escritorio la acción vive en el sidebar. */
export function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Crear tarea o gasto"
      onClick={onClick}
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-float transition-transform active:scale-95 md:right-6 md:bottom-6 lg:hidden"
    >
      <Plus className="size-6" aria-hidden />
    </button>
  );
}
