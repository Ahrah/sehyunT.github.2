import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyCareerCounselingSpaShell,
  assertNoSensitiveCopy,
  CAREER_COUNSELING_CANONICAL,
  CAREER_COUNSELING_TITLE,
  careerCounselingPrerenderHtml,
} from './career-counseling-prerender';
import {
  COST_GUIDE_PLAIN,
  KEYWORD_PAGES,
  keywordPageHtml,
  resourcePageHtml,
} from './seo-pages';
import {
  COST_GUIDE,
  isAllowedRegion,
  isCareerCounselingPath,
  isValidMobile,
  validateCareerCounselingForm,
} from '../src/lib/careerCounseling';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf-8');

const PUBLIC_PRICE_RE = /만원|60,?000\s*원|"price"\s*:/;

assertNoSensitiveCopy(careerCounselingPrerenderHtml);
assert.equal(careerCounselingPrerenderHtml.includes('경기도 성남시 수정구 창업로 43, 81호'), true);
assert.equal(careerCounselingPrerenderHtml.includes(COST_GUIDE), true);
assert.equal(PUBLIC_PRICE_RE.test(careerCounselingPrerenderHtml), false);
assert.equal(/농협|국민은행|우리은행|신한은행|\d{2,3}-\d{2}-\d{6}/.test(careerCounselingPrerenderHtml), false);

const shell = `<!doctype html><html><head>
<title>old</title>
<meta name="description" content="old" />
<link rel="canonical" href="https://sehyunt.re.kr/" />
<script type="application/ld+json">{"@type":"WebSite"}</script>
<script type="module" src="/assets/index.js"></script>
</head><body>
<div id="root"><div>home</div></div>
</body></html>`;

const applied = applyCareerCounselingSpaShell(shell);
assert.equal(applied.includes(CAREER_COUNSELING_TITLE), true);
assert.equal(applied.includes(CAREER_COUNSELING_CANONICAL), true);
assert.equal(applied.includes('온라인 진로·선택과목 상담'), true);
assert.equal(applied.includes('<div>home</div>'), false);
assert.equal(PUBLIC_PRICE_RE.test(applied), false);

for (const page of KEYWORD_PAGES) {
  const html = keywordPageHtml(page);
  assert.equal(PUBLIC_PRICE_RE.test(html), false, `${page.slug} still has a public price`);
  assert.equal(html.includes(COST_GUIDE_PLAIN), true, `${page.slug} is missing the cost guide`);
  assert.equal(html.includes('자료실'), true);
}

const membersOnlyHtml = resourcePageHtml({
  id: 'secret-price-faq',
  title: '회원 전용 비용 FAQ',
  description: '한 학기 200만원 이내. 자소서 약 100만원.',
  fileType: 'article',
  content: '[H]비용[/H]\n한 학기 200만원 이내입니다. 자기소개서 완성까지 약 100만원.',
  membersOnly: true,
  category: '대입',
});
assert.equal(membersOnlyHtml.includes('200만원'), false);
assert.equal(membersOnlyHtml.includes('100만원'), false);
assert.equal(membersOnlyHtml.includes('회원 전용'), true);
assert.equal(membersOnlyHtml.includes('한 학기 200만원 이내. 자소서 약 100만원.'), false);

assert.equal(isCareerCounselingPath('/jinro-counseling/'), true);
assert.equal(isCareerCounselingPath('/jinro-counseling'), true);
assert.equal(isCareerCounselingPath('/'), false);
assert.equal(isAllowedRegion('부산광역시'), true);
assert.equal(isAllowedRegion('서울특별시'), false);
assert.equal(isValidMobile('010-5308-6879'), true);
assert.equal(isValidMobile('02-123-4567'), false);

const valid = validateCareerCounselingForm({
  userId: 'u1',
  email: 'a@b.c',
  childName: '학생',
  schoolName: '부산고등학교',
  schoolRegion: '부산광역시',
  grade: '고1',
  careerGoal: '컴퓨터공학',
  preferredSlots: [
    { date: '2026-11-25', time: '15:00' },
    { date: '2026-12-01', time: '19:00' },
    { date: '2026-12-25', time: '23:00' },
  ],
  phone: '01012345678',
  question: '',
  eligibilityConfirmed: true,
  privacyAgreed: true,
});
assert.equal(valid, null);

const blocked = validateCareerCounselingForm({
  userId: 'u1',
  email: 'a@b.c',
  childName: '학생',
  schoolName: '서울고등학교',
  schoolRegion: '서울특별시',
  grade: '고1',
  careerGoal: '컴퓨터공학',
  preferredSlots: [
    { date: '2026-11-25', time: '15:00' },
    { date: '2026-12-01', time: '19:00' },
    { date: '2026-12-25', time: '23:00' },
  ],
  phone: '01012345678',
  question: '',
  eligibilityConfirmed: true,
  privacyAgreed: true,
});
assert.equal(typeof blocked, 'string');

assert.equal(rules.includes('match /careerCounselingApplications/{applicationId}'), true);
assert.equal(rules.includes('ahrah0365@gmail.com'), true);
assert.equal(/match \/resourceBodies\/\{itemId\}[\s\S]*?allow read: if isSignedIn\(\);/.test(rules), true);

console.log('✅ career counseling checks passed');
