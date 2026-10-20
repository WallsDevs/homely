import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { AppError, type FieldErrors } from './errors.ts';

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

type Parsed<S extends Schemas, K extends keyof Schemas> = S[K] extends z.ZodType
  ? z.output<S[K]>
  : undefined;

export type EndpointInput<S extends Schemas> = {
  body: Parsed<S, 'body'>;
  query: Parsed<S, 'query'>;
  params: Parsed<S, 'params'>;
};

type Handler<S extends Schemas> = (input: EndpointInput<S>, req: Request, res: Response) => unknown;

/**
 * Envuelve un controller: valida body, query y params con Zod y le entrega los datos ya tipados.
 * Si algo no valida, lanza `VALIDATION_ERROR` con los errores por campo.
 * Express 5 propaga las promesas rechazadas al manejador global de errores.
 */
export function endpoint<S extends Schemas>(schemas: S, handler: Handler<S>): RequestHandler {
  return async (req, res) => {
    const details: FieldErrors = {};
    const body = parse(schemas.body, req.body, 'body', details);
    const query = parse(schemas.query, req.query, 'query', details);
    const params = parse(schemas.params, req.params, 'params', details);
    if (Object.keys(details).length > 0) throw AppError.validation(details);

    // Cada valor viene de `safeParse` con su schema, así que coincide con EndpointInput<S>.
    await handler({ body, query, params } as EndpointInput<S>, req, res);
  };
}

function parse(
  schema: z.ZodType | undefined,
  value: unknown,
  source: string,
  details: FieldErrors,
): unknown {
  if (!schema) return undefined;
  const result = schema.safeParse(value ?? {});
  if (result.success) return result.data;

  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : source;
    (details[key] ??= []).push(issue.message);
  }
  return undefined;
}
