import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn.ts';
import { IconButton } from './button.tsx';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string | undefined;
  children: ReactNode;
  footer?: ReactNode;
};

/**
 * Formulario o detalle modal adaptable: BottomSheet en móvil, Dialog centrado desde md.
 * Usa `<dialog>` nativo: foco atrapado, Esc para cerrar y `inert` del fondo sin librerías.
 */
export function Sheet({ open, onClose, title, description, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // Clic en el fondo cierra; con teclado se cierra con Esc (comportamiento nativo de <dialog>).
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        // El propio <dialog> es la columna flex y nunca hace scroll: solo el área de contenido.
        // Así no hay doble barra (el navegador da `overflow: auto` a los diálogos por defecto).
        'hidden flex-col overflow-hidden border border-line bg-surface p-0 text-fg shadow-float open:flex',
        // Móvil: hoja anclada abajo.
        'inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none rounded-t-lg open:animate-sheet-up',
        // Desde md: diálogo centrado.
        'md:inset-0 md:m-auto md:h-fit md:max-h-[85dvh] md:max-w-[480px] md:rounded-lg md:open:animate-dialog-in',
      )}
    >
      <div aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line md:hidden" />
      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pt-4 pb-2 md:pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-h2">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-0.5 text-small text-fg-2">
              {description}
            </p>
          )}
        </div>
        <IconButton
          aria-label="Cerrar"
          icon={<X className="size-5" />}
          onClick={onClose}
          className="-mt-1 -mr-2"
        />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>
      {footer && (
        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-line px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:flex-row md:justify-end md:pb-4">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
