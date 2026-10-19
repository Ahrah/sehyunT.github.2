/**
 * Shared templates for static SEO pages (resource articles + keyword landing pages).
 * Used by generate-static-pages.ts at build time.
 */

import { SITE } from '../src/config/site';

export const DOMAIN = SITE.domain;
export const CONSULT_URL = SITE.consultUrl;

export const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Convert the admin article markup ([H]...[/H], [HIGHLIGHT]...[/HIGHLIGHT]) to HTML. */
export function articleToHtml(content: string): string {
  if (!content) return '';
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const h = line.match(/^\[H\](.*?)\[\/H\]$/);
      if (h) return `<h2>${escapeHtml(h[1])}</h2>`;
      let html = escapeHtml(line);
      html = html.replace(/\[HIGHLIGHT\](.*?)\[\/HIGHLIGHT\]/g, '<strong class="hl">$1</strong>');
      return `<p>${html}</p>`;
    })
    .join('\n');
}

/** Plain-text summary (for meta description) from article markup. */
export function plainSummary(content: string, max = 150): string {
  const text = (content || '')
    .replace(/\[\/?H\]/g, ' ')
    .replace(/\[\/?HIGHLIGHT\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export const KEYWORD_LINKS = [
  { slug: 'saenggibu-consulting', label: '생기부 컨설팅' },
  { slug: 'jasoseo-consulting', label: '자소서 컨설팅' },
  { slug: 'interview-consulting', label: '면접 컨설팅' },
  { slug: 'jinro-counseling', label: '진로·선택과목 상담' },
];

const STYLE = `
  :root { --text:#000; --gray:#52525B; --light:#E4E4E7; --bg:#fff; --soft:#F4F4F4; --accent:#E11D48; --blue:#1a4f8b; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif; line-height:1.8; word-break:keep-all; }
  a { color:inherit; }
  header.site { border-bottom:1px solid var(--light); }
  header.site .in, footer.site .in, main { max-width:760px; margin:0 auto; padding:0 16px; }
  header.site .in { display:flex; align-items:center; justify-content:space-between; gap:12px; height:64px; }
  .brand { display:flex; align-items:center; gap:10px; text-decoration:none; font-weight:900; letter-spacing:-0.02em; }
  .brand img { height:32px; width:auto; }
  nav.top a { font-size:13px; font-weight:700; text-decoration:none; color:var(--gray); margin-left:14px; }
  nav.top a:hover { color:var(--accent); }
  main { padding-top:40px; padding-bottom:64px; }
  .crumb { font-size:13px; color:var(--gray); margin-bottom:12px; }
  .crumb a { text-decoration:none; }
  .tag { display:inline-block; font-size:11px; font-weight:800; padding:3px 10px; background:var(--blue); color:#fff; margin-right:8px; }
  .date { font-size:13px; color:var(--gray); }
  h1 { font-size:clamp(26px, 5vw, 36px); line-height:1.35; letter-spacing:-0.03em; margin:12px 0 20px; font-weight:900; }
  h2 { font-size:20px; line-height:1.45; margin:40px 0 12px; font-weight:800; letter-spacing:-0.02em; }
  p { font-size:17px; margin:0 0 16px; color:#18181B; }
  .lead { font-size:18px; color:#18181B; }
  .hl { color:var(--blue); font-weight:700; }
  table { width:100%; border-collapse:collapse; margin:8px 0 20px; font-size:16px; }
  th, td { border-top:1px solid var(--light); border-bottom:1px solid var(--light); padding:12px 10px; text-align:left; vertical-align:top; }
  th { background:var(--soft); width:34%; font-weight:800; }
  ul.steps { padding-left:20px; margin:0 0 16px; }
  ul.steps li { font-size:17px; margin-bottom:8px; }
  .cta { margin:48px 0 0; padding:28px 20px; background:var(--soft); border-left:3px solid var(--accent); }
  .cta p { margin-bottom:14px; }
  .btn { display:inline-block; background:#000; color:#fff; text-decoration:none; font-weight:800; font-size:15px; padding:14px 22px; margin:4px 8px 4px 0; }
  .btn.ghost { background:transparent; color:#000; border:2px solid #000; }
  .related { margin-top:40px; border-top:1px solid var(--light); padding-top:20px; }
  .related a { display:block; font-weight:700; text-decoration:none; padding:6px 0; }
  .related a:hover { color:var(--accent); }
  footer.site { border-top:1px solid var(--light); padding:32px 0 48px; font-size:13px; color:#71717A; }
  footer.site p { font-size:13px; color:#71717A; margin:4px 0; }
  footer.site nav a { margin-right:14px; font-weight:700; text-decoration:none; color:var(--gray); }
  @media (max-width: 520px) { nav.top a.hide-sm { display:none; } th { width:38%; } }
`;

interface PageShellOpts {
  title: string;         // <title>
  description: string;
  canonical: string;     // absolute URL
  ogType?: 'article' | 'website';
  jsonLd?: object[];
  body: string;          // inner <main> HTML
}

export function pageShell(o: PageShellOpts): string {
  const ld = (o.jsonLd || [])
    .map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`)
    .join('\n  ');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(o.title)}</title>
  <meta name="description" content="${escapeHtml(o.description)}">
  <link rel="canonical" href="${o.canonical}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta property="og:type" content="${o.ogType || 'website'}">
  <meta property="og:title" content="${escapeHtml(o.title)}">
  <meta property="og:description" content="${escapeHtml(o.description)}">
  <meta property="og:url" content="${o.canonical}">
  <meta property="og:site_name" content="입시는세연쌤">
  <meta property="og:image" content="${DOMAIN}/logo-pic.png">
  <meta name="twitter:card" content="summary">
  ${ld}
  <style>${STYLE}</style>
</head>
<body>
  <header class="site"><div class="in">
    <a class="brand" href="/"><img src="/logo-pic.png" alt="입시는세연쌤 로고" width="37" height="32">입시는세연쌤</a>
    <nav class="top">
      <a href="/jinro-counseling/">진로 상담</a>
      <a href="/saenggibu-consulting/">생기부</a>
      <a href="/jasoseo-consulting/">자소서</a>
      <a href="/interview-consulting/">면접</a>
      <a class="hide-sm" href="/#resources">자료실</a>
    </nav>
  </div></header>
  <main>
${o.body}
  </main>
  <footer class="site"><div class="in">
    <nav><a href="/">홈</a><a href="/#resources">자료실</a>${KEYWORD_LINKS.map(k => `<a href="/${k.slug}/">${k.label}</a>`).join('')}</nav>
    <p style="margin-top:14px">상호명: ${SITE.name} · 대표: ${SITE.founder} · 사업자등록번호: ${SITE.businessNumber}</p>
    <p>이메일: ${SITE.email} · 문의: 카카오톡 '입시는세연쌤' 채널</p>
    <p>© ${new Date().getFullYear()} SEHYUN T. ALL RIGHTS RESERVED.</p>
  </div></footer>
</body>
</html>`;
}

/** Link to the home 자료실 section with the matching 고입/대입/학습자료 tab opened. */
export const resourcesHref = (category?: '대입' | '고입' | '학습자료') =>
  category === '고입' ? '/?cat=goip#resources' : category === '대입' ? '/?cat=daeip#resources' : category === '학습자료' ? '/?cat=study#resources' : '/#resources';

export const COST_GUIDE_PLAIN = '비용은 회원가입 후 자료실에서 확인하실 수 있어요.';

export function costGuideHtml(category?: '대입' | '고입' | '학습자료') {
  return `비용은 회원가입 후 <a href="${resourcesHref(category)}">자료실</a>에서 확인하실 수 있어요.`;
}

function keywordPageCategory(slug: string): '대입' | '고입' {
  return slug === 'saenggibu-consulting' ? '대입' : '고입';
}

const ctaBlock = (category?: '대입' | '고입') => `
    <div class="cta">
      <p><strong>상담 문의</strong><br>카카오톡에서 '입시는세연쌤' 채널을 찾아 남겨 주세요. 아래 상담 신청서로도 받습니다.</p>
      <a class="btn" href="${CONSULT_URL}" target="_blank" rel="noopener">상담 신청하기</a>
      <a class="btn ghost" href="${resourcesHref(category)}">${category ? `${category} 입시 자료실 보기` : '입시 자료실 보기'}</a>
    </div>`;

// ---------------------------------------------------------------------------
// Keyword landing pages. Copy comes from 세연쌤's own FAQ text (2026-09-28).
// ---------------------------------------------------------------------------

interface Faq { q: string; a: string }
interface KeywordPage {
  slug: string;
  keyword: string;
  title: string;          // <title>
  h1: string;
  description: string;
  lead: string;           // first paragraph — must contain keyword
  summary: [string, string][]; // 대상 / 비용 / 진행 방식 table
  sections: { h: string; paras?: string[]; list?: string[] }[];
  faqs: Faq[];
  relatedArticle?: { id: string; title: string };
}

export const KEYWORD_PAGES: KeywordPage[] = [
  {
    slug: 'saenggibu-consulting',
    keyword: '생기부 컨설팅',
    title: '생기부 컨설팅 | 학종 생기부 관리 비용·진행 방식 - 입시는세연쌤',
    h1: '생기부 컨설팅 — 학종 생기부 관리',
    description: '입시는세연쌤 생기부 컨설팅. 학생부종합전형을 준비하는 고등학생 대상. 수행평가·과목 선택·학교생활 관리, 1:1 개인톡, 매 학기 생기부 확인.',
    lead: '입시는세연쌤의 생기부 컨설팅은 학생부종합전형(학종)을 준비하는 고등학생의 생기부를 한 학기 단위로 관리하는 컨설팅입니다. 수행평가, 과목 선택, 학교생활 관리까지 학기 내내 학생 곁에서 함께 봅니다.',
    summary: [
      ['대상 학생', '학종을 준비하는 고등학생 (특목고·자사고 학생의 생기부 컨설팅을 많이 하고 있습니다)'],
      ['비용', COST_GUIDE_PLAIN],
      ['진행 방식', '세연쌤과 학생의 1:1 개인톡 · 답변은 하루 이내, 컨설팅은 이틀 이내가 원칙 · 매 학기 생기부 확인'],
      ['포함 내용', '수행평가 컨설팅, 과목 선택, 학교생활 관리, 자율탐구보고서·동아리 활동, 선생님 상담 준비'],
    ],
    sections: [
      {
        h: '생기부 컨설팅은 어떻게 진행되나요?',
        paras: [
          '컨설팅을 시작하면 세연쌤이 학생과 1:1 개인톡으로 직접 연락합니다. 학생에게 연락처를 알려 주기 때문에 밤늦게나 새벽에 보내도 괜찮습니다. 답변은 하루 이내, 컨설팅은 이틀 이내가 원칙입니다. 실제로는 대부분 12시간 안에 답하고, 하루 안에 컨설팅을 진행합니다.',
          '생기부는 매 학기 확인합니다. 다만 학교에 따라 여름방학에는 생기부에서 아무것도 확인할 수 없는 경우가 있어서, 그럴 때는 겨울방학에 확인합니다. 무엇이 남았고 무엇이 비었는지를 보고, 다음 학기에 채울 것을 정합니다.',
        ],
      },
      {
        h: '자율탐구보고서·동아리 활동도 학종 기준으로 봅니다',
        paras: [
          '보고서 주제 하나, 동아리 활동 하나도 학생부종합전형에서 어떻게 읽힐지를 먼저 생각하고 진행합니다. 그 활동이 학생의 진로, 그리고 앞서 남은 기록과 어떻게 이어지는지를 주제 고를 때부터 같이 봅니다.',
          '담임 선생님이나 교과 선생님과 상담하기 전에, 어떤 것을 여쭤보고 무엇을 부탁드리면 좋을지 미리 알려 드립니다.',
        ],
      },
      {
        h: '외고 재학생 생기부 컨설팅',
        paras: [
          '외고에는 공부를 잘하는 학생이 모여 있어서 내신 경쟁이 치열합니다. 이런 환경에서 학생이 수행평가를 잘 할 수 있도록 컨설팅합니다. 활동은 많은데 생기부에서 서로 연결되지 않는다면, 새로 무엇을 더 하기보다 이미 한 활동과 다음 활동이 어떻게 이어질지를 먼저 봅니다.',
          '1학년 1학기 말과 2학기 말에는 2학년 때 들을 선택과목을 고릅니다. 이때 각 학기에 어떤 과목이 들어 있는지, 이번 학기에 놓치더라도 다른 학기에 들을 수 있는 과목인지 등을 보고 컨설턴트가 판단합니다.',
        ],
      },
    ],
    faqs: [
      { q: '생기부 컨설팅 비용은 얼마인가요?', a: COST_GUIDE_PLAIN },
      { q: '진로는 몇 학년까지 정해야 하나요?', a: '고1에는 계열까지만 정해도 충분합니다. 고2가 되면 그 계열 안에서 어떤 분야로 갈지 정해야 합니다. 분야가 정해져야 과목 선택도, 탐구 주제도 거기에 맞출 수 있습니다.' },
      { q: '진로가 늦게 바뀌었거나 학종 준비를 늦게 시작했다면요?', a: '그럴 때는 1회성 컨설팅부터 받아 보시길 권합니다. 긴 관리보다 먼저 필요한 것은 지금까지의 생기부를 같이 펼쳐 보고, 남은 학기에 무엇을 채울지 방향을 정하는 일입니다.' },
    ],
    relatedArticle: { id: '2rH6jfosr4bEMNFDEOHf', title: '[2026년] 세연쌤 학종 생기부 관리 컨설팅, 비용과 관리 범위 FAQ' },
  },
  {
    slug: 'jasoseo-consulting',
    keyword: '자소서 컨설팅',
    title: '자소서 컨설팅 | 외고·국제고·자사고 자기소개서 비용·진행 방식 - 입시는세연쌤',
    h1: '자소서 컨설팅 — 외고·국제고·자사고 자기소개서',
    description: '입시는세연쌤 자소서 컨설팅. 외고·국제고·자사고를 준비하는 중학생 대상, 4~6회 수업. 면접에서 보여 줄 서사 구조화에 초점.',
    lead: '입시는세연쌤의 자소서 컨설팅은 외고·국제고 같은 특목고와 자사고 진학을 준비하는 중학생의 자기소개서를 완성하는 컨설팅입니다. 문장을 다듬기 전에, 면접에서 보여 줄 서사를 구조화하는 데 초점을 둡니다.',
    summary: [
      ['대상 학생', '외고·국제고 같은 특목고와 자사고 진학을 준비하는 중학생'],
      ['비용', COST_GUIDE_PLAIN],
      ['진행 방식', '대부분 4~6회 수업 동안 자기소개서 작성 · 자기소개서 작성은 중3 여름방학부터'],
      ['마친 뒤', '자기소개서 수업이 끝날 때 예상 질문을 드리고, 면접 준비로 이어집니다'],
    ],
    sections: [
      {
        h: '자소서 컨설팅은 무엇에 초점을 두나요?',
        paras: [
          '면접에서 보여 줄 서사를 구조화하는 데 초점을 둡니다. 무엇이 궁금했는지, 그래서 무엇을 더 찾아봤는지, 그 경험이 지원 동기와 진로 계획으로 어떻게 이어지는지 뼈대를 세웁니다. 문장을 다듬는 일은 그다음입니다. 쓰다 보니 탐구가 얕다고 느껴지면 이 시기에 탐구를 보완할 수 있도록 컨설팅을 진행합니다.',
        ],
      },
      {
        h: '진행 순서',
        paras: ['학년과 관계없이 아래 순서로 진행하고, 그중 학생에게 필요한 단계부터 시작합니다.'],
        list: ['진로 상담', '진학 상담', '자기소개서 작성 (중3 여름방학부터)', '면접 (모의 면접은 12월)'],
      },
      {
        h: '자기주도학습은 무엇을 말하나요?',
        paras: [
          '스터디플래너를 쓰는 것과는 관계가 없습니다. 수업에서 궁금해진 주제를 스스로 책과 자료로 더 찾아보는 것이 자기주도학습입니다. 고입 자소서에서 중요한 것은 이렇게 스스로 궁금한 것을 찾아본 경험과, 그 경험을 얼마나 깊이 파고들었는지입니다. 활동 목록이 긴 것보다 한 주제를 더 깊이 탐구해 본 경험이 더 쓸모 있습니다.',
        ],
      },
    ],
    faqs: [
      { q: '자소서 컨설팅 비용은 얼마인가요?', a: COST_GUIDE_PLAIN },
      { q: '중3인데 아직 진로나 학교를 못 정했어요. 바로 자소서를 써도 되나요?', a: '앞 단계가 정해지지 않았다면 앞 단계부터 시작합니다. 진로가 없으면 진로 상담부터, 진로는 있는데 학교를 못 정했다면 진학 상담부터 합니다. 어디로, 왜 가고 싶은지가 서야 자소서에 어떤 경험을 쓸지 고를 수 있습니다.' },
      { q: '진로 상담에서는 무엇을 하나요?', a: '여러 진로 분야를 보여 주고, 학생이 흥미를 느끼는 쪽으로 진로를 정하도록 돕습니다. 특목고나 자사고에 가고 싶다는 마음이 있다면, 그 진로에 맞춰 스스로 알아볼 탐구 주제를 함께 정합니다.' },
    ],
    relatedArticle: { id: 'VYDKTGZbmQ3ItIWOeHiF', title: '[2026년] 세연쌤 외고·국제고·자사고 자소서·면접 컨설팅, 비용과 진행 방식 FAQ' },
  },
  {
    slug: 'interview-consulting',
    keyword: '면접 컨설팅',
    title: '면접 컨설팅 | 외고·국제고·자사고 면접 준비·모의 면접 - 입시는세연쌤',
    h1: '면접 컨설팅 — 외고·국제고·자사고 면접 준비',
    description: '입시는세연쌤 면접 컨설팅. 특목고·자사고를 준비하는 중학생 대상. 12월부터 실제 면접장처럼 선생님 3명·학생 1명 모의 면접, 당일 피드백.',
    lead: '입시는세연쌤의 면접 컨설팅은 외고·국제고·자사고 면접을 준비하는 중학생을 위한 컨설팅입니다. 자기소개서를 쓰는 시기부터 면접 직전까지 이어서 진행하고, 12월부터는 실제 면접장처럼 모의 면접을 합니다.',
    summary: [
      ['대상 학생', '외고·국제고 같은 특목고와 자사고 진학을 준비하는 중학생'],
      ['비용', COST_GUIDE_PLAIN],
      ['진행 방식', '자기소개서 수업이 끝날 때 예상 질문 제공 → 12월부터 모의 면접 (선생님 3명, 학생 1명)'],
      ['모의 면접', '대기 시간까지 1시간 정도 · 끝나면 바로 간단한 피드백 · 그날 저녁 훈련할 부분에 대한 조언을 적어서 전달'],
    ],
    sections: [
      {
        h: '면접 준비는 어떻게 하나요?',
        paras: [
          '자소서에 쓴 문장마다 왜 그렇게 했는지, 어떻게 했는지를 묻습니다. 학생은 답하면서 자신의 탐구와 지원 동기를 다시 정리합니다. 자소서에 쓴 이야기를 자신의 말로 설명할 수 있으면 면접 준비가 된 것입니다.',
          '자기소개서 수업이 끝날 때 예상 질문을 드리고, 학생은 스스로 답변을 써서 외우며 준비합니다.',
        ],
      },
      {
        h: '12월 모의 면접',
        paras: [
          '12월부터는 모의 면접을 합니다. 실제 면접장처럼 선생님 3명, 학생 1명으로 진행하고, 대기 시간까지 1시간 정도 걸립니다. 면접이 끝나면 바로 간단한 피드백을 드리고, 그날 저녁에 앞으로 훈련할 부분에 대한 조언을 적어서 보내 드립니다.',
        ],
      },
    ],
    faqs: [
      { q: '면접 컨설팅 비용은 얼마인가요?', a: COST_GUIDE_PLAIN },
      { q: '모의 면접은 언제, 어떻게 하나요?', a: '12월부터 합니다. 실제 면접장처럼 선생님 3명, 학생 1명으로 진행하고, 대기 시간까지 1시간 정도 걸립니다.' },
      { q: '면접 준비가 됐는지는 어떻게 아나요?', a: '자소서에 쓴 이야기를 자신의 말로 설명할 수 있으면 면접 준비가 된 것입니다.' },
    ],
    relatedArticle: { id: 'VYDKTGZbmQ3ItIWOeHiF', title: '[2026년] 세연쌤 외고·국제고·자사고 자소서·면접 컨설팅, 비용과 진행 방식 FAQ' },
  },
];

export function keywordPageHtml(p: KeywordPage): string {
  const url = `${DOMAIN}/${p.slug}/`;
  const category = keywordPageCategory(p.slug);
  const summaryRows = p.summary.map(([k, v]) => {
    const cell = k === '비용' ? costGuideHtml(category) : escapeHtml(v);
    return `<tr><th>${escapeHtml(k)}</th><td>${cell}</td></tr>`;
  }).join('');
  const sections = p.sections.map(s => `
    <h2>${escapeHtml(s.h)}</h2>
    ${(s.paras || []).map(x => `<p>${escapeHtml(x)}</p>`).join('\n    ')}
    ${s.list ? `<ul class="steps">${s.list.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}`).join('\n');
  const faqs = p.faqs.map(f => {
    const answer = /비용은 얼마/.test(f.q) ? costGuideHtml(category) : escapeHtml(f.a);
    return `
    <h2>${escapeHtml(f.q)}</h2>
    <p>${answer}</p>`;
  }).join('\n');
  const others = KEYWORD_LINKS.filter(k => k.slug !== p.slug);
  const related = `
    <div class="related">
      ${p.relatedArticle ? `<a href="/resources/${p.relatedArticle.id}">→ ${escapeHtml(p.relatedArticle.title)}</a>` : ''}
      ${others.map(k => `<a href="/${k.slug}/">→ 입시는세연쌤 ${k.label}</a>`).join('\n      ')}
    </div>`;

  const body = `
    <div class="crumb"><a href="/">홈</a> › ${escapeHtml(p.keyword)}</div>
    <h1>${escapeHtml(p.h1)}</h1>
    <p class="lead">${escapeHtml(p.lead)}</p>
    <h2>${escapeHtml(p.keyword)} 한눈에 보기</h2>
    <table>${summaryRows}</table>
${sections}
${faqs}
${ctaBlock(p.slug === 'saenggibu-consulting' ? '대입' : '고입')}
${related}`;

  return pageShell({
    title: p.title,
    description: p.description,
    canonical: url,
    ogType: 'website',
    body,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `입시는세연쌤 ${p.keyword}`,
        serviceType: p.keyword,
        description: p.description,
        url,
        areaServed: 'KR',
        provider: { '@type': 'Organization', name: '입시는세연쌤', url: DOMAIN, founder: { '@type': 'Person', name: '조세연' } },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: p.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '홈', item: `${DOMAIN}/` },
          { '@type': 'ListItem', position: 2, name: p.keyword, item: url },
        ],
      },
    ],
  });
}

export interface ResourceLike {
  id: string;
  title: string;
  description?: string;
  fileType: string;
  content?: string | null;
  locked?: boolean;
  membersOnly?: boolean;
  category?: '대입' | '고입' | '학습자료';
  createdAt?: any;
}

export function isGatedResource(r: Pick<ResourceLike, 'locked' | 'membersOnly'>): boolean {
  return !!(r.locked || r.membersOnly);
}

export function resourcePageHtml(r: ResourceLike): string {
  const url = `${DOMAIN}/resources/${r.id}`;
  const category = r.category || '대입';
  const published = r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt ? new Date(r.createdAt) : new Date());
  const publishedIso = published.toISOString();
  const dateLabel = published.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const gated = isGatedResource(r);
  const hasArticle = r.fileType === 'article' && !gated && !!r.content;
  const publicDescription = !gated && r.description?.trim() ? r.description.trim() : '';
  const description = publicDescription
    || (hasArticle ? plainSummary(r.content as string) : `${r.title} — 입시는세연쌤 입시 전략 자료`);

  let content: string;
  if (hasArticle) {
    content = articleToHtml(r.content as string);
  } else if (gated) {
    content = r.membersOnly && !r.locked
      ? `<p>이 자료는 회원 전용입니다. 회원가입 후 <a href="${resourcesHref(category)}">자료실</a>에서 확인하실 수 있어요.</p>`
      : `<p>이 자료는 비밀번호가 설정된 회원 전용 자료입니다. <a href="${resourcesHref(category)}">자료실</a>에서 열람하실 수 있습니다.</p>`;
  } else {
    content = `${publicDescription ? `<p>${escapeHtml(publicDescription)}</p>` : ''}<p>이 자료는 <a href="${resourcesHref(category)}">입시는세연쌤 자료실</a>에서 내려받거나 열람하실 수 있습니다.</p>`;
  }

  const body = `
    <div class="crumb"><a href="/">홈</a> › <a href="${resourcesHref(category)}">자료실</a> › ${escapeHtml(category)}</div>
    <div><span class="tag">${escapeHtml(category)}</span><span class="date">${escapeHtml(dateLabel)}</span></div>
    <h1>${escapeHtml(r.title)}</h1>
    <article>
${content}
    </article>
${ctaBlock(category === '고입' ? '고입' : category === '대입' ? '대입' : undefined)}
    <div class="related">
      ${KEYWORD_LINKS.map(k => `<a href="/${k.slug}/">→ 입시는세연쌤 ${k.label} 안내</a>`).join('\n      ')}
    </div>`;

  return pageShell({
    title: `${r.title} | 입시는세연쌤`,
    description,
    canonical: url,
    ogType: 'article',
    body,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: r.title,
        description,
        author: { '@type': 'Person', name: '조세연' },
        publisher: { '@type': 'Organization', name: '입시는세연쌤', logo: { '@type': 'ImageObject', url: `${DOMAIN}/logo-pic.png` } },
        datePublished: publishedIso,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      },
    ],
  });
}

export function linksPageHtml(): string {
  const url = `${DOMAIN}/links/`;
  const title = '입시는세연쌤 | 링크';
  const description = '특목고 입시 / 최상위권 생기부 컨설팅';
  const ogImage = `${DOMAIN}/profile_640.jpg`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="입시는세연쌤">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary">
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap">
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      margin: 0;
      padding: 0;
      background: #111;
      color: #F8F6F2;
      font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif;
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 40px 20px;
    }
    .container {
      width: 100%;
      max-width: 460px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    .logo {
      margin-bottom: 24px;
      display: inline-block;
    }
    .brand-name {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #F8F6F2;
      margin-bottom: 4px;
    }
    .tagline {
      font-size: 20px;
      font-weight: 700;
      font-style: italic;
      color: #C8202F;
      letter-spacing: -0.03em;
      font-family: "Oswald", "Impact", "Arial Black", sans-serif;
      text-transform: uppercase;
      margin-bottom: 24px;
      transform: skewX(-5deg);
    }
    .divider {
      width: 100%;
      height: 1px;
      background: #C8202F;
      margin: 24px 0;
    }
    .profile {
      text-align: center;
      margin-bottom: 40px;
      position: relative;
    }
    .profile img {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 20px;
      border: 2px solid rgba(200, 32, 47, 0.3);
    }
    .profile h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
      color: #F8F6F2;
    }
    .profile p {
      font-size: 14px;
      color: #999;
      font-weight: 500;
    }
    .links {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 48px;
    }
    .link-btn {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px 28px;
      background: transparent;
      color: #F8F6F2;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s ease;
      border: 1px solid rgba(248, 246, 242, 0.15);
      text-align: center;
      line-height: 1.5;
    }
    .link-btn::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 0;
      height: 100%;
      background: rgba(200, 32, 47, 0.05);
      transition: width 0.3s ease;
    }
    .link-btn:hover {
      border-color: rgba(200, 32, 47, 0.5);
      transform: translateX(4px);
    }
    .link-btn:hover::before {
      width: 100%;
    }
    .link-btn span {
      position: relative;
      z-index: 1;
    }
    .link-btn.primary {
      background: #C8202F;
      color: #F8F6F2;
      border-color: #C8202F;
      font-weight: 700;
      white-space: nowrap;
    }
    .link-btn.primary::before {
      background: rgba(255, 255, 255, 0.1);
    }
    .link-btn.primary:hover {
      background: #A61B27;
      border-color: #A61B27;
      transform: translateX(4px) translateY(-2px);
      box-shadow: 0 4px 12px rgba(200, 32, 47, 0.3);
    }
    .social {
      display: flex;
      justify-content: center;
      gap: 24px;
      padding-top: 24px;
      border-top: 1px solid rgba(248, 246, 242, 0.1);
    }
    .social a {
      color: #555;
      font-size: 24px;
      transition: all 0.3s ease;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid transparent;
    }
    .social a:hover {
      color: #C8202F;
      border-color: rgba(200, 32, 47, 0.3);
      background: rgba(200, 32, 47, 0.05);
    }
    @media (max-width: 480px) {
      body { padding: 32px 16px; }
      .profile h1 { font-size: 20px; }
      .tagline { font-size: 18px; }
      .link-btn { font-size: 13px; padding: 16px 24px; }
      .link-btn.primary { font-size: 12px; padding: 16px 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <svg width="80" height="80" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <polygon points="50,90 10,10 90,10" fill="#F8F6F2"/>
          <polygon points="65,10 90,10 50,90" fill="#C8202F"/>
        </svg>
      </div>
      <div class="brand-name">SEHYUN T ADMISSIONS LAB</div>
      <div class="tagline">DESIGN YOUR SUCCESS.</div>
    </div>
    
    <div class="divider"></div>
    
    <div class="profile">
      <picture>
        <source srcset="/profile_640.webp" type="image/webp">
        <img src="/profile_640.jpg" alt="입시는세연쌤 프로필 사진" width="640" height="640" loading="lazy">
      </picture>
      <h1>입시는세연쌤 · 조세연</h1>
      <p>특목고 입시 / 최상위권 생기부 컨설팅</p>
    </div>
    
    <div class="links">
      <a href="${SITE.kakaoChannelUrlHttp}" class="link-btn primary" target="_blank" rel="noopener">
        <span>💬 카톡 채널 추가시 15분 무료 전화상담</span>
      </a>
      <a href="${SITE.kakaoInterviewNoticeUrl}" class="link-btn" target="_blank" rel="noopener">
        <span>📢 12월 특목고 3:1 모의면접 안내</span>
      </a>
      <a href="https://sehyunt.re.kr/" class="link-btn" target="_blank" rel="noopener">
        <span>SehyunT | 프로그램 소개 및 신청</span>
      </a>
      <a href="https://sehyunt-logic.tistory.com/" class="link-btn" target="_blank" rel="noopener">
        <span>시사·토론·면접 팁</span>
      </a>
      <a href="https://sehyunt-study.tistory.com/" class="link-btn" target="_blank" rel="noopener">
        <span>면접 연습 문제</span>
      </a>
    </div>
    
    <div class="social">
      <a href="${SITE.youtubeUrl}" target="_blank" rel="noopener" aria-label="YouTube">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      </a>
      <a href="${SITE.instagramBrandUrl}" target="_blank" rel="noopener" aria-label="Instagram">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
      </a>
      <a href="${SITE.threadsUrl}" target="_blank" rel="noopener" aria-label="Threads">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.3 8.8c-.1-.3-.2-.5-.4-.7-.8-1.1-2.3-1.7-4.4-1.7-1.4 0-2.6.3-3.5.9-.8.5-1.4 1.3-1.7 2.2-.1.3 0 .6.2.8.2.2.5.2.8.1.3-.1.5-.4.6-.6.2-.6.6-1.1 1.1-1.4.6-.4 1.4-.6 2.4-.6 1.7 0 2.8.5 3.3 1.3.2.3.3.6.4 1 .1.6.1 1.1.1 1.7 0 .5 0 .9-.1 1.4-2.4-.2-4.8.2-6.4 1.3-1 .7-1.6 1.7-1.6 2.9 0 1 .4 1.9 1.1 2.6.7.7 1.7 1 2.8 1 1.5 0 2.8-.5 3.8-1.4.8-.7 1.3-1.6 1.6-2.6.4-.1.8-.3 1.1-.6.6-.5.9-1.2.9-2 0-.3 0-.7-.1-1-.1-.6-.2-1.1-.4-1.6zm-3.9 5.8c-.2.7-.6 1.3-1.1 1.8-.7.6-1.6.9-2.6.9-.7 0-1.3-.2-1.8-.6-.4-.4-.7-.9-.7-1.5 0-.8.4-1.4 1.1-1.9 1.2-.8 3.1-1.1 5.2-.9-.1.7-.3 1.5-.6 2.2h.5zm6.6-2.6c0 2.3-.7 4.3-2 6.1-1.3 1.7-3.1 3-5.2 3.7-1.4.5-2.9.7-4.4.7-2.3 0-4.5-.5-6.5-1.6-2-1.1-3.6-2.6-4.8-4.6C1.4 14.5.8 12.3.8 10c0-2.3.7-4.5 2-6.2 1.3-1.8 3-3.1 5.1-3.9C9.3-.6 10.8-.8 12.3-.8c2.3 0 4.5.5 6.5 1.6 2 1.1 3.6 2.6 4.8 4.6 1.3 1.9 1.9 4.1 1.9 6.6z"/></svg>
      </a>
    </div>
  </div>
</body>
</html>`;
}
