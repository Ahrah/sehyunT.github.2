let hotfixScheduled = false;

function ensureSerifFont() {
  if (document.getElementById('sehyun-serif-font')) return;
  const link = document.createElement('link');
  link.id = 'sehyun-serif-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500&display=swap';
  document.head.appendChild(link);
}

function allTextElements(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector));
}

function applyRequestedHotfix() {
  hotfixScheduled = false;

  // 1) Keep the whole "학생의 다음 STEP을" phrase together on one line in the hero.
  const heroTitle = allTextElements('main h1').find((el) => el.textContent?.includes('입시에 더해'));
  if (heroTitle) {
    if (heroTitle.dataset.stepParticleFix !== '2') {
      heroTitle.dataset.stepParticleFix = '2';
      heroTitle.innerHTML = '입시에 더해,<br /><span class="hero-emphasis hero-step-line">학생의 다음 STEP을</span><br />설계합니다.';
    }

    const stepLine = heroTitle.querySelector<HTMLElement>('.hero-step-line');
    if (stepLine) {
      stepLine.style.whiteSpace = 'nowrap';
      stepLine.style.display = 'inline-block';
    }
  }

  // 2) Keep the Programs intro as the requested consulting copy.
  allTextElements('#programs p').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (
      text.startsWith('지금 가장 막혀 있는 지점부터 시작하면 됩니다.') ||
      text.startsWith('복잡한 프로그램 목록 대신') ||
      text === '단순한 입시 관리가 아닌, 체계적인 분석을 기반으로 한 맞춤형 솔루션.' ||
      text === '진로, 공부, 기록, 자소서·면접 중 필요한 부분을 먼저 확인하고 세부 프로그램을 선택할 수 있습니다.'
    ) {
      el.textContent = '학생의 진로, 기록, 학업 현황을 분석해 1:1로 컨설팅합니다.';
    }
  });

  // 3) Keep "지금 필요한 한 가지부터" on one line without forcing oversized type on mobile.
  const programsHeading = allTextElements('#programs h2').find((el) => el.textContent?.replace(/\s+/g, ' ').trim() === '지금 필요한 한 가지부터');
  if (programsHeading) {
    programsHeading.innerHTML = '지금 필요한 한 가지부터';
    programsHeading.style.whiteSpace = 'nowrap';
    programsHeading.style.fontSize = 'clamp(2.15rem, 5vw, 3.75rem)';
    programsHeading.style.lineHeight = '1.08';
    programsHeading.style.letterSpacing = '-0.055em';
  }

  // 4) Requested wording change for self-directed learning.
  allTextElements('main').forEach((el) => {
    if (el.children.length === 0 && el.textContent?.trim() === '학생에게 실제로 먹히는 공부 방식을 찾습니다.') {
      el.textContent = '학생에게 가장 효율적인 공부 방식을 찾습니다.';
    }
  });

  // 5) Belief paragraph: change typeface, reduce weight, and wrap the full sentence in quotation marks.
  const beliefCopy = allTextElements('#about p').find((el) => {
    const text = el.textContent?.trim() || '';
    return text.startsWith('학생에게 필요한 것은 그럴듯한 활동을 많이 만드는 일이 아니라') ||
      text.startsWith('"학생에게 필요한 것은 그럴듯한 활동을 많이 만드는 일이 아니라');
  });
  if (beliefCopy) {
    ensureSerifFont();
    beliefCopy.style.fontFamily = '"Noto Serif KR", serif';
    beliefCopy.style.fontWeight = '400';
    beliefCopy.style.letterSpacing = '-0.025em';
    beliefCopy.style.lineHeight = '1.78';

    const text = beliefCopy.textContent?.trim() || '';
    if (!text.startsWith('"') || !text.endsWith('"')) {
      beliefCopy.textContent = `"${text.replace(/^"|"$/g, '')}"`;
    }
  }

  // 6) Remove the icons above these two belief items only.
  ['깊어지는 탐구', '생각을 설명하는 힘'].forEach((heading) => {
    const title = allTextElements('#about h3').find((el) => el.textContent?.trim() === heading);
    const parent = title?.parentElement;
    parent?.querySelector('svg')?.remove();
  });

  // 7) Remove the Student Changes disclaimer copy without leaving an empty gap.
  allTextElements('main p').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (
      text === '검증되지 않은 합격 실적 대신, 상담을 통해 학생의 생각과 행동이 어떻게 달라졌는지를 보여드립니다.' ||
      text === '합격 숫자만 나열하기보다, 상담 뒤 학생이 질문하고 공부하고 표현하는 방식이 실제로 어떻게 달라졌는지를 보여드립니다.' ||
      text === '상담 뒤 학생이 질문하고 공부하고 표현하는 방식이 실제로 어떻게 달라졌는지를 보여드립니다.' ||
      text.startsWith('합격 숫자만 나열하기보다')
    ) {
      el.remove();
    }
  });
}

function scheduleHotfix() {
  if (hotfixScheduled) return;
  hotfixScheduled = true;
  requestAnimationFrame(applyRequestedHotfix);
}

export function initHomeRequestedHotfix() {
  scheduleHotfix();
  const root = document.getElementById('root');
  if (!root) return;

  const observer = new MutationObserver(scheduleHotfix);
  observer.observe(root, { childList: true, subtree: true, characterData: true });
}
