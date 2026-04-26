import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const repoRoot = process.cwd();
const maxCompressedBytes = 500 * 1024;
const ignoredDirs = new Set(['.git', '.toolchain', '.vs', 'node_modules', 'obj']);
const wasmFiles = [];

function collectWasmFiles(dir) {
  const relativeDir = relative(repoRoot, dir).replaceAll('\\', '/');
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) continue;
      if (relativeDir === '' && entry.name === 'dist') continue;
      collectWasmFiles(fullPath);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.wasm')) wasmFiles.push(fullPath);
  }
}

collectWasmFiles(repoRoot);

if (wasmFiles.length === 0) {
  console.log('No WASM artifacts found; skipping WASM bundle-size budget.');
  process.exit(0);
}

let failed = false;

for (const file of wasmFiles) {
  const rawBytes = statSync(file).size;
  const compressedBytes = gzipSync(readFileSync(file), { level: 9 }).length;
  const label = relative(repoRoot, file).replaceAll('\\', '/');
  const compressedKiB = (compressedBytes / 1024).toFixed(1);
  const rawKiB = (rawBytes / 1024).toFixed(1);
  const status = compressedBytes <= maxCompressedBytes ? 'ok' : 'over budget';

  console.log(`${status}: ${label} ${compressedKiB} KiB gzip (${rawKiB} KiB raw)`);
  if (compressedBytes > maxCompressedBytes) failed = true;
}

if (failed) {
  console.error(`WASM bundle-size budget exceeded: max ${(maxCompressedBytes / 1024).toFixed(0)} KiB gzip.`);
  process.exit(1);
}
