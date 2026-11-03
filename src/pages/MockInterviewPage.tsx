import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { SITE, loadPretendard } from '../config/site';
import {
  EMPTY_FORM,
  EMPTY_WISH,
  EXTRA_REQUEST_PURPOSE,
  MI_CONFIG,
  MI_STATUS,
  OPEN_LABEL,
  OTHER_CHOICE,
  type MiForm,
  type MiWish,
  type SlotSummary,
  extraRequestFrom,
  formatDateLabel,
  formatMonthDay,
  formatShortKst,
  isOpen,
  normalizePhone,
  sortSlots,
  toggleSlot,
  toggleValue,
  validateForm,
  validateWish,
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

/** 01012345678 → 010-1234-5678. 모양이 다르면 적은 그대로 보여 줍니다. */
function displayPhone(phone: string): string {
  const d = normalizePhone(phone);
  return /^01\d{8,9}$/.test(d) ? d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : phone;
}

const FEE_LABEL = `${MI_CONFIG.fee.toLocaleString('ko-KR')}원`;
const PHOTO_REQUIRED = MI_CONFIG.photoConsentRequired;
const KEEP_UNTIL_LABEL = formatMonthDay(MI_CONFIG.extraRequestKeepUntil);
const EXTRA_TITLE = '추가 날짜·시간 오픈 신청';
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

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

/** 신청완료 화면에 넘기는 값: 서버 결과(정규 타임을 신청한 경우)와 보낸 신청서 */
type Done = { res: SubmitResponse | null; form: MiForm };

const isWaitSlot = (s: SlotSummary | undefined) => !!s && (s.left === 0 || s.waitlist > 0);

export function MockInterviewPage() {
  const [now, overridden] = useNow();
  const notReady = isLiveSiteWithoutBackend();
  const open = isOpen(now) && !notReady;
  const [slots, setSlots] = useState<SlotSummary[]>([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<MiForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    loadPretendard();
  }, []);

  // 신청완료 화면에서 브라우저 '뒤로'를 누르면 신청 화면으로 돌아갑니다.
  useEffect(() => {
    const onPop = () => {
      if (window.location.hash !== '#done') setDone(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
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

  // 누르면 고르고, 다시 누르면 뺍니다. 여러 타임을 고를 수 있으므로 화면을 옮기지 않습니다.
  const pickSlot = (s: SlotSummary) => {
    if (!open || s.closed) return;
    setForm((f) => ({ ...f, slots: toggleSlot(f.slots, s.date, s.time) }));
  };
  const pickExtra = (date: string) => {
    if (!open) return;
    setForm((f) => ({ ...f, extraDates: toggleValue(f.extraDates, date) }));
  };

  const booking = form.slots.length > 0;
  const extraOnly = !booking && form.extraDates.length > 0;
  const picked = sortSlots(form.slots);
  const pickedWait = picked.filter((x) => isWaitSlot(slots.find((s) => s.date === x.date && s.time === x.time)));
  const pickedPay = picked.length - pickedWait.length;

  const showDone = (d: Done) => {
    setDone(d);
    try {
      window.history.pushState({ miDone: true }, '', `${window.location.pathname}${window.location.search}#done`);
    } catch {
      /* noop */
    }
    window.scrollTo({ top: 0 });
  };

  const backToForm = () => {
    setDone(null);
    if (window.location.hash === '#done') {
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      } catch {
        /* noop */
      }
    }
    void refresh();
    window.scrollTo({ top: 0 });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!open) return;
    const errs = validateForm(form);
    setErrors(errs);
    if (errs.length) return;
    // 추가 오픈 신청만 하면 신청완료 화면에서 원하는 날짜·시간을 고른 뒤 한 번에 보냅니다.
    if (!booking) {
      showDone({ res: null, form });
      setForm(EMPTY_FORM);
      return;
    }
    setSending(true);
    try {
      const res = await submitApplication(form, now);
      if (!res.ok) {
        setErrors([res.error || '신청을 저장하지 못했습니다.']);
      } else {
        showDone({ res, form });
        setForm(EMPTY_FORM);
        void refresh();
      }
    } catch {
      setErrors(['신청을 보내지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.']);
    } finally {
      setSending(false);
    }
  };

  const submitLabel = !open
    ? notReady && isOpen(now) ? '신청 접수 준비 중입니다' : OPEN_LABEL
    : sending
      ? '보내는 중…'
      : extraOnly
        ? '다음: 원하는 날짜·시간 고르기'
        : booking && pickedPay === 0
          ? '대기 신청하기'
          : '신청하기';

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
              backToForm();
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

      {done ? (
        <DoneScreen done={done} now={now} open={open} onBack={backToForm} />
      ) : (
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

        <section className="mi-section" aria-labelledby="mi-slots-title">
          <h2 id="mi-slots-title">어느 날짜에 신청할 수 있나요?</h2>
          <p className="mi-note">
            16시·17시·18시에 신청을 받습니다. 타임마다 {MI_CONFIG.capacity}명까지 예약합니다. 원하는 타임을 모두 눌러
            고르세요. 다시 누르면 선택이 풀립니다. 자리가 다 찬 타임은 버튼이 '대기 신청'으로 바뀝니다.
          </p>
          <p className="mi-note">
            다른 날짜나 시간을 원하면 '추가 오픈 신청'을 눌러 고른 뒤 신청서를 보내 주세요. 신청완료 화면에서 원하는
            날짜와 시간을 고를 수 있습니다. 신청이 모이면 타임을 더 열고 연락드립니다.
          </p>
          {loadError && <p className="mi-error">{loadError}</p>}
          <div className="mi-days">
            {MI_CONFIG.dates.map((date) => (
              <div key={date} className="mi-day">
                <h3>{formatDateLabel(date)}</h3>
                <div className="mi-slot-row">
                  {MI_CONFIG.times.map((time) => {
                    const s = slots.find((x) => x.date === date && x.time === time);
                    const waitlist = isWaitSlot(s);
                    const active = form.slots.some((x) => x.date === date && x.time === time);
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
                        <span className="mi-slot-time">{active ? `✓ ${time}` : time}</span>
                        <span className="mi-slot-left">
                          {!s ? '불러오는 중' : s.closed ? '마감' : waitlist ? (s.waitlist ? `대기 신청 (대기 ${s.waitlist}명)` : '대기 신청') : `남은 자리 ${s.left}/${s.capacity}`}
                        </span>
                      </button>
                    );
                  })}
                  <ExtraToggle active={form.extraDates.includes(date)} disabled={!open} onClick={() => pickExtra(date)} />
                </div>
              </div>
            ))}
          </div>
          <ExtraToggle
            wide
            label="목록에 없는 날짜"
            active={form.extraDates.includes(OTHER_CHOICE)}
            disabled={!open}
            onClick={() => pickExtra(OTHER_CHOICE)}
          />
        </section>

        <section className="mi-section" id="mi-form" aria-labelledby="mi-form-title">
          <h2 id="mi-form-title">신청서</h2>
          {!open && <p className="mi-open-badge">{notReady && isOpen(now) ? '신청 접수 준비 중입니다' : OPEN_LABEL}</p>}
          <form onSubmit={onSubmit} noValidate>
            <fieldset disabled={!open || sending} className="mi-fieldset">
              <div className="mi-picked" aria-live="polite">
                <p className="mi-picked-title">고른 타임</p>
                {picked.length ? (
                  <ul className="mi-chips">
                    {picked.map((x) => {
                      const w = pickedWait.includes(x);
                      return (
                        <li key={`${x.date} ${x.time}`} className={w ? 'is-wait' : ''}>
                          {formatDateLabel(x.date)} {x.time}
                          {w ? ' · 대기' : ''}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mi-note">위 날짜에서 원하는 타임을 눌러 고르세요. 여러 타임을 고를 수 있습니다.</p>
                )}
                {form.extraDates.length > 0 && (
                  <p className="mi-note">
                    추가 오픈 신청:{' '}
                    {[...MI_CONFIG.dates.filter((d) => form.extraDates.includes(d)).map(formatDateLabel),
                      ...(form.extraDates.includes(OTHER_CHOICE) ? ['목록에 없는 날짜'] : [])].join(', ')}
                    {' '}(원하는 시간은 신청완료 화면에서 고릅니다)
                  </p>
                )}
                {pickedPay > 0 && (
                  <p className="mi-note">
                    입금할 금액: {won(pickedPay * MI_CONFIG.fee)}({FEE_LABEL} × {pickedPay}타임). 정확한 금액과 계좌는
                    신청완료 화면에 나옵니다.
                  </p>
                )}
                {pickedWait.length > 0 && (
                  <p className="mi-note">대기로 접수되는 타임은 지금 입금하지 않습니다. 자리가 나면 연락드립니다.</p>
                )}
              </div>

              <div className="mi-grid">
                <label>학생 이름<input value={form.studentName} onChange={(e) => set('studentName', e.target.value)} autoComplete="name" /></label>
                <label>지원 학교<input value={form.school} placeholder="예: ○○외국어고등학교" onChange={(e) => set('school', e.target.value)} /></label>
                <label>지원 전형<input value={form.track} placeholder="예: 일반전형, 사회통합전형" onChange={(e) => set('track', e.target.value)} /></label>
                <label>휴대폰<input value={form.phone} inputMode="tel" placeholder="010-0000-0000" onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></label>
                {!extraOnly && (
                  <label>입금자명<input value={form.depositor} placeholder="입금할 때 쓰는 이름" onChange={(e) => set('depositor', e.target.value)} /></label>
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
                  <li>수집 항목: 학생 이름, 지원 학교, 지원 전형, 휴대폰 번호, 입금자명, 이메일로 보내 주신 생기부·자소서와 보낸 이메일 주소. 만 14세 미만은 보호자 이름·연락처. 추가 날짜·시간 오픈을 신청하면 원하는 날짜와 시간.</li>
                  <li>이용 목적: 모의면접 예약과 입금 확인, 일정 연락, 면접 질문 준비, 피드백과 보고서 작성.</li>
                  <li>보관 기간: 면접 후 6개월. 기간이 지나면 파기합니다.</li>
                  <li>추가 날짜·시간 오픈을 신청한 경우: 이름, 연락처, 원하는 날짜와 시간을 {EXTRA_REQUEST_PURPOSE} 목적으로 {KEEP_UNTIL_LABEL}까지 보관 후 삭제합니다.</li>
                  <li>동의하지 않을 수 있습니다. 동의하지 않으면 모의면접을 신청할 수 없습니다.</li>
                </Consent>
                {!extraOnly && (
                  <>
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
                  </>
                )}
              </div>

              {errors.length > 0 && (
                <ul className="mi-error" role="alert">
                  {errors.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}

              <button type="submit" className="mi-submit">{submitLabel}</button>
            </fieldset>
          </form>
        </section>

        <RefundSection />
        <QnaSection />
      </main>
      )}

      <footer className="mi-footer">
        <div className="mi-wrap">
          <p>입시는세연쌤 / 대표: {SITE.founder}</p>
          <p>사업자등록번호 {SITE.businessNumber} · {SITE.address} · {SITE.phone}</p>
        </div>
      </footer>
    </div>
  );
}

function ExtraToggle({
  active,
  disabled,
  onClick,
  label,
  wide,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label?: string;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      className={`mi-slot is-request${active ? ' is-active' : ''}${wide ? ' is-wide' : ''}`}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
    >
      {label && <span className="mi-slot-time">{active ? `✓ ${label}` : label}</span>}
      <span className={label ? 'mi-slot-left' : 'mi-slot-time'}>{!label && active ? '✓ 추가 오픈 신청' : '추가 오픈 신청'}</span>
    </button>
  );
}

function RefundSection() {
  return (
    <section className="mi-section" aria-labelledby="mi-refund-title">
      <h2 id="mi-refund-title">취소와 환불은 어떻게 하나요?</h2>
      {MI_CONFIG.refundDraft && <p className="mi-placeholder">확정 전 초안입니다. 문구가 바뀔 수 있습니다.</p>}
      <RefundList />
    </section>
  );
}

function QnaSection() {
  return (
    <section className="mi-section" aria-labelledby="mi-qna-title">
      <h2 id="mi-qna-title">자주 묻는 질문</h2>
      <div className="mi-qna">
        <Qna q="모의면접은 보통 몇 번 신청하나요?">
          평균적으로 모의면접을 5회 정도 신청하고, 외대부고는 8회 정도 신청합니다.
        </Qna>
        <Qna q="여러 타임을 한 번에 신청할 수 있나요?">
          네. 원하는 타임을 모두 눌러 고른 뒤 신청서를 한 번 보내면 됩니다. 입금은 자리를 잡은 타임 수만큼(타임마다{' '}
          {FEE_LABEL}) 한 번에 보내 주세요. 대기로 접수된 타임은 자리가 나면 그때 따로 입금합니다.
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
          원하는 날짜의 '추가 오픈 신청'(목록에 없으면 '목록에 없는 날짜')을 눌러 고른 뒤 신청서를 보내 주세요.
          신청완료 화면에서 원하는 날짜와 시간을 여러 개 고르거나 직접 적을 수 있습니다. 신청이 모이면 타임을 더 열고
          연락드립니다. 입금은 하지 않으며, 연락처는 {KEEP_UNTIL_LABEL}까지 보관 후 삭제합니다.
        </Qna>
      </div>
    </section>
  );
}

function DoneScreen({ done, now, open, onBack }: { done: Done; now: number; open: boolean; onBack: () => void }) {
  const { res, form } = done;
  const items = res?.items ?? [];
  const pending = items.filter((x) => x.status === MI_STATUS.pending);
  const waiting = items.filter((x) => x.status === MI_STATUS.waitlist);
  const amount = res?.amount ?? pending.length * MI_CONFIG.fee;
  const wantsExtra = form.extraDates.length > 0;
  const bookingDone = items.length > 0;
  return (
    <main className="mi-wrap">
      <section className="mi-hero mi-done-hero" role="status">
        <p className="mi-eyebrow">신청완료</p>
        <h1>{bookingDone ? '모의면접 신청이 접수되었습니다' : `${EXTRA_TITLE}: 원하는 날짜와 시간을 골라 주세요`}</h1>
        {bookingDone ? (
          <p className="mi-lead">
            {pending.length
              ? '아래 계좌로 1시간 안에 입금해 주세요. 세연쌤이 입금을 확인하면 예약이 확정되고 문자로 알려 드립니다.'
              : '고른 타임은 모두 대기로 접수되었습니다. 아직 입금하지 마세요. 자리가 나면 연락드립니다.'}
          </p>
        ) : (
          <p className="mi-lead">아래에서 원하는 날짜와 시간을 고르고 보내 주세요. 보내야 추가 오픈 신청이 접수됩니다.</p>
        )}
      </section>

      {bookingDone && (
        <section className="mi-section" aria-labelledby="mi-done-items">
          <h2 id="mi-done-items">신청 내용</h2>
          <p>신청번호 <b>{res?.id}</b></p>
          <ul className="mi-done-list">
            {items.map((x) => (
              <li key={x.id} className={x.status === MI_STATUS.waitlist ? 'is-wait' : ''}>
                <span>{formatDateLabel(x.date)} {x.time}</span>
                <b>{x.status === MI_STATUS.waitlist ? `대기 ${x.waitlistPosition ?? ''}번` : '입금 대기'}</b>
              </li>
            ))}
          </ul>
          <p className="mi-note">학생 {form.studentName} · {form.school} · {form.track}</p>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mi-section mi-pay" aria-labelledby="mi-done-pay">
          <h2 id="mi-done-pay">1시간 안에 입금해 주세요</h2>
          <dl className="mi-pay-grid">
            <dt>입금할 금액</dt>
            <dd><b>{won(amount)}</b>{pending.length > 1 ? ` (${FEE_LABEL} × ${pending.length}타임, 한 번에 입금)` : ''}</dd>
            <dt>은행</dt>
            <dd>{MI_CONFIG.bankName}</dd>
            <dt>계좌번호</dt>
            <dd><b>{MI_CONFIG.bankNumber}</b></dd>
            <dt>예금주</dt>
            <dd>{MI_CONFIG.bankHolder}</dd>
            <dt>입금자명</dt>
            <dd>{form.depositor}</dd>
            <dt>입금 기한</dt>
            <dd><b>{res?.payDeadline != null ? `${formatShortKst(res.payDeadline)} (한국 시간)` : '신청 후 1시간'}</b></dd>
          </dl>
          <p className="mi-strong">1시간 안에 입금하지 않으면 신청이 자동으로 취소되고 대기 1번 학생에게 자리가 넘어갑니다.</p>
          <p className="mi-note">입금자명이 다르면 확인이 늦어집니다. 신청서에 적은 입금자명으로 보내 주세요.</p>
        </section>
      )}

      {bookingDone && (
        <section className="mi-section" aria-labelledby="mi-done-next">
          <h2 id="mi-done-next">다음 단계</h2>
          <ol className="mi-list">
            {pending.length > 0 && <li>위 계좌로 {won(amount)}을 입금 기한까지 보냅니다.</li>}
            {pending.length > 0 && <li>세연쌤이 입금을 확인하면 예약이 확정되고 문자로 알려 드립니다.</li>}
            <li>
              면접 1주 전까지 생기부와 자소서를 {MI_CONFIG.docsEmail}으로 보냅니다. 메일 제목에 학생 이름과 면접 날짜를
              적어 주세요. 보내지 않으면 예약이 취소되고 대기자에게 넘어갑니다.
            </li>
            {waiting.length > 0 && (
              <li>대기 타임은 앞 순서에서 자리가 나면 연락드립니다. 그때부터 1시간 안에 입금하면 확정됩니다.</li>
            )}
          </ol>
        </section>
      )}

      {wantsExtra && <WishPicker form={form} applicationId={res?.id ?? ''} now={now} open={open} />}

      <RefundSection />
      <QnaSection />

      <p className="mi-back">
        <button type="button" className="mi-extra-link" onClick={onBack}>신청 화면으로 돌아가기</button>
      </p>
    </main>
  );
}

function WishPicker({ form, applicationId, now, open }: { form: MiForm; applicationId: string; now: number; open: boolean }) {
  const [wish, setWish] = useState<MiWish>(() => ({
    ...EMPTY_WISH,
    dates: MI_CONFIG.dates.filter((d) => form.extraDates.includes(d)),
  }));
  const [errs, setErrs] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ id: string; dates: string; times: string } | null>(null);
  const otherDate = form.extraDates.includes(OTHER_CHOICE);

  const onSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!open) return;
    const v = validateWish(wish);
    setErrs(v);
    if (v.length) return;
    setSending(true);
    try {
      const r = await submitExtraRequest(extraRequestFrom(form, wish, applicationId), now);
      if (!r.ok) setErrs([r.error || '추가 오픈 신청을 저장하지 못했습니다.']);
      else {
        const dates = wishDateOf(wish)
          .split(', ')
          .map((d) => ((MI_CONFIG.dates as readonly string[]).includes(d) ? formatDateLabel(d) : d))
          .join(', ');
        setSent({ id: r.id ?? '', dates, times: wishTimeOf(wish) });
      }
    } catch {
      setErrs(['보내지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.']);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mi-section mi-wish" id="mi-extra-request" aria-labelledby="mi-xr-title">
      <h2 id="mi-xr-title">{EXTRA_TITLE}</h2>
      {sent ? (
        <div className="mi-result-inline" role="status">
          <p>추가 오픈 신청을 받았습니다{sent.id ? `(신청번호 ${sent.id})` : ''}.</p>
          <p>원하는 날짜: {sent.dates}</p>
          <p>원하는 시간: {sent.times}</p>
          <p>타임을 열거나 빈자리가 생기면 {displayPhone(form.phone)}로 연락드립니다.</p>
        </div>
      ) : (
        <form onSubmit={onSend} noValidate>
          <fieldset disabled={!open || sending} className="mi-fieldset">
            <p className="mi-note">
              원하는 날짜와 시간을 모두 고르세요. 여러 개를 고를 수 있고, 목록에 없으면 직접 적을 수 있습니다. 추가 오픈
              신청은 자리를 잡지 않고, 입금도 하지 않습니다.
            </p>
            <div>
              <p className="mi-picked-title">원하는 날짜</p>
              <div className="mi-chip-picks">
                {MI_CONFIG.dates.map((d) => (
                  <label key={d} className={`mi-chip-pick${wish.dates.includes(d) ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={wish.dates.includes(d)}
                      onChange={() => setWish((w) => ({ ...w, dates: toggleValue(w.dates, d) }))}
                    />
                    {formatDateLabel(d)}
                  </label>
                ))}
              </div>
              <label className="mi-block mi-wish-text">
                {otherDate ? '목록에 없는 날짜(직접 적기)' : '다른 날짜(직접 적기, 선택)'}
                <input
                  value={wish.dateText}
                  maxLength={40}
                  placeholder="예: 12/26(토), 12/27(일)"
                  onChange={(e) => setWish((w) => ({ ...w, dateText: e.target.value }))}
                />
              </label>
            </div>
            <div>
              <p className="mi-picked-title">원하는 시간</p>
              <div className="mi-chip-picks">
                {MI_CONFIG.extraRequestTimes.map((t) => (
                  <label key={t} className={`mi-chip-pick${wish.times.includes(t) ? ' is-on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={wish.times.includes(t)}
                      onChange={() => setWish((w) => ({ ...w, times: toggleValue(w.times, t) }))}
                    />
                    {t}
                  </label>
                ))}
              </div>
              <label className="mi-block mi-wish-text">
                다른 시간(직접 적기, 선택)
                <input
                  value={wish.timeText}
                  maxLength={40}
                  placeholder="예: 오전 아무 때나"
                  onChange={(e) => setWish((w) => ({ ...w, timeText: e.target.value }))}
                />
              </label>
            </div>
            <p className="mi-note">
              연락처는 신청서에 적은 {form.studentName} · {displayPhone(form.phone)}을 씁니다. {KEEP_UNTIL_LABEL}까지 보관 후 삭제합니다.
            </p>
            {errs.length > 0 && (
              <ul className="mi-error" role="alert">
                {errs.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}
            <button type="submit" className="mi-submit mi-submit-light">
              {sending ? '보내는 중…' : '추가 오픈 신청 보내기'}
            </button>
          </fieldset>
        </form>
      )}
    </section>
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

