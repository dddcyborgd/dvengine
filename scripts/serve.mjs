#!/usr/bin/env node
/*! dvengine — serve (scripts/serve.mjs) · zero-dependency static server for the repo root on :8801 (PORT env overrides) with MIME for .js/.mjs/.json/.glb/.wasm/.html/.css · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, resolve, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || process.argv[2] || 8801);
const MIME = { '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.vrm': 'model/gltf-binary', '.wasm': 'application/wasm', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = normalize(join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  let st; try { st = statSync(file); } catch { res.writeHead(404); return res.end('not found: ' + p); }
  if (st.isDirectory()) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'credentialless' });
  createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`dvengine → http://127.0.0.1:${PORT}/  (index.html · studio/studio.html · legacy/legacy.html)`));
