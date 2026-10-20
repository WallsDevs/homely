// Aplica el tema antes del primer pintado para evitar el destello de tema incorrecto.
// Archivo aparte (no en línea) para que la CSP pueda prohibir scripts en línea.
(function () {
  var theme = 'system';
  try {
    theme = localStorage.getItem('homely.theme') || 'system';
  } catch {
    // Almacenamiento bloqueado: se usa el tema del sistema.
  }
  var dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
