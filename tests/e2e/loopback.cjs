'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { chromium } = require('playwright-core');
const http = require('node:http');
const path = require('node:path');

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
};

function closeServer(server) {
  server.close();
  server.closeAllConnections();
}

async function serve(dist) {
  const root = await fs.realpath(dist);
  const index = await fs.readFile(path.join(root, 'index.html'));
  const server = http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method) || !req.url.startsWith('/')) {
        res.writeHead(405).end();
        return;
      }
      const requestPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
      const resolved = path.resolve(root, '.' + requestPath);
      assert(resolved === root || resolved.startsWith(root + path.sep));
      let file;
      let type;
      try {
        const real = await fs.realpath(resolved);
        assert(real === root || real.startsWith(root + path.sep));
        file = await fs.readFile(real);
        type = mime[path.extname(real)] || 'application/octet-stream';
      } catch (error) {
        if (!['ENOENT', 'EISDIR'].includes(error.code)) throw error;
        if (path.extname(requestPath)) {
          res.writeHead(404).end();
          return;
        }
        file = index;
        type = mime['.html'];
      }
      const cache = requestPath.startsWith('/assets/') ? 'public, max-age=86400, immutable' : 'no-store';
      res.writeHead(200, { 'content-type': type, 'cache-control': cache, 'content-length': file.length });
      res.end(req.method === 'HEAD' ? undefined : file);
    } catch {
      res.writeHead(400).end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { origin: 'http://127.0.0.1:' + server.address().port, close: () => closeServer(server) };
}

async function denyProxy() {
  const server = http.createServer((_, res) => res.writeHead(403).end());
  server.on('connection', (socket) => socket.on('error', () => socket.destroy()));
  server.on('connect', (_, socket) => socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { url: 'http://127.0.0.1:' + server.address().port, close: () => closeServer(server) };
}

function defaultChrome() {
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  return existsSync(macChrome) ? macChrome : chromium.executablePath();
}

function launchBrowser(executablePath, proxy) {
  return chromium.launch({
    executablePath,
    headless: true,
    args: [
      '--proxy-server=' + proxy.url,
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--disable-quic',
      '--metrics-recording-only',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    ],
  });
}

async function closeBrowser(browser) {
  if (!browser) return;
  let timer;
  try {
    await Promise.race([
      browser.close(),
      new Promise((resolve) => {
        timer = setTimeout(resolve, 3000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function finishCli(main) {
  main()
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => {
      // A suíte já fechou seus contextos e servidores. Descarte handles residuais do transporte do Chrome.
      process.stdout.write('', () => process.stderr.write('', () => process.exit(process.exitCode ?? 0)));
    });
}

module.exports = { serve, denyProxy, defaultChrome, launchBrowser, closeBrowser, finishCli };
