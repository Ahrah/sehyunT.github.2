import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CAREER_COUNSELING_SLUG } from './career-counseling-prerender';
import { fetchResourcesPublic } from './fetch-public-resources';
import { KEYWORD_PAGES, isGatedResource } from './seo-pages';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ORIGIN = 'https://sehyunt.re.kr';
const REPORT_PATH = path.join(ROOT, 'site-audit-report.md');
const MAX_REQUESTS = 300;
const DELAY_MS = 120;
const FETCH_TIMEOUT_MS = 15_000;
const PRICE_RE = /\d[\d,]*\s*만?원(?![가-힣])/g;
const USER_AGENT = 'sehyunt-site-audit/1.0 (+https://sehyunt.re.kr)';

type Severity = 'pass' | 'warn' | 'fail';

type CheckResult = { status: number; finalUrl: string; redirected: boolean; html?: string; error?: string };

type Finding = { level: Severity; text: string };

const findings = {
  sitemap: [] as Finding[],
  links: [] as Finding[],
  seo: [] as Finding[],
  prices: [] as Finding[],
  lighthouse: [] as Finding[],
};

let requestCount = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function add(section: keyof typeof findings, level: Severity, text: string) {
  findings[section].push({ level, text });
}

function worst(items: Finding[]): Severity {
  if (items.some((item) => item.level === 'fail')) return 'fail';
  if (items.some((item) => item.level === 'warn')) return 'warn';
  return 'pass';
}

function normalizeUrl(raw: string, base = ORIGIN): string | null {
  try {
    const url = new URL(raw, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      // keep trailing slash
    }
    return url.href;
  } catch {
    return null;
  }
}

function samePage(a: string, b: string): boolean {
  const left = new URL(a);
  const right = new URL(b);
  const strip = (value: string) => (value === '/' ? '/' : value.replace(/\/+$/, ''));
  return left.host === right.host && strip(left.pathname) === strip(right.pathname);
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url).origin === ORIGIN;
  } catch {
    return false;
  }
}

async function request(url: string, method: 'GET' | 'HEAD' = 'GET'): Promise<CheckResult> {
  requestCount += 1;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' },
    });
    const html = method === 'GET' ? await res.text() : undefined;
    return {
      status: res.status,
      finalUrl: res.url || url,
      redirected: res.redirected || !samePage(url, res.url || url),
      html,
    };
  } catch (err: any) {
    return { status: 0, finalUrl: url, redirected: false, error: err?.message || String(err) };
  } finally {
    clearTimeout(timer);
  }
}

async function headOrGet(url: string): Promise<CheckResult> {
  const head = await request(url, 'HEAD');
  if (head.status >= 200 && head.status < 400) return head;
  await sleep(DELAY_MS);
  return request(url, 'GET');
}

function parseSitemap(xml: string): string[] {
  const urls = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)].map((match) => match[1].trim());
  return [...new Set(urls.map((url) => normalizeUrl(url)).filter((url): url is string => !!url))];
}

function extractLinks(html: string, pageUrl: string): string[] {
  const hrefs = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const out: string[] = [];
  for (const href of hrefs) {
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
    const abs = normalizeUrl(href, pageUrl);
    if (abs) out.push(abs);
  }
  return [...new Set(out)];
}

function stripTags(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function metaContent(html: string, attr: string, value: string): string {
  const re = new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0] || '';
  return (tag.match(/content=["']([^"']*)["']/i)?.[1] || '').trim();
}

function attrOf(html: string, tagRe: RegExp, attr: string): string {
  const tag = html.match(tagRe)?.[0] || '';
  return (tag.match(new RegExp(`${attr}=["']([^"']*)["']`, 'i'))?.[1] || '').trim();
}

function chromePath(): string | undefined {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  for (const candidate of ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium-browser']) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function runLighthouse(url: string, formFactor: 'mobile' | 'desktop'): Promise<Record<string, number> | { error: string }> {
  const chrome = chromePath();
  const outFile = path.join(ROOT, `.lighthouse-${formFactor}-${Date.now()}.json`);
  const args = [
    '--yes',
    'lighthouse@12.6.0',
    url,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--output=json',
    `--output-path=${outFile}`,
    '--quiet',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
  ];
  if (formFactor === 'desktop') args.push('--preset=desktop');
  else args.push('--form-factor=mobile', '--screenEmulation.mobile');
  if (chrome) args.push(`--chrome-path=${chrome}`);

  return new Promise((resolve) => {
    const child = spawn('npx', args, { cwd: ROOT, env: process.env });
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ error: 'lighthouse timeout' });
    }, 180_000);
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const json = JSON.parse(fs.readFileSync(outFile, 'utf-8'));
        fs.rmSync(outFile, { force: true });
        const cats = json.categories || {};
        resolve({
          performance: Math.round((cats.performance?.score ?? 0) * 100),
          accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
          'best-practices': Math.round((cats['best-practices']?.score ?? 0) * 100),
          seo: Math.round((cats.seo?.score ?? 0) * 100),
        });
      } catch {
        fs.rmSync(outFile, { force: true });
        resolve({ error: `lighthouse exit ${code}: ${stderr.slice(0, 240) || 'invalid json'}` });
      }
    });
  });
}

async function expectedPublicCount(): Promise<{ expected: number | null; note: string }> {
  try {
    const resources = await fetchResourcesPublic(12_000);
    const publicCount = resources.filter((item) => !isGatedResource(item)).length;
    const staticCount = 1 + 1 + 1 + KEYWORD_PAGES.length;
    return {
      expected: staticCount + publicCount,
      note: `공개 자료 ${publicCount} + 고정 페이지 ${staticCount}(홈, /${CAREER_COUNSELING_SLUG}/, /resources/, 키워드 ${KEYWORD_PAGES.length}) = ${staticCount + publicCount}`,
    };
  } catch (err: any) {
    return { expected: null, note: `자료실을 읽지 못했습니다 (${err?.message || err}).` };
  }
}

function sectionStatus(name: string, items: Finding[]): string {
  const mark = { pass: '통과', warn: '주의', fail: '실패' }[worst(items)];
  return `### ${name}: ${mark}`;
}

function renderList(items: Finding[]): string {
  if (!items.length) return '- 문제 없음\n';
  return `${items.map((item) => `- **${item.level}** ${item.text}`).join('\n')}\n`;
}

function renderReport(extra: string[]): string {
  const overall = worst(Object.values(findings).flat());
  return [
    '# 사이트 주간 감사',
    '',
    `대상: ${ORIGIN}`,
    `시각: ${new Date().toISOString()}`,
    `요청 수: ${requestCount}`,
    `종합: **${{ pass: '통과', warn: '주의', fail: '실패' }[overall]}** (보고 전용, 배포를 막지 않습니다)`,
    '',
    ...extra,
    sectionStatus('1. 사이트맵', findings.sitemap),
    '',
    renderList(findings.sitemap),
    sectionStatus('2. 깨진 링크', findings.links),
    '',
    renderList(findings.links),
    sectionStatus('3. 페이지 메타', findings.seo),
    '',
    renderList(findings.seo),
    sectionStatus('4. 가격 노출', findings.prices),
    '',
    renderList(findings.prices),
    sectionStatus('5. Lighthouse', findings.lighthouse),
    '',
    renderList(findings.lighthouse),
    '',
  ].join('\n');
}

function renderSummary(extra: string[]): string {
  const overall = worst(Object.values(findings).flat());
  return [
    '## 사이트 주간 감사',
    '',
    `종합: ${{ pass: '통과', warn: '주의', fail: '실패' }[overall]} (보고 전용)`,
    ...extra.filter((line) => line.startsWith('- ')),
    `- 사이트맵 ${worst(findings.sitemap)} · 링크 ${worst(findings.links)} · 메타 ${worst(findings.seo)} · 가격 ${worst(findings.prices)} · Lighthouse ${worst(findings.lighthouse)}`,
    '',
  ].join('\n');
}

async function main() {
  const extras: string[] = [];
  const htmlByUrl = new Map<string, string>();
  const checked = new Map<string, CheckResult>();

  const sitemapRes = await request(`${ORIGIN}/sitemap.xml`);
  if (sitemapRes.status !== 200 || !sitemapRes.html) {
    add('sitemap', 'fail', `sitemap.xml을 읽지 못했습니다 (${sitemapRes.status || sitemapRes.error}).`);
  }
  const sitemapUrls = sitemapRes.html ? parseSitemap(sitemapRes.html) : [];
  if (sitemapUrls.length) add('sitemap', 'pass', `sitemap.xml에서 URL ${sitemapUrls.length}개를 읽었습니다.`);

  const expected = await expectedPublicCount();
  extras.push(`- ${expected.note}`);
  if (expected.expected != null) {
    if (expected.expected === sitemapUrls.length) {
      add('sitemap', 'pass', `사이트맵 개수(${sitemapUrls.length})가 공개 페이지 예상(${expected.expected})과 같습니다.`);
    } else {
      add('sitemap', 'warn', `사이트맵 ${sitemapUrls.length}개, 예상 ${expected.expected}개. ${expected.note}`);
    }
  } else {
    add('sitemap', 'warn', expected.note);
  }

  const seeds = [...new Set([`${ORIGIN}/`, ...sitemapUrls])];
  for (const url of seeds) {
    if (requestCount >= MAX_REQUESTS) break;
    await sleep(DELAY_MS);
    const result = await request(url);
    checked.set(url, result);
    if (result.html) htmlByUrl.set(url, result.html);
    if (result.status === 200) {
      if (result.redirected) add('sitemap', 'warn', `${url} → ${result.finalUrl} (리다이렉트 후 200)`);
    } else {
      add('sitemap', 'fail', `${url} 상태 ${result.status || result.error}`);
    }
  }

  const queued = new Set<string>();
  const externals = new Set<string>();
  for (const [pageUrl, html] of htmlByUrl) {
    for (const href of extractLinks(html, pageUrl)) {
      if (isSameOrigin(href)) {
        if (![...checked.keys()].some((seen) => samePage(seen, href))) queued.add(href);
      } else {
        externals.add(href);
      }
    }
  }

  for (const url of queued) {
    if (requestCount >= MAX_REQUESTS) {
      add('links', 'warn', `요청 한도 ${MAX_REQUESTS}에 닿아 나머지 내부 링크는 건너뛰었습니다.`);
      break;
    }
    await sleep(DELAY_MS);
    const result = await request(url);
    checked.set(url, result);
    if (result.html && result.status === 200) htmlByUrl.set(url, result.html);
    if (result.status >= 400 || result.status === 0) {
      add('links', 'fail', `내부 ${url} → ${result.status || result.error}`);
    }
  }
  if (!findings.links.some((item) => item.level === 'fail')) {
    add('links', 'pass', `내부 링크 ${[...checked.keys()].filter(isSameOrigin).length}개를 확인했고 4xx/5xx는 없습니다.`);
  }

  for (const url of externals) {
    if (requestCount >= MAX_REQUESTS) {
      add('links', 'warn', `요청 한도 ${MAX_REQUESTS}에 닿아 나머지 외부 링크는 건너뛰었습니다.`);
      break;
    }
    await sleep(DELAY_MS);
    const result = await headOrGet(url);
    if (result.status >= 400 || result.status === 0) {
      add('links', 'warn', `외부 ${url} → ${result.status || result.error}`);
    }
  }

  const titles = new Map<string, string[]>();
  const descriptions = new Map<string, string[]>();
  for (const [pageUrl, html] of htmlByUrl) {
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
    const description = metaContent(html, 'name', 'description');
    const canonical = attrOf(html, /<link[^>]+rel=["']canonical["'][^>]*>/i, 'href');
    const ogTitle = metaContent(html, 'property', 'og:title');
    const ogImage = metaContent(html, 'property', 'og:image');
    const h1s = [...html.matchAll(/<h1\b/gi)].length;

    if (!title) add('seo', 'fail', `${pageUrl}: title이 없거나 비어 있습니다.`);
    else titles.set(title, [...(titles.get(title) || []), pageUrl]);
    if (!description) add('seo', 'fail', `${pageUrl}: meta description이 없습니다.`);
    else descriptions.set(description, [...(descriptions.get(description) || []), pageUrl]);
    if (!canonical) add('seo', 'fail', `${pageUrl}: canonical이 없습니다.`);
    else {
      const abs = normalizeUrl(canonical, pageUrl);
      if (!abs || !isSameOrigin(abs)) add('seo', 'fail', `${pageUrl}: canonical이 sehyunt.re.kr가 아닙니다 (${canonical}).`);
      else if (!samePage(abs, pageUrl)) add('seo', 'fail', `${pageUrl}: canonical이 자신을 가리키지 않습니다 (${canonical}).`);
    }
    if (h1s !== 1) add('seo', 'warn', `${pageUrl}: h1이 ${h1s}개입니다.`);
    if (!ogTitle) add('seo', 'warn', `${pageUrl}: og:title이 없습니다.`);
    if (!ogImage) add('seo', 'warn', `${pageUrl}: og:image가 없습니다.`);

    const text = stripTags(html);
    const prices = [...text.matchAll(PRICE_RE)].map((match) => match[0]);
    for (const price of [...new Set(prices)]) {
      add('prices', 'fail', `${pageUrl}: 가격처럼 보이는 문구 "${price}"`);
    }
  }

  for (const [title, urls] of titles) {
    if (urls.length > 1) add('seo', 'warn', `같은 title ${urls.length}페이지: "${title}" — ${urls.join(', ')}`);
  }
  for (const [description, urls] of descriptions) {
    if (urls.length > 1) add('seo', 'warn', `같은 description ${urls.length}페이지: "${description.slice(0, 80)}" — ${urls.join(', ')}`);
  }
  if (!findings.seo.some((item) => item.level !== 'pass')) add('seo', 'pass', `HTML ${htmlByUrl.size}페이지의 메타를 확인했습니다.`);
  if (!findings.prices.length) add('prices', 'pass', '공개 페이지에서 원/만원 가격 패턴이 없습니다.');

  const inbound = new Map<string, number>();
  for (const [pageUrl, html] of htmlByUrl) {
    for (const href of extractLinks(html, pageUrl)) {
      if (!isSameOrigin(href) || samePage(href, pageUrl)) continue;
      inbound.set(href, (inbound.get(href) || 0) + 1);
    }
  }
  const resourceUrls = sitemapUrls.filter((url) => {
    const pathName = new URL(url).pathname;
    return pathName.startsWith('/resources/') && pathName !== '/resources/' && pathName !== '/resources';
  });
  const missingInbound = resourceUrls.filter((url) => {
    const hits = [...inbound.entries()].filter(([from]) => samePage(from, url)).reduce((sum, [, n]) => sum + n, 0);
    return hits < 1;
  });
  if (resourceUrls.length && !missingInbound.length) {
    add('links', 'pass', `사이트맵 자료실 글 ${resourceUrls.length}개가 내부 <a href>를 1개 이상 받습니다.`);
  } else if (missingInbound.length) {
    add('links', 'warn', `내부 링크 0개인 자료실 URL ${missingInbound.length}개: ${missingInbound.slice(0, 8).join(', ')}`);
  }

  const lighthouseTargets = [
    { label: '홈', url: `${ORIGIN}/` },
    { label: '프로그램(진로 상담)', url: `${ORIGIN}/${CAREER_COUNSELING_SLUG}/` },
  ];
  extras.push('- 프로그램 본문은 `/#programs`라 홈과 HTML이 같아, Lighthouse 두 번째는 `/jinro-counseling/`을 측정했습니다.');
  if (!chromePath()) {
    add('lighthouse', 'warn', 'Chrome을 찾지 못해 Lighthouse를 건너뛰었습니다. CHROME_PATH를 지정하면 됩니다.');
  } else {
    for (const target of lighthouseTargets) {
      for (const form of ['mobile', 'desktop'] as const) {
        const result = await runLighthouse(target.url, form);
        if ('error' in result) {
          add('lighthouse', 'warn', `${target.label} ${form}: ${result.error}`);
          continue;
        }
        const line = `${target.label} ${form}: 성능 ${result.performance} · 접근성 ${result.accessibility} · 모범 ${result['best-practices']} · SEO ${result.seo}`;
        extras.push(`- ${line}`);
        const low = Object.entries(result).filter(([, score]) => score < 80);
        add('lighthouse', low.length ? 'warn' : 'pass', low.length ? `${line} (80 미만: ${low.map(([name]) => name).join(', ')})` : line);
      }
    }
  }

  const report = renderReport(extras);
  fs.writeFileSync(REPORT_PATH, report);
  const summary = renderSummary(extras);
  console.log(summary);
  console.log(`보고서: ${REPORT_PATH}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  main().catch((err) => {
    console.warn('⚠️  감사 중 오류가 났지만 종료 코드는 0입니다:', err);
    const fallback = `# 사이트 주간 감사\n\n검사를 끝내지 못했습니다: ${err?.message || err}\n`;
    fs.writeFileSync(REPORT_PATH, fallback);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## 사이트 주간 감사\n\n검사를 끝내지 못했습니다. 보고 전용이라 실패로 보지 않습니다.\n');
  });
}
