import { Page, Route } from '@playwright/test';

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function token(role = 'OWNER') {
  const payload = {
    sub: 'admin',
    userName: 'admin',
    correo: 'admin@chinito.test',
    rol: role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
  };

  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

export async function mockBackend(page: Page) {
  await page.route(`**/auth/login`, async route => {
    const request = route.request();
    const payload = request.postDataJSON() as { password?: string } | undefined;

    if (payload?.password === 'Correcta123') {
      return json(route, { token: token() });
    }

    return json(route, { mensaje: 'Credenciales invalidas' }, 400);
  });

  await page.route(`**/auth/trabajadores**`, route => json(route, [
    {
      id: 1,
      nombre: 'Ana',
      apellido: 'Torres',
      dni: '45678912',
      celular: '987654321',
      correo: 'ana@chinito.test',
      rol: 'VENDEDOR',
      activo: true,
    },
  ]));

  await page.route(`**/api/categorias**`, route => json(route, [
    { id: 1, nombre: 'Accesorios' },
    { id: 2, nombre: 'Tecnologia' },
  ]));

  await page.route(`**/api/productos**`, route => json(route, [
    {
      id: 10,
      categoriaId: 1,
      codigoInterno: 'PROD-001',
      nombre: 'Audifonos Bluetooth',
      precioVenta: 89.9,
      precioCompra: 55,
      moneda: 'Soles',
      stock: 8,
    },
  ]));

  await page.route(`**/api/stock/10`, route => json(route, { cantidad: 8 }));
  await page.route(`**/api/stock**`, route => json(route, [{ productoId: 10, cantidad: 8 }]));

  await page.route(`**/api/clientes**`, route => json(route, [
    {
      id: 21,
      dniOrRuc: '76543210',
      nombres: 'Luis',
      apellidoPaterno: 'Perez',
      apellidoMaterno: 'Rios',
    },
  ]));

  await page.route(`**/api/proveedores**`, route => json(route, [
    {
      id: 31,
      dniOrRuc: '20123456789',
      razonSocialONombre: 'Proveedor Demo SAC',
      correoElectronico: 'ventas@proveedor.test',
      direccion: 'Av. Demo 123',
      telefono: '987654321',
    },
  ]));

  await page.route(`**/api/compras**`, route => json(route, [
    {
      id: 41,
      proveedorId: 31,
      productoId: 10,
      cantidad: 3,
      total: 165,
      fecha: new Date().toISOString(),
    },
  ]));

  await page.route(`**/api/ventas**`, route => json(route, [
    {
      id: 51,
      clienteId: 21,
      clienteNombre: 'Luis Perez',
      total: 179.8,
      fecha: new Date().toISOString(),
    },
  ]));
}

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('Usuario o correo').fill('admin');
  await page.getByPlaceholder(/Contrase/i).fill('Correcta123');
  await page.getByRole('button', { name: /Iniciar sesion/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 5_000 });
}
