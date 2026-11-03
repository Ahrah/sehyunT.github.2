import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { SITE, loadPretendard } from '../config/site';
import {
  EMPTY_EXTRA_REQUEST,
  EMPTY_FORM,
  EXTRA_REQUEST_PURPOSE,
  MI_CONFIG,
  MI_STATUS,
  OPEN_LABEL,
  OTHER_CHOICE,
  type MiExtraRequest,
  type MiForm,
  type SlotSummary,
  formatDateLabel,
  formatMonthDay,
  formatShortKst,
  isOpen,
  validateExtraRequest,
  validateForm,
  wishDateOf,
  wishTimeOf,
} from '../lib/mockInterview';
import {
  type SubmitResponse,
  fetchStatus,
  isLiveSiteWithoutBackend,
  isTestMode,
  previewNowOverride,
  resetMock,
  seedWaitlistDemo,
  submitApplication,
  submitExtraRequest,
} from '../lib/mockInterviewApi';
import './mock-interview.css';

const FEE_LABEL = `${MI_CONFIG.fee.toLocaleString('ko-KR')}원`;
const PHOTO_REQUIRED = MI_CONFIG.photoConsentRequired;
const KEEP_UNTIL_LABEL = formatMonthDay(MI_CONFIG.extraRequestKeepUntil);
const EXTRA_TITLE = '추가 날짜·시간 오픈 신청';

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
  const [orForm, setOrForm] = useState<MiExtraRequest>(EMPTY_EXTRA_REQUEST);
  const [orErrors, setOrErrors] = useState<string[]>([]);
  const [orSending, setOrSending] = useState(false);
  const [orDone, setOrDone] = useState('');

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
    setForm((f) => ({ ...f, date: s.date, time: s.time }));
    setResult(null);
    document.getElementById('mi-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setOr = <K extends keyof MiExtraRequest>(key: K, value: MiExtraRequest[K]) =>
    setOrForm((f) => ({ ...f, [key]: value }));

  const pickExtraRequest = (date: string) => {
    if (!open) return;
    setOrForm((f) => ({ ...f, date }));
    setOrDone('');
    setOrErrors([]);
    document.getElementById('mi-extra-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onExtraRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!open) return;
    const errs = validateExtraRequest(orForm);
    setOrErrors(errs);
    if (errs.length) return;
    setOrSending(true);
    try {
      const res = await submitExtraRequest(orForm, now);
      if (!res.ok) setOrErrors([res.error || '추가 오픈 신청을 저장하지 못했습니다.']);
      else {
        const d = wishDateOf(orForm);
        const dateLabel = orForm.date === OTHER_CHOICE ? d : formatDateLabel(d);
        setOrDone(`${dateLabel} ${wishTimeOf(orForm)}`);
        setOrForm(EMPTY_EXTRA_REQUEST);
      }
    } catch {
      setOrErrors(['보내지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.']);
    } finally {
      setOrSending(false);
    }
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
          <button
            type="button"
            onClick={() => {
              seedWaitlistDemo(now);
              void refresh();
            }}
          >
            대기 예시 채우기
          </button>
          {!isOpen(now) && <a href="?now=2026-11-09T21:01">오픈 뒤 화면 보기</a>}
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
            16시·17시·18시에 신청을 받습니다. 타임마다 {MI_CONFIG.capacity}명까지 예약합니다. 자리가 다 차면 버튼이 '대기
            신청'으로 바뀝니다.
          </p>
          <p className="mi-note">
            다른 날짜나 시간을 원하면 '{EXTRA_TITLE}'에 원하는 날짜·시간과 연락처를 남겨 주세요. 신청이 모이면 타임을 더
            열고 연락드립니다.
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
                    const active = form.date === date && form.time === time;
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
                  <button
                    type="button"
                    className={`mi-slot is-request${orForm.date === date ? ' is-active' : ''}`}
                    disabled={!open}
                    onClick={() => pickExtraRequest(date)}
                  >
                    <span className="mi-slot-time">다른 시간</span>
                    <span className="mi-slot-left">추가 오픈 신청</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="mi-extra-link" disabled={!open} onClick={() => pickExtraRequest(OTHER_CHOICE)}>
            목록에 없는 날짜를 원하면: {EXTRA_TITLE}
          </button>
        </section>

        <section className="mi-section" id="mi-extra-request" aria-labelledby="mi-xr-title">
          <h2 id="mi-xr-title">{EXTRA_TITLE}</h2>
          <p>
            16시·17시·18시 말고 원하는 날짜와 시간이 있으면 남겨 주세요. 목록에서 고르거나 직접 적을 수 있습니다. 신청이
            모이면 타임을 더 열고, 빈자리나 추가 타임이 생기면 남긴 연락처로 알려 드립니다.
          </p>
          <p className="mi-note">추가 오픈 신청은 자리를 잡지 않고, 입금도 하지 않습니다.</p>
          {orDone ? (
            <p className="mi-result-inline" role="status">
              {orDone} 추가 오픈 신청을 받았습니다. 타임을 열거나 빈자리가 생기면 연락드립니다.
            </p>
          ) : (
            <form onSubmit={onExtraRequest} noValidate>
              <fieldset disabled={!open || orSending} className="mi-fieldset">
                <div className="mi-grid">
                  <label>
                    원하는 날짜
                    <select value={orForm.date} onChange={(e) => setOr('date', e.target.value)}>
                      <option value="">고르세요</option>
                      {MI_CONFIG.dates.map((d) => (
                        <option key={d} value={d}>{formatDateLabel(d)}</option>
                      ))}
                      <option value={OTHER_CHOICE}>다른 날짜(직접 적기)</option>
                    </select>
                  </label>
                  {orForm.date === OTHER_CHOICE && (
                    <label>
                      날짜 직접 적기
                      <input value={orForm.dateText} maxLength={40} placeholder="예: 12/26(토)" onChange={(e) => setOr('dateText', e.target.value)} />
                    </label>
                  )}
                  <label>
                    원하는 시간
                    <select value={orForm.time} onChange={(e) => setOr('time', e.target.value)}>
                      <option value="">고르세요</option>
                      {MI_CONFIG.extraRequestTimes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value={OTHER_CHOICE}>다른 시간(직접 적기)</option>
                    </select>
                  </label>
                  {orForm.time === OTHER_CHOICE && (
                    <label>
                      시간 직접 적기
                      <input value={orForm.timeText} maxLength={40} placeholder="예: 오전 아무 때나" onChange={(e) => setOr('timeText', e.target.value)} />
                    </label>
                  )}
                  <label>이름<input value={orForm.name} placeholder="학생 또는 학부모 이름" onChange={(e) => setOr('name', e.target.value)} /></label>
                  <label>연락처<input value={orForm.phone} inputMode="tel" placeholder="010-0000-0000" onChange={(e) => setOr('phone', e.target.value)} /></label>
                  <label className="mi-hp" aria-hidden="true">
                    website<input tabIndex={-1} autoComplete="off" value={orForm.website} onChange={(e) => setOr('website', e.target.value)} />
                  </label>
                </div>
                <label className="mi-check">
                  <input type="checkbox" checked={orForm.under14} onChange={(e) => setOr('under14', e.target.checked)} />
                  학생이 만 14세 미만입니다.
                </label>
                {orForm.under14 && (
                  <div className="mi-guardian">
                    <div className="mi-grid">
                      <label>보호자 이름<input value={orForm.guardianName} onChange={(e) => setOr('guardianName', e.target.value)} /></label>
                      <label>보호자 연락처<input value={orForm.guardianPhone} inputMode="tel" onChange={(e) => setOr('guardianPhone', e.target.value)} /></label>
                    </div>
                    <label className="mi-check">
                      <input type="checkbox" checked={orForm.guardianConsent} onChange={(e) => setOr('guardianConsent', e.target.checked)} />
                      (필수) 법정대리인으로서 아래 동의 내용을 읽고 학생의 신청에 동의합니다.
                    </label>
                    <p className="mi-note">만 14세 미만 학생은 보호자 동의가 있어야 신청할 수 있습니다.</p>
                  </div>
                )}
                <Consent
                  checked={orForm.consentPrivacy}
                  onChange={(v) => setOr('consentPrivacy', v)}
                  title="(필수) 개인정보 수집·이용 동의"
                >
                  <li>수집 항목: 이름, 연락처, 원하는 날짜·시간. 만 14세 미만은 보호자 이름·연락처.</li>
                  <li>이용 목적: {EXTRA_REQUEST_PURPOSE}. 빈자리가 나거나 추가 타임을 열면 알려 드립니다.</li>
                  <li>보관 기간: {KEEP_UNTIL_LABEL}까지 보관 후 삭제합니다.</li>
                  <li>동의하지 않을 수 있습니다. 동의하지 않으면 추가 오픈 신청을 할 수 없습니다.</li>
                </Consent>
                {orErrors.length > 0 && (
                  <ul className="mi-error" role="alert">
                    {orErrors.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                )}
                <button type="submit" className="mi-submit mi-submit-light">
                  {!open ? OPEN_LABEL : orSending ? '보내는 중…' : '추가 오픈 신청하기'}
                </button>
              </fieldset>
            </form>
          )}
        </section>

        <section className="mi-section" aria-labelledby="mi-pay-title">
          <h2 id="mi-pay-title">입금은 언제까지 해야 하나요?</h2>
          <ul className="mi-list">
            <li>계좌이체로만 받습니다. 계좌: <b>{MI_CONFIG.bankAccount}</b></li>
            <li>신청 후 1시간 안에 {FEE_LABEL}을 입금해 주세요. 입금자명은 신청서에 적은 입금자명과 같게 해 주세요.</li>
            <li>1시간은 은행에 찍힌 입금 시각으로 판단합니다. 밤에 입금해도 1시간 안이면 됩니다.</li>
            <li>세연쌤이 입금을 확인하면 예약이 확정됩니다. 확정 연락을 드립니다.</li>
            <li>1시간 안에 입금하지 않으면 신청이 자동으로 취소되고 대기 1번 학생에게 자리가 넘어갑니다.</li>
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
              {
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
              }

              <div className="mi-grid">
                <label>학생 이름<input value={form.studentName} onChange={(e) => set('studentName', e.target.value)} autoComplete="name" /></label>
                <label>지원 학교<input value={form.school} placeholder="예: ○○외국어고등학교" onChange={(e) => set('school', e.target.value)} /></label>
                <label>지원 전형<input value={form.track} placeholder="예: 일반전형, 사회통합전형" onChange={(e) => set('track', e.target.value)} /></label>
                <label>휴대폰<input value={form.phone} inputMode="tel" placeholder="010-0000-0000" onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></label>
                <label>입금자명<input value={form.depositor} placeholder="입금할 때 쓰는 이름" onChange={(e) => set('depositor', e.target.value)} /></label>
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
                    : selectedIsWaitlist
                        ? '대기 신청하기'
                        : '신청하기'}
              </button>
            </fieldset>
          </form>
        </section>

        <section className="mi-section" aria-labelledby="mi-refund-title">
          <h2 id="mi-refund-title">취소와 환불은 어떻게 하나요?</h2>
          {MI_CONFIG.refundDraft && <p className="mi-placeholder">확정 전 초안입니다. 문구가 바뀔 수 있습니다.</p>}
          <RefundList />
        </section>

        <section className="mi-section" aria-labelledby="mi-qna-title">
          <h2 id="mi-qna-title">자주 묻는 질문</h2>
          <div className="mi-qna">
            <Qna q="모의면접은 보통 몇 번 신청하나요?">
              평균적으로 모의면접을 5회 정도 신청하고, 외대부고는 8회 정도 신청합니다.
            </Qna>
            <Qna q="수강료는 얼마인가요?">
              1회 {FEE_LABEL}입니다. 1시간이고, 대기 시간과 공통문항 푸는 시간이 들어 있습니다.
            </Qna>
            <Qna q="입금은 언제까지 하나요?">
              신청 후 1시간 안에 {MI_CONFIG.bankAccount}로 입금해 주세요. 1시간은 은행에 찍힌 입금 시각으로 판단합니다.
              1시간 안에 입금하지 않으면 신청이 자동으로 취소되고 대기 1번 학생에게 자리가 넘어갑니다. 세연쌤이 입금을 확인하면
              예약이 확정됩니다.
            </Qna>
            <Qna q="서류는 무엇을 언제 보내나요?">
              면접 1주 전까지 생기부와 자소서를 {MI_CONFIG.docsEmail}으로 보내 주세요. 메일 제목에 학생 이름과 면접 날짜를
              적어 주세요. 보내지 않으면 예약이 취소되고 대기자에게 넘어갑니다. 이때 낸 금액은 모두 돌려 드립니다.
            </Qna>
            <Qna q="취소하면 환불되나요?">
              면접 시작 전에 취소하면 낸 금액을 모두 돌려 드립니다. 문자나 카카오채널로 알려 주세요. 연락이 도착한 시각을
              기준으로 합니다. 자세한 내용은 위 환불 안내를 봐 주세요.
            </Qna>
            <Qna q="16·17·18시 말고 다른 날짜나 시간에도 받을 수 있나요?">
              '{EXTRA_TITLE}'에 원하는 날짜와 시간, 이름, 연락처를 남겨 주세요. 목록에 없으면 직접 적을 수 있습니다.
              신청이 모이면 타임을 더 열고 연락드립니다. 입금은 하지 않으며, 연락처는 {KEEP_UNTIL_LABEL}까지 보관 후
              삭제합니다.
            </Qna>
          </div>
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

function Qna({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="mi-qna-item">
      <summary>{q}</summary>
      <p>{children}</p>
    </details>
  );
}

/** 환불 안내. 초안(/workspace 환불규정_초안.md)의 확정 전 내용입니다. 규정을 고치면 여기와 Q&A 를 함께 고칩니다. */
export const REFUND_RULES: string[] = [
  `수강료는 1회 ${FEE_LABEL}입니다. 환불은 입금하신 계좌로 사유가 생긴 날부터 5일 안에 돌려 드립니다.`,
  '면접 시작 전에 취소하면 낸 금액을 모두 돌려 드립니다. 문자나 카카오채널로 알려 주세요.',
  '면접 시작 후 20분이 지나기 전에 그만두면 3분의 2, 30분이 지나기 전에 그만두면 2분의 1을 돌려 드립니다. 30분이 지나면 돌려 드리지 않습니다.',
  '면접 1주 전까지 서류가 오지 않아 취소되면 낸 금액을 모두 돌려 드립니다.',
  '입금 기한(신청 후 1시간)이 지난 뒤 입금하셨다면 세연쌤이 확인한 뒤 연락드립니다. 그 타임에 자리가 없으면 그 금액을 모두 돌려 드립니다.',
  '대기 신청과 추가 날짜·시간 오픈 신청은 입금하지 않습니다. 돌려 드릴 금액도 없습니다.',
  '면접 3일 전 밤 12시까지 요청하면 12월 일정 중 남은 자리로 한 번 바꿀 수 있습니다.',
  '세연쌤 사정으로 면접을 열지 못하면 낸 금액을 모두 돌려 드립니다.',
];

function RefundList() {
  return (
    <ul className="mi-list">
      {REFUND_RULES.map((t) => <li key={t}>{t}</li>)}
    </ul>
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
      <p className="mi-strong">신청 후 1시간 안에 입금해 주세요. 세연쌤이 입금을 확인하면 예약이 확정됩니다.</p>
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
