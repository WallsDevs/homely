import { existsSync } from 'node:fs';
import path from 'node:path';
import express, { type Express } from 'express';

const ONE_YEAR_SECONDS = 31_536_000;

/**
 * En producción el server también entrega la web compilada: mismo origen para la API y el client,
 * así la cookie de sesión y las peticiones funcionan sin CORS ni configuración extra.
 */
export function serveClient(app: Express, dir: string): boolean {
  // `sendFile` exige rutas absolutas; la variable de entorno puede venir relativa.
  const distDir = path.resolve(dir);
  const indexHtml = path.join(distDir, 'index.html');
  if (!existsSync(indexHtml)) return false;

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Los assets llevan hash en el nombre: se pueden cachear para siempre.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', `public, max-age=${ONE_YEAR_SECONDS}, immutable`);
        } else {
          // index.html, sw.js y el manifest deben revalidarse para recibir versiones nuevas.
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }),
  );

  // SPA: cualquier GET que no sea de la API devuelve index.html y React Router decide.
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    if (!req.accepts('html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
  return true;
}
