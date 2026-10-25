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
  BIZ_INFO,
  CONSULT_DATE_MAX,
  CONSULT_DATE_MIN,
  CONSULT_TIMES,
  COST_GUIDE,
  FAQS,
  GRADES,
  PAGE_META,
  PAY_GUIDE,
  PROGRAM_STEPS,
  REFUND_ITEMS,
  JINRO_RELATED_ARTICLES,
  RESOURCES_HREF,
  SCHEDULE_CARDS,
  SCHOOL_REGIONS,
  formatPhone,
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
  const [slots, setSlots] = useState(emptySlots);
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
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
      eligibilityConfirmed,
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
        <b>신청 자격</b>서울·경기·인천 외 지역 고등학교 재학생만 신청할 수 있어요 (재학 학교 소재지 기준)
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
          <span className="tag">비수도권 학생 전용 · 시즌 한정</span>
          <h1>희망 전공에서 거꾸로 짜는<br /><em>온라인 진로·선택과목 상담</em></h1>
          <p className="lead">고1·고2 학생의 희망 전공을 먼저 듣고, 앞으로 들을 과목의 이수 경로를 함께 설계해요. 상담이 끝나면 1장짜리 과목 이수 로드맵을 드려요.</p>
          <div className="meta">
            <span>40분 온라인 화상 상담</span>
            <span>과목 이수 로드맵 1장</span>
            <a href={RESOURCES_HREF}>비용은 자료실에서 확인</a>
          </div>
          <p className="slogan">DESIGN YOUR SUCCESS.</p>
        </div>
      </div>

      <section className="alt">
        <div className="wrap">
          <p className="eyebrow">WHY</p>
          <h2>지역과 상관없이 받는 과목 선택 상담</h2>
          <p>과목 선택은 학교 안에서 정해지지만, 필요한 정보는 학교 밖에 흩어져 있는 경우가 많아요. 사는 지역 때문에 상담 기회가 적었다면 온라인으로 차근차근 짚어 드릴게요.</p>
          <div className="stat">
            <div className="num">59.5<small>%</small></div>
            <p>비수도권 수시 지원자의 59.5%가 정보 격차를 느꼈다고 답했어요.<span className="src">출처: 진학사 2025 조사, 응답자 기준</span></p>
          </div>
        </div>
      </section>

      <section id="구성">
        <div className="wrap">
          <p className="eyebrow">PROGRAM</p>
          <h2>상담 구성</h2>
          <p>제출 자료를 미리 읽고 들어가서, 40분을 학생 이야기에 집중해서 써요.</p>
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
          <h2>일정 안내</h2>
          <p>이번 시즌에만 운영하는 상담이에요.</p>
          <div className="info">
            {SCHEDULE_CARDS.map((card) => (
              <div className="card" key={card.h}>
                <h3>{card.h}</h3>
                <div className={`big${card.red ? ' red' : ''}`}>{card.big}</div>
                <p>
                  {card.h === '비용'
                    ? <>회원가입 후 <a href={RESOURCES_HREF}>자료실</a>에서 확인하실 수 있어요.</>
                    : card.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="alt" id="자격">
        <div className="wrap">
          <p className="eyebrow">APPLY</p>
          <h2>신청하기</h2>
          <p>아래 항목을 신청서에 적어 주시면, 문자로 상담 일정을 조율해 드려요. {COST_GUIDE}</p>

          {submitted ? (
            <div className="form-success" role="status">
              <h3>신청이 접수되었어요</h3>
              <p>문자로 상담 일정을 조율해 드릴게요. 일정이 확정되면 입금 안내를 보내 드려요. 입금 계좌는 그때 문자에서만 안내합니다.</p>
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
                    <input id="school" type="text" placeholder="예: ○○고등학교" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
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
                    <textarea id="worry" placeholder="과목 선택에서 걱정되는 점을 편하게 적어 주세요" value={question} onChange={(e) => setQuestion(e.target.value)} />
                  </div>
                  <div className="f full">
                    <span className="lb">희망 일정 (편한 날짜와 시작 시간을 세 가지 적어 주세요)<span className="req">*</span></span>
                    <p className="hint">상담은 오후 3시 시작부터 밤 11시 시작까지 가능해요. 문자로 일정을 조율한 뒤, 확정될 때 입금해 주세요.</p>
                  </div>
                  {slots.map((slot, index) => (
                    <Fragment key={`slot-${index}`}>
                      <div className="f">
                        <label htmlFor={`d${index + 1}`}>희망 일정 {index + 1} · 날짜<span className="req">*</span></label>
                        <input
                          id={`d${index + 1}`}
                          type="date"
                          min={CONSULT_DATE_MIN}
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
                      <input type="checkbox" checked={eligibilityConfirmed} onChange={(e) => setEligibilityConfirmed(e.target.checked)} required />
                      <span><b>자격 확인</b><span className="req">*</span> 학생은 서울·경기·인천 외 지역에 있는 고등학교에 재학 중이에요.</span>
                    </label>
                  </div>
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
                <div className="elig-box" style={{ marginTop: 0 }}>
                  <strong>신청 자격을 확인해 주세요</strong>
                  <p>서울·경기·인천 외 지역 고등학교 재학생(고1·고2)만 신청할 수 있어요. 기준은 거주지가 아니라 재학 중인 학교의 소재지예요.</p>
                </div>
                {user ? (
                  <button className="btn" type="submit" disabled={submitting}>
                    {submitting ? '신청서를 저장하는 중…' : '온라인 진로·선택과목 상담 신청하기'}
                  </button>
                ) : (
                  <button className="btn" type="button" onClick={openApply}>로그인하고 신청하기</button>
                )}
                <p className="btn-note">신청 기간 2026. 11. 10 ~ 12. 10 · {COST_GUIDE}</p>
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

      <nav className="related" aria-label="자료실">
        {JINRO_RELATED_ARTICLES.map((article) => (
          <a key={article.id} href={`/resources/${article.id}`}>{article.title}</a>
        ))}
      </nav>

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
