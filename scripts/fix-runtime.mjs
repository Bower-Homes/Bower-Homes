import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dir = '.vercel/output/functions';
const target = 'nodejs24.x';
let patched = 0;

for (const entry of await readdir(dir, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.endsWith('.func')) continue;

  const configPath = join(dir, entry.name, '.vc-config.json');
  let config;
  try {
    config = JSON.parse(await readFile(configPath, 'utf8'));
  } catch {
    continue;
  }

  if (typeof config.runtime !== 'string') continue;
  if (!config.runtime.startsWith('nodejs')) continue;
  if (config.runtime === target) continue;

  const previous = config.runtime;
  config.runtime = target;
  await writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(`[fix-runtime] ${entry.name}: ${previous} -> ${target}`);
  patched++;
}

if (patched === 0) {
  console.warn('[fix-runtime] no se parchó ninguna función — revisar');
}
