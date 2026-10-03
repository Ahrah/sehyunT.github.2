const COPY_REPLACEMENTS: Array<[string, string]> = [
  ['관심사와 학습 성향을 발견하고, 학교 선택부터 고교 생활의 첫 방향까지 연결합니다.', '학생이 무엇에 관심을 보이고 어떤 방식으로 배우는지부터 살핀 뒤, 학교 선택과 고교 생활의 우선순위를 함께 정합니다.'],
  ['좋아하는 것과 잘하는 것을 입시의 방향으로 바꿉니다.', '막연한 관심사를 오래 탐구할 수 있는 질문으로 바꿉니다.'],
  ['단순한 직업 추천이나 적성검사 해석을 넘어 학생의 관심사, 독서 성향, 탐구 방식, 학습 태도를 입체적으로 분석합니다. 장기적으로 지속 가능한 학업 방향을 제안하며, 이는 고등학교 선택과 학생부 로드맵의 기초가 됩니다.', '적성검사 결과만으로 진로를 정하지 않습니다. 학생이 오래 붙잡는 질문, 읽고 싶어 하는 주제, 자료를 다루는 방식과 학습 태도를 함께 살펴 관심 분야를 좁혀 갑니다. 이후 학교 선택, 과목 선택, 탐구 주제까지 실제 행동으로 옮길 수 있는 방향을 정합니다.'],
  ['진로 관심사 및 학업 성향 분석', '관심사·학습 성향 분석'],
  ['탐구 분야 확장 방향 제안', '탐구 질문 확장·심화 방향 제안'],
  ['독서 및 활동 로드맵 설계', '독서·자료조사·탐구 계획 정리'],
  ['고등학교 진학 방향 연결', '고교 선택 기준 정리'],
  ['진학 예정 학교의 특징과 학업 환경을 분석하여 입학 후의 학생부 운영과 자기주도학습 루틴을 미리 구축합니다. 불필요한 스펙 경쟁 대신 학생의 성향에 맞는 활동 구조를 정립합니다.', '진학 예정 학교의 교육과정과 활동 환경을 먼저 확인합니다. 입학 뒤 무엇을 무리하게 더할지보다, 어떤 과목에서 어떤 질문을 발전시키고 어떤 공부 습관을 먼저 잡아야 하는지 우선순위를 정합니다.'],
  ['계획을 세우는 데서 끝나지 않고, 학생이 스스로 실행하고 회복하는 공부 구조를 만듭니다.', '계획표를 만드는 데서 끝내지 않습니다. 학생이 스스로 시작하고, 흔들려도 다시 공부로 돌아오는 방법을 찾습니다.'],
  ['학생마다 다른 공부의 작동 방식을 찾습니다.', '학생에게 실제로 먹히는 공부 방식을 찾습니다.'],
  ['단순 관리를 넘어 학생이 공부를 미루는 원인, 집중 유지 환경, 목표 달성 기제를 정밀 분석합니다. 티칭이 아닌 코칭 중심으로 운영되며, 진로 관심사와 학업을 연결하여 장기적인 학습 동기를 만듭니다.', '공부를 미루는 순간, 집중이 깨지는 조건, 잘 되는 시간대와 과목별 습관을 함께 확인합니다. 누가 옆에서 계속 관리해야 움직이는 방식이 아니라, 학생이 자기 상태를 알고 스스로 조정할 수 있는 공부 루틴을 만드는 데 초점을 둡니다.'],
  ['함께 읽고 말하며 사고의 깊이를 키웁니다.', '읽고, 질문하고, 말하면서 생각을 더 깊게 만듭니다.'],
  ['학습 플랜 설계부터 비문학 독해, 정보 구조화 훈련을 동료들과 함께 수행합니다. 자신의 사고 과정을 언어화하고 타인의 관점을 수용하며 사고의 폭을 확장합니다.', '비문학과 원서를 읽고 핵심 정보를 구조화한 뒤, 서로 다른 해석을 비교하며 자신의 생각을 말로 정리합니다. 정답을 빠르게 찾는 연습보다 근거를 찾고 관점을 바꾸며 설명하는 연습에 가깝습니다.'],
  ['학생의 경험을 설득력 있는 언어로 정리하고, 어떤 질문에도 자기 생각을 말하도록 훈련합니다.', '학생이 실제로 한 경험과 생각을 분명한 문장으로 정리하고, 낯선 질문에도 자기 근거로 답할 수 있게 훈련합니다.'],
  ['경험의 나열을 학생만의 서사로 바꿉니다.', '무엇을 했는지보다 왜 했고 무엇을 생각했는지가 보이게 만듭니다.'],
  ['단순 첨삭을 넘어 학생의 활동과 경험을 재해석합니다. 핵심 메시지를 도출하고 문항별 스토리라인을 구성하며, 면접과의 연결성까지 고려한 서사를 만듭니다.', '문장을 예쁘게 고치는 데서 시작하지 않습니다. 학생이 실제로 한 활동을 다시 살펴 질문의 출발점, 선택의 이유, 탐구 과정과 생각의 변화를 찾아냅니다. 그다음 문항에 필요한 내용만 남겨 학생의 말투로 정리합니다.'],
  ['암기보다 사고력과 진정성을 보여주는 답변을 만듭니다.', '외운 답보다 짧은 시간 안에 생각을 정리해 말하는 힘을 기릅니다.'],
  ['학교별 면접 유형을 분석하고 예상 질문에 대한 구조적 답변 능력을 키웁니다. 면접 태도와 전달력까지 코칭하여 학생이 자신의 경험을 스스로 설명할 수 있도록 훈련합니다.', '학교별 질문 방식과 평가 포인트를 분석한 뒤, 예상하지 못한 질문에서도 핵심을 잡고 근거를 붙여 답하는 연습을 합니다. 학생부와 자소서의 내용을 자기 말로 짧고 정확하게 설명하는 훈련까지 이어갑니다.'],
  ['낯선 질문에도 흔들리지 않는 사고의 틀을 세웁니다.', '처음 보는 질문에도 생각의 순서를 잃지 않게 훈련합니다.'],
  ['반복 등장하는 핵심 질문들의 논리를 해부합니다. 답을 외우는 대신 어떤 질문이 나와도 학생의 경험과 사고를 구조화해 전달할 수 있는 프레임을 훈련합니다.', '자주 나오는 공통문항을 유형별로 나누고, 질문이 무엇을 확인하려는지부터 읽습니다. 답안을 외우지 않고 주장-근거-사례-한계의 순서를 연습해 즉석에서도 자기 생각을 만들 수 있게 합니다.'],
  ['세특, 탐구, 수행평가와 지원 전략을 하나의 성장 흐름으로 연결합니다.', '세특과 수행평가를 채우는 데 그치지 않고, 질문을 만들고 자료를 찾고 더 깊게 파고든 흔적이 기록에 남도록 돕습니다.'],
  ['학생부의 여러 기록을 하나의 방향으로 연결합니다.', '학생부에서 탐구의 깊이와 생각의 변화가 보이게 만듭니다.'],
  ['한 학기 동안의 진로 관심사와 학업 흐름을 기반으로 세특, 탐구활동, 발표, 독서가 유기적으로 이어지도록 설계합니다. 대학이 읽어낼 수 있는 장기적인 성장 흐름을 만듭니다.', '한 학기 동안 수업에서 생긴 질문을 출발점으로 독서, 자료조사, 발표, 보고서가 어디까지 깊어질 수 있는지 봅니다. 모든 활동을 억지로 같은 주제에 묶기보다, 각 활동에서 학생이 어떤 관점으로 문제를 보고 어떻게 질문을 발전시켰는지가 기록에 드러나도록 정리합니다.'],
  ['결과보다 학생의 사고 과정이 보이는 기록을 만듭니다.', '무엇을 제출했는지보다 어떻게 생각했는지가 보이게 합니다.'],
  ['수행평가와 수시 활동 내용을 학생의 탐구 방향과 사고 흐름이 드러나도록 구체화합니다. 발표와 보고서의 논리 구조부터 최종 세특 기재 포인트까지 조력합니다.', '수행평가 주제를 정할 때부터 질문이 너무 넓거나 얕지 않은지 점검합니다. 자료의 관점을 비교하고, 한계를 찾고, 후속 질문을 만드는 과정까지 학생이 직접 해낼 수 있도록 보고서와 발표의 논리를 함께 다듬습니다.'],
  ['데이터와 학생의 강점을 결합해 지원 조합을 설계합니다.', '성적과 기록을 함께 읽고, 실제 지원에서 강점이 살아나는 조합을 찾습니다.'],
  ['내신 성적과 생기부의 흐름, 면접 가능성을 종합하여 최적의 지원 조합을 제안합니다. 전형별 적합도를 검토하고 합격 가능성과 리스크를 함께 분석합니다.', '내신, 과목 선택, 학생부의 탐구 깊이와 면접 준비도를 함께 봅니다. 전형별로 무엇이 강점이고 어디에서 위험이 생기는지 구분해 지원 대학과 학과의 우선순위를 정합니다.'],
  ['복잡한 프로그램 목록 대신 학생의 현재 고민에 맞는 네 개의 시작점으로 정리했습니다. 카드를 열면 세부 프로그램과 진행 방향을 확인할 수 있습니다.', '지금 가장 막혀 있는 지점부터 시작하면 됩니다. 진로, 공부, 기록, 자소서·면접 중 필요한 부분을 먼저 확인하고 세부 프로그램을 선택할 수 있습니다.'],
  ['좋은 전략은\n학생을 닮아야\n합니다.', '좋은 전략은\n학생의 생각을\n더 선명하게 합니다.'],
  ['입시는 누군가의 정답을 복사하는 과정이 아니라, 나만의 질문을 발견하고 끝까지 설명할 수 있게 되는 과정이라고 믿습니다.', '학생에게 필요한 것은 그럴듯한 활동을 많이 만드는 일이 아니라, 자기 질문을 만들고 여러 관점에서 자료를 읽고 끝까지 생각해보는 경험입니다. 그 과정이 쌓이면 기록에서는 탐구의 깊이가 보이고, 면접에서는 짧은 시간 안에도 자기 생각을 설명할 수 있습니다.'],
  ['연결된 성장', '깊어지는 탐구'],
  ['진로, 수업, 탐구와 기록이 하나의 맥락 안에서 이어지도록 설계합니다.', '넓은 관심사에서 출발해 질문을 좁히고, 자료를 비교하며 한 단계 더 깊은 후속 탐구로 나아갑니다.'],
  ['학생의 주도권', '생각을 설명하는 힘'],
  ['결과물을 대신 만들기보다 학생이 이해하고 선택하고 말하는 힘을 키웁니다.', '결과물을 대신 만들지 않습니다. 학생이 근거를 찾고 판단하고, 자신의 생각을 기록과 말로 설명할 수 있게 훈련합니다.'],
  ['검증되지 않은 합격 실적 대신, 상담을 통해 학생의 생각과 행동이 어떻게 달라졌는지를 보여드립니다.', '합격 숫자만 나열하기보다, 상담 뒤 학생이 질문하고 공부하고 표현하는 방식이 실제로 어떻게 달라졌는지를 보여드립니다.'],
  ['성적표보다 먼저 학생의 관심사, 학습 습관, 스트레스 반응과 지금까지의 경험을 입체적으로 봅니다.', '성적만 보지 않습니다. 학생이 무엇에 오래 관심을 두는지, 어떻게 공부하는지, 어떤 자료에서 질문이 생기는지부터 살핍니다.'],
  ['막연한 진로를 구체적인 질문으로 바꾸고, 학생에게 중요한 선택과 보완 지점을 선명하게 정리합니다.', '막연한 관심사를 "무엇이 궁금한가"라는 질문으로 바꾸고, 여러 가능성 가운데 지금 더 파고들 가치가 있는 방향을 고릅니다.'],
  ['진로, 교과, 탐구, 독서와 기록이 따로 놀지 않도록 하나의 로드맵 안에서 연결합니다.', '자료를 비교하고 관점을 바꿔 보면서 질문의 범위를 좁힙니다. 단순 조사에서 끝나지 않고 분석과 후속 질문이 생기도록 탐구를 깊게 만듭니다.'],
  ['대신 만들어주는 결과물이 아니라 학생이 이해하고 말할 수 있는 활동과 학습 루틴으로 옮깁니다.', '찾은 질문을 수업, 독서, 수행평가와 실제 공부에 적용합니다. 학생이 직접 자료를 읽고 판단하고 자신의 문장으로 정리하게 합니다.'],
  ['실행 결과를 함께 돌아보고 기록과 면접의 일관성을 높이며 다음 선택까지 이어지도록 정교화합니다.', '탐구 과정에서 드러난 생각과 변화를 학생부에 남길 포인트로 정리하고, 면접에서는 짧은 시간 안에 핵심을 설명할 수 있도록 반복해서 다듬습니다.'],
  ['학생을 읽습니다', '관심사를 살핍니다'],
  ['핵심 질문을 찾습니다', '질문을 좁힙니다'],
  ['성장의 흐름을 설계합니다', '탐구를 깊게 만듭니다'],
  ['학생의 언어로 실행합니다', '직접 연구하고 정리합니다'],
  ['끝까지 점검하고 다듬습니다', '기록하고 말하는 힘으로 남깁니다'],
  ['상담은 정답을 대신 주는 일이 아닙니다. 학생이 자기 방향을 이해하고 다음 선택을 해낼 수 있도록 다섯 단계를 함께 걷습니다.', '관심사를 바로 진로로 고정하지 않습니다. 질문을 만들고, 범위를 좁히고, 자료를 비교하고, 직접 설명할 수 있을 때까지 탐구의 깊이를 높입니다.'],
  ['학생의 다음 장면을\n함께 설계해볼까요?', '지금의 고민에서\n다음 질문을 찾아볼까요?'],
  ['현재 상황과 고민을 남겨주시면, 어떤 프로그램이 필요한지부터 차근차근 안내드립니다.', '학생이 지금 어디에서 막혀 있는지 알려주시면, 무엇부터 확인하고 어떤 방식으로 준비하면 좋을지 안내드립니다.'],
  ['학생의 진로와 학습, 기록을 하나의 성장 흐름으로 연결하는 입시 전략 컨설팅.', '질문하고 탐구하고 설명하는 힘을 길러, 그 과정이 공부와 학생부, 면접에서 드러나게 하는 교육·입시 컨설팅.'],
];

const HERO_SUBCOPY = '학생이 자기 힘으로 성장할 수 있도록, 관심사를 질문으로 바꾸고 여러 관점에서 탐구하며 스스로 연구하는 힘을 기릅니다. 그 생각의 깊이가 학생부 기록에 남고, 면접에서는 짧은 시간 안에도 분명하게 드러나도록 훈련합니다.';

const focusWords = [
  { text: '경제', x: 10, y: 20 },
  { text: '역사', x: 78, y: 15 },
  { text: '심리', x: 18, y: 74 },
  { text: '과학', x: 83, y: 72 },
  { text: '사회문제', x: 50, y: 8 },
  { text: '기술', x: 8, y: 48 },
  { text: '문학', x: 91, y: 44 },
  { text: '정책', x: 50, y: 84 },
];

let applying = false;
let focusSection: HTMLElement | null = null;
let observer: MutationObserver | null = null;
let raf = 0;

function replaceExactText(root: ParentNode) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const value = node.nodeValue?.trim();
    if (!value) continue;
    const match = COPY_REPLACEMENTS.find(([from]) => from === value);
    if (match) node.nodeValue = node.nodeValue!.replace(match[0], match[1]);
  }
}

function findSectionByText(text: string): HTMLElement | null {
  return Array.from(document.querySelectorAll('section')).find((section) => section.textContent?.includes(text)) as HTMLElement | null || null;
}

function enhanceHero() {
  const main = document.querySelector('main');
  const hero = main?.querySelector('section:first-of-type') as HTMLElement | null;
  if (!hero) return;

  hero.classList.add('hero-stage');
  if (!hero.querySelector('.hero-grid')) {
    const grid = document.createElement('div');
    grid.className = 'hero-grid';
    hero.prepend(grid);
  }

  const badge = Array.from(hero.querySelectorAll('div')).find((el) => el.textContent?.trim() === '학생마다 다른 길을 설계합니다');
  badge?.remove();

  const h1 = hero.querySelector('h1');
  if (h1 && h1.dataset.sehyunCopy !== '1') {
    h1.dataset.sehyunCopy = '1';
    h1.className = 'mt-4 max-w-5xl text-[clamp(3rem,6.5vw,7rem)] font-black leading-[1.08] tracking-[-0.065em]';
    h1.innerHTML = '입시에 더해,<br /><span class="hero-emphasis">학생의 다음 STEP</span>을<br />설계합니다.';
  }

  const intro = hero.querySelector('h1 + p') as HTMLParagraphElement | null;
  if (intro) {
    intro.textContent = HERO_SUBCOPY;
    intro.className = 'mt-9 max-w-2xl text-lg font-medium leading-[1.9] text-brand-ink/68 sm:text-xl';
  }

  const chips = Array.from(hero.querySelectorAll('span')).filter((el) => ['진로에서 입시까지', '학생 중심 1:1 설계', '실행과 기록의 연결'].includes(el.textContent?.trim() || ''));
  const replacements = ['질문을 만드는 힘', '심화탐구·연구 역량', '기록·면접 표현력'];
  chips.forEach((chip, index) => { if (replacements[index]) chip.textContent = replacements[index]; });

  const imageCard = hero.querySelector('img[alt="입시 컨설턴트 조세연"]')?.closest('div')?.parentElement as HTMLElement | null;
  if (imageCard && imageCard.dataset.pointerMotion !== '1') {
    imageCard.dataset.pointerMotion = '1';
    imageCard.style.willChange = 'transform';
    hero.addEventListener('pointermove', (event) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 900) return;
      const rect = hero.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      imageCard.style.transform = `translate3d(${nx * 12}px, ${ny * 10}px, 0) rotateX(${ny * -1.6}deg) rotateY(${nx * 1.8}deg)`;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { imageCard.style.transform = ''; }, { passive: true });
  }
}

function buildFocusSection() {
  if (document.querySelector('[data-sehyun-focus="1"]')) return;
  const programs = document.getElementById('programs');
  if (!programs) return;

  const section = document.createElement('section');
  section.dataset.sehyunFocus = '1';
  section.className = 'motion-window relative min-h-[165vh] text-white';
  section.innerHTML = `
    <div class="sticky top-0 flex min-h-screen items-center overflow-hidden px-6 py-24 sm:px-8 lg:px-12">
      <div class="focus-grid absolute inset-0 opacity-40"></div>
      <div class="relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <div class="relative z-10">
          <p class="section-label text-brand-coral">How We Think</p>
          <h2 class="mt-7 text-5xl font-black leading-[1.08] tracking-[-0.055em] sm:text-7xl">관심사는 넓게.<br />질문은 점점 더 깊게.</h2>
          <p class="mt-8 max-w-xl text-base leading-8 text-white/65 sm:text-lg">처음부터 전공 하나를 정해 놓고 활동을 끼워 맞추지 않습니다. 여러 관심사에서 출발해 자료를 읽고 비교하면서 질문을 좁히고, 끝에는 학생만의 연구 주제와 설명 가능한 생각을 남깁니다.</p>
          <div class="mt-10 flex flex-wrap gap-2 text-xs font-bold text-white/65">
            <span class="rounded-full border border-white/15 px-4 py-2">관심</span>
            <span class="rounded-full border border-white/15 px-4 py-2">질문</span>
            <span class="rounded-full border border-white/15 px-4 py-2">비교</span>
            <span class="rounded-full border border-white/15 px-4 py-2">심화탐구</span>
            <span class="rounded-full border border-brand-coral/60 px-4 py-2 text-brand-coral">기록 · 면접</span>
          </div>
        </div>
        <div class="relative h-[470px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] sm:h-[560px]" data-focus-stage>
          <div class="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-coral/50 bg-brand-coral/10 shadow-[0_0_80px_rgba(239,68,68,0.18)]" data-focus-core>
            <div class="flex h-full items-center justify-center px-6 text-center text-lg font-black leading-7">나만의<br />탐구 질문</div>
          </div>
          ${focusWords.map((word, index) => `<div class="focus-node absolute rounded-full bg-white px-4 py-2 text-xs font-black text-brand-ink sm:text-sm" style="left:${word.x}%;top:${word.y}%;" data-focus-node="${index}">${word.text}</div>`).join('')}
          <div class="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-white/35"><span>Broad interests</span><span>Focused inquiry</span></div>
        </div>
      </div>
    </div>`;
  programs.parentElement?.insertBefore(section, programs);
  focusSection = section;
}

function updateFocusMotion() {
  raf = 0;
  const section = (focusSection || document.querySelector('[data-sehyun-focus="1"]')) as HTMLElement | null;
  if (!section || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = section.getBoundingClientRect();
  const max = Math.max(1, rect.height - window.innerHeight);
  const progress = Math.min(1, Math.max(0, -rect.top / max));
  const eased = 1 - Math.pow(1 - progress, 3);
  const stage = section.querySelector('[data-focus-stage]') as HTMLElement | null;
  if (!stage) return;
  const stageRect = stage.getBoundingClientRect();
  const cx = stageRect.width / 2;
  const cy = stageRect.height / 2;

  section.querySelectorAll<HTMLElement>('[data-focus-node]').forEach((node, index) => {
    const base = focusWords[index];
    const startX = (base.x / 100) * stageRect.width;
    const startY = (base.y / 100) * stageRect.height;
    const targetRadius = 95 + (index % 3) * 18;
    const angle = (index / focusWords.length) * Math.PI * 2 - Math.PI / 2;
    const targetX = cx + Math.cos(angle) * targetRadius;
    const targetY = cy + Math.sin(angle) * targetRadius;
    const x = (targetX - startX) * eased;
    const y = (targetY - startY) * eased;
    const scale = 1 - eased * 0.12;
    const opacity = 1 - eased * 0.2;
    node.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    node.style.opacity = String(opacity);
    node.style.transition = 'opacity 120ms linear';
  });

  const core = section.querySelector('[data-focus-core]') as HTMLElement | null;
  if (core) {
    core.style.transform = `translate(-50%, -50%) scale(${0.76 + eased * 0.24})`;
    core.style.opacity = String(0.45 + eased * 0.55);
  }
}

function setupRevealMotion() {
  const targets = document.querySelectorAll<HTMLElement>('main section h2, main section h3, main section article, main section > div > p');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target as HTMLElement;
      el.style.opacity = '1';
      el.style.transform = 'translate3d(0,0,0)';
      io.unobserve(el);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  targets.forEach((el, index) => {
    if (el.dataset.revealInit === '1' || el.closest('[data-sehyun-focus="1"]')) return;
    el.dataset.revealInit = '1';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.style.opacity = '0';
    el.style.transform = 'translate3d(0, 18px, 0)';
    el.style.transition = `opacity 680ms cubic-bezier(.2,.75,.2,1) ${Math.min(index % 4, 3) * 55}ms, transform 680ms cubic-bezier(.2,.75,.2,1) ${Math.min(index % 4, 3) * 55}ms`;
    io.observe(el);
  });
}

function applyEnhancements() {
  if (applying) return;
  applying = true;
  try {
    replaceExactText(document.body);
    enhanceHero();
    buildFocusSection();
    setupRevealMotion();
    updateFocusMotion();
  } finally {
    applying = false;
  }
}

function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(updateFocusMotion);
}

export function initHomeEnhancements() {
  const start = () => {
    applyEnhancements();
    observer = new MutationObserver(() => requestAnimationFrame(applyEnhancements));
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(start), { once: true });
  else requestAnimationFrame(start);
}
