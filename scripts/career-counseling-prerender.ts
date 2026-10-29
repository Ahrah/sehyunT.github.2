/**
 * SPA shell + prerendered marketing HTML for /jinro-counseling/
 * Copy comes from src/lib/careerCounseling.ts so the static HTML matches the page.
 * No account numbers, pass rates, or reviews.
 */

import { PRETENDARD_HEAD, SITE } from '../src/config/site';
import {
  APPLY_INTRO,
  COST_GUIDE,
  ELIGIBILITY_NOTE,
  FAQS,
  HERO_COPY,
  PAGE_META,
  PAY_GUIDE,
  PROGRAM_INTRO,
  PROGRAM_STEPS,
  REFUND_ITEMS,
  SCHEDULE_CARDS,
  SCHEDULE_TITLE,
  WHY_COPY,
  CAREER_COUNSELING_PRODUCT,
  isCareerCounselingOpen,
} from '../src/lib/careerCounseling';
import { escapeHtml } from './seo-pages';

export const CAREER_COUNSELING_SLUG = 'jinro-counseling';
export const CAREER_COUNSELING_TITLE = PAGE_META.title;
export const CAREER_COUNSELING_DESCRIPTION = PAGE_META.description;
export const CAREER_COUNSELING_CANONICAL = PAGE_META.canonical;

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      name: CAREER_COUNSELING_PRODUCT,
      serviceType: '진로 컨설팅',
      description: CAREER_COUNSELING_DESCRIPTION,
      url: CAREER_COUNSELING_CANONICAL,
      areaServed: 'KR',
      provider: {
        '@type': 'Organization',
        name: '입시는세연쌤',
        url: `${SITE.domain}/`,
        founder: { '@type': 'Person', name: '조세연' },
        address: {
          '@type': 'PostalAddress',
          streetAddress: '창업로 43, 81호',
          addressLocality: '성남시 수정구',
          addressRegion: '경기도',
          addressCountry: 'KR',
        },
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
  ],
};

function listItems(items: readonly string[]): string {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function stepsHtml(): string {
  return PROGRAM_STEPS.map((step) => (
    `<div class="step${step.main ? ' main' : ''}"><span class="n">${escapeHtml(step.n)}</span><h3>${escapeHtml(step.title)}</h3><ul>${listItems(step.items)}</ul></div>`
  )).join('');
}

function scheduleHtml(): string {
  return SCHEDULE_CARDS.map((card) => (
    `<div class="card"><h3>${escapeHtml(card.h)}</h3><div class="big${card.red ? ' red' : ''}">${escapeHtml(card.big)}</div><p>${escapeHtml(card.p)}</p></div>`
  )).join('');
}

function faqHtml(): string {
  return FAQS.map((item, index) => (
    `<details${index === 0 ? ' open' : ''}><summary>${escapeHtml(item.q)}</summary><p>${escapeHtml(item.a)}</p></details>`
  )).join('');
}

const APPLY_FORM_HTML = `<form class="apply" id="신청서">
      <p class="f full pay-guide">${escapeHtml(PAY_GUIDE)}</p>
      <div class="f full refund"><b>환불 안내</b>
        <ul>
          ${REFUND_ITEMS.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n          ')}
        </ul>
      </div>
      <div class="f full">
        <button class="btn" type="button">로그인하고 신청하기</button>
        <p class="btn-note">${escapeHtml(COST_GUIDE)}</p>
      </div>
    </form>`;

export function buildCareerCounselingPrerenderHtml(nowMs: number = Date.now()): string {
  if (!isCareerCounselingOpen(nowMs)) {
    throw new Error('진로 컨설팅 신청은 항상 열려 있어야 해요.');
  }

  return `
<div class="cc-page">
  <div class="elig-bar" role="note"><b>${escapeHtml(ELIGIBILITY_NOTE.label)}</b>${escapeHtml(ELIGIBILITY_NOTE.text)}</div>
  <header class="top"><div class="wrap">
    <a class="brand" href="/">
      <img src="/logo-mark.svg" alt="" width="40" height="40">
      <span class="en"><strong>SEHYUN T</strong><span>ADMISSIONS LAB</span></span>
    </a>
    <div class="top-actions">
      <a class="top-call" href="${SITE.phoneHref}">${SITE.phone}</a>
      <button type="button" class="top-auth">로그인</button>
    </div>
  </div></header>
  <div class="hero"><div class="wrap">
    <span class="tag">${escapeHtml(HERO_COPY.tag)}</span>
    <h1>${escapeHtml(HERO_COPY.titleBefore)}<br><em>${escapeHtml(HERO_COPY.titleEm)}</em></h1>
    <p class="lead">${escapeHtml(HERO_COPY.lead)}</p>
    <div class="meta">${HERO_COPY.chips.map((chip) => `<span>${escapeHtml(chip)}</span>`).join('')}</div>
    <p class="slogan">DESIGN YOUR SUCCESS.</p>
  </div></div>
  <section class="alt"><div class="wrap">
    <p class="eyebrow">WHY</p>
    <h2>${escapeHtml(WHY_COPY.title)}</h2>
    ${WHY_COPY.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('\n    ')}
  </div></section>
  <section id="구성"><div class="wrap">
    <p class="eyebrow">PROGRAM</p>
    <h2>${escapeHtml(PROGRAM_INTRO.title)}</h2>
    <p>${escapeHtml(PROGRAM_INTRO.text)}</p>
    <div class="steps">
      ${stepsHtml()}
    </div>
  </div></section>
  <section class="gb" id="일정"><div class="wrap">
    <p class="eyebrow">SCHEDULE</p>
    <h2>${escapeHtml(SCHEDULE_TITLE)}</h2>
    <div class="info">
      ${scheduleHtml()}
    </div>
  </div></section>
  <section class="alt" id="자격"><div class="wrap">
    <p class="eyebrow">APPLY</p>
    <h2>신청하기</h2>
    <p>${escapeHtml(APPLY_INTRO)} ${escapeHtml(COST_GUIDE)}</p>
    ${APPLY_FORM_HTML}
  </div></section>
  <section id="faq"><div class="wrap">
    <p class="eyebrow">FAQ</p>
    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqHtml()}
    </div>
  </div></section>
  <footer class="site"><div class="wrap">
    <div><strong>SEHYUN T ADMISSIONS LAB</strong><br>입시는세연쌤 · <span class="sl">DESIGN YOUR SUCCESS.</span></div>
    <div>문의 <a href="${SITE.phoneHref}">${SITE.phone}</a> · <a href="mailto:${SITE.email}">${SITE.email}</a><br><a href="${SITE.domain}">sehyunt.re.kr</a> · Instagram ${SITE.instagramHandle}</div>
    <div class="biz">
      <b>사업자 정보</b>
      <ul>
        <li>상호 ${SITE.name}</li>
        <li>대표 ${SITE.founder}</li>
        <li>사업장 주소 ${SITE.address}</li>
        <li>전화 ${SITE.phone}</li>
      </ul>
    </div>
  </div></footer>
</div>
`;
}

/** Static HTML for crawlers. The form is open at any timestamp, including before 2026-11-10. */
export const careerCounselingPrerenderHtml = buildCareerCounselingPrerenderHtml(0);

function replaceAttr(html: string, attr: string, value: string): string {
  const pattern = new RegExp(`(${attr}=")[^"]*(")`, 'g');
  return html.replace(pattern, `$1${value}$2`);
}

export function applyCareerCounselingSpaShell(
  html: string,
  prerenderHtml: string = careerCounselingPrerenderHtml,
): string {
  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${CAREER_COUNSELING_TITLE}</title>`);
  out = replaceAttr(out, 'name="title" content', CAREER_COUNSELING_TITLE);
  out = replaceAttr(out, 'name="description" content', CAREER_COUNSELING_DESCRIPTION);
  out = replaceAttr(out, 'property="og:title" content', CAREER_COUNSELING_TITLE);
  out = replaceAttr(out, 'property="og:description" content', CAREER_COUNSELING_DESCRIPTION);
  out = replaceAttr(out, 'property="og:url" content', CAREER_COUNSELING_CANONICAL);
  out = replaceAttr(out, 'name="twitter:title" content', CAREER_COUNSELING_TITLE);
  out = replaceAttr(out, 'name="twitter:description" content', CAREER_COUNSELING_DESCRIPTION);
  out = replaceAttr(out, 'name="twitter:url" content', CAREER_COUNSELING_CANONICAL);
  out = out.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${CAREER_COUNSELING_CANONICAL}" />`);
  out = out.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n    ${JSON.stringify(JSON_LD).replace(/</g, '\\u003c')}\n    </script>`
  );
  out = out.replace(/<link[^>]*rel="preload"[^>]*IMG_1441[^>]*>\s*/gi, '');
  out = out.replace(/<link[^>]*IMG_1441[^>]*rel="preload"[^>]*>\s*/gi, '');
  out = out.replace(/<link\b[^>]*\brel="modulepreload"[^>]*>\s*/gi, (tag) => (
    /fb-(?:app|auth|firestore|storage)-/.test(tag) ? '' : tag
  ));
  if (!out.includes('pretendard')) {
    out = out.replace('</head>', `${PRETENDARD_HEAD}\n  </head>`);
  }

  const startTag = '<div id="root">';
  const start = out.indexOf(startTag);
  if (start === -1) throw new Error('Could not find #root in SPA shell');
  const afterStart = start + startTag.length;
  const bodyClose = out.lastIndexOf('</body>');
  if (bodyClose === -1) throw new Error('Could not find </body> in SPA shell');
  const rootClose = out.lastIndexOf('</div>', bodyClose);
  if (rootClose === -1 || rootClose < afterStart) throw new Error('Could not find #root closing tag');
  return `${out.slice(0, afterStart)}\n${prerenderHtml}\n    ${out.slice(rootClose)}`;
}

export function assertNoSensitiveCopy(html: string) {
  const banned = [
    /\b\d{2,3}-\d{2}-\d{6}\b/, // 계좌번호 형태
    /합격률/,
    /합격 후기/,
    /수강 후기/,
    /만원/,
    /60,?000\s*원/,
    /"price"\s*:/,
  ];
  for (const pattern of banned) {
    if (pattern.test(html)) {
      throw new Error(`Sensitive copy matched ${pattern} in career counseling prerender`);
    }
  }
}
