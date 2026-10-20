import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError, errorMessage } from './api-client.ts';

/**
 * Lleva un error de la API al formulario: los errores por campo (`VALIDATION_ERROR`) se pintan
 * bajo cada campo; el resto se devuelve como mensaje general para mostrar arriba del formulario.
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (error instanceof ApiError && error.details) {
    let handled = false;
    for (const [field, messages] of Object.entries(error.details)) {
      const match = fields.find((name) => name === field);
      if (match && messages[0]) {
        setError(match, { type: 'server', message: messages[0] });
        handled = true;
      }
    }
    if (handled) return null;
  }
  return errorMessage(error);
}
