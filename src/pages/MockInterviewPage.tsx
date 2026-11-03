import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SITE, loadPretendard } from '../config/site';
import {
  EMPTY_FORM,
  EMPTY_WISH,
  MI_CONFIG,
  MI_STATUS,
  OPEN_LABEL,
  OTHER_CHOICE,
  type MiForm,
  type MiWish,
  type PublicSlot,
  CANCEL_INQUIRY,
  checkLinkSearch,
  extraRequestFrom,
  setExtraSlots,
  formatDateLabel,
  formatMonthDay,
  formatShortKst,
  isOpen,
  msUntilOpen,
  normalizePhone,
  sortSlots,
  statusLabel,
  toggleSlot,
  toggleValue,
  validateForm,
  validateWish,
  wishDateOf,
  wishTimeOf,
} from '../lib/mockInterview';
import {
  type SubmitResponse,
  fetchCheck,
  fetchStatus,
  isLiveSiteWithoutBackend,
  isTestMode,
  previewNowOverride,
  resetMock,
  seedWaitlistDemo,
  submitApplication,
  submitExtraRequest,
} from '../lib/mockInterviewApi';
import { type MemberProfile, type PrefillMap, applyMemberPrefill, loadMemberProfile } from '../lib/memberPrefill';
import { MockInterviewAdmin } from '../components/MockInterviewAdmin';
import './mock-interview.css';

/** 회원 프로필 → 신청서 칸: 학생 이름(childName) → 학생이름(입금자명), 휴대폰 → 휴대폰 */
const MI_PREFILL: PrefillMap<MiForm> = { name: 'studentName', phone: 'phone' };

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

/**
 * 화면 시각. 서버(Apps Script)가 알려 준 시각과 이 기기 시계의 차이를 더해 씁니다(기기 시계가 틀려도 같은 시각에 열림).
 * 15초마다 다시 읽고, 오픈 15초 전부터는 오픈 시각에 맞춰 한 번 더 깨어나 새로고침 없이 바로 열립니다.
 */
function useNow(): [number, boolean, (serverNow: number) => void] {
  const override = useMemo(() => (typeof window === 'undefined' ? null : previewNowOverride(window.location.search)), []);
  const skew = useRef(0);
  const [now, setNow] = useState(() => override ?? Date.now());
  useEffect(() => {
    if (override != null) return;
    let id = 0;
    const tick = () => {
      const t = Date.now() + skew.current;
      setNow(t);
      const until = msUntilOpen(t);
      id = window.setTimeout(tick, until > 0 && until < 15000 ? until + 50 : 15000);
    };
    tick();
    return () => window.clearTimeout(id);
  }, [override]);
  const setServerNow = useCallback(
    (serverNow: number) => {
      if (override != null || !Number.isFinite(serverNow)) return;
      skew.current = serverNow - Date.now();
    },
    [override],
  );
  return [now, override != null, setServerNow];
}

/** 신청완료 화면에 넘기는 값: 서버 결과(정규 타임을 신청한 경우)와, 방금 보낸 신청서(다시 연 화면이면 없음) */
type Done = { res: SubmitResponse | null; form: MiForm | null };

/** 이 브라우저에 남겨 두는 마지막 신청(신청완료 화면을 닫아도 다시 열면 보입니다) */
const SAVED_KEY = 'mi-last-application-v1';
type Saved = { id: string; token: string; res: SubmitResponse; savedAt: number };

function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    return s && s.id && s.token && s.res ? s : null;
  } catch {
    return null;
  }
}
function saveDone(res: SubmitResponse) {
  if (!res.id || !res.token) return;
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify({ id: res.id, token: res.token, res, savedAt: Date.now() } satisfies Saved));
  } catch {
    /* 저장 공간이 없으면 확인 링크로만 다시 봅니다. */
  }
}
function clearSaved() {
  try {
    localStorage.removeItem(SAVED_KEY);
  } catch {
    /* noop */
  }
}
function checkUrlOf(res: SubmitResponse | null): string {
  if (!res?.id || !res.token || typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}${checkLinkSearch(res.id, res.token)}`;
}

/** 취소 안내 한 줄(카카오채널로 문의) */
const CANCEL_LINE = `${CANCEL_INQUIRY} 연락이 도착한 시각을 기준으로 합니다.`;

/** /mock-interview/?admin 이면 관리자 화면, 아니면 신청 화면 */
export function MockInterviewPage() {
  const admin = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('admin');
  return admin ? <MockInterviewAdmin /> : <MockInterviewApply />;
}

function MockInterviewApply() {
  const [now, overridden, setServerNow] = useNow();
  const notReady = isLiveSiteWithoutBackend();
  const open = isOpen(now) && !notReady;
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState<MiForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [checkError, setCheckError] = useState('');

  useEffect(() => {
    loadPretendard();
  }, []);

  // 확인 링크(?check=&k=)로 열었거나, 이 브라우저에 남은 신청이 있으면 신청완료 화면을 다시 보여 주고 지금 상태로 새로 읽습니다.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get('check');
    const k = q.get('k');
    const saved = loadSaved();
    const target = id && k ? { id, token: k } : saved;
    if (!target) return;
    if (!(id && k) && saved) setDone({ res: saved.res, form: null });
    let alive = true;
    fetchCheck(target.id, target.token, now)
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setDone({ res: r, form: null });
          if (saved && saved.id === r.id) saveDone(r);
          setCheckError('');
        } else if (id && k) setCheckError(r.error || '신청을 찾지 못했습니다.');
      })
      .catch(() => {
        if (alive && id && k) setCheckError('신청 상태를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.');
      });
    return () => {
      alive = false;
    };
    // 처음 한 번만 읽습니다.
  }, []);

  // 신청완료 화면에서 브라우저 '뒤로'를 누르면 신청 화면으로 돌아갑니다(남겨 둔 신청은 그대로 둡니다).
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
        // 관리자가 연 추가 타임도 신청할 수 있게 합니다.
        setExtraSlots(res.extraSlots ?? []);
        setSlots(res.slots);
        setServerNow(res.now);
        setLoadError('');
      } else setLoadError(res.error || '신청할 수 있는 타임을 불러오지 못했습니다.');
    } catch {
      setLoadError('신청할 수 있는 타임을 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.');
    }
  }, [now, setServerNow]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 로그인한 회원이면 이름·휴대폰을 미리 채웁니다. 이미 적은 칸은 그대로 두고, 채운 칸도 고칠 수 있습니다.
  const touched = useRef(new Set<keyof MiForm>());
  const member = useRef<MemberProfile | null>(null);
  useEffect(() => {
    let alive = true;
    void loadMemberProfile({ allowPreviewMember: isTestMode() }).then((profile) => {
      if (!alive || !profile) return;
      member.current = profile;
      setForm((f) => applyMemberPrefill(f, profile, MI_PREFILL, touched.current));
    });
    return () => {
      alive = false;
    };
  }, []);

  /** 신청을 보낸 뒤 빈 신청서로 돌립니다. 회원이면 이름·휴대폰은 다시 채워 둡니다. */
  const resetForm = () => {
    touched.current = new Set();
    setForm(applyMemberPrefill(EMPTY_FORM, member.current, MI_PREFILL));
  };

  const set = <K extends keyof MiForm>(key: K, value: MiForm[K]) => {
    touched.current.add(key);
    setForm((f) => ({ ...f, [key]: value }));
  };

  // 누르면 고르고, 다시 누르면 뺍니다. 여러 타임을 고를 수 있으므로 화면을 옮기지 않습니다.
  const pickSlot = (s: PublicSlot) => {
    if (!open || s.closed) return;
    setForm((f) => ({ ...f, slots: toggleSlot(f.slots, s.date, s.time) }));
  };
  const pickExtra = (date: string) => {
    if (!open) return;
    setForm((f) => ({ ...f, extraDates: toggleValue(f.extraDates, date) }));
  };

  const booking = form.slots.length > 0;
  const extraOnly = !booking && form.extraDates.length > 0;
  // 기본 날짜·시간에 관리자가 연 추가 타임을 더해 날짜별로 보여 줍니다.
  const days = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const d of MI_CONFIG.dates) map.set(d, new Set(MI_CONFIG.times));
    for (const x of slots) (map.get(x.date) ?? map.set(x.date, new Set()).get(x.date)!).add(x.time);
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, t]) => ({ date, times: [...t].sort() }));
  }, [slots]);
  const picked = sortSlots(form.slots);
  const pickedWait = picked.filter((x) => !!slots.find((s) => s.date === x.date && s.time === x.time)?.wait);
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

  /** '새로 신청하기': 이 브라우저에 남긴 신청을 지우고 빈 신청서로 돌아갑니다(확인 링크는 그대로 열립니다). */
  const startNew = () => {
    clearSaved();
    setDone(null);
    setCheckError('');
    try {
      window.history.replaceState(null, '', window.location.pathname + (isTestMode() ? keepNowParam(window.location.search) : ''));
    } catch {
      /* noop */
    }
    void refresh();
    window.scrollTo({ top: 0 });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!open || sending) return;
    const errs = validateForm(form);
    setErrors(errs);
    if (errs.length) return;
    // 추가 오픈 신청만 하면 신청완료 화면에서 원하는 날짜·시간을 고른 뒤 한 번에 보냅니다.
    if (!booking) {
      showDone({ res: null, form });
      resetForm();
      return;
    }
    setSending(true);
    try {
      const res = await submitApplication(form, now);
      if (!res.ok) {
        setErrors([res.error || '신청을 저장하지 못했습니다.']);
      } else {
        saveDone(res);
        showDone({ res, form: res.duplicate ? null : form });
        resetForm();
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
  const badge = !open && <p className="mi-open-badge">{notReady && isOpen(now) ? '신청 접수 준비 중입니다' : OPEN_LABEL}</p>;

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
              startNew();
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

      {checkError && !done ? (
        <main className="mi-wrap">
          <section className="mi-hero" role="alert">
            <h1>신청 확인</h1>
            <p className="mi-lead">{checkError}</p>
            <p className="mi-back">
              <button type="button" className="mi-extra-link" onClick={startNew}>신청 화면으로 가기</button>
            </p>
          </section>
        </main>
      ) : done ? (
        <DoneScreen done={done} now={now} open={open} onNew={startNew} />
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
          </ul>
          {badge}
        </section>

        <form onSubmit={onSubmit} noValidate>
          <section className="mi-section" id="mi-form" aria-labelledby="mi-form-title">
            <h2 id="mi-form-title">신청서</h2>
            {badge}
            <fieldset disabled={!open || sending} className="mi-fieldset">
              <div className="mi-grid">
                <label>학생이름(입금자명)<input value={form.studentName} placeholder="입금할 때도 이 이름을 씁니다" onChange={(e) => set('studentName', e.target.value)} autoComplete="name" /></label>
                <label>지원 학교<input value={form.school} placeholder="예: ○○외국어고등학교" onChange={(e) => set('school', e.target.value)} /></label>
                <label>지원 전형<input value={form.track} placeholder="예: 일반전형, 사회통합전형" onChange={(e) => set('track', e.target.value)} /></label>
                <label>휴대폰<input value={form.phone} inputMode="tel" placeholder="010-0000-0000" onChange={(e) => set('phone', e.target.value)} autoComplete="tel" /></label>
                <label className="mi-hp" aria-hidden="true">
                  website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
                </label>
              </div>

              <div className="mi-consents">
                <Consent
                  checked={form.consentPrivacy}
                  onChange={(v) => set('consentPrivacy', v)}
                  title="(필수) 개인정보 수집·이용 동의"
                >
                  <li>수집 항목: 학생이름(입금자명), 지원 학교, 지원 전형, 휴대폰 번호, 이메일로 보내 주신 생기부·자소서와 보낸 이메일 주소. 추가 날짜·시간 오픈을 신청하면 원하는 날짜와 시간.</li>
                  <li>이용 목적: 모의면접 예약과 입금 확인, 일정 연락, 면접 질문 준비, 피드백과 보고서 작성에 씁니다.</li>
                  <li>보관 기간: 면접 후 6개월. 기간이 지나면 파기합니다.</li>
                  <li>추가 날짜·시간 오픈을 신청한 경우: 이름, 연락처, 원하는 날짜와 시간을 받습니다. 이용 목적: 추가 타임을 열 때 알려 드립니다. {KEEP_UNTIL_LABEL}까지 보관 후 삭제합니다.</li>
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
            </fieldset>
          </section>

          <section className="mi-section" id="mi-slots" aria-labelledby="mi-slots-title">
            <h2 id="mi-slots-title">날짜와 시간 고르기</h2>
            <p className="mi-note">
              16시·17시·18시에 신청을 받습니다. 원하는 타임을 모두 눌러 고르세요. 다시 누르면 선택이 풀립니다.
              '(대기)'로 보이는 타임은 대기로 접수됩니다.
            </p>
            <p className="mi-note">
              다른 날짜나 시간을 원하면 '추가 오픈 신청'을 눌러 고른 뒤 신청서를 보내 주세요. 신청완료 화면에서 원하는
              날짜와 시간을 고를 수 있습니다. 신청이 모이면 타임을 더 열고 연락드립니다.
            </p>
            {loadError && <p className="mi-error">{loadError}</p>}
            <div className="mi-days">
              {days.map(({ date, times }) => (
                <div key={date} className="mi-day">
                  <h3>{formatDateLabel(date)}</h3>
                  <div className="mi-slot-row">
                    {times.map((time) => {
                      const s = slots.find((x) => x.date === date && x.time === time);
                      const waitlist = !!s?.wait;
                      const active = form.slots.some((x) => x.date === date && x.time === time);
                      const disabled = !open || sending || !s || s.closed;
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
                          <span className="mi-slot-left">{!s ? '불러오는 중' : s.closed ? '마감' : waitlist ? '(대기)' : '신청 가능'}</span>
                        </button>
                      );
                    })}
                    {(MI_CONFIG.dates as readonly string[]).includes(date) && (
                      <ExtraToggle active={form.extraDates.includes(date)} disabled={!open || sending} onClick={() => pickExtra(date)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <ExtraToggle
              wide
              label="목록에 없는 날짜"
              active={form.extraDates.includes(OTHER_CHOICE)}
              disabled={!open || sending}
              onClick={() => pickExtra(OTHER_CHOICE)}
            />

            <div className="mi-picked" aria-live="polite">
              <p className="mi-picked-title">고른 타임</p>
              {picked.length ? (
                <ul className="mi-chips">
                  {picked.map((x) => {
                    const w = pickedWait.includes(x);
                    return (
                      <li key={`${x.date} ${x.time}`} className={w ? 'is-wait' : ''}>
                        {formatDateLabel(x.date)} {x.time}
                        {w ? ' (대기)' : ''}
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
                <p className="mi-note">대기로 접수되는 타임은 지금 입금하지 않습니다. 앞선 신청자가 취소하면 대기 순서대로 연락드립니다.</p>
              )}
            </div>

            {errors.length > 0 && (
              <ul className="mi-error" role="alert">
                {errors.map((m) => <li key={m}>{m}</li>)}
              </ul>
            )}

            {booking && (
              <p className="mi-note mi-once">
                신청하기는 한 번만 눌러 주세요. 같은 이름·휴대폰 번호로 같은 타임을 다시 신청하면 새로 접수하지 않고 기존 신청을
                보여 드립니다. 신청완료 화면을 닫았다면 이 브라우저에서 이 페이지를 다시 열거나, 신청완료 화면의 확인 링크를
                열면 입금 안내를 다시 볼 수 있습니다.
              </p>
            )}

            <button type="submit" className="mi-submit" disabled={!open || sending}>{submitLabel}</button>
          </section>
        </form>

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

/** 미리보기에서 ?now= 는 남깁니다. */
function keepNowParam(search: string): string {
  const v = new URLSearchParams(search).get('now');
  return v ? `?now=${encodeURIComponent(v)}` : '';
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
      <RefundList />
    </section>
  );
}

function QnaSection({ refundAbove = false }: { refundAbove?: boolean }) {
  return (
    <section className="mi-section" aria-labelledby="mi-qna-title">
      <h2 id="mi-qna-title">자주 묻는 질문</h2>
      <div className="mi-qna">
        <Qna q="모의면접은 보통 몇 번 신청하나요?">
          평균적으로 모의면접을 5회 정도 신청하고, 외대부고는 8회 정도 신청합니다.
        </Qna>
        <Qna q="여러 타임을 한 번에 신청할 수 있나요?">
          네. 원하는 타임을 모두 눌러 고른 뒤 신청서를 한 번 보내면 됩니다. 입금은 자리를 잡은 타임 수만큼(타임마다{' '}
          {FEE_LABEL}) 한 번에 보내 주세요. 대기로 접수된 타임은 입금 안내 문자를 받은 뒤 따로 입금합니다.
        </Qna>
        <Qna q="수강료는 얼마인가요?">
          1회 {FEE_LABEL}입니다. 1시간이고, 대기 시간과 공통문항 푸는 시간이 들어 있습니다.
        </Qna>
        <Qna q="입금은 언제까지 하나요?">
          신청 후 1시간 이내에 신청 회차당 {FEE_LABEL}을 입금해 주세요. 1시간은 은행에 찍힌 입금 시각으로 판단합니다. 1시간
          안에 입금하지 않으면 신청이 취소되고 대기 1번 학생에게 자리가 넘어갑니다. 입금 후 예약확정 문자를 받으면 예약이
          확정됩니다. 대기로 신청해 입금 안내 문자를 받으셨다면 문자를 받은 때부터 {PROMOTED_HOURS}시간 이내에 입금해 주세요.
          계좌는 신청완료 화면에서 안내합니다.
        </Qna>
        <Qna q="취소하면 환불되나요?">
          면접 10일 전까지 취소하면 낸 금액을 모두 돌려 드립니다. 면접 9일 전부터 7일 전까지는 ⅔, 6일 전부터 5일 전까지는
          ⅓을 돌려 드리고, 4일 전부터와 노쇼는 환불되지 않습니다. {CANCEL_LINE}{' '}
          {refundAbove ? '자세한 내용은 위 환불 안내를 봐 주세요.' : '자세한 환불 기준은 신청 뒤 신청완료 화면에서 안내합니다.'}
        </Qna>
        <Qna q="다른 날짜에도 열리나요?">
          원하는 날짜의 '추가 오픈 신청'(목록에 없으면 '목록에 없는 날짜')을 눌러 고른 뒤 신청서를 보내 주세요.
          신청완료 화면에서 원하는 날짜와 시간을 여러 개 고르거나 직접 적을 수 있습니다. 신청이 모이면 타임을 더 열고
          연락드립니다. 입금은 하지 않으며, 연락처는 {KEEP_UNTIL_LABEL}까지 보관 후 삭제합니다.
        </Qna>
      </div>
    </section>
  );
}

/** 대기로 올라간 뒤 입금 기한(시간) */
const PROMOTED_HOURS = Math.round(MI_CONFIG.promotedPayWindowMs / 3600000);

/** 신청완료 화면: '(대기)' 타임으로 신청한 학생에게 보여 주는 대기 흐름 안내 */
export function waitlistGuideItems(items: readonly { date: string; time: string }[]): string[] {
  const atOpen = items.some((x) => MI_CONFIG.waitlistAtOpen.includes(`${x.date} ${x.time}`));
  const full = items.some((x) => !MI_CONFIG.waitlistAtOpen.includes(`${x.date} ${x.time}`));
  const n = MI_CONFIG.waitlistReleaseCount;
  return [
    '대기 중에는 입금하지 않습니다.',
    ...(atOpen ? [`처음부터 대기로 받는 타임은 대기 신청이 ${n}명이 되면 대기 순서대로 입금 안내 문자를 보내 드립니다.`] : []),
    ...(full ? ['자리가 다 찬 타임은 앞서 신청한 학생이 취소하면 대기 1번부터 순서대로 입금 안내 문자를 보내 드립니다.'] : []),
    `문자를 받은 때부터 ${PROMOTED_HOURS}시간 이내에 입금해 주세요. 입금이 확인되면 예약확정 문자를 보내 드리고 예약이 확정됩니다.`,
    `${PROMOTED_HOURS}시간 안에 입금하지 않으면 신청이 취소되고 다음 대기 학생에게 차례가 넘어갑니다.`,
  ];
}

function WaitlistGuide({ items }: { items: readonly { date: string; time: string }[] }) {
  return (
    <section className="mi-section" aria-labelledby="mi-done-wait">
      <h2 id="mi-done-wait">대기 안내</h2>
      <ul className="mi-list">
        {waitlistGuideItems(items).map((t) => <li key={t}>{t}</li>)}
      </ul>
    </section>
  );
}

/** 신청완료 화면의 입금 안내(11/3 세연님 문구 그대로). 계좌·금액은 설정값에서 넣습니다. */
function PayGuide() {
  return (
    <ul className="mi-list mi-pay-guide">
      <li>계좌이체: {MI_CONFIG.bankAccount}</li>
      <li>신청 후 1시간 이내에 신청 회차당 {FEE_LABEL}을 입금해 주세요. 입금자명은 신청서에 적은 입금자명과 같게 해 주세요.</li>
      <li>1시간은 은행에 찍힌 입금 시각으로 판단합니다.</li>
      <li>
        입금 시 예약이 확정됩니다. 10분 이내로 확정 문자가 오지 않았다면{' '}
        <a href={SITE.kakaoChannelUrl} target="_blank" rel="noreferrer">채널</a>에 문의를 남겨주세요.
      </li>
      <li className="mi-strong">1시간 안에 입금하지 않으면 신청이 취소되고 대기 1번 학생에게 자리가 넘어갑니다.</li>
    </ul>
  );
}

function CheckLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      ref.current?.select();
      setCopied(false);
    }
  };
  return (
    <section className="mi-section mi-checklink" aria-labelledby="mi-done-link">
      <h2 id="mi-done-link">내 신청 확인 링크</h2>
      <p className="mi-note">
        이 링크를 저장해 두면 이 화면을 닫아도 입금 안내와 지금 신청 상태를 다시 볼 수 있습니다. 이 브라우저에서는 이
        페이지를 다시 열어도 보입니다. 링크는 다른 사람에게 보내지 마세요.
      </p>
      <div className="mi-copy-row">
        <input ref={ref} readOnly value={url} aria-label="내 신청 확인 링크" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="mi-copy" onClick={() => void copy()}>{copied ? '복사했습니다' : '링크 복사'}</button>
      </div>
    </section>
  );
}

function DoneScreen({ done, now, open, onNew }: { done: Done; now: number; open: boolean; onNew: () => void }) {
  const { res, form } = done;
  const items = res?.items ?? [];
  const pending = items.filter((x) => x.status === MI_STATUS.pending);
  const waiting = items.filter((x) => x.status === MI_STATUS.waitlist);
  const confirmed = items.filter((x) => x.status === MI_STATUS.confirmed);
  const amount = res?.amount ?? pending.length * MI_CONFIG.fee;
  const wantsExtra = !!form && form.extraDates.length > 0;
  const bookingDone = items.length > 0;
  const checkUrl = checkUrlOf(res);
  const name = res?.studentName || form?.studentName || '';
  const lead = pending.length
    ? '아래 입금 기한까지 입금해 주세요. 입금 후 예약확정 문자를 받으면 예약이 확정됩니다.'
    : waiting.length && !confirmed.length
      ? '고른 타임은 모두 대기로 접수되었습니다. 아직 입금하지 마세요. 아래 대기 안내를 확인해 주세요.'
      : confirmed.length
        ? '예약이 확정된 타임이 있습니다. 아래에서 신청 상태를 확인해 주세요.'
        : '아래에서 신청 상태를 확인해 주세요.';
  return (
    <main className="mi-wrap">
      <section className="mi-hero mi-done-hero" role="status">
        <p className="mi-eyebrow">신청완료</p>
        <h1>{bookingDone ? '모의면접 신청이 접수되었습니다' : `${EXTRA_TITLE}: 원하는 날짜와 시간을 골라 주세요`}</h1>
        {res?.duplicate && (
          <p className="mi-strong">같은 이름·휴대폰 번호로 이미 신청한 타임이 있어 새로 접수하지 않았습니다. 기존 신청 내용을 보여 드립니다.</p>
        )}
        <p className="mi-lead">{bookingDone ? lead : '아래에서 원하는 날짜와 시간을 고르고 보내 주세요. 보내야 추가 오픈 신청이 접수됩니다.'}</p>
      </section>

      {bookingDone && (
        <section className="mi-section" aria-labelledby="mi-done-items">
          <h2 id="mi-done-items">신청 내용</h2>
          <p>신청번호 <b>{res?.id}</b></p>
          <ul className="mi-done-list">
            {items.map((x) => (
              <li key={x.id} className={x.status === MI_STATUS.waitlist ? 'is-wait' : ''}>
                <span>{formatDateLabel(x.date)} {x.time}</span>
                <b>{statusLabel(x.status)}</b>
              </li>
            ))}
          </ul>
          <p className="mi-note">학생 {name}{res?.school || form?.school ? ` · ${res?.school || form?.school}` : ''}{res?.track || form?.track ? ` · ${res?.track || form?.track}` : ''}</p>
        </section>
      )}

      {pending.length > 0 && (
        <section className="mi-section mi-pay" aria-labelledby="mi-done-pay">
          <h2 id="mi-done-pay">입금 안내</h2>
          <dl className="mi-pay-grid">
            <dt>입금할 금액</dt>
            <dd><b>{won(amount)}</b>{pending.length > 1 ? ` (${FEE_LABEL} × ${pending.length}타임, 한 번에 입금)` : ''}</dd>
            <dt>계좌</dt>
            <dd><b>{res?.bankAccount || MI_CONFIG.bankAccount}</b></dd>
            <dt>입금자명</dt>
            <dd>{name}</dd>
            <dt>입금 기한</dt>
            <dd><b>{res?.payDeadline != null ? `${formatShortKst(res.payDeadline)} (한국 시간)` : '신청 후 1시간'}</b></dd>
          </dl>
          <PayGuide />
        </section>
      )}

      {checkUrl && <CheckLink url={checkUrl} />}

      {bookingDone && (pending.length > 0 || waiting.length > 0) && (
        <section className="mi-section" aria-labelledby="mi-done-next">
          <h2 id="mi-done-next">다음 단계</h2>
          <ol className="mi-list">
            {pending.length > 0 && <li>위 계좌로 {won(amount)}을 입금 기한까지 보냅니다.</li>}
            {pending.length > 0 && <li>입금 후 예약확정 문자를 받으면 예약이 확정됩니다.</li>}
            {waiting.length > 0 && (
              <li>대기 타임은 차례가 되면 문자로 알려 드립니다. 문자를 받은 때부터 {PROMOTED_HOURS}시간 이내에 입금해 주세요.</li>
            )}
          </ol>
        </section>
      )}

      {waiting.length > 0 && <WaitlistGuide items={waiting} />}

      {wantsExtra && form && <WishPicker form={form} applicationId={res?.id ?? ''} now={now} open={open} />}

      {bookingDone && (
        <p className="mi-note mi-cancel-inquiry">
          {CANCEL_INQUIRY}{' '}
          <a href={SITE.kakaoChannelUrl} target="_blank" rel="noreferrer">카카오채널 열기</a>
        </p>
      )}

      <RefundSection />
      <QnaSection refundAbove />

      <p className="mi-back">
        <button type="button" className="mi-extra-link" onClick={onNew}>새로 신청하기</button>
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

/**
 * 환불 안내: 세연님 환불 규정 문서(11/3 수정본) 문구입니다. 11/3 추가 결정: 9~8일 전은 7일 전 기준, 6일 전은 5일 전 기준으로 구간을 이어 붙였고, 서류 미제출 항목을 더했습니다.
 * 규정을 고치면 여기와 Q&A 를 함께 고칩니다.
 * 문서의 마지막 항목 번호(10)는 순서대로 8로 적었습니다.
 */
export const REFUND_SECTIONS: { title: string; items: string[] }[] = [
  {
    title: '기본 원칙',
    items: [
      `수강료는 1회 ${FEE_LABEL}입니다.`,
      `입금 계좌: ${MI_CONFIG.bankAccount}. 신청 후 1시간 안에 입금합니다.`,
      '1시간은 은행에 찍힌 입금 시각으로 봅니다.',
      '세연쌤이 입금을 확인한 뒤 예약을 확정합니다. 확정은 문자로 알려 드립니다.',
      '환불은 입금하신 계좌로 돌려 드립니다.',
      '환불 사유가 생긴 날부터 5일 안에 돌려 드립니다.',
    ],
  },
  {
    title: '면접 전에 취소할 때',
    items: [
      '면접 질문 준비가 10일 전부터 이루어집니다. 면접 10일 전까지 취소하면 낸 금액을 모두 돌려 드립니다.',
      CANCEL_LINE,
    ],
  },
  {
    title: '면접 10일 전 이후',
    items: [
      '면접 10일 전까지: 전액 환불',
      '면접 9일 전 ~ 7일 전: ⅔ 환불',
      '면접 6일 전 ~ 5일 전: ⅓ 환불',
      '면접 4일 전부터, 노쇼: 환불 불가',
    ],
  },
  {
    title: '입금 기한을 넘겼을 때',
    items: [
      '신청 후 1시간 안에 입금하지 않으면 신청이 취소됩니다.',
      `대기에서 차례가 되어 입금 안내 문자를 받으셨다면 문자를 받은 때부터 ${Math.round(MI_CONFIG.promotedPayWindowMs / 3600000)}시간 안에 입금합니다.`,
      '기한이 지난 뒤 입금하셔서 신청이 취소되셨다면 전액 환불해드립니다.',
    ],
  },
  { title: '대기 신청', items: ['대기 중에는 입금하지 않습니다.', '대기 중 입금 시 전액 환불해드립니다.'] },
  {
    title: '추가 날짜 및 시간 오픈 신청',
    items: [
      "'열어주세요'는 대기가 없으며, 입금도 하지 않습니다.",
      '새로운 타임이 열리면 남겨 주신 연락처로 알려 드립니다.',
      '남겨 주신 이름·연락처는 12월 20일까지 보관합니다.',
    ],
  },
  {
    title: '일정 변경(1회)',
    items: ['12월 일정 중 남은 자리가 있다면 일정을 한 번 바꿀 수 있습니다.', '바꾼 일정은 다시 바꿀 수 없습니다.', '바꾼 일정을 취소할 때도 2,3번 기준을 적용합니다.'],
  },
  {
    title: '세연쌤 사정으로 진행하지 못할 때',
    items: ['세연쌤 사정으로 면접을 열지 못하면 낸 금액을 모두 돌려 드립니다.', '원하시면 다른 날짜로 옮겨 드립니다.'],
  },
  {
    title: '서류를 내지 않았을 때',
    items: ['서류를 내지 않아도 면접은 그대로 진행합니다. 이때는 당일 즉석 질문으로 진행합니다.'],
  },
];

function RefundList() {
  return (
    <ol className="mi-list mi-refund">
      {REFUND_SECTIONS.map((s) => (
        <li key={s.title}>
          <b>{s.title}</b>
          <ul>
            {s.items.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </li>
      ))}
    </ol>
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

