/**
 * SPA shell + prerendered marketing HTML for /jinro-counseling/
 * Copy follows detail_page.html. No account numbers, pass rates, or reviews.
 */

import { PRETENDARD_HEAD, SITE } from '../src/config/site';

export const CAREER_COUNSELING_SLUG = 'jinro-counseling';
export const CAREER_COUNSELING_TITLE = '온라인 진로·선택과목 상담 | 입시는세연쌤';
export const CAREER_COUNSELING_DESCRIPTION =
  '비수도권 고등학교 재학생 전용. 희망 전공에서 과목 이수 경로를 역설계하는 40분 온라인 화상 상담과 1장짜리 과목 이수 로드맵.';
export const CAREER_COUNSELING_CANONICAL = `${SITE.domain}/jinro-counseling/`;

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Service',
      name: '온라인 진로·선택과목 상담',
      serviceType: '진로·선택과목 상담',
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
      mainEntity: [
        {
          '@type': 'Question',
          name: '집은 지방인데 학교가 서울·경기·인천에 있어요. 신청할 수 있나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '이 상담은 재학 중인 학교의 소재지를 기준으로 해요. 학교가 서울·경기·인천에 있으면 신청할 수 없어요.',
          },
        },
        {
          '@type': 'Question',
          name: '결제는 언제 하나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '신청서를 내신 뒤에는 문자로 상담 일정을 조율해요. 비용은 회원가입 후 자료실에서 확인하실 수 있어요. 일정이 확정되면 입금 안내와 계좌를 문자로 보내 드려요.',
          },
        },
        {
          '@type': 'Question',
          name: '환불은 어떻게 되나요?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '상담 2일 전까지 취소하시면 전액 환불해 드려요. 상담 1일 전부터 당일까지 취소하시면 환불하지 않아요. 신청 자격이 맞지 않으면 전액 환불해 드려요.',
          },
        },
      ],
    },
  ],
};

export const careerCounselingPrerenderHtml = `
<div class="cc-page">
  <div class="elig-bar" role="note"><b>신청 자격</b>서울·경기·인천 외 지역 고등학교 재학생만 신청할 수 있어요 (재학 학교 소재지 기준)</div>
  <header class="top"><div class="wrap">
    <a class="brand" href="/">
      <img src="/logo-mark.svg" alt="" width="32" height="32">
      <span class="en"><strong>SEHYUN T</strong><span>ADMISSIONS LAB</span></span>
    </a>
    <a class="top-call" href="${SITE.phoneHref}">${SITE.phone}</a>
  </div></header>
  <div class="hero"><div class="wrap">
    <span class="tag">비수도권 학생 전용 · 시즌 한정</span>
    <h1>희망 전공에서 거꾸로 짜는<br><em>온라인 진로·선택과목 상담</em></h1>
    <p class="lead">고1·고2 학생의 희망 전공을 먼저 듣고, 앞으로 들을 과목의 이수 경로를 함께 설계해요. 상담이 끝나면 1장짜리 과목 이수 로드맵을 드려요.</p>
    <div class="meta"><span>40분 온라인 화상 상담</span><span>과목 이수 로드맵 1장</span><a href="/#resources">비용은 자료실에서 확인</a></div>
    <p class="slogan">DESIGN YOUR SUCCESS.</p>
  </div></div>
  <section class="alt"><div class="wrap">
    <p class="eyebrow">WHY</p>
    <h2>지역과 상관없이 받는 과목 선택 상담</h2>
    <p>과목 선택은 학교 안에서 정해지지만, 필요한 정보는 학교 밖에 흩어져 있는 경우가 많아요. 사는 지역 때문에 상담 기회가 적었다면 온라인으로 차근차근 짚어 드릴게요.</p>
    <div class="stat"><div class="num">59.5<small>%</small></div>
      <p>비수도권 수시 지원자의 59.5%가 정보 격차를 느꼈다고 답했어요.<span class="src">출처: 진학사 2025 조사, 응답자 기준</span></p>
    </div>
  </div></section>
  <section id="구성"><div class="wrap">
    <p class="eyebrow">PROGRAM</p>
    <h2>상담 구성</h2>
    <p>제출 자료를 미리 읽고 들어가서, 40분을 학생 이야기에 집중해서 써요.</p>
    <div class="steps">
      <div class="step"><span class="n">STEP 1 · 상담 전날까지</span><h3>자료 제출</h3><ul><li>학교생활기록부</li><li>희망 진로</li><li>학교 선택과목표 (있는 경우)</li></ul></div>
      <div class="step main"><span class="n">STEP 2 · 40분</span><h3>온라인 화상 상담</h3><ul><li>희망 전공에서 과목 이수 경로를 역설계해요</li><li>학교에 개설되지 않은 과목은 공동교육과정·온라인학교 등 대안 가능성을 점검해요</li><li>세특·탐구 활동을 과목과 연결하는 방향을 잡아요</li></ul></div>
      <div class="step"><span class="n">STEP 3 · 상담 후</span><h3>과목 이수 로드맵</h3><ul><li>상담 내용을 1장짜리 과목 이수 로드맵으로 정리해 드려요</li></ul></div>
    </div>
  </div></section>
  <section class="gb" id="일정"><div class="wrap">
    <p class="eyebrow">SCHEDULE</p>
    <h2>일정 안내</h2>
    <p>이번 시즌에만 운영하는 상담이에요.</p>
    <div class="info">
      <div class="card"><h3>신청 기간</h3><div class="big">11/10 ~ 12/10</div><p>2026년, 시즌 한정</p></div>
      <div class="card"><h3>상담 진행</h3><div class="big">11/25 ~ 12/25</div><p>온라인 화상 40분</p></div>
      <div class="card"><h3>대상</h3><div class="big">고1 · 고2</div><p>서울·경기·인천 외 지역 고등학교 재학생</p></div>
      <div class="card"><h3>비용</h3><div class="big red">자료실에서 확인</div><p>회원가입 후 <a href="/#resources">자료실</a>에서 확인하실 수 있어요.</p></div>
    </div>
  </div></section>
  <section class="alt" id="자격"><div class="wrap">
    <p class="eyebrow">APPLY</p>
    <h2>신청하기</h2>
    <p>아래 항목을 신청서에 적어 주시면, 문자로 상담 일정을 조율해 드려요. 비용은 회원가입 후 자료실에서 확인하실 수 있어요.</p>
    <p class="pay-guide">신청서를 제출하시면 문자로 상담 일정을 조율해 드려요. 비용은 회원가입 후 자료실에서 확인하실 수 있어요. 일정이 확정되면 입금 안내를 문자로 보내 드려요.</p>
    <div class="refund"><b>환불 안내</b>
      <ul>
        <li>상담 2일 전까지 취소하면 전액 환불해 드려요.</li>
        <li>상담 1일 전부터 당일까지 취소하면 환불하지 않아요.</li>
        <li>자격이 맞지 않으면 전액 환불해 드려요.</li>
      </ul>
    </div>
    <div class="elig-box"><strong>신청 자격을 확인해 주세요</strong><p>서울·경기·인천 외 지역 고등학교 재학생(고1·고2)만 신청할 수 있어요. 기준은 거주지가 아니라 재학 중인 학교의 소재지예요.</p></div>
    <a class="btn" href="/jinro-counseling/#신청서">로그인하고 신청하기</a>
    <p class="btn-note">신청 기간 2026. 11. 10 ~ 12. 10 · 비용은 회원가입 후 자료실에서 확인하실 수 있어요.</p>
  </div></section>
  <section id="faq"><div class="wrap">
    <p class="eyebrow">FAQ</p>
    <h2>자주 묻는 질문</h2>
    <div class="faq">
      <details open><summary>집은 지방인데 학교가 서울·경기·인천에 있어요. 신청할 수 있나요?</summary><p>이 상담은 재학 중인 학교의 소재지를 기준으로 해요. 학교가 서울·경기·인천에 있으면 신청할 수 없어요. 반대로 집이 수도권이어도 학교가 그 외 지역에 있으면 신청할 수 있답니다.</p></details>
      <details><summary>결제는 언제 하나요?</summary><p>신청서를 내신 뒤에는 문자로 상담 일정을 조율해요. 비용은 회원가입 후 자료실에서 확인하실 수 있어요. 일정이 확정되면 입금 안내와 계좌를 문자로 보내 드려요.</p></details>
      <details><summary>환불은 어떻게 되나요?</summary><p>상담 2일 전까지 취소하시면 전액 환불해 드려요. 상담 1일 전부터 당일까지 취소하시면 환불하지 않아요. 신청 자격이 맞지 않으면 전액 환불해 드려요.</p></details>
      <details><summary>자격이 맞지 않는 걸 나중에 알게 되면 어떻게 되나요?</summary><p>상담 전에 신청서의 학교 정보를 확인해요. 자격 조건과 맞지 않으면 신청을 취소하고, 이미 입금하신 금액은 전액 환불해 드려요.</p></details>
      <details><summary>학교 선택과목표가 없어도 괜찮을까요?</summary><p>선택과목표는 있는 경우에만 보내 주시면 돼요. 없어도 학교생활기록부와 희망 진로를 바탕으로 상담을 진행하니 걱정할 필요 없답니다.</p></details>
      <details><summary>희망 전공이 아직 정해지지 않았어요.</summary><p>고민 중인 후보 전공을 적어 주세요. 후보마다 필요한 과목 흐름을 함께 살펴보고 로드맵에 정리해 드려요.</p></details>
      <details><summary>상담은 어떤 방식으로 진행되나요?</summary><p>40분 온라인 화상 상담으로 진행해요. 신청서에 적어 주신 희망 일정 세 가지를 바탕으로 문자로 일정을 조율하고, 확정된 뒤에는 상담 전날까지 자료를 받아 미리 읽어 둘게요. 상담 진행 기간은 11/25~12/25예요.</p></details>
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

function replaceAttr(html: string, attr: string, value: string): string {
  const pattern = new RegExp(`(${attr}=")[^"]*(")`, 'g');
  return html.replace(pattern, `$1${value}$2`);
}

export function applyCareerCounselingSpaShell(html: string): string {
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
  if (!out.includes('pretendard.min.css')) {
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
  return `${out.slice(0, afterStart)}\n${careerCounselingPrerenderHtml}\n    ${out.slice(rootClose)}`;
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
