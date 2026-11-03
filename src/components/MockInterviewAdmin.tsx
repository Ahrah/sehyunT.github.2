import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadPretendard } from '../config/site';
import {
  MI_STATUS,
  checkNewSlot,
  formatDateLabel,
  formatShortKst,
  normalizePhone,
  openNoticeText,
  statusLabel,
} from '../lib/mockInterview';
import {
  type AdminOp,
  type AdminResponse,
  type AdminRow,
  adminRequest,
  isTestMode,
  previewNowOverride,
  seedExtraRequestDemo,
  seedWaitlistDemo,
} from '../lib/mockInterviewApi';
import '../pages/mock-interview.css';

/**
 * 모의면접 관리자 화면(/mock-interview/?admin).
 * 실제 모드에서는 Apps Script 스크립트 속성 MI_ADMIN_KEY 와 같은 관리자 키를 넣어야 열립니다.
 * 키는 이 탭(sessionStorage)에만 두고, 탭을 닫으면 지워집니다.
 */
const KEY_STORE = 'mi-admin-key';
type Tab = 'rows' | 'extra' | 'open';

const phoneLabel = (p: string) => {
  const d = normalizePhone(p);
  return /^01\d{8,9}$/.test(d) ? d.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3') : p;
};

function useNoindex() {
  useEffect(() => {
    const m = document.createElement('meta');
    m.name = 'robots';
    m.content = 'noindex, nofollow';
    document.head.appendChild(m);
    const title = document.title;
    document.title = '모의면접 관리 | 입시는세연쌤';
    return () => {
      m.remove();
      document.title = title;
    };
  }, []);
}

export function MockInterviewAdmin() {
  useNoindex();
  useEffect(() => loadPretendard(), []);
  const test = isTestMode();
  const nowOf = useCallback(() => (typeof window === 'undefined' ? Date.now() : previewNowOverride(window.location.search) ?? Date.now()), []);
  const [key, setKey] = useState(() => {
    try {
      return sessionStorage.getItem(KEY_STORE) ?? '';
    } catch {
      return '';
    }
  });
  const [keyInput, setKeyInput] = useState('');
  const [data, setData] = useState<AdminResponse | null>(null);
  const [tab, setTab] = useState<Tab>('rows');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [showCancelled, setShowCancelled] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('16:00');
  const [audience, setAudience] = useState<'date' | 'all'>('date');

  const run = useCallback(
    async (req: AdminOp) => {
      setBusy(true);
      setErr('');
      try {
        const r = await adminRequest(key, req, nowOf());
        if (!r.ok) {
          setErr(r.error || '처리하지 못했습니다.');
          if (!test && /키/.test(r.error || '')) setKey('');
          return null;
        }
        setData(r);
        return r;
      } catch {
        setErr('서버에 연결하지 못했습니다. 잠시 뒤 다시 해 주세요.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [key, nowOf, test],
  );

  useEffect(() => {
    if (test || key) void run({ op: 'list' });
  }, [test, key, run]);

  const rows = useMemo(() => {
    const list = (data?.rows ?? []).filter((r) => showCancelled || r.status !== MI_STATUS.cancelled);
    return [...list].sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`) || a.appliedAt - b.appliedAt);
  }, [data, showCancelled]);

  const cancelRow = async (r: AdminRow) => {
    const ok = window.confirm(
      `${r.studentName || r.id} 학생의 ${formatDateLabel(r.date)} ${r.time} 신청을 취소할까요?\n` +
        '입금 대기·예약확정이었다면 대기 1번 학생이 입금 대기로 올라가고 입금 안내 [문자발송] 메일이 나갑니다.',
    );
    if (!ok) return;
    const res = await run({ op: 'cancel', id: r.id });
    if (!res) return;
    if (res.already) setMsg(`${r.id}은 이미 취소된 신청입니다.`);
    else if (res.promoted?.length)
      setMsg(
        `${r.id} 취소했습니다. ` +
          res.promoted.map((p) => `대기 ${p.position}번 ${p.name || p.id} 학생을 입금 대기로 올리고 입금 안내 문자 메일을 보냈습니다.`).join(' '),
      );
    else setMsg(`${r.id} 취소했습니다. 올라갈 대기 학생은 없습니다.`);
  };

  const slotErr = newDate ? checkNewSlot(newDate, newTime, nowOf()) : '';
  const openSlot = async () => {
    if (slotErr || !newDate) return;
    const ok = window.confirm(
      `${formatDateLabel(newDate)} ${newTime} 타임을 열까요?\n` +
        (audience === 'date' ? '이 날짜를 원한 추가 오픈 신청자에게' : '추가 오픈 신청자 모두에게') +
        ' 알림 [문자발송] 메일이 나갑니다(한 사람에게 이 날짜 한 번).',
    );
    if (!ok) return;
    const res = await run({ op: 'openSlot', date: newDate, time: newTime, audience });
    if (!res) return;
    setMsg(
      `${res.slot} 타임을 ${res.already ? '이미 열어 두었습니다' : '열었습니다'}. 알림 메일 ${res.sent ?? 0}통을 보냈습니다.` +
        (res.failed?.length ? ` 못 보낸 사람: ${res.failed.join(', ')}(직접 연락해 주세요)` : ''),
    );
  };

  if (!test && !key) {
    return (
      <div className="mi-page mi-admin">
        <main className="mi-wrap">
          <section className="mi-section">
            <h1 className="mi-admin-title">모의면접 관리</h1>
            <p className="mi-note">관리자 키를 넣어 주세요. 키는 이 탭에만 남고 탭을 닫으면 지워집니다.</p>
            <form
              className="mi-copy-row"
              onSubmit={(e) => {
                e.preventDefault();
                const k = keyInput.trim();
                if (!k) return;
                try {
                  sessionStorage.setItem(KEY_STORE, k);
                } catch {
                  /* noop */
                }
                setKey(k);
                setKeyInput('');
              }}
            >
              <input type="password" autoComplete="off" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} aria-label="관리자 키" />
              <button type="submit" className="mi-copy">열기</button>
            </form>
            {err && <p className="mi-error">{err}</p>}
          </section>
        </main>
      </div>
    );
  }

  const extra = data?.extraRequests ?? [];
  return (
    <div className="mi-page mi-admin">
      {test && (
        <div className="mi-test-banner" role="status">
          <span>미리보기(테스트 모드) · 관리자 화면 · 문자 메일은 실제로 보내지 않고 아래 '보냈을 메일'에만 남깁니다</span>
          <button
            type="button"
            onClick={() => {
              seedWaitlistDemo(nowOf());
              seedExtraRequestDemo(nowOf());
              void run({ op: 'list' });
            }}
          >
            예시 채우기
          </button>
        </div>
      )}
      <main className="mi-wrap mi-admin-wrap">
        <h1 className="mi-admin-title">모의면접 관리</h1>
        <div className="mi-admin-tabs" role="tablist">
          {(
            [
              ['rows', `신청 목록 (${(data?.rows ?? []).filter((r) => r.status !== MI_STATUS.cancelled).length})`],
              ['extra', `추가 오픈 신청 (${extra.length})`],
              ['open', '타임 추가 열기'],
            ] as const
          ).map(([t, label]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
          <button type="button" className="mi-admin-refresh" disabled={busy} onClick={() => void run({ op: 'list' })}>
            새로고침
          </button>
        </div>
        {msg && <p className="mi-admin-msg" role="status">{msg}</p>}
        {err && <p className="mi-error" role="alert">{err}</p>}

        {tab === 'rows' && (
          <section className="mi-section">
            <p className="mi-note">
              '취소'를 누르면 그 신청을 관리자 취소로 바꾸고, 입금 대기·예약확정이던 자리는 대기 1번 학생에게 넘어갑니다(입금 기한 8시간
              10분). 시트에서 상태 칸을 직접 '취소'로 바꾸면 대기가 올라가지 않으니 이 버튼이나 시트 메뉴를 써 주세요.
            </p>
            <label className="mi-admin-check">
              <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} /> 취소된 신청도 보기
            </label>
            <div className="mi-admin-table-wrap">
              <table className="mi-admin-table">
                <thead>
                  <tr>
                    <th>신청번호</th><th>날짜·시간</th><th>상태</th><th>학생</th><th>휴대폰</th><th>신청 시각</th><th>입금 기한</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.status === MI_STATUS.cancelled ? 'is-cancelled' : r.status === MI_STATUS.waitlist ? 'is-wait' : ''}>
                      <td>{r.id}</td>
                      <td>{formatDateLabel(r.date)} {r.time}</td>
                      <td>
                        {statusLabel(r.status)}
                        {r.waitlistPos ? ` ${r.waitlistPos}번` : ''}
                        {r.status === MI_STATUS.cancelled && r.cancelReason ? <small> ({r.cancelReason})</small> : null}
                      </td>
                      <td>{r.studentName}</td>
                      <td>{phoneLabel(r.phone)}</td>
                      <td>{formatShortKst(r.appliedAt)}</td>
                      <td>{r.payDeadline ? formatShortKst(r.payDeadline) : ''}</td>
                      <td>
                        {r.status !== MI_STATUS.cancelled && (
                          <button type="button" className="mi-admin-cancel" disabled={busy} onClick={() => void cancelRow(r)}>
                            취소
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr><td colSpan={8} className="mi-note">{data ? '신청이 없습니다.' : '불러오는 중…'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'extra' && (
          <section className="mi-section">
            <p className="mi-note">시트 '추가 오픈 신청' 탭을 그대로 읽습니다. 먼저 신청한 순서입니다.</p>
            <div className="mi-admin-table-wrap">
              <table className="mi-admin-table">
                <thead>
                  <tr><th>이름</th><th>휴대폰</th><th>원하는 날짜</th><th>원하는 시간</th><th>신청 시각</th><th>알림 기록</th></tr>
                </thead>
                <tbody>
                  {[...extra].sort((a, b) => a.at - b.at).map((q) => (
                    <tr key={q.id}>
                      <td>{q.name}</td>
                      <td>{phoneLabel(q.phone)}</td>
                      <td>{q.wishDate}</td>
                      <td>{q.wishTime}</td>
                      <td>{q.at ? formatShortKst(q.at) : ''}</td>
                      <td className="mi-admin-pre">{q.notified}</td>
                    </tr>
                  ))}
                  {!extra.length && <tr><td colSpan={6} className="mi-note">{data ? '추가 오픈 신청이 없습니다.' : '불러오는 중…'}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === 'open' && (
          <section className="mi-section">
            <p className="mi-note">
              새 날짜·시간을 열면 신청 페이지에 바로 나타나고, 추가 오픈 신청자에게 알림 [문자발송] 메일을 보냅니다. 같은 사람에게 같은
              날짜 알림은 한 번만 갑니다.
            </p>
            <div className="mi-admin-form">
              <label>
                날짜
                <input type="date" value={newDate} min="2026-11-01" onChange={(e) => setNewDate(e.target.value)} />
              </label>
              <label>
                시간
                <input type="time" step={1800} value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </label>
              <fieldset>
                <legend>알림 받을 사람</legend>
                <label><input type="radio" checked={audience === 'date'} onChange={() => setAudience('date')} /> 이 날짜를 원한 신청자</label>
                <label><input type="radio" checked={audience === 'all'} onChange={() => setAudience('all')} /> 추가 오픈 신청자 모두</label>
              </fieldset>
            </div>
            {newDate && (slotErr ? <p className="mi-error">{slotErr}</p> : <p className="mi-admin-preview">보낼 문자: {openNoticeText(newDate, newTime)}</p>)}
            <button type="button" className="mi-submit" disabled={busy || !newDate || !!slotErr} onClick={() => void openSlot()}>
              타임 열고 알림 보내기
            </button>
            {(data?.extraSlots ?? []).length > 0 && (
              <p className="mi-note">지금 열어 둔 추가 타임: {(data?.extraSlots ?? []).join(', ')}</p>
            )}
          </section>
        )}

        {test && (data?.outbox ?? []).length > 0 && (
          <section className="mi-section">
            <h2>보냈을 [문자발송] 메일 (미리보기)</h2>
            <ul className="mi-list mi-admin-outbox">
              {[...(data?.outbox ?? [])].reverse().map((m, i) => (
                <li key={i}>
                  <b>{m.kind}</b> · 받는번호 {m.phone} · {formatShortKst(m.at)}
                  <br />
                  {m.text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
