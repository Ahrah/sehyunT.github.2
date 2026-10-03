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

  // 2) Remove only the first sentence from the Programs intro.
  allTextElements('main p').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (text.startsWith('지금 가장 막혀 있는 지점부터 시작하면 됩니다.')) {
      el.textContent = text.replace('지금 가장 막혀 있는 지점부터 시작하면 됩니다.', '').trim();
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

  // 7) Remove only the opening clause from Student Changes description.
  allTextElements('main p').forEach((el) => {
    const text = el.textContent?.trim() || '';
    if (text === '합격 숫자만 나열하기보다, 상담 뒤 학생이 질문하고 공부하고 표현하는 방식이 실제로 어떻게 달라졌는지를 보여드립니다.') {
      el.textContent = '상담 뒤 학생이 질문하고 공부하고 표현하는 방식이 실제로 어떻게 달라졌는지를 보여드립니다.';
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
