import { expect, test } from '@playwright/test';
import { login, mockBackend } from './fixtures/api-mocks';

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test('inicio de sesion correcto', async ({ page }) => {
  await login(page);

  await expect(page.getByText('Ventas registradas')).toBeVisible();
  await expect(page.getByText('Monto vendido')).toBeVisible();
});

test('inicio de sesion incorrecto', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('Usuario o correo').fill('admin');
  await page.getByPlaceholder(/Contrase/i).fill('incorrecta');
  await page.getByRole('button', { name: /Iniciar sesion/i }).click();

  await expect(page.getByText(/incorrectos/i)).toBeVisible({ timeout: 5_000 });
  await expect(page).toHaveURL(/\/login/);
});

test('navegacion por modulos principales', async ({ page }) => {
  await login(page);

  const modules = [
    { menu: /Cliente/i, title: /Clientes/i },
    { menu: /Proveedor/i, title: /Proveedores/i },
    { menu: /Categor/i, title: /Familias del cat[aá]logo/i },
    { menu: /Producto/i, title: /Productos/i },
    { menu: /Venta/i, title: /Ventas/i },
    { menu: /Trabajadores/i, title: /Trabajadores/i },
    { menu: /Ajustes/i, title: /Ajustes/i },
  ];

  for (const module of modules) {
    await page.getByLabel(/Abrir men[uú]/i).click();
    await page.getByRole('menuitem', { name: module.menu }).first().click();
    await expect(page.getByText(module.title).first()).toBeVisible();
  }
});

test('categorias: listado y validacion de formulario', async ({ page }) => {
  await login(page);
  await page.goto('/categoria');

  await expect(page.getByText('Accesorios').first()).toBeVisible();
  await page.goto('/agregar-categoria');
  await page.getByRole('button', { name: /Nueva Categor[ií]a/i }).click();
  await page.getByRole('button', { name: /^Guardar$/i }).click();

  await expect(page.getByText(/campo es obligatorio/i).first()).toBeVisible();
});

test('productos: listado, inventario y validacion de stock', async ({ page }) => {
  await login(page);
  await page.goto('/producto');

  await expect(page.getByText('Audifonos Bluetooth').first()).toBeVisible();
  await expect(page.getByText(/Stock/i).first()).toBeVisible();
  await page.goto('/agregar-productos');
  await page.getByRole('button', { name: /Nuevo Producto/i }).click();
  await page.getByRole('button', { name: /^Guardar$/i }).click();

  await expect(page.getByText(/stock 0/i).first()).toBeVisible();
});

test('clientes: listado y validaciones de formulario', async ({ page }) => {
  await login(page);
  await page.goto('/cliente');

  await expect(page.getByRole('cell', { name: 'Luis' })).toBeVisible();
  await page.getByRole('button', { name: /Nuevo Cliente/i }).click();
  await page.getByRole('button', { name: /^Guardar$/i }).click();

  await expect(page.getByText(/DNI de 8 d[ií]gitos|RUC de 11 d[ií]gitos/i).first()).toBeVisible();
});

test('proveedores: listado y validaciones de formulario', async ({ page }) => {
  await login(page);
  await page.goto('/proveedor');

  await expect(page.getByRole('cell', { name: 'Proveedor Demo SAC' })).toBeVisible();
  await page.getByRole('button', { name: /Nuevo Proveedor/i }).click();
  await page.getByRole('button', { name: /^Guardar$/i }).click();

  await expect(page.getByText(/RUC de 11 digitos/i)).toBeVisible();
});

test('compras: endpoint disponible para integracion por gateway', async ({ page }) => {
  await page.goto('/login');

  const compras = await page.evaluate(async () => {
    const response = await fetch('http://localhost:8080/api/compras');
    return response.json() as Promise<unknown[]>;
  });

  expect(compras.length).toBeGreaterThan(0);
});

test('ventas: listado y validacion de formulario', async ({ page }) => {
  await login(page);
  await page.goto('/venta');

  await expect(page.getByRole('cell', { name: 'Luis Perez' })).toBeVisible();
  await page.getByRole('button', { name: /Registrar Venta/i }).click();
  await page.getByRole('button', { name: /Registrar venta|Guardar/i }).first().click({ force: true });

  await expect(page.getByText(/cliente|producto|obligatorio|agrega/i).first()).toBeVisible();
});

test('cierre de sesion', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: /Cerrar/i }).click();
  await page.getByRole('button', { name: /Confirmar/i }).click();

  await expect(page).toHaveURL(/\/inicio/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
