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
  JASOSEO_COST_PLAIN,
  KEYWORD_PAGES,
  keywordPageHtml,
  resourcePageHtml,
} from './seo-pages';
import {
  CONSULT_DATE_MAX,
  CONSULT_TIMES,
  COST_GUIDE,
  GRADES,
  SCHOOL_REGIONS,
  careerCounselingStatusLabel,
  consultDateMin,
  consultSlotHint,
  formatKstDateTime,
  formatPreferredSlots,
  isCareerCounselingPath,
  isConsultDate,
  isKnownSchoolRegion,
  isValidMobile,
  nextCareerCounselingStatus,
  validateCareerCounselingForm,
  type CareerCounselingApplicationInput,
} from '../src/lib/careerCounseling';
import { buildCareerCounselingNotifyPayload } from '../src/lib/careerCounselingNotify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rules = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf-8');

const PUBLIC_PRICE_RE = /만원|60,?000\s*원|"price"\s*:/;

assertNoSensitiveCopy(careerCounselingPrerenderHtml);
assert.equal(careerCounselingPrerenderHtml.includes('경기도 성남시 수정구 창업로 43, 81호'), true);
assert.equal(careerCounselingPrerenderHtml.includes(COST_GUIDE), true);
assert.equal(careerCounselingPrerenderHtml.includes('11월 10일부터 신청 가능합니다.'), false);
assert.equal(careerCounselingPrerenderHtml.includes('class="apply"'), true);
assert.equal(careerCounselingPrerenderHtml.includes('40분'), false);
assert.equal(careerCounselingPrerenderHtml.includes('비수도권'), false);
assert.equal(careerCounselingPrerenderHtml.includes('59.5'), false);
assert.equal(careerCounselingPrerenderHtml.includes('23:00'), false);
assert.equal(careerCounselingPrerenderHtml.includes('진로 컨설팅'), true);
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
assert.equal(applied.includes('진로 컨설팅'), true);
assert.equal(applied.includes('온라인 진로·선택과목 상담'), false);
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
  assert.equal(html.includes('>진로 컨설팅<'), true, `${page.slug} top nav missing renamed label`);
  assert.equal(html.includes('>비수도권 진로 상담<'), false, `${page.slug} still uses the old nav label`);
  assert.equal(html.includes('>협업 문의<'), true, `${page.slug} top nav missing collab inquiry`);
  assert.equal(html.includes('href="https://booking.kakao.com/short/s-yFjEtAaK"'), true);
  assert.equal(html.includes('class="quiet" href="https://booking.kakao.com/short/s-yFjEtAaK" target="_blank" rel="noopener"'), true);
  assert.equal(PUBLIC_PRICE_RE.test(html), false, `${page.slug} still has a public price`);
  if (page.slug === 'jasoseo-consulting') {
    assert.equal(html.includes(COST_GUIDE_PLAIN), false, 'jasoseo page still points parents to the members archive for the price');
    assert.equal(html.includes(JASOSEO_COST_PLAIN), true);
    assert.equal(html.includes('진로 상담'), false);
    assert.equal(html.includes('진로 컨설팅부터'), true);
    assert.equal(html.includes('진로 컨설팅에서는 무엇을 하나요?'), true);
    assert.equal(html.includes('진학 상담부터 합니다.'), true);
  } else {
    assert.equal(html.includes(COST_GUIDE_PLAIN), true, `${page.slug} is missing the cost guide`);
  }
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
assert.equal(SCHOOL_REGIONS.length, 17);
assert.equal(isKnownSchoolRegion('부산광역시'), true);
assert.equal(isKnownSchoolRegion('서울특별시'), true);
assert.equal(isKnownSchoolRegion('경기도'), true);
assert.equal(isKnownSchoolRegion('인천광역시'), true);
assert.equal(isKnownSchoolRegion('제주특별자치도'), true);
assert.equal(isKnownSchoolRegion('해외'), false);
assert.deepEqual([...GRADES], ['중1', '중2', '중3', '고1']);
assert.equal((GRADES as readonly string[]).includes('고2'), false);
assert.equal(CONSULT_TIMES.at(-1), '22:00');
assert.equal((CONSULT_TIMES as readonly string[]).includes('23:00'), false);
assert.equal(isValidMobile('010-5308-6879'), true);
assert.equal(isValidMobile('02-123-4567'), false);

const appliedAt = Date.parse('2026-10-29T03:00:00.000Z');
assert.equal(consultDateMin(appliedAt), '2026-11-01');
assert.equal(consultSlotHint(appliedAt).includes('2026-11-01부터 2027-02-28까지'), true);
assert.equal(consultSlotHint(appliedAt).includes('2026-11-25'), false);
assert.equal(isConsultDate('2026-11-01', appliedAt), true);
assert.equal(isConsultDate('2026-10-31', appliedAt), false);
assert.equal(isConsultDate('2027-02-28', appliedAt), true);
assert.equal(isConsultDate('2027-03-01', appliedAt), false);
assert.equal(CONSULT_DATE_MAX, '2027-02-28');

const slots = [
  { date: '2026-11-25', time: '15:00' },
  { date: '2026-12-01', time: '19:00' },
  { date: '2026-12-25', time: '22:00' },
] as CareerCounselingApplicationInput['preferredSlots'];

const sample = (overrides: Partial<CareerCounselingApplicationInput> = {}): CareerCounselingApplicationInput => ({
  userId: 'u1',
  email: 'a@b.c',
  childName: '학생',
  schoolName: '서울중학교',
  schoolRegion: '서울특별시',
  grade: '중3',
  careerGoal: '컴퓨터공학',
  preferredSlots: slots,
  phone: '01012345678',
  question: '',
  privacyAgreed: true,
  ...overrides,
});

assert.equal(validateCareerCounselingForm(sample(), appliedAt), null);
assert.equal(validateCareerCounselingForm(sample({ grade: '중1' }), appliedAt), null);
assert.equal(validateCareerCounselingForm(sample({ grade: '중2' }), appliedAt), null);
assert.equal(validateCareerCounselingForm(sample({ schoolRegion: '부산광역시', grade: '고1' }), appliedAt), null);
assert.equal(typeof validateCareerCounselingForm(sample({ schoolRegion: '해외' }), appliedAt), 'string');
assert.equal(typeof validateCareerCounselingForm(sample({ grade: '고2' as CareerCounselingApplicationInput['grade'] }), appliedAt), 'string');
assert.equal(typeof validateCareerCounselingForm(sample({
  preferredSlots: [
    { date: '2026-11-25', time: '15:00' },
    { date: '2026-12-01', time: '19:00' },
    { date: '2026-12-25', time: '23:00' },
  ],
}), appliedAt), 'string');
assert.equal(typeof validateCareerCounselingForm(sample({
  preferredSlots: [
    { date: '2026-10-31', time: '15:00' },
    { date: '2026-12-01', time: '19:00' },
    { date: '2026-12-25', time: '22:00' },
  ],
}), appliedAt), 'string');
assert.equal(validateCareerCounselingForm(sample({
  preferredSlots: [
    { date: '2026-11-01', time: '15:00' },
    { date: '2027-01-15', time: '18:00' },
    { date: '2027-02-28', time: '22:00' },
  ],
}), appliedAt), null);

assert.equal(rules.includes('match /careerCounselingApplications/{applicationId}'), true);
assert.equal(rules.includes('ahrah0365@gmail.com'), true);
assert.equal(/match \/resourceBodies\/\{itemId\}[\s\S]*?allow read: if isSignedIn\(\);/.test(rules), true);
const counselingRules = rules.slice(rules.indexOf('match /careerCounselingApplications/{applicationId}'));
assert.equal(counselingRules.includes('allow read:'), false);
assert.equal(counselingRules.includes('allow list: if isAdmin();'), true);
assert.equal(counselingRules.includes("request.resource.data.status == 'submitted'"), true);
assert.equal(counselingRules.includes("hasOnly(['status', 'updatedAt'])"), true);
assert.equal(counselingRules.includes("request.resource.data.status in ['submitted', 'contacted']"), true);
assert.equal(counselingRules.includes("!('notifyFailed' in request.resource.data)"), true);
assert.equal(counselingRules.includes("hasOnly(['notifyFailed'])"), true);
assert.equal(counselingRules.includes('request.resource.data.notifyFailed == true'), true);
assert.equal(counselingRules.includes("!('notifyFailed' in resource.data)"), true);

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
assert.equal(programsPublic.includes('온라인 1회 1시간 · 10만 원'), true);
assert.equal(programsPublic.includes("period: '중1~고1'"), true);
assert.equal(programsPublic.includes('period="중1~고1"'), true);
assert.equal(programsPublic.includes('중3~고1'), false);

const roadmapCss = fs.readFileSync(path.join(root, 'src/index.css'), 'utf-8');
assert.match(
  roadmapCss,
  /\.program-map-cell--career \{\s*grid-column: b1;\s*grid-row: r1 \/ r7;\s*\}/,
);
assert.equal(roadmapCss.includes('.program-map-cell--career { grid-column: b1; grid-row: r3 / r7; }'), false);

const roadmapSrc = fs.readFileSync(path.join(root, 'src/components/ProgramRoadmap.tsx'), 'utf-8');
const stackSrc = roadmapSrc.slice(roadmapSrc.indexOf('className="program-map-stack"'));
const middle12Start = stackSrc.indexOf('중1 · 중2');
const middle12NextPhase = stackSrc.indexOf('program-map-stack-phase', middle12Start);
const middle12Row = stackSrc.slice(middle12Start, middle12NextPhase === -1 ? undefined : middle12NextPhase);
assert.equal(middle12Row.includes('진로 컨설팅'), true);
assert.equal(middle12Row.includes('period="중1~고1"'), true);
assert.equal(programsPublic.includes('40분'), false);
assert.equal(programsPublic.includes('비수도권'), false);

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
assert.equal(ccCss.includes('contain: paint'), true);

const counselingHtmlSrc = fs.readFileSync(path.join(root, 'jinro-counseling/index.html'), 'utf-8');
assert.equal(counselingHtmlSrc.includes('IMG_1441'), false);
assert.equal(counselingHtmlSrc.includes('Noto+Sans+KR'), false);
assert.equal(counselingHtmlSrc.includes('counseling-main.tsx'), true);
assert.equal(counselingHtmlSrc.includes('pretendard-dynamic-subset.min.css'), true);
assert.equal(counselingHtmlSrc.includes('진로 컨설팅 (중1~고1 온라인) | 입시는세연쌤'), true);
assert.equal(counselingHtmlSrc.includes('중3~고1'), false);
assert.equal(counselingHtmlSrc.includes('중1~고1 진로 컨설팅.'), true);
assert.equal(counselingHtmlSrc.includes('"name":"진로 컨설팅"'), true);
assert.equal(counselingHtmlSrc.includes('온라인 진로·선택과목 상담'), false);
assert.equal(counselingHtmlSrc.includes('40분'), false);
assert.equal(counselingHtmlSrc.includes('비수도권'), false);

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
const addDocAt = sessionSrc.indexOf('await addDoc');
const tryAt = sessionSrc.indexOf('try {', addDocAt);
const notifyAt = sessionSrc.indexOf('await notifyCareerCounselingApplication');
assert.equal(addDocAt !== -1 && tryAt > addDocAt && notifyAt > tryAt, true);
assert.equal(sessionSrc.slice(addDocAt, tryAt).includes('catch'), false);
assert.equal(sessionSrc.slice(notifyAt).includes('catch (err)'), true);
assert.equal(sessionSrc.slice(notifyAt).includes('notifyFailed: true'), true);
assert.equal(sessionSrc.slice(notifyAt).includes('throw'), false);

const notifySrc = fs.readFileSync(path.join(root, 'src/lib/careerCounselingNotify.ts'), 'utf-8');
assert.equal(notifySrc.includes('https://formsubmit.co/ajax/${CAREER_COUNSELING_NOTIFY_EMAIL}'), true);
assert.equal(notifySrc.includes("CAREER_COUNSELING_NOTIFY_EMAIL = 'consultantsyssam@gmail.com'"), true);
assert.equal(notifySrc.includes('[입시는세연쌤] 새 진로 컨설팅 신청 -'), true);
assert.equal(fs.readFileSync(path.join(root, 'src/lib/careerCounseling.ts'), 'utf-8').includes('consultantsyssam@gmail.com'), false);
assert.equal(fs.readFileSync(path.join(root, 'scripts/career-counseling-prerender.ts'), 'utf-8').includes('careerCounselingNotify'), false);

const notifyPayload = buildCareerCounselingNotifyPayload({
  userId: 'uid-1',
  email: 'parent@example.com',
  childName: '김세연',
  schoolName: '○○고등학교',
  schoolRegion: '경기도',
  grade: '고1',
  careerGoal: '생명과학',
  preferredSlots: [
    { date: '2026-11-20', time: '15:00' },
    { date: '2026-11-21', time: '19:00' },
    { date: '2026-11-22', time: '22:00' },
  ],
  phone: '010-5308-6879',
  question: '과목 선택이 고민이에요',
  privacyAgreed: true,
  productName: '진로 컨설팅',
  price: 100000,
  status: 'submitted',
}, new Date('2026-10-29T04:52:07.000Z'), 'app-1');
assert.equal(notifyPayload._subject, '[입시는세연쌤] 새 진로 컨설팅 신청 - 김세연');
assert.equal(notifyPayload._replyto, 'parent@example.com');
assert.equal(notifyPayload.학생_이름, '김세연');
assert.equal(notifyPayload.학년, '고1');
assert.equal(notifyPayload.재학_학교, '○○고등학교');
assert.equal(notifyPayload.학교_소재, '경기도');
assert.equal(notifyPayload.휴대폰, '010-5308-6879');
assert.equal(notifyPayload.희망_진로, '생명과학');
assert.equal(notifyPayload.질문, '과목 선택이 고민이에요');
assert.equal(notifyPayload.희망_일정, formatPreferredSlots([
  { date: '2026-11-20', time: '15:00' },
  { date: '2026-11-21', time: '19:00' },
  { date: '2026-11-22', time: '22:00' },
]));
assert.equal(notifyPayload.신청_시각_KST, '2026-10-29 13:52:07 KST');
assert.equal(notifyPayload.상태, '신규');
assert.equal(notifyPayload.신청_ID, 'app-1');
assert.equal(notifyPayload.금액, '100,000원');
assert.equal(careerCounselingStatusLabel('contacted'), '연락함');
assert.equal(nextCareerCounselingStatus('submitted'), 'contacted');
assert.equal(nextCareerCounselingStatus('contacted'), 'submitted');
assert.equal(formatKstDateTime(new Date('2026-10-29T15:00:00.000Z')), '2026-10-30 00:00 KST');

const firestoreApiSrc = fs.readFileSync(path.join(root, 'src/lib/firestoreApi.ts'), 'utf-8');
assert.equal(firestoreApiSrc.includes("from 'firebase/firestore'"), true);
for (const name of ['doc', 'getDoc', 'addDoc', 'collection', 'serverTimestamp', 'updateDoc']) {
  assert.equal(firestoreApiSrc.includes(name), true, `firestoreApi missing ${name}`);
}

assert.equal(appSrc.includes("['진로 컨설팅', '/jinro-counseling/']"), true);
assert.equal(appSrc.includes('협업 문의'), true);
assert.equal(appSrc.includes('SITE.collabInquiryUrl'), true);
assert.equal(appSrc.includes('rel="noopener"'), true);
const siteSrcForCollab = fs.readFileSync(path.join(root, 'src/config/site.ts'), 'utf-8');
assert.equal(siteSrcForCollab.includes("collabInquiryUrl: 'https://booking.kakao.com/short/s-yFjEtAaK'"), true);
const adminSrc = fs.readFileSync(path.join(root, 'src/components/AdminDashboard.tsx'), 'utf-8');
assert.equal(adminSrc.includes('메일 실패'), true);
assert.equal(adminSrc.includes('notifyFailed'), true);
const careerCopy = fs.readFileSync(path.join(root, 'src/lib/careerCounseling.ts'), 'utf-8');
assert.equal(careerCopy.includes('중3~고1'), false);
assert.equal(careerCopy.includes('중1~고1'), true);
assert.equal(careerCopy.includes('10만 원'), true);
assert.equal(appSrc.includes("['비수도권 진로 상담', '/jinro-counseling/']"), false);
assert.equal(appSrc.includes("['진로 상담', '/jinro-counseling/']"), false);
assert.equal(appSrc.includes("aspectRatio: '4 / 5'"), true);
assert.equal(appSrc.includes('aspect-[4/5]'), true);

const ccPageSrc = fs.readFileSync(path.join(root, 'src/pages/CareerCounselingPage.tsx'), 'utf-8');
assert.equal(ccPageSrc.includes("from 'motion/react'"), false);
assert.equal(ccPageSrc.includes("from '../components/AuthModal'"), false);
assert.equal(ccPageSrc.includes("from '../lib/firebase'"), false);
assert.equal(ccPageSrc.includes('CareerCounselingAuthGate'), true);
assert.equal(ccPageSrc.includes('eligibilityConfirmed'), false);
assert.equal(ccPageSrc.includes('59.5'), false);
assert.equal(ccPageSrc.includes('40분'), false);

const deployYml = fs.readFileSync(path.join(root, '.github/workflows/deploy.yml'), 'utf-8');
assert.equal(deployYml.includes("cron: '17 18 * * *'"), true);
assert.equal(deployYml.includes('5 15 9 11'), false);
assert.equal(deployYml.includes('CAREER_COUNSELING_OPEN_AT'), false);

console.log('✅ career counseling checks passed');
