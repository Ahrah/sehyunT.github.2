import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { SITE, loadPretendard } from '../config/site';
import {
  EMPTY_FORM,
  MI_CONFIG,
  MI_STATUS,
  OPEN_LABEL,
  type MiForm,
  type SlotSummary,
  formatDateLabel,
  formatShortKst,
  isOpen,
  validateForm,
} from '../lib/mockInterview';
import {
  type SubmitResponse,
  fetchStatus,
  isLiveSiteWithoutBackend,
  isTestMode,
  previewNowOverride,
  resetMock,
  submitApplication,
} from '../lib/mockInterviewApi';
import './mock-interview.css';

const FEE_LABEL = `${MI_CONFIG.fee.toLocaleString('ko-KR')}원`;
const PHOTO_REQUIRED = MI_CONFIG.photoConsentRequired;

function useNow(): [number, boolean] {
  const override = useMemo(() => (typeof window === 'undefined' ? null : previewNowOverride(window.location.search)), []);
  const [now, setNow] = useState(() => override ?? Date.now());
  useEffect(() => {
    if (override != null) return;
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, [override]);
  return [now, override != null];
}

export function MockInterviewPage() {
  const [now, overridden] = useNow();
  const notReady = isLiveSiteWithoutBackend();
  const open = isOpen(now) && !notReady;
  const [slots, setSlots] = useState<SlotSummary[]>([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<MiForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResponse | null>(null);

  useEffect(() => {
    loadPretendard();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchStatus(now);
      if (res.ok) {
        setSlots(res.slots);
        setLoadError('');
      } else setLoadError(res.error || '남은 자리를 불러오지 못했습니다.');
    } catch {
      setLoadError('남은 자리를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.');
    }
  }, [now]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const set = <K extends keyof MiForm>(key: K, value: MiForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const pickSlot = (s: SlotSummary) => {
    if (!open || s.closed) return;
    setForm((f) => ({ ...f, kind: '예약', date: s.date, time: s.time }));
    setResult(null);
    document.getElementById('mi-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selected = slots.find((s) => s.date === form.date && s.time === form.time);
  const selectedIsWaitlist = !!selected && (selected.left === 0 || selected.waitlist > 0);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!open) return;
    const errs = validateForm(form);
    setErrors(errs);
    if (errs.length) return;
    setSending(true);
    try {
      const res = await submitApplication(form, now);
      if (!res.ok) {
        setErrors([res.error || '신청을 저장하지 못했습니다.']);
      } else {
        setResult(res);
        setForm(EMPTY_FORM);
        void refresh();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setErrors(['신청을 보내지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.']);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mi-page">
      {isTestMode() && (
        <div className="mi-test-banner" role="status">
          <span>
            미리보기(테스트 모드) · 신청 내용은 이 브라우저에만 저장됩니다
            {overridden ? ` · 화면 시각 ${formatShortKst(now)}` : ''}
          </span>
          <button
            type="button"
            onClick={() => {
              resetMock();
              setResult(null);
              void refresh();
            }}
          >
            테스트 신청 지우기
          </button>
        </div>
      )}

      <header className="mi-top">
        <div className="mi-wrap">
          <a href="/" className="mi-brand">입시는세연쌤</a>
        </div>
      </header>

      <main className="mi-wrap">
        <section className="mi-hero">
          <p className="mi-eyebrow">특목·자사고 면접 대비</p>
          <h1>12월 3:1 모의면접 신청</h1>
          <p className="mi-lead">
            면접관 3명 앞에서 학생 1명이 실제 면접처럼 답합니다. 면접이 끝나면 그 자리에서 피드백을 드리고, 1일 뒤
            보고서를 보내 드립니다.
          </p>
          <ul className="mi-facts">
            <li><b>수강료</b> 1회 {FEE_LABEL}</li>
            <li><b>시간</b> 1시간(대기 시간과 공통문항 푸는 시간 포함)</li>
            <li><b>정원</b> 타임마다 {MI_CONFIG.capacity}명</li>
          </ul>
          {!open && <p className="mi-open-badge">{notReady && isOpen(now) ? '신청 접수 준비 중입니다' : OPEN_LABEL}</p>}
        </section>

        {result && <ResultPanel result={result} />}

        <section className="mi-section" aria-labelledby="mi-slots-title">
          <h2 id="mi-slots-title">어느 날짜에 신청할 수 있나요?</h2>
          <p className="mi-note">
            타임마다 {MI_CONFIG.capacity}명까지 예약합니다. 자리가 다 차면 버튼이 '대기 신청'으로 바뀝니다.
          </p>
          {loadError && <p className="mi-error">{loadError}</p>}
          <div className="mi-days">
            {MI_CONFIG.dates.map((date) => (
              <div key={date} className="mi-day">
                <h3>{formatDateLabel(date)}</h3>
                <div className="mi-slot-row">
                  {MI_CONFIG.times.map((time) => {
                    const s = slots.find((x) => x.date === date && x.time === time);
                    const waitlist = !!s && (s.left === 0 || s.waitlist > 0);
                    const active = form.kind === '예약' && form.date === date && form.time === time;
                    const disabled = !open || !s || s.closed;
                    return (
                      <button
                        key={time}
                        type="button"
                        className={`mi-slot${waitlist ? ' is-wait' : ''}${active ? ' is-active' : ''}`}
                        disabled={disabled}
                        onClick={() => s && pickSlot(s)}
                        aria-pressed={active}
                      >
                        <span className="mi-slot-time">{time}</span>
                        <span className="mi-slot-left">
                          {!s ? '불러오는 중' : s.closed ? '마감' : waitlist ? (s.waitlist ? `대기 신청 (대기 ${s.waitlist}명)` : '대기 신청') : `남은 자리 ${s.left}/${s.capacity}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mi-request-box">
            <h3>오후(13~17시)나 평일을 원하면 어떻게 하나요?</h3>
            <p>
              13~17시와 평일은 요청만 받습니다. 아래 신청서에서 '요청'을 고르고 원하는 날짜·요일·시간을 적어 주세요.
              요청은 예약으로 잡히지 않습니다. 일정을 맞출 수 있으면 세연쌤이 연락드립니다.
            </p>
          </div>
        </section>

        <section className="mi-section" aria-labelledby="mi-pay-title">
          <h2 id="mi-pay-title">입금은 언제까지 해야 하나요?</h2>
          <ul className="mi-list">
            <li>계좌이체로만 받습니다. 계좌: {MI_CONFIG.bankAccount}</li>
            <li>신청 후 1시간 안에 입금해야 예약이 확정됩니다. 입금자명은 신청서에 적은 이름과 같게 해 주세요.</li>
            <li>확정 여부는 은행에 찍힌 입금 시각으로 판단합니다. 밤에 입금해도 1시간 안이면 확정됩니다.</li>
            <li>1시간 안에 입금하지 않으면 신청이 취소되고 대기 1번 학생에게 자리가 넘어갑니다.</li>
          </ul>
        </section>

        <section className="mi-section" aria-labelledby="mi-docs-title">
          <h2 id="mi-docs-title">서류는 언제 보내나요?</h2>
          <p>
            면접 1주 전까지 생기부·자소서를 <a href={`mailto:${MI_CONFIG.docsEmail}`}>{MI_CONFIG.docsEmail}</a>으로
            보내주세요. 보내지 않으면 자동 취소되고 대기자에게 넘어갑니다.
          </p>
          <p className="mi-note">예: 12/12(토) 면접은 12/5(토) 밤 12시 전까지 보내야 합니다.</p>
        </section>

        <section className="mi-section" id="mi-form" aria-labelledby="mi-form-title">
          <h2 id="mi-form-title">신청서</h2>
          {!open && <p className="mi-open-badge">{notReady && isOpen(now) ? '신청 접수 준비 중입니다' : OPEN_LABEL}</p>}
          <form onSubmit={onSubmit} noValidate>
            <fieldset disabled={!open || sending} className="mi-fieldset">
              <div className="mi-kind">
                <label>
                  <input type="radio" name="kind" checked={form.kind === '예약'} onChange={() => set('kind', '예약')} />
                  예약(10·11·12시)
                </label>
                <label>
                  <input type="radio" name="kind" checked={form.kind === '요청'} onChange={() => set('kind', '요청')} />
                  요청(13~17시·평일)
                </label>
              </div>

              {form.kind === '예약' ? (
                <div className="mi-grid">
                  <label>
                    날짜
                    <select value={form.date} onChange={(e) => set('date', e.target.value)}>
                      <option value="">고르세요</option>
                      {MI_CONFIG.dates.map((d) => (
                        <option key={d} value={d}>{formatDateLabel(d)}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    시간
                    <select value={form.time} onChange={(e) => set('time', e.target.value)}>
                      <option value="">고르세요</option>
                      {MI_CONFIG.times.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  {selected && (
                    <p className="mi-note mi-span">
                      {selectedIsWaitlist
                        ? `이 타임은 자리가 다 찼습니다. 신청하면 대기로 접수합니다(지금 대기 ${selected.waitlist}명).`
                        : `이 타임은 남은 자리가 ${selected.left}개입니다.`}
                    </p>
                  )}
                </div>
              ) : (
                <label className="mi-block">
                  원하는 날짜·요일·시간
                  <textarea
                    rows={3}
                    value={form.requestText}
                    placeholder="예: 12/12(토) 14시 또는 평일 수요일 저녁 7시 이후"
                    onChange={(e) => set('requestText', e.target.value)}
                  />
                </label>
              )}

              <div className="mi-grid">
                <label>학생 이름<input value={form.studentName} onChange={(e) => set('studentName', e.target.value)} autoComplete="name" /></label>
                <label>지원 학교<input value={form.school} placeholder="예: ○○외국어고등학교" onChange={(e) => set('school', e.target.value)} /></label>
                <label>지원 전형<input value={form.track} placeholder="예: 일반전형, 사회통합전형" onChange={(e) => set('track', e.target.value)} /></label>
                <label>휴대폰<input value={form.phone} inputMode="tel" placeholder="010-0000-0000" onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></label>
                {form.kind === '예약' && (
                  <label>입금자명<input value={form.depositor} onChange={(e) => set('depositor', e.target.value)} /></label>
                )}
                <label className="mi-hp" aria-hidden="true">
                  website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
                </label>
              </div>

              <label className="mi-check">
                <input type="checkbox" checked={form.under14} onChange={(e) => set('under14', e.target.checked)} />
                학생이 만 14세 미만입니다.
              </label>
              {form.under14 && (
                <div className="mi-guardian">
                  <div className="mi-grid">
                    <label>보호자 이름<input value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} /></label>
                    <label>보호자 연락처<input value={form.guardianPhone} inputMode="tel" onChange={(e) => set('guardianPhone', e.target.value)} /></label>
                  </div>
                  <label className="mi-check">
                    <input type="checkbox" checked={form.guardianConsent} onChange={(e) => set('guardianConsent', e.target.checked)} />
                    (필수) 법정대리인으로서 아래 동의 내용을 읽고 학생의 신청에 동의합니다.
                  </label>
                  <p className="mi-note">만 14세 미만 학생은 보호자 동의가 있어야 신청할 수 있습니다.</p>
                </div>
              )}

              <div className="mi-consents">
                <Consent
                  checked={form.consentPrivacy}
                  onChange={(v) => set('consentPrivacy', v)}
                  title="(필수) 개인정보 수집·이용 동의"
                >
                  <li>수집 항목: 학생 이름, 지원 학교, 지원 전형, 휴대폰 번호, 입금자명, 이메일로 보내 주신 생기부·자소서와 보낸 이메일 주소. 만 14세 미만은 보호자 이름·연락처.</li>
                  <li>이용 목적: 모의면접 예약과 입금 확인, 일정 연락, 면접 질문 준비, 피드백과 보고서 작성.</li>
                  <li>보관 기간: 면접 후 6개월. 기간이 지나면 파기합니다.</li>
                  <li>동의하지 않을 수 있습니다. 동의하지 않으면 모의면접을 신청할 수 없습니다.</li>
                </Consent>
                <Consent
                  checked={form.consentVideo}
                  onChange={(v) => set('consentVideo', v)}
                  title="(필수) 면접 영상 촬영 동의"
                >
                  <li>면접 장면을 영상으로 촬영해 학부모님께 보내 드립니다.</li>
                  <li>영상은 보낸 날로부터 7일 안에 파기합니다. 홍보에는 쓰지 않습니다.</li>
                  <li>동의하지 않을 수 있습니다. 동의하지 않으면 모의면접을 신청할 수 없습니다.</li>
                </Consent>
                <Consent
                  checked={form.consentPhoto}
                  onChange={(v) => set('consentPhoto', v)}
                  title={`(${PHOTO_REQUIRED ? '필수' : '선택'}) 사진 활용 동의`}
                >
                  <li>면접 장면 사진을 얼굴을 모자이크한 뒤 인스타그램, 네이버 블로그, 카카오채널, 홈페이지에 올립니다.</li>
                  <li>사진은 2년 동안 보관한 뒤 파기합니다.</li>
                  <li>동의는 언제든 철회할 수 있습니다. 철회하면 올린 사진을 내립니다.</li>
                  <li>
                    {PHOTO_REQUIRED
                      ? '동의하지 않을 수 있습니다. 동의하지 않으면 모의면접을 신청할 수 없습니다.'
                      : '동의하지 않아도 신청할 수 있습니다.'}
                  </li>
                </Consent>
              </div>

              {errors.length > 0 && (
                <ul className="mi-error" role="alert">
                  {errors.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}

              <button type="submit" className="mi-submit">
                {!open
                  ? notReady && isOpen(now) ? '신청 접수 준비 중입니다' : OPEN_LABEL
                  : sending
                    ? '보내는 중…'
                    : form.kind === '요청'
                      ? '요청 보내기'
                      : selectedIsWaitlist
                        ? '대기 신청하기'
                        : '신청하기'}
              </button>
            </fieldset>
          </form>
        </section>

        <section className="mi-section" aria-labelledby="mi-refund-title">
          <h2 id="mi-refund-title">환불은 어떻게 하나요?</h2>
          <p className="mi-placeholder">[환불 규정 확정 예정]</p>
        </section>
      </main>

      <footer className="mi-footer">
        <div className="mi-wrap">
          <p>입시는세연쌤 / 대표: {SITE.founder}</p>
          <p>사업자등록번호 {SITE.businessNumber} · {SITE.address} · {SITE.phone}</p>
        </div>
      </footer>
    </div>
  );
}

function Consent({
  checked,
  onChange,
  title,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mi-consent">
      <label className="mi-check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{title}</span>
      </label>
      <ul className="mi-list mi-small">{children}</ul>
    </div>
  );
}

function ResultPanel({ result }: { result: SubmitResponse }) {
  if (result.status === MI_STATUS.request) {
    return (
      <section className="mi-result" role="status">
        <h2>요청을 받았습니다.</h2>
        <p>요청은 예약으로 잡히지 않습니다. 일정을 맞출 수 있으면 세연쌤이 연락드립니다.</p>
      </section>
    );
  }
  if (result.status === MI_STATUS.waitlist) {
    return (
      <section className="mi-result is-wait" role="status">
        <h2>대기 {result.waitlistPosition ?? ''}번으로 접수했습니다.</h2>
        <p>
          앞 순서에서 자리가 나면 입금 대기로 바뀌고 세연쌤이 연락드립니다. 그때부터 1시간 안에 입금해야 예약이
          확정됩니다. 아직 입금하지 마세요.
        </p>
      </section>
    );
  }
  return (
    <section className="mi-result" role="status">
      <h2>신청을 받았습니다. 아직 확정 전입니다.</h2>
      <p className="mi-strong">신청 후 1시간 안에 입금해야 예약이 확정됩니다.</p>
      {result.payDeadline != null && <p>입금 기한: <b>{formatShortKst(result.payDeadline)}</b> (한국 시간)</p>}
      <p>계좌: {MI_CONFIG.bankAccount} · 금액: {FEE_LABEL}</p>
      <p>
        면접 1주 전까지 생기부·자소서를 {MI_CONFIG.docsEmail}으로 보내주세요. 보내지 않으면 자동 취소되고 대기자에게
        넘어갑니다.
      </p>
      {result.id && <p className="mi-note">신청번호 {result.id}</p>}
    </section>
  );
}
