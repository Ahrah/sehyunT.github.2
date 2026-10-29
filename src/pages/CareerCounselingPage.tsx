import { FormEvent, Fragment, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { User as FirebaseUser } from 'firebase/auth';
import { loadPretendard } from '../config/site';
import {
  ensureCareerAuth,
  signOutCareer,
  submitCareerApplication,
  watchCareerAuth,
} from '../lib/careerCounselingSession';
import {
  APPLY_INTRO,
  APPLY_SUCCESS_BODY,
  BIZ_INFO,
  CONSULT_DATE_MAX,
  CONSULT_TIMES,
  COST_GUIDE,
  ELIGIBILITY_NOTE,
  FAQS,
  GRADES,
  HERO_COPY,
  PAGE_META,
  PAY_GUIDE,
  PROGRAM_INTRO,
  PROGRAM_STEPS,
  QUESTION_PLACEHOLDER,
  REFUND_ITEMS,
  SCHEDULE_CARDS,
  SCHEDULE_TITLE,
  SCHOOL_PLACEHOLDER,
  SCHOOL_REGIONS,
  SUBMIT_LABEL,
  WHY_COPY,
  consultDateMin,
  consultSlotHint,
  formatPhone,
  msUntilNextKstMidnight,
  toCareerCounselingRecord,
  validateCareerCounselingForm,
} from '../lib/careerCounseling';
import './career-counseling.css';

const CareerCounselingAuthGate = lazy(() => import('./CareerCounselingAuthGate'));

function afterIdle(fn: () => void, timeout: number) {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 1);
  return () => window.clearTimeout(id);
}

const emptySlots = [
  { date: '', time: '' },
  { date: '', time: '' },
  { date: '', time: '' },
] as [{ date: string; time: string }, { date: string; time: string }, { date: string; time: string }];

export const CareerCounselingPage = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [childName, setChildName] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolRegion, setSchoolRegion] = useState('');
  const [grade, setGrade] = useState('');
  const [careerGoal, setCareerGoal] = useState('');
  const [question, setQuestion] = useState('');
  const [consultNow, setConsultNow] = useState(() => Date.now());
  const [slots, setSlots] = useState(emptySlots);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const pendingApply = useRef(false);

  useEffect(() => {
    if (!document.querySelector('link[href*="pretendard"]')) {
      loadPretendard();
    }
    document.title = PAGE_META.title;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', PAGE_META.description);
  }, []);

  useEffect(() => {
    const unsub = watchCareerAuth((currentUser, profile) => {
      setUser(currentUser);
      if (!currentUser) {
        setChildName('');
        return;
      }
      setChildName(profile.childName);
      setPhone((prev) => prev || formatPhone(profile.phone));
      if (pendingApply.current) {
        pendingApply.current = false;
        document.getElementById('신청서')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
    const cancelIdle = afterIdle(() => {
      void ensureCareerAuth();
    }, 2500);
    return () => {
      unsub();
      cancelIdle();
    };
  }, []);

  useEffect(() => {
    let id = 0;
    const arm = () => {
      const now = Date.now();
      setConsultNow(now);
      id = window.setTimeout(arm, msUntilNextKstMidnight(now) + 50);
    };
    arm();
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    document.body.style.overflow = authOpen ? 'hidden' : 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [authOpen]);

  const openApply = () => {
    if (!user) {
      pendingApply.current = true;
      void ensureCareerAuth();
      setAuthOpen(true);
      return;
    }
    document.getElementById('신청서')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateSlot = (index: number, key: 'date' | 'time', value: string) => {
    setSlots((prev) => {
      const next = [...prev] as typeof emptySlots;
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      pendingApply.current = true;
      void ensureCareerAuth();
      setAuthOpen(true);
      return;
    }

    const payload = {
      userId: user.uid,
      email: user.email || '',
      childName,
      schoolName,
      schoolRegion,
      grade: grade as (typeof GRADES)[number],
      careerGoal,
      preferredSlots: slots,
      phone,
      question,
      privacyAgreed,
    };

    const validationError = validateCareerCounselingForm(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await submitCareerApplication(toCareerCounselingRecord(payload));
      setSubmitted(true);
      document.getElementById('자격')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || '신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cc-page">
      {authOpen
        ? createPortal(
            <Suspense fallback={null}>
              <CareerCounselingAuthGate open onClose={() => setAuthOpen(false)} />
            </Suspense>,
            document.body
          )
        : null}

      <div className="elig-bar" role="note">
        <b>{ELIGIBILITY_NOTE.label}</b>{ELIGIBILITY_NOTE.text}
      </div>

      <header className="top">
        <div className="wrap">
          <a className="brand" href="/">
            <img src="/logo-mark.svg" alt="" width={40} height={40} />
            <span className="en"><strong>SEHYUN T</strong><span>ADMISSIONS LAB</span></span>
          </a>
          <div className="top-actions">
            <a className="top-call" href={BIZ_INFO.phoneHref}>{BIZ_INFO.phone}</a>
            {user ? (
              <button type="button" className="top-auth" onClick={() => void signOutCareer()}>로그아웃</button>
            ) : (
              <button type="button" className="top-auth" onClick={() => setAuthOpen(true)}>로그인</button>
            )}
          </div>
        </div>
      </header>

      <div className="hero">
        <div className="wrap">
          <span className="tag">{HERO_COPY.tag}</span>
          <h1>{HERO_COPY.titleBefore}<br /><em>{HERO_COPY.titleEm}</em></h1>
          <p className="lead">{HERO_COPY.lead}</p>
          <div className="meta">
            {HERO_COPY.chips.map((chip) => <span key={chip}>{chip}</span>)}
          </div>
          <p className="slogan">DESIGN YOUR SUCCESS.</p>
        </div>
      </div>

      <section className="alt">
        <div className="wrap">
          <p className="eyebrow">WHY</p>
          <h2>{WHY_COPY.title}</h2>
          {WHY_COPY.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </section>

      <section id="구성">
        <div className="wrap">
          <p className="eyebrow">PROGRAM</p>
          <h2>{PROGRAM_INTRO.title}</h2>
          <p>{PROGRAM_INTRO.text}</p>
          <div className="steps">
            {PROGRAM_STEPS.map((step) => (
              <div className={`step${step.main ? ' main' : ''}`} key={step.title}>
                <span className="n">{step.n}</span>
                <h3>{step.title}</h3>
                <ul>
                  {step.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gb" id="일정">
        <div className="wrap">
          <p className="eyebrow">SCHEDULE</p>
          <h2>{SCHEDULE_TITLE}</h2>
          <div className="info">
            {SCHEDULE_CARDS.map((card) => (
              <div className="card" key={card.h}>
                <h3>{card.h}</h3>
                <div className={`big${card.red ? ' red' : ''}`}>{card.big}</div>
                <p>{card.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="alt" id="자격">
        <div className="wrap">
          <p className="eyebrow">APPLY</p>
          <h2>신청하기</h2>
          <p>{APPLY_INTRO} {COST_GUIDE}</p>

          {submitted ? (
            <div className="form-success" role="status">
              <h3>신청이 접수되었어요</h3>
              <p>{APPLY_SUCCESS_BODY}</p>
            </div>
          ) : (
            <form className="apply" id="신청서" onSubmit={onSubmit}>
              {user ? (
                <div className="f full">
                  <span className="lb">신청 계정</span>
                  <div className="account-chip">
                    {childName || '회원'} · {user.email}
                    <span className="hint" style={{ display: 'block' }}>이름과 이메일은 회원가입 정보를 사용해요. 문자 수신 번호만 확인하고 수정해 주세요.</span>
                  </div>
                </div>
              ) : null}

              {user ? (
                <>
                  <div className="f">
                    <label htmlFor="tel">문자 수신 가능한 휴대폰 번호<span className="req">*</span></label>
                    <input
                      id="tel"
                      type="tel"
                      placeholder="010-0000-0000"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      required
                    />
                    <p className="hint">가입 시 등록한 번호예요. 일정 조율·입금 안내용으로 확인하고 필요하면 수정해 주세요.</p>
                  </div>
                  <div className="f">
                    <label htmlFor="school">재학 학교명<span className="req">*</span></label>
                    <input id="school" type="text" placeholder={SCHOOL_PLACEHOLDER} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
                  </div>
                  <div className="f">
                    <label htmlFor="sido">학교 소재 시·도<span className="req">*</span></label>
                    <select id="sido" value={schoolRegion} onChange={(e) => setSchoolRegion(e.target.value)} required>
                      <option value="">선택해 주세요</option>
                      {SCHOOL_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
                    </select>
                  </div>
                  <div className="f">
                    <span className="lb">학년<span className="req">*</span></span>
                    <div className="radios">
                      {GRADES.map((item) => (
                        <label key={item}>
                          <input type="radio" name="grade" value={item} checked={grade === item} onChange={() => setGrade(item)} required />
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="f">
                    <label htmlFor="major">희망 진로<span className="req">*</span></label>
                    <input id="major" type="text" placeholder="아직 고민 중이면 후보를 적어 주세요" value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} required />
                  </div>
                  <div className="f full">
                    <label htmlFor="worry">질문(고민)</label>
                    <textarea id="worry" placeholder={QUESTION_PLACEHOLDER} value={question} onChange={(e) => setQuestion(e.target.value)} />
                  </div>
                  <div className="f full">
                    <span className="lb">희망 일정 (편한 날짜와 시작 시간을 세 가지 적어 주세요)<span className="req">*</span></span>
                    <p className="hint">{consultSlotHint(consultNow)}</p>
                  </div>
                  {slots.map((slot, index) => (
                    <Fragment key={`slot-${index}`}>
                      <div className="f">
                        <label htmlFor={`d${index + 1}`}>희망 일정 {index + 1} · 날짜<span className="req">*</span></label>
                        <input
                          id={`d${index + 1}`}
                          type="date"
                          min={consultDateMin(consultNow)}
                          max={CONSULT_DATE_MAX}
                          value={slot.date}
                          onChange={(e) => updateSlot(index, 'date', e.target.value)}
                          required
                        />
                      </div>
                      <div className="f">
                        <label htmlFor={`t${index + 1}`}>희망 일정 {index + 1} · 시작 시간<span className="req">*</span></label>
                        <select id={`t${index + 1}`} value={slot.time} onChange={(e) => updateSlot(index, 'time', e.target.value)} required>
                          <option value="">선택해 주세요</option>
                          {CONSULT_TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                      </div>
                    </Fragment>
                  ))}
                  <div className="f full check">
                    <label>
                      <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} required />
                      <span><b>개인정보 수집·이용 동의</b><span className="req">*</span> 상담 신청 확인과 일정 안내를 위해 위 정보를 수집·이용하는 데 동의해요.</span>
                    </label>
                  </div>
                </>
              ) : null}

              <p className="f full pay-guide">{PAY_GUIDE}</p>
              <div className="f full refund">
                <b>환불 안내</b>
                <ul>
                  {REFUND_ITEMS.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              {error ? <p className="f full form-error" role="alert">{error}</p> : null}
              <div className="f full">
                {user ? (
                  <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? '신청서를 저장하는 중…' : SUBMIT_LABEL}
                  </button>
                ) : (
                  <button className="btn" type="button" onClick={openApply}>로그인하고 신청하기</button>
                )}
                <p className="btn-note">{COST_GUIDE}</p>
              </div>
            </form>
          )}
        </div>
      </section>

      <section id="faq">
        <div className="wrap">
          <p className="eyebrow">FAQ</p>
          <h2>자주 묻는 질문</h2>
          <div className="faq">
            {FAQS.map((item, index) => (
              <details key={item.q} open={index === 0}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="site">
        <div className="wrap">
          <div>
            <strong>SEHYUN T ADMISSIONS LAB</strong><br />
            입시는세연쌤 · <span className="sl">DESIGN YOUR SUCCESS.</span>
          </div>
          <div>
            문의 <a href={BIZ_INFO.phoneHref}>{BIZ_INFO.phone}</a> · <a href={`mailto:${BIZ_INFO.email}`}>{BIZ_INFO.email}</a>
            <br />
            <a href="https://sehyunt.re.kr">sehyunt.re.kr</a> · Instagram {BIZ_INFO.instagram}
          </div>
          <div className="biz">
            <b>사업자 정보</b>
            <ul>
              <li>상호 {BIZ_INFO.name}</li>
              <li>대표 {BIZ_INFO.ceo}</li>
              <li>사업장 주소 {BIZ_INFO.address}</li>
              <li>전화 {BIZ_INFO.phone}</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};
