/**
 * Shared templates for static SEO pages (resource articles + keyword landing pages).
 * Used by generate-static-pages.ts at build time.
 */

export const DOMAIN = 'https://sehyunt.re.kr';
export const CONSULT_URL = 'https://tally.so/r/KYrWDz';

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
    <a class="brand" href="/"><img src="/logo-pic.png" alt="입시는세연쌤 로고">입시는세연쌤</a>
    <nav class="top">
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
    <p style="margin-top:14px">상호명: 입시는세연쌤 · 대표: 조세연 · 사업자등록번호: 612-69-00756</p>
    <p>이메일: consultantsyssam@gmail.com · 문의: 카카오톡 '입시는세연쌤' 채널</p>
    <p>© ${new Date().getFullYear()} SEHYUN T. ALL RIGHTS RESERVED.</p>
  </div></footer>
</body>
</html>`;
}

const ctaBlock = `
    <div class="cta">
      <p><strong>상담 문의</strong><br>카카오톡에서 '입시는세연쌤' 채널을 찾아 남겨 주세요. 아래 상담 신청서로도 받습니다.</p>
      <a class="btn" href="${CONSULT_URL}" target="_blank" rel="noopener">상담 신청하기</a>
      <a class="btn ghost" href="/#resources">입시 자료실 보기</a>
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
    description: '입시는세연쌤 생기부 컨설팅. 학생부종합전형을 준비하는 고등학생 대상, 한 학기 180~200만원. 수행평가·과목 선택·학교생활 관리, 1:1 개인톡, 매 학기 생기부 확인.',
    lead: '입시는세연쌤의 생기부 컨설팅은 학생부종합전형(학종)을 준비하는 고등학생의 생기부를 한 학기 단위로 관리하는 컨설팅입니다. 수행평가, 과목 선택, 학교생활 관리까지 학기 내내 학생 곁에서 함께 봅니다.',
    summary: [
      ['대상 학생', '학종을 준비하는 고등학생 (특목고·자사고 학생의 생기부 컨설팅을 많이 하고 있습니다)'],
      ['비용', '한 학기 180~200만원 — 질문하거나 컨설팅을 받을 때마다 비용이 따로 들지 않습니다'],
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
      { q: '생기부 컨설팅 비용은 얼마인가요?', a: '한 학기에 180~200만원입니다. 수행평가 컨설팅, 과목 선택, 학교생활 관리가 모두 포함되며, 질문하거나 컨설팅을 받을 때마다 비용이 따로 들지 않습니다.' },
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
    description: '입시는세연쌤 자소서 컨설팅. 외고·국제고·자사고를 준비하는 중학생 대상, 자기소개서 완성까지 약 100만원, 4~6회 수업. 면접에서 보여 줄 서사 구조화에 초점.',
    lead: '입시는세연쌤의 자소서 컨설팅은 외고·국제고 같은 특목고와 자사고 진학을 준비하는 중학생의 자기소개서를 완성하는 컨설팅입니다. 문장을 다듬기 전에, 면접에서 보여 줄 서사를 구조화하는 데 초점을 둡니다.',
    summary: [
      ['대상 학생', '외고·국제고 같은 특목고와 자사고 진학을 준비하는 중학생'],
      ['비용', '자기소개서 완성까지 약 100만원 (면접 준비까지 포함하면 150~200만원)'],
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
      { q: '자소서 컨설팅 비용은 얼마인가요?', a: '자기소개서 완성까지는 약 100만원입니다. 면접 준비까지 포함하면 150~200만원입니다.' },
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
    description: '입시는세연쌤 면접 컨설팅. 특목고·자사고를 준비하는 중학생 대상, 자소서부터 면접까지 150~200만원. 12월부터 실제 면접장처럼 선생님 3명·학생 1명 모의 면접, 당일 피드백.',
    lead: '입시는세연쌤의 면접 컨설팅은 외고·국제고·자사고 면접을 준비하는 중학생을 위한 컨설팅입니다. 자기소개서를 쓰는 시기부터 면접 직전까지 이어서 진행하고, 12월부터는 실제 면접장처럼 모의 면접을 합니다.',
    summary: [
      ['대상 학생', '외고·국제고 같은 특목고와 자사고 진학을 준비하는 중학생'],
      ['비용', '면접 준비까지 포함하면 150~200만원 (자기소개서 완성까지는 약 100만원)'],
      ['진행 방식', '자기소개서 수업이 끝날 때 예상 질문 제공 → 12월부터 모의 면접 (선생님 3명, 학생 1명)'],
      ['모의 면접', '대기 시간까지 1시간 정도 · 끝나면 바로 간단한 피드백 · 그날 저녁 훈련할 부분에 대한 조언을 적어서 전달'],
    ],
    sections: [
      {
        h: '면접 준비는 어떻게 하나요?',
        paras: [
          '자소서에 쓴 문장마다 왜 그렇게 했는지, 어떻게 했는지를 묻습니다. 학생은 답하면서 자기 탐구와 지원 동기를 다시 정리합니다. 자소서에 쓴 이야기를 자기 말로 설명할 수 있으면 면접 준비가 된 것입니다.',
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
      { q: '면접 컨설팅 비용은 얼마인가요?', a: '자기소개서 완성까지는 약 100만원이고, 면접 준비까지 포함하면 150~200만원입니다.' },
      { q: '모의 면접은 언제, 어떻게 하나요?', a: '12월부터 합니다. 실제 면접장처럼 선생님 3명, 학생 1명으로 진행하고, 대기 시간까지 1시간 정도 걸립니다.' },
      { q: '면접 준비가 됐는지는 어떻게 아나요?', a: '자소서에 쓴 이야기를 자기 말로 설명할 수 있으면 면접 준비가 된 것입니다.' },
    ],
    relatedArticle: { id: 'VYDKTGZbmQ3ItIWOeHiF', title: '[2026년] 세연쌤 외고·국제고·자사고 자소서·면접 컨설팅, 비용과 진행 방식 FAQ' },
  },
];

export function keywordPageHtml(p: KeywordPage): string {
  const url = `${DOMAIN}/${p.slug}/`;
  const summaryRows = p.summary.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
  const sections = p.sections.map(s => `
    <h2>${escapeHtml(s.h)}</h2>
    ${(s.paras || []).map(x => `<p>${escapeHtml(x)}</p>`).join('\n    ')}
    ${s.list ? `<ul class="steps">${s.list.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>` : ''}`).join('\n');
  const faqs = p.faqs.map(f => `
    <h2>${escapeHtml(f.q)}</h2>
    <p>${escapeHtml(f.a)}</p>`).join('\n');
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
${ctaBlock}
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
  category?: '대입' | '고입';
  createdAt?: any;
}

export function resourcePageHtml(r: ResourceLike): string {
  const url = `${DOMAIN}/resources/${r.id}`;
  const category = r.category || '대입';
  const published = r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt ? new Date(r.createdAt) : new Date());
  const publishedIso = published.toISOString();
  const dateLabel = published.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const hasArticle = r.fileType === 'article' && !r.locked && !!r.content;
  const description = (r.description && r.description.trim()) || (hasArticle ? plainSummary(r.content as string) : `${r.title} — 입시는세연쌤 입시 전략 자료`);

  let content: string;
  if (hasArticle) {
    content = articleToHtml(r.content as string);
  } else if (r.locked) {
    content = `<p>이 자료는 비밀번호가 설정된 회원 전용 자료입니다. <a href="/#resources">자료실</a>에서 열람하실 수 있습니다.</p>`;
  } else {
    content = `${r.description ? `<p>${escapeHtml(r.description)}</p>` : ''}<p>이 자료는 <a href="/#resources">입시는세연쌤 자료실</a>에서 내려받거나 열람하실 수 있습니다.</p>`;
  }

  const body = `
    <div class="crumb"><a href="/">홈</a> › <a href="/#resources">자료실</a> › ${escapeHtml(category)}</div>
    <div><span class="tag">${escapeHtml(category)}</span><span class="date">${escapeHtml(dateLabel)}</span></div>
    <h1>${escapeHtml(r.title)}</h1>
    <article>
${content}
    </article>
${ctaBlock}
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
