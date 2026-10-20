import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { Providers } from './app/providers.tsx';
import { router } from './app/router.tsx';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró #root en index.html');

createRoot(root).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
);
