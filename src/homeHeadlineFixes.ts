function normalize(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function rewriteHeadlines() {
  document.querySelectorAll<HTMLElement>('main h2').forEach((heading) => {
    const text = normalize(heading.textContent);

    if (text === '좋은 전략은 학생을 닮아야 합니다.') {
      heading.innerHTML = '좋은 전략은<br />학생의 생각을<br />더 선명하게 합니다.';
    }

    if (text === '학생의 다음 장면을 함께 설계해볼까요?') {
      heading.innerHTML = '지금의 고민에서<br />다음 질문을 찾아볼까요?';
    }

    if (text === '합격보다 오래 남는 성장의 설계도') {
      heading.innerHTML = '입시가 끝난 뒤에도 남는<br />생각하는 힘';
    }
  });

  document.querySelectorAll<HTMLElement>('main .section-label').forEach((label) => {
    const text = normalize(label.textContent);
    if (text === 'Our Belief') label.textContent = 'What Matters';
    if (text === 'Student Changes') label.textContent = 'What Changes';
    if (text === 'Sehyun T Strategy Map') label.textContent = 'How We Work';
    if (text === 'Start a Conversation') label.textContent = 'Start Here';
  });
}

export function initHomeHeadlineFixes() {
  const run = () => requestAnimationFrame(rewriteHeadlines);
  run();
  const root = document.getElementById('root');
  if (!root) return;
  const observer = new MutationObserver(run);
  observer.observe(root, { childList: true, subtree: true, characterData: true });
}
