/**
 * Prerender Home Page Content
 * 
 * Generates static HTML for the home page content to improve SEO.
 * This runs after the main Vite build and injects real content into index.html.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
          입시가 아니라,<br />
          <span class="text-brand-accent not-italic">학생의 다음</span>을 설계합니다.
        </h1>
        <p class="text-lg md:text-xl text-brand-gray leading-relaxed max-w-xl mb-12 font-light">
          진로·학습·기록·면접을 따로 보지 않습니다. 학생이 자기 힘으로 성장할 수 있도록 하나의 흐름으로 연결합니다.
        </p>
        <nav aria-label="컨설팅 바로가기" class="flex flex-wrap gap-3">
          <a href="/saenggibu-consulting/">생기부 컨설팅</a>
          <a href="/jasoseo-consulting/">자소서 컨설팅</a>
          <a href="/interview-consulting/">면접 컨설팅</a>
        </nav>
        
        <div class="mt-20 grid grid-cols-2 gap-12 border-t border-brand-light-gray pt-12 max-w-lg">
          <div>
            <div class="text-3xl font-black tracking-tighter text-brand-text">07+</div>
            <div class="text-[14px] text-[#71717A] uppercase tracking-[0.2em] mt-2 font-bold">Years Exp</div>
          </div>
          <div>
            <div class="text-3xl font-black tracking-tighter text-brand-text">1:1</div>
            <div class="text-[14px] text-[#71717A] uppercase tracking-[0.2em] mt-2 font-bold">Customized</div>
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
            <h3 class="text-2xl font-black mb-6 uppercase tracking-tight">연결된 성장</h3>
            <p class="text-xl text-brand-gray leading-relaxed font-light max-w-2xl">
              진로, 수업, 탐구와 기록이 하나의 맥락 안에서 이어지도록 설계합니다.
            </p>
          </div>
          <div>
            <h3 class="text-2xl font-black mb-6 uppercase tracking-tight">학생의 주도권</h3>
            <p class="text-xl text-brand-gray leading-relaxed font-light max-w-2xl">
              결과물을 대신 만들기보다 학생이 이해하고 선택하고 말하는 힘을 키웁니다.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Programs Section -->
    <section class="py-48 px-6 lg:px-12 max-w-7xl mx-auto">
      <div class="mb-32">
        <p class="text-[10px] uppercase tracking-[0.6em] text-brand-accent font-black">Programs</p>
        <h2 class="text-6xl md:text-7xl font-extrabold tracking-[-0.05em] leading-none">지금 필요한 한 가지부터</h2>
        <p class="text-brand-gray max-w-sm font-light text-base md:text-lg leading-[1.6] mt-8 italic">
          단순한 입시 관리가 아닌, 체계적인 분석을 기반으로 한 맞춤형 솔루션.
        </p>
      </div>

      <div class="space-y-16">
        <!-- Career & Middle -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">진로·고입 전략</h3>
          <p class="text-brand-gray">중학생 시기는 성적 향상을 넘어, 자신의 흥미와 학습 방식을 발견하는 골든타임입니다.</p>
        </div>

        <!-- Learning Coaching -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">자기주도학습</h3>
          <p class="text-brand-gray">모두에게 맞는 공부법은 없습니다. 학생의 패턴에 최적화된 공부 엔진을 설계합니다.</p>
        </div>

        <!-- Specialized Prep -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">자소서·면접</h3>
          <p class="text-brand-gray">자기소개서 집중 컨설팅, 면접 대비, 공통문항 특강을 통한 완벽한 입시 준비.</p>
        </div>

        <!-- Student Record -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">생기부·수시 전략</h3>
          <p class="text-brand-gray">학생부종합전형 통합 컨설팅 및 수시 지원 전략으로 합격을 설계합니다.</p>
        </div>
      </div>
    </section>

    <!-- Strategy Map Section -->
    <section class="bg-brand-text py-40 px-6 lg:px-8 text-brand-bg">
      <div class="max-w-7xl mx-auto">
        <p class="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Sehyun T Strategy Map</p>
        <h2 class="text-5xl md:text-7xl font-black tracking-tighter mb-12">합격보다 오래 남는 성장의 설계도</h2>
        <ol class="space-y-8">
          <li><strong>01 학생을 읽습니다</strong> — 관심사, 학습 습관과 경험을 입체적으로 봅니다.</li>
          <li><strong>02 핵심 질문을 찾습니다</strong> — 선택과 보완 지점을 선명하게 정리합니다.</li>
          <li><strong>03 성장의 흐름을 설계합니다</strong> — 진로, 교과, 탐구와 기록을 연결합니다.</li>
          <li><strong>04 학생의 언어로 실행합니다</strong> — 이해하고 말할 수 있는 활동과 학습 루틴으로 옮깁니다.</li>
          <li><strong>05 끝까지 점검하고 다듬습니다</strong> — 실행 결과와 다음 선택까지 정교화합니다.</li>
        </ol>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="bg-brand-text py-48 px-6 lg:px-8 text-center text-brand-bg">
      <div class="max-w-5xl mx-auto">
        <p class="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-16 md:mb-12">Contact Us</p>
        <h2 class="text-6xl md:text-9xl font-black leading-[0.9] tracking-tighter mb-20 uppercase italic">
          학생의 다음 장면을<br />
          <span class="text-brand-accent not-italic">함께 설계해볼까요?</span>
        </h2>
        <div class="flex flex-col sm:flex-row justify-center gap-8 mb-32">
          <a href="https://tally.so/r/KYrWDz" target="_blank" rel="noopener noreferrer" class="flex-1 max-w-xs">
            <button class="w-full py-10 text-xl font-black uppercase rounded-none bg-white text-black hover:bg-brand-accent hover:text-white transition-all duration-700 border border-white">
              Get Consult
            </button>
          </a>
          <a href="https://blog.naver.com/ahrahsehyun" target="_blank" rel="noopener noreferrer" class="flex-1 max-w-xs">
            <button class="w-full py-10 text-xl font-black uppercase rounded-none bg-transparent text-white border-2 border-white hover:bg-white hover:text-brand-text transition-all duration-700">
              Official Blog
            </button>
          </a>
        </div>
        <div class="flex flex-wrap justify-center gap-8 md:gap-16 text-brand-bg/70 text-[11px] md:text-[14px] font-black uppercase tracking-[0.15em] md:tracking-[0.3em]">
          <div class="flex items-center gap-2 md:gap-4">이메일: consultantsyssam@gmail.com</div>
          <div class="flex items-center gap-2 md:gap-4">인스타그램: @consultant.sy</div>
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
          성장을 넘어 성공을 설계하는 가장 정교한 교육 파트너.
        </p>
      </div>
      <nav aria-label="컨설팅 안내" class="mt-16 flex flex-wrap gap-x-6 gap-y-3 text-sm font-black">
        <a href="/saenggibu-consulting/">생기부 컨설팅</a>
        <a href="/jasoseo-consulting/">자소서 컨설팅</a>
        <a href="/interview-consulting/">면접 컨설팅</a>
      </nav>
      <div class="mt-16 sm:mt-24 pt-8 border-t border-brand-light-gray/70 text-[14px] sm:text-[15px] text-[#71717A] space-y-2">
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span><strong class="font-bold text-brand-text">상호명:</strong> 입시는세연쌤</span>
          <span><strong class="font-bold text-brand-text">사업자등록번호:</strong> 612-69-00756</span>
          <span><strong class="font-bold text-brand-text">대표:</strong> 조세연</span>
          <span><strong class="font-bold text-brand-text">이메일:</strong> consultantsyssam@gmail.com</span>
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
