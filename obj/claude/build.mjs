// Bundles src/ into a single self-contained index.html that opens straight from
// disk (file://). Three.js itself still loads from the CDN via the import map.
//   node build.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const js = execFileSync('npx', [
  '--yes', 'esbuild@0.24.0', 'src/main.js', '--bundle', '--format=esm', '--target=es2022',
  '--external:three', '--external:three/addons/*', '--legal-comments=none',
], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const tag = '<script type="module" src="./src/main.js"></script>';
const dev = readFileSync('dev.html', 'utf8');
if (!dev.includes(tag)) throw new Error('module script tag not found in dev.html');
const inline = `<script type="module">\n${js.replaceAll('</script', '<\\/script')}</script>`;
writeFileSync('index.html', dev.replace(tag, () => inline));
console.log(`index.html written (${(inline.length / 1024).toFixed(0)} KB of inlined code)`);
