import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';

const HTML = process.argv[2];
const OUT_DIR = process.argv[3];
if (!HTML || !OUT_DIR) {
  console.error('Usage: node extract-design-bundle.mjs <bundle.html> <out-dir>');
  process.exit(2);
}

const html = readFileSync(HTML, 'utf8');
const manifestMatch = html.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/);
const templateMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
if (!manifestMatch || !templateMatch) {
  console.error('manifest/template script tags not found');
  process.exit(1);
}

const manifest = JSON.parse(manifestMatch[1]);
const template = JSON.parse(templateMatch[1]);

const babelUuids = [...template.matchAll(/<script type="text\/babel" src="([0-9a-f-]+)"/g)].map((m) => m[1]);
console.error('babel UUIDs:', babelUuids);

mkdirSync(OUT_DIR, { recursive: true });
const labels = ['mock-icons.tsx', 'mock-data.ts', 'mock-app.tsx'];
babelUuids.forEach((uuid, i) => {
  const entry = manifest[uuid];
  if (!entry) throw new Error(`missing manifest entry for ${uuid}`);
  let bytes = Buffer.from(entry.data, 'base64');
  if (entry.compressed) bytes = gunzipSync(bytes);
  const out = join(OUT_DIR, labels[i] ?? `mock-${i}.txt`);
  writeFileSync(out, bytes);
  console.error(`wrote ${out} (${bytes.length} bytes)`);
});
