import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const port = Number(process.env.HEX_MAP_PORT || 4173);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const requestPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const allowed = requestPath === '/index.html' || /^\/src\/[a-z-]+\.(js|css)$/.test(requestPath);
    if (req.method !== 'GET' || !allowed) { res.writeHead(404); res.end('Not found'); return; }
    const file = path.join(root, requestPath);
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'" });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`HEX_MAP_STUDIO_READY http://localhost:${port}`));
