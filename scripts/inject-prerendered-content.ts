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
          Premium Admissions Strategy
        </div>
        <h1 class="text-6xl md:text-8xl font-extrabold leading-[1] tracking-tighter mb-8 italic">
          DESIGN YOUR <br />
          <span class="text-brand-accent not-italic">SUCCESS.</span>
        </h1>
        <p class="text-lg md:text-xl text-brand-gray leading-relaxed max-w-xl mb-12 font-light">
          합격을 넘어, 학생의 고유한 서사와 
          지속 가능한 학습 시스템을 설계하는 프리미엄 전략 컨설팅
        </p>
      </div>
    </section>

    <!-- Philosophy Section -->
    <section class="py-40 px-6 lg:px-8 bg-brand-secondary">
      <div class="max-w-7xl mx-auto">
        <p class="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-8">Philosophy</p>
        <h2 class="text-5xl md:text-7xl font-black leading-[1.1] tracking-tighter text-brand-text mb-12">
          성적을 넘어, <br />방식의 <br />혁신.
        </h2>
        <div class="space-y-12">
          <div>
            <h3 class="text-2xl font-black mb-6 uppercase tracking-tight">나만의 고유한 서사 구축</h3>
            <p class="text-xl text-brand-gray leading-relaxed font-light max-w-2xl">
              단순한 스펙 나열이 아닌, 학생의 고유한 관심사와 문제의식을 
              설득력 있는 성장 이야기로 연결하여 독보적인 경쟁력을 만듭니다.
            </p>
          </div>
          <div>
            <h3 class="text-2xl font-black mb-6 uppercase tracking-tight">스스로 움직이는 학습 시스템</h3>
            <p class="text-xl text-brand-gray leading-relaxed font-light max-w-2xl">
              입시는 성장의 과정입니다. 스스로 목표를 설정하고 
              끝까지 완주할 수 있는 단단한 기초와 학습 구조를 함께 설계합니다.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Programs Section -->
    <section class="py-48 px-6 lg:px-12 max-w-7xl mx-auto">
      <div class="mb-32">
        <p class="text-[10px] uppercase tracking-[0.6em] text-brand-accent font-black">Professional Curriculum</p>
        <h2 class="text-6xl md:text-7xl font-extrabold tracking-[-0.05em] uppercase leading-none">Programs</h2>
        <p class="text-brand-gray max-w-sm font-light text-base md:text-lg leading-[1.6] mt-8 italic">
          단순한 입시 관리가 아닌, 체계적인 분석을 기반으로 한 맞춤형 솔루션.
        </p>
      </div>

      <div class="space-y-16">
        <!-- Career & Middle -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">진로 및 고입 전략</h3>
          <p class="text-brand-gray">중학생 시기는 성적 향상을 넘어, 자신의 흥미와 학습 방식을 발견하는 골든타임입니다.</p>
        </div>

        <!-- Learning Coaching -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">자기주도학습 솔루션</h3>
          <p class="text-brand-gray">모두에게 맞는 공부법은 없습니다. 학생의 패턴에 최적화된 공부 엔진을 설계합니다.</p>
        </div>

        <!-- Specialized Prep -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">특목·자사고 입시</h3>
          <p class="text-brand-gray">자기소개서 집중 컨설팅, 면접 대비, 공통문항 특강을 통한 완벽한 입시 준비.</p>
        </div>

        <!-- Student Record -->
        <div>
          <h3 class="text-4xl font-extrabold tracking-tighter mb-4">고등학교 생기부·대입</h3>
          <p class="text-brand-gray">학생부종합전형 통합 컨설팅 및 수시 지원 전략으로 합격을 설계합니다.</p>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section class="bg-brand-text py-48 px-6 lg:px-8 text-center text-brand-bg">
      <div class="max-w-5xl mx-auto">
        <p class="text-xs uppercase tracking-[0.5em] text-brand-accent font-black mb-12">Contact Us</p>
        <h2 class="text-6xl md:text-9xl font-black leading-[0.9] tracking-tighter mb-20 uppercase italic">
          Master your <br />
          <span class="text-brand-accent not-italic">Future.</span>
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
        <div class="flex flex-wrap justify-center gap-16 text-brand-bg/70 text-[14px] font-black uppercase tracking-[0.3em]">
          <div class="flex items-center gap-4">이메일: consultantsyssam@gmail.com</div>
          <div class="flex items-center gap-4">인스타그램: @consultant.sy</div>
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
