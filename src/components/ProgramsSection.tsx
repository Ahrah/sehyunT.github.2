import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import { SITE } from '../config/site';
import {
  ADMISSION_CYCLE,
  ADMISSION_SOURCE_NOTE,
  officeWindows,
  schoolGroups,
  type SchoolDates,
} from '../data/admissionDates';
import {
  programGroups,
  programRoadmap,
  type ProgramCard,
  type ProgramDetail,
} from '../data/programs';

const NAV_OFFSET = 96;

function expandIdForTarget(targetId: string) {
  if (targetId === 'program-susi') return 'program-record';
  return targetId;
}

function scrollToId(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const top = node.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
  window.scrollTo({ top, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function InquiryButton({ className = '' }: { className?: string }) {
  return (
    <a href={SITE.consultUrl} target="_blank" rel="noopener noreferrer" className={className}>
      <span className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-brand-ink px-7 text-sm font-bold text-white transition-colors hover:bg-brand-accent">
        상담 문의 <ArrowUpRight size={16} />
      </span>
    </a>
  );
}

function DetailBody({ detail }: { detail: ProgramDetail }) {
  return (
    <div id={detail.id} className="scroll-mt-28 space-y-5">
      <div>
        <h5 className="text-lg font-black tracking-[-0.03em]">{detail.title}</h5>
        <p className="mt-2 text-sm leading-7 text-brand-ink/60">{detail.summary}</p>
      </div>
      <p className="text-sm leading-7 text-brand-ink/70 sm:text-base sm:leading-8">{detail.content}</p>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-accent">함께 하는 일</p>
          <ul className="mt-3 space-y-2">
            {detail.features.map((feature) => (
              <li key={feature} className="flex gap-2.5 text-sm font-semibold leading-6">
                <Check size={15} className="mt-1 shrink-0 text-brand-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-accent">이런 학생에게</p>
          <ul className="mt-3 space-y-2">
            {detail.target.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-6 text-brand-ink/65">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-coral" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {detail.landing && (
        <a href={detail.landing.href} className="inline-flex items-center gap-2 text-sm font-black text-brand-accent">
          {detail.landing.label} 안내 <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}

function ProgramCardView({
  card,
  expanded,
  onToggle,
  reveal,
}: {
  card: ProgramCard;
  expanded: boolean;
  onToggle: () => void;
  reveal: Record<string, unknown>;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      {...reveal}
      id={card.id}
      className={`scroll-mt-28 overflow-hidden rounded-[1.75rem] border transition-colors ${
        expanded ? 'border-brand-ink bg-brand-mist' : 'border-brand-ink/10 bg-white hover:border-brand-ink/30'
      }`}
    >
      <div className="p-6 sm:p-8">
        <p className="text-xs font-black tracking-[0.14em] text-brand-accent">{card.period}</p>
        <h4 className="mt-2 text-2xl font-black tracking-[-0.04em] sm:text-[1.75rem]">{card.name}</h4>
        <p className="mt-3 text-[0.95rem] leading-7 text-brand-ink/62">{card.blurb}</p>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="mt-5 inline-flex items-center gap-2 text-sm font-black text-brand-ink"
        >
          자세히 보기
          <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.35 }}
            className="overflow-hidden"
          >
            <div className="space-y-8 border-t border-brand-ink/10 px-6 py-6 sm:px-8">
              {card.details.map((detail) => (
                <div key={detail.title} className="rounded-2xl bg-white p-5 sm:p-6">
                  <DetailBody detail={detail} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function schoolRow(school: SchoolDates) {
  return (
    <tr key={school.id} className="border-t border-brand-ink/10 align-top">
      <th scope="row" className="sticky left-0 bg-white px-3 py-3 text-left font-black">
        <span className="flex flex-wrap items-center gap-2">
          {school.name}
          {school.officePlan && (
            <span className="rounded-full bg-brand-ink px-2 py-0.5 text-[10px] font-black tracking-wide text-white">
              교육청 기준
            </span>
          )}
        </span>
      </th>
      <td className="px-3 py-3">{school.apply}</td>
      <td className="px-3 py-3">{school.essay}</td>
      <td className="px-3 py-3">{school.interview}</td>
      <td className="px-3 py-3">{school.result}</td>
    </tr>
  );
}

export function ProgramsSection() {
  const reduceMotion = useReducedMotion();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [schoolsOpen, setSchoolsOpen] = useState(false);
  const [asideOpen, setAsideOpen] = useState(false);

  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.65 },
      };

  const openAndScroll = (targetId: string) => {
    const expandId = expandIdForTarget(targetId);
    setExpandedCard(expandId);
    window.setTimeout(() => {
      scrollToId(document.getElementById(targetId) ? targetId : expandId);
    }, 80);
    window.setTimeout(() => {
      if (document.getElementById(targetId)) scrollToId(targetId);
    }, 380);
  };

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const fromRoadmap = programRoadmap.find((item) => item.id === hash)?.targetId;
    const target = hash.startsWith('program-') ? hash : fromRoadmap;
    if (target) openAndScroll(target);
  }, []);

  return (
    <section id="programs" className="scroll-mt-20 bg-white py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <motion.div {...reveal} className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="section-label text-brand-accent">Programs</p>
            <h2 className="mt-6 text-4xl font-black tracking-[-0.06em] sm:text-6xl">
              학년별로 이어지는
              <br />
              프로그램
            </h2>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-brand-ink/60 lg:ml-auto">
            중1 공부 습관부터 고3 면접까지, 시기에 맞춰 진로·학습·기록·면접을 연결합니다.
          </p>
        </motion.div>

        <motion.div {...reveal} className="mt-16 rounded-[2rem] bg-brand-paper p-6 sm:p-10">
          <p className="section-label text-brand-accent">Grade Roadmap</p>
          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] sm:text-3xl">학년별 로드맵</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-ink/58 sm:text-base">
            항목을 누르면 아래 해당 프로그램으로 이동합니다.
          </p>
          <ol className="program-timeline mt-10">
            {programRoadmap.map((item, index) => (
              <li key={item.id} className="program-timeline-item">
                <button
                  type="button"
                  onClick={() => openAndScroll(item.targetId)}
                  className="w-full rounded-2xl px-1 py-1 text-left transition-colors hover:bg-white/80"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-[11px] font-bold text-brand-ink/35">{String(index + 1).padStart(2, '0')}</span>
                    <span className="text-xs font-black tracking-[0.08em] text-brand-accent">{item.period}</span>
                  </span>
                  <span className="mt-1.5 block text-[1.05rem] font-black tracking-[-0.03em] sm:text-xl">{item.title}</span>
                  {item.steps && (
                    <span className="mt-2 flex flex-col gap-1 text-sm font-semibold text-brand-ink/55">
                      {item.steps.map((step) => (
                        <span key={step} className="flex gap-2">
                          <span className="text-brand-accent">→</span>
                          {step}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </motion.div>

        <motion.div {...reveal} className="mt-8 rounded-[2rem] border border-brand-ink/10 bg-brand-paper p-6 sm:p-10">
          <p className="section-label text-brand-accent">{ADMISSION_CYCLE} 고입</p>
          <h3 className="mt-4 text-2xl font-black tracking-[-0.04em] sm:text-3xl">특목·자사고 원서접수 기간</h3>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-ink/58">
            교육청별 원서접수 기간을 먼저 확인하세요. 학교별 자소서·면접·최종발표는 아래에서 펼쳐 볼 수 있습니다.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {officeWindows.map((office) => (
              <article
                key={office.id}
                className={`rounded-[1.4rem] p-5 ${
                  office.id === 'gyeonggi' ? 'bg-brand-ink text-white sm:col-span-2 lg:col-span-1' : 'bg-white'
                }`}
              >
                <p className={`text-xs font-black tracking-[0.16em] ${office.id === 'gyeonggi' ? 'text-brand-coral' : 'text-brand-accent'}`}>
                  {office.region}
                </p>
                <p className="mt-2 text-2xl font-black tracking-[-0.04em]">{office.apply}</p>
                {office.note && (
                  <p className={`mt-2 text-xs leading-5 ${office.id === 'gyeonggi' ? 'text-white/65' : 'text-brand-ink/50'}`}>
                    {office.note}
                  </p>
                )}
                {office.extras && (
                  <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    {office.extras.map((extra) => (
                      <div key={extra.label}>
                        <dt className={office.id === 'gyeonggi' ? 'text-white/50' : 'text-brand-ink/45'}>{extra.label}</dt>
                        <dd className="mt-0.5 font-bold">{extra.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </article>
            ))}
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setSchoolsOpen((open) => !open)}
              aria-expanded={schoolsOpen}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-brand-ink/15 bg-white px-5 text-sm font-black"
            >
              학교별 일정 보기
              <ChevronDown size={16} className={`transition-transform ${schoolsOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence initial={false}>
              {schoolsOpen && (
                <motion.div
                  initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35 }}
                  className="overflow-hidden"
                >
                  <div className="mt-6 space-y-8">
                    {schoolGroups.map((group) => (
                      <div key={group.id}>
                        <h4 className="text-lg font-black tracking-[-0.03em]">{group.label}</h4>
                        <div className="admission-table-wrap mt-3">
                          <table className="min-w-[720px] w-full text-left text-sm">
                            <thead>
                              <tr className="text-[11px] font-black uppercase tracking-[0.14em] text-brand-ink/45">
                                <th className="sticky left-0 bg-white px-3 py-2">학교</th>
                                <th className="px-3 py-2">원서</th>
                                <th className="px-3 py-2">자소서</th>
                                <th className="px-3 py-2">면접</th>
                                <th className="px-3 py-2">최종발표</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.schools.map((school) => schoolRow(school))}
                            </tbody>
                          </table>
                        </div>
                        {group.schools.some((school) => school.note) && (
                          <ul className="mt-3 space-y-1 text-xs leading-6 text-brand-ink/55">
                            {group.schools
                              .filter((school) => school.note)
                              .map((school) => (
                                <li key={`${school.id}-note`}>
                                  <span className="font-bold text-brand-ink/70">{school.name}</span> · {school.note}
                                </li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ))}
                    <p className="rounded-2xl bg-brand-mist px-4 py-3 text-sm leading-7 text-brand-ink/60">{ADMISSION_SOURCE_NOTE}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <div className="mt-20 space-y-16">
          {programGroups.map((group) => (
            <section key={group.id} aria-labelledby={`${group.id}-title`}>
              <motion.div {...reveal} className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="section-label text-brand-accent">
                    {group.number} · {group.eyebrow}
                  </p>
                  <h3 id={`${group.id}-title`} className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                    {group.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-brand-ink/58 sm:text-base">{group.intro}</p>
                </div>
              </motion.div>

              <div className="mt-8 grid gap-4">
                {group.cards.map((card) => (
                  <div key={card.id}>
                    <ProgramCardView
                      card={card}
                      expanded={expandedCard === card.id}
                      onToggle={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                      reveal={reveal}
                    />
                  </div>
                ))}
              </div>

              {group.aside && (
                <motion.aside
                  {...reveal}
                  className="mt-4 overflow-hidden rounded-[1.5rem] border border-dashed border-brand-ink/25 bg-brand-paper p-6 sm:p-7"
                >
                  <p className="text-xs font-black tracking-[0.14em] text-brand-accent">{group.aside.period}</p>
                  <h4 className="mt-2 text-xl font-black tracking-[-0.03em]">{group.aside.title}</h4>
                  <p className="mt-3 text-sm leading-7 text-brand-ink/62">{group.aside.blurb}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setAsideOpen((open) => !open)}
                      aria-expanded={asideOpen}
                      className="inline-flex items-center gap-2 text-sm font-black"
                    >
                      자세히 보기
                      <ChevronDown size={16} className={`transition-transform ${asideOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <a href={group.aside.href} className="inline-flex items-center gap-2 text-sm font-black text-brand-accent">
                      {group.aside.hrefLabel} <ArrowRight size={14} />
                    </a>
                  </div>
                  <AnimatePresence initial={false}>
                    {asideOpen && (
                      <motion.div
                        initial={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.35 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-5 rounded-2xl bg-white p-5">
                          <DetailBody detail={group.aside.details} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.aside>
              )}

              <div className="mt-6">
                <InquiryButton />
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
