import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

const PRODUCT_API_TARGET = 'http://localhost:8080';
const AUTH_API_TARGET = 'http://localhost:8080';

function proxyRequest(targetBaseUrl: string): express.RequestHandler {
  return async (req, res, next) => {
    try {
      const targetUrl = new URL(req.originalUrl, targetBaseUrl);
      const headers = new Headers();

      for (const [name, value] of Object.entries(req.headers)) {
        const lowerName = name.toLowerCase();

        if (!value || ['connection', 'content-length', 'host'].includes(lowerName)) {
          continue;
        }

        headers.set(name, Array.isArray(value) ? value.join(',') : value);
      }

      headers.set('origin', '');

      const hasBody = !['GET', 'HEAD'].includes(req.method) && req.body !== undefined;
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: hasBody ? JSON.stringify(req.body) : undefined,
      });

      res.status(response.status);
      response.headers.forEach((value, name) => {
        if (!['connection', 'content-encoding', 'transfer-encoding'].includes(name.toLowerCase())) {
          res.setHeader(name, value);
        }
      });

      res.send(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      next(error);
    }
  };
}

// The Express app is exported so that it can be used by serverless Functions.
export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.use('/api', express.json(), proxyRequest(PRODUCT_API_TARGET));
  server.use('/auth', express.json(), proxyRequest(AUTH_API_TARGET));

  // Serve static files from /browser
  server.get('**', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }));

  // All regular routes use the Angular engine
  server.get('**', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;

  // Start up the Node server
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
