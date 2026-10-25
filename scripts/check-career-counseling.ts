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
  EXISTING_HOME_DESCRIPTION,
  KEYWORD_PAGES,
  keywordPageHtml,
  pickRelatedResources,
  resourcePageHtml,
  resourcesHref,
  resourcesIndexHtml,
} from './seo-pages';
import {
  COST_GUIDE,
  JINRO_RELATED_ARTICLES,
  RESOURCES_HREF,
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
assert.equal(careerCounselingPrerenderHtml.includes('class="apply"'), true);
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
assert.equal(applied.includes('top-auth'), true);
assert.equal(applied.includes('로그인'), true);

const withHeroPreload = applyCareerCounselingSpaShell(shell.replace(
  '</head>',
  '<link rel="preload" as="image" type="image/webp" href="/IMG_1441-800.webp" fetchpriority="high" />\n</head>',
));
assert.equal(withHeroPreload.includes('IMG_1441'), false);
assert.equal(withHeroPreload.includes('pretendard-dynamic-subset.min.css'), true);

const withFbPreload = applyCareerCounselingSpaShell(shell.replace(
  '</head>',
  [
    '<link rel="modulepreload" crossorigin href="/assets/site-test.js">',
    '<link rel="modulepreload" crossorigin href="/assets/fb-app-test.js">',
    '<link rel="modulepreload" crossorigin href="/assets/fb-firestore-test.js">',
    '</head>',
  ].join('\n'),
));
assert.equal(withFbPreload.includes('fb-app-test.js'), false);
assert.equal(withFbPreload.includes('fb-firestore-test.js'), false);
assert.equal(withFbPreload.includes('/assets/site-test.js'), true);

for (const page of KEYWORD_PAGES) {
  const html = keywordPageHtml(page);
  assert.equal(PUBLIC_PRICE_RE.test(html), false, `${page.slug} still has a public price`);
  assert.equal(html.includes(COST_GUIDE_PLAIN), true, `${page.slug} is missing the cost guide`);
  assert.equal(html.includes('자료실'), true);
  assert.equal(html.includes('sehyun@sehyunt.re.kr'), true, `${page.slug} is missing the public contact email`);
  assert.equal(html.includes('consultantsyssam@gmail.com'), false, `${page.slug} still has the old contact email`);
}

const saenggibuHtml = keywordPageHtml(KEYWORD_PAGES.find((page) => page.slug === 'saenggibu-consulting')!);
const howIdx = saenggibuHtml.indexOf('생기부 컨설팅은 어떻게 진행되나요?');
const gradeIdx = saenggibuHtml.indexOf('학년별로 무엇을 관리하나요?');
const clubIdx = saenggibuHtml.indexOf('자율탐구보고서·동아리 활동도 학종 기준으로 봅니다');
assert.equal(howIdx !== -1, true);
assert.equal(gradeIdx !== -1, true);
assert.equal(clubIdx !== -1, true);
assert.equal(howIdx < gradeIdx && gradeIdx < clubIdx, true, '학년별 섹션은 진행 방식 다음이어야 합니다');
assert.equal(saenggibuHtml.includes('<h3>고1 — 계열을 정하고 기록의 방향을 잡습니다</h3>'), true);
assert.equal(saenggibuHtml.includes('<h3>고2 — 분야를 좁히고 탐구를 깊게 만듭니다</h3>'), true);
assert.equal(saenggibuHtml.includes('<h3>고3 1학기 — 남은 기록을 채웁니다</h3>'), true);
assert.equal(saenggibuHtml.includes('세특에 학생 자신의 탐구 과정이 드러나도록 수행평가를 준비합니다.'), true);
assert.equal(saenggibuHtml.includes('모든 학년에서 생기부는 매 학기 확인합니다. 무엇이 남았고 무엇이 비었는지 보고, 다음 학기에 채울 것을 정합니다.'), true);
assert.equal(saenggibuHtml.includes('한 학기 200만원 이내'), false);

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
assert.equal(heroSrc.includes('<picture'), true);

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
assert.equal(resourcesSrc.includes('href={`/resources/${item.id}`}'), true);
assert.equal(resourcesSrc.includes('e.preventDefault()'), true);

assert.equal(RESOURCES_HREF, '/resources/');
assert.equal(resourcesHref('고입'), '/resources/#goip');
assert.equal(resourcesHref('대입'), '/resources/#daeip');
assert.equal(resourcesHref(), '/resources/');
assert.equal(appSrc.includes("['자료실', '/resources/']"), true);

const resourcesIndex = resourcesIndexHtml([
  { id: 'goip-1', title: '고입 글 제목', fileType: 'article', category: '고입' },
  { id: 'daeip-1', title: '대입 글 제목', fileType: 'article', category: '대입' },
]);
assert.equal(resourcesIndex.includes('<h1>자료실</h1>'), true);
assert.equal(resourcesIndex.includes(EXISTING_HOME_DESCRIPTION), true);
assert.equal(resourcesIndex.includes('href="/resources/goip-1"'), true);
assert.equal(resourcesIndex.includes('href="/resources/daeip-1"'), true);
assert.equal(resourcesIndex.includes('<link rel="canonical" href="https://sehyunt.re.kr/resources/">'), true);

const relatedOnlyGoip = pickRelatedResources(
  { id: 'goip-1', title: '외고 면접 준비', fileType: 'article', category: '고입' },
  [
    { id: 'goip-1', title: '외고 면접 준비', fileType: 'article', category: '고입' },
    { id: 'goip-2', title: '특목고 면접 질문', fileType: 'article', category: '고입' },
    { id: 'goip-3', title: '자소서 첨삭', fileType: 'article', category: '고입' },
    { id: 'goip-4', title: '중3 자소서', fileType: 'article', category: '고입' },
    { id: 'daeip-1', title: '학종 면접 준비', fileType: 'article', category: '대입' },
  ],
);
assert.equal(relatedOnlyGoip.every((item) => item.category === '고입'), true);
assert.equal(relatedOnlyGoip.some((item) => item.id === 'daeip-1'), false);
assert.equal(relatedOnlyGoip.length >= 3, true);

const articleRelatedHtml = resourcePageHtml(
  { id: 'goip-1', title: '외고 면접 준비', fileType: 'article', content: '본문', category: '고입' },
  relatedOnlyGoip,
);
assert.equal(articleRelatedHtml.includes('href="/resources/goip-2"'), true);
assert.equal(articleRelatedHtml.includes('<a href="/resources/">자료실</a>'), true);

for (const article of JINRO_RELATED_ARTICLES) {
  assert.equal(careerCounselingPrerenderHtml.includes(`/resources/${article.id}`), true);
  assert.equal(careerCounselingPrerenderHtml.includes(article.title), true);
}

const saenggibuRelated = keywordPageHtml(
  KEYWORD_PAGES.find((page) => page.slug === 'saenggibu-consulting')!,
  [{ id: 'rel-1', title: '고2가 끝나기 전에 생기부를 어디까지 채워 두면 고3 1학기가 편해질까: 최상위권 치트키 세연쌤', fileType: 'article', category: '대입' }],
);
assert.equal(saenggibuRelated.includes('href="/resources/rel-1"'), true);

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
assert.equal(ccCss.includes('contain: paint'), true);

const counselingHtmlSrc = fs.readFileSync(path.join(root, 'jinro-counseling/index.html'), 'utf-8');
assert.equal(counselingHtmlSrc.includes('IMG_1441'), false);
assert.equal(counselingHtmlSrc.includes('Noto+Sans+KR'), false);
assert.equal(counselingHtmlSrc.includes('counseling-main.tsx'), true);
assert.equal(counselingHtmlSrc.includes('pretendard-dynamic-subset.min.css'), true);

const counselingMain = fs.readFileSync(path.join(root, 'src/counseling-main.tsx'), 'utf-8');
assert.equal(counselingMain.includes('CareerCounselingPage'), true);
assert.equal(counselingMain.includes('./App'), false);
assert.equal(counselingMain.includes('hydrateRoot'), false);
assert.equal(counselingMain.includes('createRoot'), true);

const authGateSrc = fs.readFileSync(path.join(root, 'src/pages/CareerCounselingAuthGate.tsx'), 'utf-8');
assert.equal(authGateSrc.includes("from '../components/AuthModal'"), true);
assert.equal(authGateSrc.includes("import '../index.css'"), true);

const mainSrc = fs.readFileSync(path.join(root, 'src/main.tsx'), 'utf-8');
assert.equal(mainSrc.includes('CareerCounselingPage'), false);
assert.equal(mainSrc.includes("import App from './App.tsx'"), true);

const sessionSrc = fs.readFileSync(path.join(root, 'src/lib/careerCounselingSession.ts'), 'utf-8');
assert.equal(sessionSrc.includes("import('firebase/firestore')"), false);
assert.equal(sessionSrc.includes("import('./firestoreApi')"), true);

const firestoreApiSrc = fs.readFileSync(path.join(root, 'src/lib/firestoreApi.ts'), 'utf-8');
assert.equal(firestoreApiSrc.includes("from 'firebase/firestore'"), true);
for (const name of ['doc', 'getDoc', 'addDoc', 'collection', 'serverTimestamp']) {
  assert.equal(firestoreApiSrc.includes(name), true, `firestoreApi missing ${name}`);
}

assert.equal(appSrc.includes("aspectRatio: '4 / 5'"), true);
assert.equal(appSrc.includes('aspect-[4/5]'), true);

const ccPageSrc = fs.readFileSync(path.join(root, 'src/pages/CareerCounselingPage.tsx'), 'utf-8');
assert.equal(ccPageSrc.includes("from 'motion/react'"), false);
assert.equal(ccPageSrc.includes("from '../components/AuthModal'"), false);
assert.equal(ccPageSrc.includes("from '../lib/firebase'"), false);
assert.equal(ccPageSrc.includes('CareerCounselingAuthGate'), true);
assert.equal(ccPageSrc.includes('JINRO_RELATED_ARTICLES'), true);

console.log('✅ career counseling checks passed');
