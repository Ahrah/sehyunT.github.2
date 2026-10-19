/**
 * Prerender Home Page Content
 * 
 * Generates static HTML for the home page content to improve SEO.
 * This runs after the main Vite build and injects real content into index.html.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { SITE } from '../src/config/site';
import { ADMISSION_CYCLE, ADMISSION_SOURCE_NOTE, officeWindows, schoolGroups } from '../src/data/admissionDates';
import { programGroups, programRoadmap } from '../src/data/programs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// Extract the static content from the home page
const homePageContent = `
<div class="min-h-screen bg-brand-bg text-brand-text font-sans antialiased">
  <main>
    <!-- Hero Section -->
    <section class="relative overflow-hidden pt-48 pb-32 px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="mb-10 inline-flex items-center gap-2 rounded-sm border-l-2 border-brand-accent bg-brand-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-text">
          학생마다 다른 길을 설계합니다
        </div>
        <h1 class="text-6xl md:text-8xl font-extrabold leading-[1] tracking-tighter mb-8 italic">
          입시에 더해,<br />
          <span class="text-brand-accent not-italic">학생의 다음 STEP을</span> 설계합니다.
        </h1>
        <p class="text-lg md:text-xl text-brand-gray leading-relaxed max-w-xl mb-12 font-normal">
          학생이 자신의 힘으로 성장할 수 있도록, 관심사를 질문으로 바꾸고 여러 관점에서 탐구하며 스스로 연구하는 힘을 기릅니다. 그 생각의 깊이가 학생부 기록에 남고, 면접에서는 짧은 시간 안에도 분명하게 드러나도록 훈련합니다.
        </p>
        <nav aria-label="컨설팅 바로가기" class="flex flex-wrap gap-3">
          <a href="/jinro-counseling/">진로·선택과목 상담</a>
          <a href="/saenggibu-consulting/">생기부 컨설팅</a>
          <a href="/jasoseo-consulting/">자소서 컨설팅</a>
          <a href="/interview-consulting/">면접 컨설팅</a>
        </nav>
        
        <div class="mt-20 grid grid-cols-2 gap-12 border-t border-brand-light-gray pt-12 max-w-lg">
          <div>
            <div class="text-3xl font-black tracking-tighter text-brand-text">8+</div>
            <div class="text-[14px] text-[#71717A] uppercase tracking-[0.2em] mt-2 font-bold">Years Exp</div>
          </div>
          <div>
            <div class="text-3xl font-black tracking-tighter text-brand-text">1:1</div>
            <div class="text-[14px] text-[#71717A] uppercase tracking-[0.2em] mt-2 font-bold">맞춤 컨설팅</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Philosophy Section -->
    <section class="py-40 px-6 lg:px-8 bg-brand-secondary">
      <div class="max-w-7xl mx-auto">
        <p class="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Philosophy</p>
        <h2 class="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-brand-text mb-12">
          좋은 전략은<br />학생을 닮아야 합니다.
        </h2>
        <div class="space-y-12">
          <div>
            <h3 class="text-2xl font-black mb-6 uppercase tracking-tight">깊어지는 탐구</h3>
            <p class="text-xl text-brand-gray leading-relaxed font-normal max-w-2xl">
              넓은 관심사에서 출발해 질문을 좁히고, 자료를 비교하며 한 단계 더 깊은 후속 탐구로 나아갑니다.
            </p>
          </div>
          <div>
            <h3 class="text-2xl font-black mb-6 uppercase tracking-tight">생각을 설명하는 힘</h3>
            <p class="text-xl text-brand-gray leading-relaxed font-normal max-w-2xl">
              결과물을 대신 만들지 않습니다. 학생이 근거를 찾고 판단하고, 자신의 생각을 기록과 말로 설명할 수 있게 훈련합니다.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Programs Section -->
    <section id="programs" class="py-48 px-6 lg:px-12 max-w-7xl mx-auto">
      <div class="mb-16">
        <p class="text-[10px] uppercase tracking-[0.6em] text-brand-accent font-black">Programs</p>
        <h2 class="text-6xl md:text-7xl font-extrabold tracking-[-0.05em] leading-none">학년별로 이어지는 프로그램</h2>
        <p class="text-brand-gray max-w-xl font-normal text-base md:text-lg leading-[1.6] mt-8">
          중1 공부 습관부터 고3 면접까지, 시기에 맞춰 진로·학습·기록·면접을 연결합니다.
        </p>
      </div>
      <h3>학년별 프로그램 로드맵</h3>
      <p>PROGRAM ROADMAP</p>
      <ol>
        ${programRoadmap.map((item) => `<li>${item.period} — ${item.title}${item.steps ? ` → ${item.steps.join(' → ')}` : ''}</li>`).join('\n        ')}
      </ol>
      <p>중3 12월 고입 일정 · 경기도교육청 기준 · 원서 12.4~12.10 · 자소서 12.15~12.16 · 면접 12.17~12.24</p>
      <p>고입 일정은 2027학년도 경기도교육청 기준이며, 학교별 면접일은 요강에서 확인해 주세요.</p>
      <h3>${ADMISSION_CYCLE} 특목·자사고 원서접수 기간</h3>
      <ul>
        ${officeWindows.map((office) => `<li>${office.region}: ${office.apply}${office.note ? ` (${office.note})` : ''}${office.extras ? ` · ${office.extras.map((extra) => `${extra.label} ${extra.value}`).join(', ')}` : ''}</li>`).join('\n        ')}
      </ul>
      ${schoolGroups.map((group) => `
      <h4>${group.label}</h4>
      <ul>
        ${group.schools.map((school) => `<li>${school.name}${school.officePlan ? ' (교육청 기준)' : ''}: 원서 ${school.apply} · 자소서 ${school.essay} · 면접 ${school.interview} · 최종발표 ${school.result}</li>`).join('\n        ')}
      </ul>`).join('\n      ')}
      <p>${ADMISSION_SOURCE_NOTE}</p>
      ${programGroups.map((group) => `
      <div>
        <h3>${group.eyebrow} · ${group.title}</h3>
        <p>${group.intro}</p>
        ${group.cards.map((card) => `<h4>${card.name}</h4><p>${card.period} · ${card.blurb}</p>${card.details.map((detail) => `<p>${detail.content}</p>`).join('')}`).join('\n        ')}
      </div>`).join('\n      ')}
    </section>

    <!-- Strategy Map Section -->
    <section class="bg-brand-text py-40 px-6 lg:px-8 text-brand-bg">
      <div class="max-w-7xl mx-auto">
        <p class="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">How We Work</p>
        <h2 class="text-5xl md:text-7xl font-black tracking-tighter mb-12">합격만이 아닌 오래 남는 성장의 설계도</h2>
        <p class="mb-12">질문을 만들고, 범위를 좁히고, 자료를 비교하고, 직접 설명할 수 있을 때까지 탐구의 깊이를 만듭니다.</p>
        <ol class="space-y-8">
          <li><strong>01 관심사를 살핍니다</strong> — 다양한 진로 분야를 제시하고, 학생의 관심을 바탕으로 진로 방향을 정합니다.</li>
          <li><strong>02 질문을 좁힙니다</strong> — 진로에 맞는 목표 학교와 전형을 정하고, 탐구 주제를 선정합니다.</li>
          <li><strong>03 탐구를 깊게 만듭니다</strong> — 중3 여름방학부터 자기소개서를 첨삭합니다.</li>
          <li><strong>04 직접 연구하고 정리합니다</strong> — 12월 모의면접으로 실전 면접을 준비합니다.</li>
          <li><strong>05 기록하고 말하는 힘으로 남깁니다</strong> — 고등학교 진학 후 학기 단위로 학생부종합전형 생기부를 관리합니다.</li>
        </ol>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="bg-brand-text py-48 px-6 lg:px-8 text-center text-brand-bg">
      <div class="max-w-5xl mx-auto">
        <p class="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-16 md:mb-12">Contact Us</p>
        <h2 class="text-6xl md:text-9xl font-black leading-[0.9] tracking-tighter mb-20 uppercase italic">
          1:1 상담 신청하기
        </h2>
        <div class="flex flex-col sm:flex-row justify-center gap-8 mb-32">
          <a href="${SITE.consultUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 max-w-xs">
            <button class="w-full py-10 text-xl font-black uppercase rounded-none bg-white text-black hover:bg-brand-accent hover:text-white transition-all duration-700 border border-white">
              상담 신청
            </button>
          </a>
          <a href="${SITE.naverBlogUrl}" target="_blank" rel="noopener noreferrer" class="flex-1 max-w-xs">
            <button class="w-full py-10 text-xl font-black uppercase rounded-none bg-transparent text-white border-2 border-white hover:bg-white hover:text-brand-text transition-all duration-700">
              Official Blog
            </button>
          </a>
        </div>
        <div class="flex flex-wrap justify-center gap-8 md:gap-16 text-brand-bg/70 text-[11px] md:text-[14px] font-black uppercase tracking-[0.15em] md:tracking-[0.3em]">
          <div class="flex items-center gap-2 md:gap-4">이메일: ${SITE.email}</div>
          <div class="flex items-center gap-2 md:gap-4">인스타그램: ${SITE.instagramHandle}</div>
        </div>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="py-24 sm:py-32 px-6 lg:px-8 border-t border-brand-light-gray bg-brand-bg">
    <div class="max-w-7xl mx-auto">
      <div class="mb-8">
        <div class="text-3xl sm:text-4xl font-black tracking-tighter">SEHYUN T</div>
        <p class="text-brand-gray max-w-sm leading-relaxed font-normal text-sm sm:text-base mt-4">
          Premium Admissions Strategy & Self-Directed Learning Lab. 
          특목고 입시와 학생부종합전형, 1:1 전략 컨설팅 입시는세연쌤
        </p>
      </div>
      <nav aria-label="컨설팅 안내" class="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-sm font-black">
        <a href="/jinro-counseling/">진로·선택과목 상담</a>
        <a href="/saenggibu-consulting/">생기부 컨설팅</a>
        <a href="/jasoseo-consulting/">자소서 컨설팅</a>
        <a href="/interview-consulting/">면접 컨설팅</a>
      </nav>
      <div class="mt-16 sm:mt-24 pt-8 border-t border-brand-light-gray/70 text-[14px] sm:text-[15px] text-[#71717A] space-y-2">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span><strong class="font-bold text-brand-text">상호명:</strong> ${SITE.name}</span>
          <span><strong class="font-bold text-brand-text">사업자등록번호:</strong> ${SITE.businessNumber}</span>
          <span><strong class="font-bold text-brand-text">대표:</strong> ${SITE.founder}</span>
          <span><strong class="font-bold text-brand-text">이메일:</strong> ${SITE.email}</span>
        </div>
        <p class="text-[14px] sm:text-[14px] text-[#71717A] font-normal">
          입시 전략 컨설팅 · 고입/대입 학종 로드맵 · 1:1 자기주도학습 코칭
        </p>
      </div>
      <div class="mt-8 pt-8 border-t border-brand-light-gray">
        <p class="text-[#71717A] text-[13px] sm:text-[13px] tracking-[0.3em] font-black uppercase text-center">
          © 2026 SEHYUN T. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  </footer>
</div>
`;

function injectPrerenderedContent() {
  console.log('📄 Injecting prerendered content into index.html...');

  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error('❌ index.html not found at:', INDEX_HTML_PATH);
    process.exit(1);
  }

  let html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');

  // Find the root div and inject content before the script tag
  // The pattern: <div id="root"></div> or <div id="root">...</div>
  const rootDivPattern = /(<div id="root">)([\s\S]*?)(<\/div>)/;
  
  if (rootDivPattern.test(html)) {
    // Inject the prerendered content into the root div
    html = html.replace(
      rootDivPattern,
      `$1${homePageContent}$3`
    );

    fs.writeFileSync(INDEX_HTML_PATH, html);
    console.log('✅ Successfully injected prerendered content into index.html');
  } else {
    console.error('❌ Could not find root div in index.html');
    process.exit(1);
  }
}

injectPrerenderedContent();
