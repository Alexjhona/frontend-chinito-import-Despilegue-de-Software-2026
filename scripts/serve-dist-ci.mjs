import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createServer } from 'node:http';

const host = process.env.CI_HOST || '127.0.0.1';
const port = Number(process.env.PORT || process.env.CI_PORT || 4200);
const root = resolve(process.env.CI_DIST_DIR || 'dist/ng-menu-dashboard/browser');
const fallbackFile = existsSync(join(root, 'index.html')) ? 'index.html' : 'index.csr.html';

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function resolveRequestPath(url = '/') {
  const requestPath = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const normalizedPath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = resolve(root, `.${sep}${normalizedPath}`);

  if (!filePath.startsWith(`${root}${sep}`) && filePath !== root) {
    return join(root, fallbackFile);
  }

  if (existsSync(filePath) && extname(filePath)) {
    return filePath;
  }

  return join(root, fallbackFile);
}

const server = createServer((req, res) => {
  const filePath = resolveRequestPath(req.url);
  const extension = extname(filePath);

  res.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
  createReadStream(filePath)
    .on('error', () => {
      res.statusCode = 404;
      res.end('Not found');
    })
    .pipe(res);
});

server.listen(port, host, () => {
  console.log(`Static CI server listening on http://${host}:${port}`);
  console.log(`Serving ${root}`);
});

server.on('error', (error) => {
  console.error('Static CI server failed to start.');
  console.error(error);
  process.exit(1);
});
