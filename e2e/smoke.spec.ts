import { expect, test, type Page } from '@playwright/test';

/*
 * Recorrido de humo con los datos del seed (dos admins, planes, tareas, gastos y metas).
 * Además de verificar los flujos, guarda capturas por pantalla en e2e/screenshots/ para
 * revisar el diseño a 360 px y a 1280 px.
 */

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

async function login(page: Page, email = 'iveth@homely.dev') {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill('homely1234');
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page.getByRole('heading', { name: /^Hola, / })).toBeVisible();
}

async function snap(page: Page, name: string) {
  // Espera a que no queden esqueletos de carga antes de capturar.
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: `e2e/screenshots/${test.info().project.name}-${name}.png`,
    fullPage: true,
  });
}

test('login, onboarding de sesión y pantalla de login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await snap(page, '01-login');
  await login(page);
  await expect(page).toHaveURL(/\/$/);
});

test('recorrido por todas las pantallas', async ({ page }) => {
  await login(page);
  await snap(page, '02-inicio');

  const screens: [string, string, RegExp | string][] = [
    ['/tasks', '03-tareas', 'Tareas'],
    ['/tasks/board', '04-tablero', 'Tablero'],
    ['/plans', '05-planes', 'Planes'],
    ['/expenses', '06-gastos', 'Gastos'],
    ['/expenses/goals', '07-metas', 'Gastos'],
    ['/expenses/categories', '08-categorias', 'Gastos'],
    ['/reports', '09-reportes', 'Reportes'],
    ['/reports/history', '10-historial', 'Reportes'],
    ['/members', '11-miembros', 'Miembros'],
    ['/settings', '12-ajustes', 'Ajustes'],
    ['/settings/data', '13-datos', 'Datos del hogar'],
  ];
  for (const [path, name, heading] of screens) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await snap(page, name);
  }

  if (isMobile(page)) {
    await page.goto('/more');
    await expect(page.getByRole('heading', { level: 1, name: 'Más' })).toBeVisible();
    await snap(page, '14-mas');
  }
});

test('completar una tarea de hoy y deshacer', async ({ page }) => {
  await login(page);
  await page.goto('/tasks');
  const check = page.getByRole('checkbox', { name: /^Completar «/ }).first();
  await expect(check).toBeVisible();
  const label = (await check.getAttribute('aria-label')) ?? '';
  const title = label.replace(/^Completar «|»$/g, '');

  await check.check();
  await expect(page.getByText('Tarea completada')).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: `Marcar «${title}» como pendiente` }),
  ).toBeChecked();
  await snap(page, '15-tarea-completada');

  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(page.getByRole('checkbox', { name: `Completar «${title}»` })).not.toBeChecked();
});

test('registrar un gasto desde el botón crear', async ({ page }) => {
  const description = `Pan E2E ${test.info().project.name}`;
  await login(page);
  await page.goto('/expenses');
  await page
    .getByRole('button', { name: isMobile(page) ? 'Crear' : 'Nuevo gasto' })
    .first()
    .click();
  if (isMobile(page)) await page.getByRole('button', { name: 'Nuevo gasto' }).click();

  const sheet = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await expect(sheet).toBeVisible();
  await sheet.getByLabel('Monto').fill('12,50');
  await sheet.getByText('Comida', { exact: true }).click();
  await sheet.getByLabel('Descripción (opcional)').fill(description);
  await snap(page, '16-nuevo-gasto');
  await sheet.getByRole('button', { name: 'Guardar gasto' }).click();

  await expect(page.getByText(/Gasto de .*12,50.* guardado/)).toBeVisible();
  await expect(page.getByText(description)).toBeVisible();
});

test('modo oscuro', async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    ...testInfo.project.use,
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await login(page);
  await snap(page, '17-inicio-oscuro');
  await page.goto('/reports');
  await expect(page.getByRole('heading', { level: 1, name: 'Reportes' })).toBeVisible();
  await snap(page, '18-reportes-oscuro');
  await context.close();
});
