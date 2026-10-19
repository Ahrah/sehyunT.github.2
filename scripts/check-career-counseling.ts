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
  assert.equal(html.includes('sehyun@sehyunt.re.kr'), true, `${page.slug} is missing the public contact email`);
  assert.equal(html.includes('consultantsyssam@gmail.com'), false, `${page.slug} still has the old contact email`);
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

const root = path.join(__dirname, '..');
const indexCss = fs.readFileSync(path.join(root, 'src/index.css'), 'utf-8');
assert.equal(indexCss.includes('fonts.googleapis.com'), false);
assert.equal(indexCss.includes('Inter'), false);
assert.equal(indexCss.includes('--color-brand-gray: #555555'), true);

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
assert.equal(indexHtml.includes('rel="preconnect"'), true);
assert.equal(indexHtml.includes('family=Noto+Sans+KR'), true);
assert.equal(indexHtml.includes('display=swap'), true);

const appSrc = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf-8');
const heroStart = appSrc.indexOf('relative overflow-hidden px-6 pb-24');
const heroEnd = appSrc.indexOf('<ProgramsSection');
const heroSrc = appSrc.slice(heroStart, heroEnd === -1 ? appSrc.indexOf('id="about"') : heroEnd);
assert.equal(heroSrc.includes('whileInView'), false);
assert.equal(heroSrc.includes('opacity: 0'), false);
assert.equal(heroSrc.includes('<picture>'), true);

const programsPublic = [
  fs.readFileSync(path.join(root, 'src/data/programs.ts'), 'utf-8'),
  fs.readFileSync(path.join(root, 'src/data/admissionDates.ts'), 'utf-8'),
  fs.readFileSync(path.join(root, 'src/components/ProgramsSection.tsx'), 'utf-8'),
  fs.readFileSync(path.join(root, 'src/components/ProgramRoadmap.tsx'), 'utf-8'),
].join('\n');
assert.equal(programsPublic.includes('학년별 프로그램 로드맵'), true);
assert.equal(programsPublic.includes('PROGRAM ROADMAP'), true);
assert.equal(programsPublic.includes('중1부터 고3까지, 시기별로 맡는 프로그램'), false);
assert.equal(programsPublic.includes('경기도교육청 기준'), true);
assert.equal(programsPublic.includes('학교별 면접일은 요강에서 확인해 주세요'), true);
assert.equal(PUBLIC_PRICE_RE.test(programsPublic), false, 'programs section added a public price');
assert.equal(programsPublic.includes('김포외고'), true);
assert.equal(programsPublic.includes('미확정(학교 요강 확인 전)'), false);
assert.equal(programsPublic.includes('12.4~12.10 17:00(인터넷)'), true);
assert.equal(programsPublic.includes('3:1 모의면접'), true);

const resourcesSrc = fs.readFileSync(path.join(root, 'src/components/ResourcesSection.tsx'), 'utf-8');
assert.equal(resourcesSrc.includes('hover:bg-blue'), false);
assert.equal(resourcesSrc.includes('SITE.kakaoChannelUrl'), true);

const siteSrc = fs.readFileSync(path.join(root, 'src/config/site.ts'), 'utf-8');
assert.equal(siteSrc.includes('pf.kakao.com/_xbijSX'), true);
assert.equal(siteSrc.includes('sehyun@sehyunt.re.kr'), true);
assert.equal(siteSrc.includes("adminEmail: 'ahrah0365@gmail.com'"), true);
assert.equal(indexHtml.includes('sehyun@sehyunt.re.kr'), true);
assert.equal(careerCounselingPrerenderHtml.includes('sehyun@sehyunt.re.kr'), true);
assert.equal(careerCounselingPrerenderHtml.includes('consultantsyssam@gmail.com'), false);
assert.equal(indexHtml.includes('consultantsyssam@gmail.com'), false);
assert.equal(siteSrc.includes('consultantsyssam@gmail.com'), false);

const ccCss = fs.readFileSync(path.join(root, 'src/pages/career-counseling.css'), 'utf-8');
assert.equal(ccCss.includes('@import'), false);

console.log('✅ career counseling checks passed');
