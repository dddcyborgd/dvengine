#!/usr/bin/env node
/*! dvengine — check-syntax (scripts/check-syntax.mjs) · `node --check` every .js/.mjs outside archive/ vendor/ dist/ node_modules/ .git/ and exit non-zero on the first failure · (c) 2026 BANKON / PYTHAI · dddcyborgd · MIT */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['archive', 'vendor', 'dist', 'node_modules', '.git', 'state']);
const files = [];
(function walk(d) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(join(d, e.name)); }
    else if (/\.(m?js)$/.test(e.name)) files.push(join(d, e.name));
  }
})(ROOT);
let bad = 0;
for (const f of files.sort()) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { bad++; console.error(`✖ ${relative(ROOT, f)}\n${String(e.stderr || e.message).trim()}`); }
}
console.log(`check-syntax: ${files.length - bad}/${files.length} files parse${bad ? ` · ${bad} FAILED` : ''}`);
process.exit(bad ? 1 : 0);
