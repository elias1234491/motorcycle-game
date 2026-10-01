// Baut eine einzelne HTML-Seite zum Veröffentlichen als Claude-Artifact.
// Aufruf: node callcenter/tools/build-artifact.mjs <ausgabe-ordner>
// Ergebnis: <ausgabe>/callcenter.html (+ personas.json daneben)
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, 'dist');
mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: [join(root, 'js/main.js')],
  bundle: true,
  format: 'esm',
  external: ['three'],
  minify: true,
  write: false,
  target: 'es2022',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let html = readFileSync(join(root, 'index.html'), 'utf8');
// Das Artifact-Gerüst liefert doctype/html/head/body selbst
html = html
  .replace(/<!DOCTYPE html>\s*/i, '')
  .replace(/<html[^>]*>\s*/i, '')
  .replace(/<\/html>\s*/i, '')
  .replace(/<\/?head>\s*/gi, '')
  .replace(/<\/?body>\s*/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '');
html = html.replace('<script type="module" src="js/main.js"></script>', () => `<script type="module">\n${js}\n</script>`);

writeFileSync(join(out, 'callcenter.html'), html);
copyFileSync(join(root, 'personas.json'), join(out, 'personas.json'));
console.log('geschrieben:', join(out, 'callcenter.html'), Math.round(html.length / 1024) + ' KB');
