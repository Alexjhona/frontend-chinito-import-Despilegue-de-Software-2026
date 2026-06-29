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
    { menu: 'Cliente', title: 'Clientes' },
    { menu: 'Proveedor', title: 'Proveedores' },
    { menu: 'Categoria', title: 'Familias del catalogo' },
    { menu: 'Producto', title: 'Productos' },
    { menu: 'Venta', title: 'Ventas' },
    { menu: 'Trabajadores', title: 'Trabajadores' },
    { menu: 'Ajustes', title: 'Ajustes' },
  ];

  for (const module of modules) {
    await page.getByLabel(/Abrir menu/i).click();
    await page.getByRole('menuitem', { name: new RegExp(module.menu, 'i') }).first().click();
    await expect(page.getByText(new RegExp(module.title, 'i')).first()).toBeVisible();
  }
});

test('categorias: listado y validacion de formulario', async ({ page }) => {
  await login(page);
  await page.goto('/categoria');

  await expect(page.getByText('Accesorios')).toBeVisible();
  await page.getByRole('button', { name: /Nueva Categoria/i }).click();
  await page.getByRole('button', { name: /^Guardar$/i }).click();

  await expect(page.getByText(/campo es obligatorio/i).first()).toBeVisible();
});

test('productos: listado, inventario y validacion de stock', async ({ page }) => {
  await login(page);
  await page.goto('/producto');

  await expect(page.getByText('Audifonos Bluetooth')).toBeVisible();
  await expect(page.getByText(/Stock/i).first()).toBeVisible();
  await page.getByRole('button', { name: /Nuevo Producto/i }).click();
  await page.getByRole('button', { name: /^Guardar$/i }).click();

  await expect(page.getByText(/stock 0/i)).toBeVisible();
});

test('clientes: listado y validaciones de formulario', async ({ page }) => {
  await login(page);
  await page.goto('/cliente');

  await expect(page.getByText('Luis')).toBeVisible();
  await page.getByRole('button', { name: /Nuevo Cliente/i }).click();
  await page.getByRole('button', { name: /^Guardar$/i }).click();

  await expect(page.getByText(/DNI de 8 digitos|RUC de 11 digitos/i)).toBeVisible();
});

test('proveedores: listado y validaciones de formulario', async ({ page }) => {
  await login(page);
  await page.goto('/proveedor');

  await expect(page.getByText('Proveedor Demo SAC')).toBeVisible();
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

  await expect(page.getByText('Luis Perez')).toBeVisible();
  await page.getByRole('button', { name: /Registrar Venta/i }).click();
  await page.getByRole('button', { name: /Registrar venta|Guardar/i }).first().click();

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
