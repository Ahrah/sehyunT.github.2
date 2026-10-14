/**
 * Post-build step: inject the GA4 (gtag.js) snippet right after <head> in every
 * generated HTML file under dist/ (SPA shell, prerendered resource pages,
 * keyword/service landing pages, /links, 404). Idempotent.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');
const GA_ID = 'G-BTG5X3NHL5';

const SNIPPET = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
</script>`;

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.html') ? [p] : [];
  });
}

let count = 0;
for (const file of walk(DIST_DIR)) {
  const html = fs.readFileSync(file, 'utf-8');
  if (html.includes(`gtag/js?id=${GA_ID}`)) continue;
  const out = html.replace(/<head(\s[^>]*)?>/i, (m) => m + SNIPPET);
  if (out === html) { console.warn(`⚠️  No <head> in ${file}`); continue; }
  fs.writeFileSync(file, out);
  count++;
}
console.log(`📈 GA4 snippet injected into ${count} HTML files`);
