/**
 * Post-build step: inject a deferred GA4 (gtag.js) snippet after <head>
 * in every generated HTML file under dist/. Pageview is queued immediately
 * so tracking still fires when the library loads after idle. Idempotent.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '../dist');
const GA_ID = 'G-BTG5X3NHL5';

const SNIPPET = `
<!-- Google tag (gtag.js) — queued immediately, fetched after load/idle -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_ID}');
  function loadGtag() {
    if (window.__gtagLoaded) return;
    window.__gtagLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_ID}';
    document.head.appendChild(s);
  }
  function scheduleGtag() {
    if ('requestIdleCallback' in window) requestIdleCallback(loadGtag, { timeout: 3500 });
    else setTimeout(loadGtag, 1);
  }
  if (document.readyState === 'complete') scheduleGtag();
  else window.addEventListener('load', scheduleGtag);
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
