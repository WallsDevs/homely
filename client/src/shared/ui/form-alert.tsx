import { CircleAlert } from 'lucide-react';

/** Error general de un formulario (no asociado a un campo concreto). */
export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md bg-danger-soft px-3 py-2.5 text-small text-danger"
    >
      <CircleAlert className="mt-px size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
