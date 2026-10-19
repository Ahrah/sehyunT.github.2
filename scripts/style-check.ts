import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchResourcesPublic, type ResourceItem } from './fetch-public-resources';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const RULES_PATH = path.join(ROOT, 'style-rules.json');
const DEFAULT_REPORT = path.join(ROOT, 'style-check-report.md');

export type StyleRule = {
  id: string;
  description: string;
  regex: string;
  exceptions?: string[];
  severity?: string;
};

export type StyleHit = {
  location: string;
  ruleId: string;
  severity: string;
  sentence: string;
  match: string;
};

const SKIP_FILES = new Set([
  'scripts/style-check.ts',
  'scripts/style-check.test.ts',
  'scripts/check-career-counseling.ts',
]);

export function loadRules(filePath = RULES_PATH): StyleRule[] {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (!Array.isArray(raw?.rules)) throw new Error('style-rules.json must have a rules array');
  return raw.rules;
}

export function compileRule(rule: StyleRule): { rule: StyleRule; re: RegExp } {
  return { rule, re: new RegExp(rule.regex, 'gu') };
}

function isExcepted(text: string, index: number, length: number, exceptions: string[] = []): boolean {
  return exceptions.some((ex) => {
    let from = 0;
    while (from <= text.length) {
      const at = text.indexOf(ex, from);
      if (at === -1) return false;
      if (index >= at && index + length <= at + ex.length) return true;
      from = at + 1;
    }
    return false;
  });
}

function sentenceAround(text: string, index: number, length: number): string {
  const breaks = ['.', '!', '?', '。', '\n'];
  let start = 0;
  for (const mark of breaks) {
    const at = text.lastIndexOf(mark, index - 1);
    if (at >= start) start = at + 1;
  }
  let end = text.length;
  for (const mark of breaks) {
    const at = text.indexOf(mark, index + length);
    if (at !== -1) end = Math.min(end, at + 1);
  }
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

export function findHits(text: string, rules: StyleRule[], location: string): StyleHit[] {
  if (!text) return [];
  const hits: StyleHit[] = [];
  for (const rule of rules) {
    const re = new RegExp(rule.regex, 'gu');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      if (isExcepted(text, match.index, match[0].length, rule.exceptions)) continue;
      hits.push({
        location,
        ruleId: rule.id,
        severity: rule.severity || 'warning',
        sentence: sentenceAround(text, match.index, match[0].length) || match[0],
        match: match[0],
      });
      if (match[0].length === 0) re.lastIndex += 1;
    }
  }
  return hits;
}

function isUserFacingChunk(text: string): boolean {
  return /[가-힣]|《|》|\*\*/.test(text);
}

export function extractSnippets(source: string): { text: string; line: number }[] {
  const snippets: { text: string; line: number }[] = [];
  let i = 0;
  let line = 1;
  const n = source.length;
  let atLineStart = true;

  const bump = (ch: string) => {
    if (ch === '\n') {
      line += 1;
      atLineStart = true;
    } else if (!/\s/.test(ch)) {
      atLineStart = false;
    }
  };

  const skipInterpolation = () => {
    i += 2;
    let depth = 1;
    while (i < n && depth > 0) {
      if (source.startsWith('//', i)) {
        while (i < n && source[i] !== '\n') i += 1;
        continue;
      }
      if (source.startsWith('/*', i)) {
        i += 2;
        while (i < n && !source.startsWith('*/', i)) {
          bump(source[i]);
          i += 1;
        }
        i += 2;
        continue;
      }
      const q = source[i];
      if (q === "'" || q === '"' || q === '`') {
        i += 1;
        while (i < n && source[i] !== q) {
          if (source[i] === '\\') i += 1;
          bump(source[i] || '');
          i += 1;
        }
        i += 1;
        continue;
      }
      if (source[i] === '{') depth += 1;
      if (source[i] === '}') depth -= 1;
      bump(source[i]);
      i += 1;
    }
  };

  const takeQuoted = (quote: string) => {
    const startLine = line;
    i += 1;
    let buf = '';
    while (i < n && source[i] !== quote) {
      if (source[i] === '\\' && i + 1 < n) {
        buf += source[i + 1];
        i += 2;
        continue;
      }
      if (quote === '`' && source.startsWith('${', i)) {
        buf += ' ';
        skipInterpolation();
        continue;
      }
      bump(source[i]);
      buf += source[i];
      i += 1;
    }
    if (i < n) i += 1;
    if (isUserFacingChunk(buf)) snippets.push({ text: buf, line: startLine });
  };

  while (i < n) {
    if (atLineStart && /^(import|export)\b/.test(source.slice(i))) {
      while (i < n && source[i] !== ';' && source[i] !== '\n') {
        if (source[i] === "'" || source[i] === '"' || source[i] === '`') {
          const q = source[i];
          i += 1;
          while (i < n && source[i] !== q) {
            if (source[i] === '\\') i += 1;
            bump(source[i] || '');
            i += 1;
          }
        }
        bump(source[i] || '');
        i += 1;
      }
      if (source[i] === ';') i += 1;
      continue;
    }

    if (source.startsWith('//', i)) {
      while (i < n && source[i] !== '\n') i += 1;
      continue;
    }
    if (source.startsWith('/*', i)) {
      i += 2;
      while (i < n && !source.startsWith('*/', i)) {
        bump(source[i]);
        i += 1;
      }
      i += 2;
      continue;
    }

    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      takeQuoted(ch);
      continue;
    }

    if (ch === '>' && source[i - 1] !== '=' && source[i - 1] !== '-') {
      i += 1;
      const startLine = line;
      let buf = '';
      while (i < n && source[i] !== '<' && source[i] !== '{') {
        bump(source[i]);
        buf += source[i];
        i += 1;
      }
      const trimmed = buf.trim();
      if (trimmed && isUserFacingChunk(trimmed)) snippets.push({ text: trimmed, line: startLine });
      continue;
    }

    bump(ch);
    i += 1;
  }

  return snippets;
}

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      out.push(...listSourceFiles(full));
      continue;
    }
    if (!/\.(tsx?|jsx?)$/.test(entry.name)) continue;
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (SKIP_FILES.has(rel)) continue;
    if (/\.test\./.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

function scanSources(rules: StyleRule[]): StyleHit[] {
  const hits: StyleHit[] = [];
  for (const rootDir of ['src', 'scripts']) {
    const dir = path.join(ROOT, rootDir);
    if (!fs.existsSync(dir)) continue;
    for (const file of listSourceFiles(dir)) {
      const rel = path.relative(ROOT, file).replace(/\\/g, '/');
      const source = fs.readFileSync(file, 'utf-8');
      for (const snippet of extractSnippets(source)) {
        hits.push(...findHits(snippet.text, rules, `${rel}:${snippet.line}`));
      }
    }
  }
  return hits;
}

function scanResources(resources: ResourceItem[], rules: StyleRule[]): StyleHit[] {
  const hits: StyleHit[] = [];
  for (const item of resources) {
    const fields: [string, string | undefined][] = [
      ['title', item.title],
      ['description', item.description],
    ];
    if (!item.locked) fields.push(['content', item.content]);
    for (const [field, value] of fields) {
      if (!value) continue;
      hits.push(...findHits(value, rules, `resource:${item.id}#${field}`));
    }
  }
  return hits;
}

function renderReport(hits: StyleHit[], rules: StyleRule[], notes: string[]): string {
  const counts = new Map<string, number>();
  for (const rule of rules) counts.set(rule.id, 0);
  for (const hit of hits) counts.set(hit.ruleId, (counts.get(hit.ruleId) || 0) + 1);

  const lines = [
    '# 문체 검사 보고',
    '',
    `검사 시각: ${new Date().toISOString()}`,
    `총 ${hits.length}건`,
    '',
    '## 규칙별 건수',
    '',
    '| 규칙 | 설명 | 건수 |',
    '| --- | --- | ---: |',
    ...rules.map((rule) => `| ${rule.id} | ${rule.description.replace(/\|/g, '/')} | ${counts.get(rule.id) || 0} |`),
    '',
  ];

  if (notes.length) {
    lines.push('## 참고', '', ...notes.map((note) => `- ${note}`), '');
  }

  lines.push('## 상세', '');
  if (!hits.length) {
    lines.push('해당 없음.');
    return `${lines.join('\n')}\n`;
  }

  for (const rule of rules) {
    const group = hits.filter((hit) => hit.ruleId === rule.id);
    if (!group.length) continue;
    lines.push(`### ${rule.id}`, '');
    for (const hit of group) {
      lines.push(`- \`${hit.location}\` · ${rule.id} · ${hit.sentence}`);
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function renderSummary(hits: StyleHit[], rules: StyleRule[], notes: string[]): string {
  const counts = new Map<string, number>();
  for (const rule of rules) counts.set(rule.id, 0);
  for (const hit of hits) counts.set(hit.ruleId, (counts.get(hit.ruleId) || 0) + 1);
  return [
    '## 문체 검사',
    '',
    `총 ${hits.length}건 (배포를 막지 않습니다)`,
    '',
    ...rules.map((rule) => `- ${rule.id}: ${counts.get(rule.id) || 0}`),
    ...(notes.length ? ['', ...notes.map((note) => `- ${note}`)] : []),
    '',
  ].join('\n');
}

export async function runStyleCheck(options: { strict?: boolean; reportPath?: string } = {}) {
  const rules = loadRules();
  const notes: string[] = [];
  const hits = scanSources(rules);

  try {
    const resources = await fetchResourcesPublic(10_000);
    hits.push(...scanResources(resources, rules));
    notes.push(`자료실 ${resources.length}건을 검사했습니다.`);
  } catch (err: any) {
    const message = err?.message || String(err);
    console.warn('⚠️  자료실을 읽지 못했습니다. 코드만 검사하고 계속합니다:', message);
    notes.push(`자료실을 읽지 못해 코드만 검사했습니다 (${message}).`);
  }

  const report = renderReport(hits, rules, notes);
  const reportPath = options.reportPath || DEFAULT_REPORT;
  fs.writeFileSync(reportPath, report);
  console.log(renderSummary(hits, rules, notes));
  console.log(`보고서: ${reportPath}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderSummary(hits, rules, notes));
  }

  if (options.strict && hits.length) {
    process.exitCode = 1;
  }
  return { hits, rules, notes, report };
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const strict = process.argv.includes('--strict');
  runStyleCheck({ strict }).catch((err) => {
    console.warn('⚠️  문체 검사 중 오류가 났지만 배포는 막지 않습니다:', err);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, '## 문체 검사\n\n검사를 끝내지 못했습니다. 배포는 계속합니다.\n');
    }
    if (strict) process.exitCode = 1;
  });
}
