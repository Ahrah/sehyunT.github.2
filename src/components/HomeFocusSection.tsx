import { useEffect, useRef } from 'react';

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

export function HomeFocusSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const raf = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const update = () => {
      raf.current = 0;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
        node.style.transform = `translate3d(${(targetX - startX) * eased}px, ${(targetY - startY) * eased}px, 0) scale(${1 - eased * 0.12})`;
        node.style.opacity = String(1 - eased * 0.2);
      });

      const core = section.querySelector('[data-focus-core]') as HTMLElement | null;
      if (core) {
        core.style.transform = `translate(-50%, -50%) scale(${0.76 + eased * 0.24})`;
        core.style.opacity = String(0.45 + eased * 0.55);
      }
    };

    const onScroll = () => {
      if (raf.current) return;
      raf.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <section ref={sectionRef} data-sehyun-focus="1" className="motion-window relative min-h-[165vh] text-white">
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden px-6 py-24 sm:px-8 lg:px-12">
        <div className="focus-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div className="relative z-10">
            <p className="section-label text-brand-coral">How We Think</p>
            <h2 className="mt-7 text-5xl font-black leading-[1.08] tracking-[-0.055em] sm:text-7xl">관심사는 넓게.<br />질문은 점점 더 깊게.</h2>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/65 sm:text-lg">처음부터 전공 하나를 정해 놓고 활동을 끼워 맞추지 않습니다. 여러 관심사에서 출발해 자료를 읽고 비교하면서 질문을 좁히고, 끝에는 학생만의 연구 주제와 설명 가능한 생각을 남깁니다.</p>
            <div className="mt-10 flex flex-wrap gap-2 text-xs font-bold text-white/65">
              <span className="rounded-full border border-white/15 px-4 py-2">관심</span>
              <span className="rounded-full border border-white/15 px-4 py-2">질문</span>
              <span className="rounded-full border border-white/15 px-4 py-2">비교</span>
              <span className="rounded-full border border-white/15 px-4 py-2">심화탐구</span>
              <span className="rounded-full border border-brand-coral/60 px-4 py-2 text-brand-coral">기록 · 면접</span>
            </div>
          </div>
          <div className="relative h-[470px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] sm:h-[560px]" data-focus-stage>
            <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-coral/50 bg-brand-coral/10 shadow-[0_0_80px_rgba(239,68,68,0.18)]" data-focus-core>
              <div className="flex h-full items-center justify-center px-6 text-center text-lg font-black leading-7">나만의<br />탐구 질문</div>
            </div>
            {focusWords.map((word, index) => (
              <div
                key={word.text}
                className="focus-node absolute rounded-full bg-white px-4 py-2 text-xs font-black text-brand-ink sm:text-sm"
                style={{ left: `${word.x}%`, top: `${word.y}%` }}
                data-focus-node={index}
              >
                {word.text}
              </div>
            ))}
            <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              <span>Broad interests</span>
              <span>Focused inquiry</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
