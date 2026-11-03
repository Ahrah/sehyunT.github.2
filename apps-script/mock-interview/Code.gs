/**
 * 12월 3:1 모의면접 신청 — Google Apps Script 웹 앱 (세연님 구글 시트에 붙여 넣는 코드)
 *
 * - 홈페이지(sehyunt.re.kr/mock-interview/)가 이 웹 앱에 신청을 보냅니다.
 * - 신청 내역은 이 스프레드시트의 '신청' 탭에 쌓입니다.
 * - '추가 날짜·시간 오픈 신청'은 '추가 오픈 신청' 탭에 쌓입니다(희망 날짜·희망 시간·이름·연락처, 입금 없음).
 * - 입금 확인은 손으로 합니다(기본): 세연님이 '입금 확정' 칸에 체크하면 5분 안에 '확정'으로 바뀌고
 *   세연님 메일로 확정 안내 메일이 옵니다. 학생 이메일은 받지 않으므로 학생에게 직접 메일을 보내지 않습니다.
 * - [입금알림] 메일 자동 확인은 나중에 켤 수 있는 선택 기능입니다(AUTO_DEPOSIT_CHECK, 기본 꺼짐).
 * - 좌석·대기·기한 규칙은 홈페이지 코드 src/lib/mockInterview.ts 와 같습니다.
 *
 * 설치 방법은 같은 폴더의 README.md 를 보세요.
 */

var MI = {
  SHEET: '신청',
  OPEN_AT: '2026-11-09T21:00:00+09:00',
  DATES: ['2026-12-12', '2026-12-13', '2026-12-19', '2026-12-20'],
  TIMES: ['16:00', '17:00', '18:00'],
  EXTRA_REQUEST_TIMES: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'],
  EXTRA_REQUEST_SHEET: '추가 오픈 신청',
  /** 예전 이름의 탭이 남아 있으면 같은 보관 기한에 함께 비웁니다. */
  EXTRA_REQUEST_OLD_SHEETS: ['오픈 알림 신청'],
  EXTRA_REQUEST_KEEP_UNTIL: '2026-12-20',
  EXTRA_REQUEST_PURPOSE: '대기·추가 타임 연락',
  FEE: 80000,
  CAPACITY: 4,
  /** 오픈 때부터 '대기'로 보여 주는 타임. 대기가 WAITLIST_RELEASE_COUNT 명 모이면 대기 순서대로 입금 대기로 올립니다(src/lib/mockInterview.ts 와 같음). */
  WAITLIST_AT_OPEN: ['2026-12-12 16:00', '2026-12-20 18:00'],
  WAITLIST_RELEASE_COUNT: 2,
  DUP_OTHER_NAME: '같은 휴대폰 번호로 이미 신청한 타임이 있습니다. 신청완료 화면의 확인 링크를 열거나 카카오톡 채널 \'입시는세연쌤\'으로 문의해 주세요.',
  BANK_ACCOUNT: '카카오뱅크 3333-38-6269721 (입시는세연쌤)',
  PAY_WINDOW_MS: 60 * 60 * 1000,
  /** 대기에서 입금 대기로 올라간 뒤 입금 기한(8시간, 세연님 11/3 결정). +10분 유예·자동 취소는 같습니다. */
  PROMOTED_PAY_WINDOW_MS: 8 * 60 * 60 * 1000,
  /** 입금 기한 뒤 자동 취소까지 기다리는 시간(10분). 입금 시각이 기한 + 10분 안이면 제때 입금으로 봅니다. */
  PAY_GRACE_MS: 10 * 60 * 1000,
  DOCS_DAYS_BEFORE: 7,
  DOCS_GRACE_MS: 24 * 60 * 60 * 1000,
  /** 서류 기한까지 서류가 없으면 확정을 취소할지. 세연님 11/3 결정: 서류 없이도 면접은 그대로 진행합니다(당일 즉석 질문). */
  CANCEL_WITHOUT_DOCS: false,
  BOOKING_CLOSE_MS: 24 * 60 * 60 * 1000,
  PHOTO_CONSENT_REQUIRED: true,
  /** 확정·대기 승격 때 세연님에게 알림 메일을 보낼지 */
  NOTIFY_OWNER: true,
  OWNER_EMAIL: ['consultantsyssam', 'gmail.com'].join('@'),
  /** [입금알림] 메일 자동 확인(선택 기능). 켜기 전에 README '선택: 입금 알림 자동 확인'을 따르세요. */
  AUTO_DEPOSIT_CHECK: false,
  DEPOSIT_SHEET: '입금알림 기록',
  TZ: 'Asia/Seoul'
};

/** 상태 값. 미입금 자동 취소도 '취소'이고 취소 사유가 '미입금(…)'으로 시작합니다. '확인 필요'는 자리를 잡지 않습니다. */
var ST = { pending: '입금 대기', confirmed: '확정', waitlist: '대기', cancelled: '취소', check: '확인 필요' };

/** 시트 열. 순서를 바꿔도 코드는 머리글 이름으로 찾습니다. 이름은 바꾸지 마세요. */
var COLS = [
  '신청번호', '신청 시각', '구분', '날짜', '시간', '상태', '대기 순번',
  '입금 기한', '입금 확정', '입금 시각', '미입금',
  '서류 기한', '서류 받음',
  '학생 이름', '지원 학교', '지원 전형', '휴대폰', '입금자명',
  '만 14세 미만', '보호자 이름', '보호자 연락처', '보호자 동의', '보호자 동의 시각',
  '개인정보 동의', '개인정보 동의 시각', '영상 동의', '영상 동의 시각', '사진 동의', '사진 동의 시각',
  '입금 대기 시작', '취소 사유', '처리 기록', '메모',
  /** 새 열은 맨 뒤에 붙입니다(setup 을 다시 실행하면 빠진 머리글을 붙입니다). */
  '확인 필요 사유',
  /** 한 번에 여러 타임을 신청하면 같은 묶음 번호. 한 번에 입금하고, 한 줄만 입금 확정해도 묶음 전체가 확정됩니다. */
  '묶음 번호',
  /** 신청완료 화면의 확인 링크 키(묶음마다 하나). 신청번호와 이 키가 모두 맞아야 신청 상태를 보여 줍니다. */
  '확인 키'
];
/** 스크립트가 고치는 열(세연님이 입력하는 칸은 덮어쓰지 않습니다) */
var SCRIPT_OWNED = ['상태', '대기 순번', '입금 기한', '서류 기한', '입금 대기 시작', '취소 사유', '처리 기록', '확인 필요 사유', '묶음 번호', '확인 키'];
var CHECKBOX_COLS = ['입금 확정', '미입금', '서류 받음'];
var EXTRA_REQ_COLS = ['신청번호', '신청 시각', '희망 날짜', '희망 시간', '이름', '연락처', '만 14세 미만', '보호자 이름',
  '보호자 연락처', '보호자 동의', '개인정보 동의', '동의 시각', '이용 목적', '보관 기한', '메모',
  /** 새 열은 맨 뒤에 붙입니다 */
  '모의면접 신청번호'];
var DEPOSIT_COLS = ['메일 시각', '금액', '입금자명', '결과', '신청번호', '메일 ID'];

/* ===================== 규칙(순수 함수, 테스트 대상) ===================== */

function mi_slotStart(date, time) { return Date.parse(date + 'T' + time + ':00+09:00'); }
function mi_isOpen(now) { return now >= Date.parse(MI.OPEN_AT); }
function mi_isValidSlot(date, time) { return MI.DATES.indexOf(date) >= 0 && MI.TIMES.indexOf(time) >= 0; }
function mi_bookingClosesAt(date, time) { return mi_slotStart(date, time) - MI.BOOKING_CLOSE_MS; }
function mi_baseDocsDeadline(date) {
  return Date.parse(date + 'T00:00:00+09:00') - (MI.DOCS_DAYS_BEFORE - 1) * 86400000 - 1;
}
function mi_docsDeadlineFor(date, holdStartedAt) {
  return Math.max(mi_baseDocsDeadline(date), holdStartedAt + MI.DOCS_GRACE_MS);
}
function mi_slotRows(rows, date, time) {
  return rows.filter(function (r) { return r.kind === '예약' && r.date === date && r.time === time; });
}
function mi_heldCount(rows, date, time) {
  return mi_slotRows(rows, date, time).filter(function (r) {
    return r.status === ST.pending || r.status === ST.confirmed;
  }).length;
}
function mi_waitlistOf(rows, date, time) {
  return mi_slotRows(rows, date, time).filter(function (r) { return r.status === ST.waitlist; })
    .sort(function (a, b) { return (a.appliedAt - b.appliedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
}
/** 오픈 때부터 대기로 둔 타임이 아직 잠겨 있는지(src/lib/mockInterview.ts isGated 와 같음) */
function mi_isGated(rows, date, time) {
  if (MI.WAITLIST_AT_OPEN.indexOf(date + ' ' + time) < 0) return false;
  if (mi_slotRows(rows, date, time).some(function (r) { return r.holdStartedAt != null; })) return false;
  return mi_waitlistOf(rows, date, time).length < MI.WAITLIST_RELEASE_COUNT;
}
function mi_initialStatus(rows, date, time) {
  var full = mi_heldCount(rows, date, time) >= MI.CAPACITY;
  var queued = mi_waitlistOf(rows, date, time).length > 0;
  return (full || queued || mi_isGated(rows, date, time)) ? ST.waitlist : ST.pending;
}
function mi_summarize(rows, now) {
  var out = [];
  MI.DATES.forEach(function (date) {
    MI.TIMES.forEach(function (time) {
      var left = Math.max(0, MI.CAPACITY - mi_heldCount(rows, date, time));
      var waitlist = mi_waitlistOf(rows, date, time).length;
      out.push({
        date: date, time: time, capacity: MI.CAPACITY, left: left, waitlist: waitlist,
        wait: left === 0 || waitlist > 0 || mi_isGated(rows, date, time),
        closed: now >= mi_bookingClosesAt(date, time)
      });
    });
  });
  return out;
}
/** 홈페이지로 보내는 타임 정보: 남은 자리·대기 인원 숫자는 보내지 않습니다. */
function mi_publicSlots(list) {
  return list.map(function (s) { return { date: s.date, time: s.time, wait: s.wait, closed: s.closed }; });
}
/** 같은 휴대폰·같은 타임으로 입금 대기·확정인 줄이 있으면 그 묶음 번호(src/lib/mockInterview.ts findActiveDuplicate 와 같음) */
function mi_findActiveDuplicate(rows, phone, picks) {
  var p = mi_phone(phone);
  var hit = rows.filter(function (r) {
    return r.kind === '예약' && mi_phone(r.phone) === p && (r.status === ST.pending || r.status === ST.confirmed) &&
      picks.some(function (x) { return x.date === r.date && x.time === r.time; });
  })[0];
  return hit ? (hit.groupId || hit.id) : null;
}
/** 묶음 하나의 현재 상태(확인 링크·중복 신청 응답). 휴대폰·입금자명은 돌려주지 않습니다. */
function mi_view_(rows, groupId) {
  var mine = rows.filter(function (r) { return (r.groupId || r.id) === groupId; });
  if (!mine.length) return null;
  var items = mine.map(function (r) {
    return { id: r.id, date: r.date, time: r.time, status: r.status, payDeadline: r.status === ST.pending ? r.payDeadline : null };
  });
  var dls = items.filter(function (x) { return x.status === ST.pending && x.payDeadline != null; }).map(function (x) { return x.payDeadline; });
  return {
    ok: true, id: groupId, items: items,
    payDeadline: dls.length ? Math.min.apply(null, dls) : null,
    amount: dls.length * MI.FEE,
    token: mine[0].token || '', studentName: mine[0].studentName || '', school: mine[0].school || '', track: mine[0].track || '',
    bankAccount: MI.BANK_ACCOUNT
  };
}
function mi_sameName_(a, b) {
  var n = function (x) { return String(x || '').replace(/\s+/g, ''); };
  return !!n(a) && n(a) === n(b);
}
/** 확인 링크 키 비교. 키가 비어 있으면 늘 거절합니다. */
function mi_tokenOk(view, k) {
  var a = String((view && view.token) || ''), b = String(k || '');
  if (!a || a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function mi_cancel(r, now, reason) {
  r.status = ST.cancelled;
  r.cancelReason = reason;
  r.log.push(mi_fmt(now) + ' 취소: ' + reason);
  r.changed = true;
}
function mi_needsCheck(r, now, reason) {
  r.status = ST.check;
  r.checkReason = reason;
  r.log.push(mi_fmt(now) + ' 확인 필요: ' + reason);
  r.changed = true;
  r.justNeedsCheck = true;
}
/** 미입금으로 취소된 줄인지(자동 취소·'미입금' 체크·예전 문구) */
function mi_isUnpaidCancel(reason) {
  return /^미입금/.test(reason) || reason === '1시간 안에 입금하지 않음';
}
function mi_payGraceEnd(payDeadline) { return payDeadline + MI.PAY_GRACE_MS; }
/** 입금 묶음 키(src/lib/mockInterview.ts payUnitKey 와 같음): 같은 묶음 번호 + 같은 입금 기한 */
function mi_payUnitKey(r) { return r.groupId ? r.groupId + '|' + r.payDeadline : 'row:' + r.id; }
/** 입금 묶음 하나의 판단(src/lib/mockInterview.ts decidePay 와 같음) */
function mi_decidePay(u, now) {
  var graceEnd = mi_payGraceEnd(u.payDeadline);
  var dl = mi_fmt(u.payDeadline);
  if (u.paidAt != null && u.paidAt > graceEnd) {
    return { action: 'check', reason: '입금 기한(' + dl + ') + 10분 뒤 입금(입금 시각 ' + mi_fmt(u.paidAt) + ')' };
  }
  if (u.paid) {
    if (u.paidAt == null && now > graceEnd) return { action: 'check', reason: '입금 기한(' + dl + ') + 10분 뒤 입금 확정(입금 시각 없음)' };
    return { action: 'confirm', reason: '' };
  }
  if (now > graceEnd) return { action: 'cancel', reason: '미입금(입금 기한 ' + dl + ' + 10분 지남)' };
  if (now > u.payDeadline && u.unpaid) return { action: 'cancel', reason: '미입금(미입금 체크)' };
  return { action: 'none', reason: '' };
}
/** 입금 대기 줄을 입금 묶음으로 나눕니다. 순서는 시트 순서대로. */
function mi_payUnits(rows) {
  var keys = [], units = {};
  rows.forEach(function (r) {
    if (r.kind !== '예약' || r.status !== ST.pending || r.payDeadline == null) return;
    var k = mi_payUnitKey(r);
    if (!units[k]) { units[k] = []; keys.push(k); }
    units[k].push(r);
  });
  return keys.map(function (k) { return units[k]; });
}
/**
 * 시간 트리거 규칙(src/lib/mockInterview.ts sweep 과 같음). rows 를 직접 고치고, 고친 행에 changed=true 를 붙입니다.
 * 입금 대기는 입금 묶음 단위로 판단합니다. 묶음 안 한 줄만 '입금 확정'에 체크해도 묶음 전체가 확정됩니다.
 * 다른 줄의 '입금 확정' 칸은 건드리지 않고 상태와 처리 기록만 바꿉니다.
 */
function mi_sweep(rows, now) {
  mi_payUnits(rows).forEach(function (unit) {
    var paidAts = unit.map(function (r) { return r.paidAt; }).filter(function (t) { return t != null; });
    var d = mi_decidePay({
      paid: unit.some(function (r) { return r.paidChecked; }),
      paidAt: paidAts.length ? Math.min.apply(null, paidAts) : null,
      unpaid: unit.some(function (r) { return r.unpaidChecked; }),
      payDeadline: unit[0].payDeadline
    }, now);
    unit.forEach(function (r) {
      if (d.action === 'confirm') {
        r.status = ST.confirmed;
        r.log.push(mi_fmt(now) + ' 확정');
        r.changed = true;
        r.justConfirmed = true;
      } else if (d.action === 'check') mi_needsCheck(r, now, d.reason);
      else if (d.action === 'cancel') mi_cancel(r, now, d.reason);
    });
  });
  rows.forEach(function (r) {
    if (r.kind !== '예약') return;
    if (r.status === ST.cancelled && mi_isUnpaidCancel(r.cancelReason) && (r.paidChecked || r.paidAt != null)) {
      mi_needsCheck(r, now, '미입금 취소 뒤 입금 확정' + (r.paidAt != null ? '(입금 시각 ' + mi_fmt(r.paidAt) + ')' : ''));
    }
    if (MI.CANCEL_WITHOUT_DOCS && r.status === ST.confirmed && r.docsDeadline != null && now > r.docsDeadline && !r.docsReceived) {
      mi_cancel(r, now, '서류 미제출');
    }
  });
  MI.DATES.forEach(function (date) {
    MI.TIMES.forEach(function (time) {
      if (now >= mi_bookingClosesAt(date, time)) return;
      if (mi_isGated(rows, date, time)) return;
      var free = MI.CAPACITY - mi_heldCount(rows, date, time);
      var queue = mi_waitlistOf(rows, date, time);
      var position = 0;
      while (free > 0 && queue.length > 0) {
        var next = queue.shift();
        position += 1;
        next.status = ST.pending;
        next.holdStartedAt = now;
        next.payDeadline = now + MI.PROMOTED_PAY_WINDOW_MS;
        next.docsDeadline = mi_docsDeadlineFor(date, now);
        next.promotedFrom = position;
        next.log.push(mi_fmt(now) + ' 대기 ' + position + '번에서 입금 대기로 승격');
        next.changed = true;
        next.justPromoted = true;
        free -= 1;
      }
    });
  });
  return rows;
}
/** 서류 기한 예시(예약확정 문자): '12/12(토) 면접은 12/5(토) 밤 12시 전까지' (src/lib/mockInterview.ts docsDeadlineExample 와 같음) */
function mi_dateLabel_(ymd) {
  var d = new Date(Date.parse(ymd + 'T00:00:00Z'));
  return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '(' + '일월화수목금토'.charAt(d.getUTCDay()) + ')';
}
function mi_docsExample(date) {
  var dl = new Date(mi_baseDocsDeadline(date) + 9 * 3600000);
  var ymd = dl.getUTCFullYear() + '-' + ('0' + (dl.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + dl.getUTCDate()).slice(-2);
  return mi_dateLabel_(date) + ' 면접은 ' + mi_dateLabel_(ymd) + ' 밤 12시 전까지';
}
/** 대기 승격 문자(세연님 11/3 문구, src/lib/mockInterview.ts waitlistPromotionText 와 같음) */
function mi_promotionText(position, depositor, date, time, payDeadline) {
  var ymd = date.split('-'), hm = time.split(':');
  var slot = Number(ymd[1]) + '월 ' + Number(ymd[2]) + '일 ' + Number(hm[0]) + '시' + (Number(hm[1]) ? ' ' + Number(hm[1]) + '분' : '');
  var d = new Date(payDeadline + 9 * 3600000);
  function p(n) { return (n < 10 ? '0' : '') + n; }
  var dl = (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일 ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
  var hours = Math.round(MI.PROMOTED_PAY_WINDOW_MS / 3600000);
  var fee = String(MI.FEE).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '대기 ' + position + '번 ' + depositor + ' 학생, 현재 ' + slot + ' 3:1 모의면접 신청 가능합니다. ' +
    hours + '시간 이내(' + dl + '까지)에 입금 완료해 주시면 예약이 확정됩니다. ' +
    '입금 계좌: ' + MI.BANK_ACCOUNT + ', ' + fee + '원';
}
function mi_fmt(ms) {
  var d = new Date(ms + 9 * 3600000);
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}
function mi_phone(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function mi_isPhone(v) { return /^01[016789][0-9]{7,8}$/.test(mi_phone(v)); }
function mi_str(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 100); }
function mi_slotsOf(f) { return Array.isArray(f.slots) ? f.slots : []; }
function mi_extraDatesOf(f) { return Array.isArray(f.extraDates) ? f.extraDates : []; }
/** 신청서 검사(src/lib/mockInterview.ts validateForm 과 같음). 빈 배열이면 통과 */
function mi_validate(f) {
  var e = [];
  if (f.kind !== '예약') return ['신청 구분이 올바르지 않습니다.'];
  var slots = mi_slotsOf(f), extra = mi_extraDatesOf(f);
  var booking = slots.length > 0;
  if (!booking && !extra.length) e.push("타임을 하나 이상 고르거나 '추가 오픈 신청'을 눌러 주세요.");
  var seen = {}, dup = false;
  var bad = slots.some(function (x) { return !x || !mi_isValidSlot(x.date, x.time); });
  if (!bad) slots.forEach(function (x) { var k = x.date + ' ' + x.time; if (seen[k]) dup = true; seen[k] = true; });
  if (bad) e.push('고를 수 없는 타임이 들어 있습니다.');
  else if (dup) e.push('같은 타임을 두 번 골랐습니다.');
  if (extra.some(function (d) { return d !== 'other' && MI.DATES.indexOf(d) < 0; })) e.push('추가 오픈 신청 날짜가 올바르지 않습니다.');
  if (!mi_str(f.studentName)) e.push('학생이름(입금자명)을 적어 주세요.');
  if (!mi_str(f.school)) e.push('지원 학교를 적어 주세요.');
  if (!mi_str(f.track)) e.push('지원 전형을 적어 주세요.');
  if (!mi_isPhone(f.phone)) e.push('휴대폰 번호를 확인해 주세요.');
  if (f.consentPrivacy !== true) e.push('개인정보 수집·이용에 동의해야 신청할 수 있습니다.');
  if (booking && f.consentVideo !== true) e.push('면접 영상 촬영에 동의해야 신청할 수 있습니다.');
  if (booking && MI.PHOTO_CONSENT_REQUIRED && f.consentPhoto !== true) e.push('사진 활용에 동의해야 신청할 수 있습니다.');
  return e;
}

/** 추가 날짜·시간 오픈 신청 '희망 날짜': 고른 날짜(날짜 순)와 직접 적은 글을 ', '로 잇습니다. 없으면 ''. */
function mi_wishDateOf(f) {
  var picked = Array.isArray(f.dates) ? f.dates : [];
  var out = MI.DATES.filter(function (d) { return picked.indexOf(d) >= 0; });
  var t = mi_str(f.dateText, 40);
  if (t) out.push(t);
  return out.join(', ');
}
/** 추가 날짜·시간 오픈 신청 '희망 시간': 고른 시간(시간 순)과 직접 적은 글을 ', '로 잇습니다. 없으면 ''. */
function mi_wishTimeOf(f) {
  var picked = Array.isArray(f.times) ? f.times : [];
  var out = MI.EXTRA_REQUEST_TIMES.filter(function (t) { return picked.indexOf(t) >= 0; });
  var t = mi_str(f.timeText, 40);
  if (t) out.push(t);
  return out.join(', ');
}

/** 추가 날짜·시간 오픈 신청 검사 */
function mi_validateExtraRequest(f) {
  var e = [];
  if (!mi_wishDateOf(f)) e.push('원하는 날짜를 하나 이상 고르거나 적어 주세요.');
  if (!mi_wishTimeOf(f)) e.push('원하는 시간을 하나 이상 고르거나 적어 주세요.');
  if (!mi_str(f.name)) e.push('이름을 적어 주세요.');
  if (!mi_isPhone(f.phone)) e.push('연락처를 확인해 주세요.');
  if (f.consentPrivacy !== true) e.push('개인정보 수집·이용에 동의해야 추가 오픈 신청을 할 수 있습니다.');
  return e;
}
function mi_extraRequestPurgeAt() { return Date.parse(MI.EXTRA_REQUEST_KEEP_UNTIL + 'T23:59:59.999+09:00'); }

/**
 * [입금알림] 메일 한 통을 읽습니다(선택 기능). 읽지 못하면 null.
 * 예상 형식(시험 전, 실제 문구 확인 필요): '[카카오뱅크] 입금 80,000원 홍길동' 또는 줄바꿈으로 나뉜 형태.
 * 시각은 메일을 받은 시각을 씁니다.
 */
function mi_parseDepositMail(text, receivedAt) {
  var t = String(text || '').replace(/\r/g, '');
  if (t.indexOf('입금') < 0 || /출금|결제|취소/.test(t)) return null;
  var m = t.match(/입금\s*([0-9][0-9,]*)\s*원[\s\/|·,]*([^\s\/|·,0-9][^\n\/|·,]*?)\s*(?:\n|\/|\||잔액|$)/);
  if (!m) return null;
  var name = m[2].replace(/\s+/g, '').trim();
  if (!name) return null;
  return { amount: Number(m[1].replace(/,/g, '')), name: name, at: receivedAt };
}
/**
 * 입금 1건을 맞출 입금 묶음을 고릅니다. 입금자명이 같고 금액이 '수강료 × 묶음 타임 수'와 같은 묶음이
 * 정확히 1개면 그 묶음의 줄 목록, 아니면 null(손으로 확인).
 */
function mi_matchDeposit(rows, dep) {
  var hits = mi_payUnits(rows).filter(function (unit) {
    var r = unit[0];
    return !unit.some(function (x) { return x.paidChecked; }) && dep.amount === MI.FEE * unit.length &&
      String(r.depositor || '').replace(/\s+/g, '') === dep.name &&
      (r.holdStartedAt == null || dep.at >= r.holdStartedAt - 5 * 60000);
  });
  return hits.length === 1 ? hits[0] : null;
}

/* ===================== 웹 앱 ===================== */

function doGet(e) {
  var now = Date.now();
  var p = (e && e.parameter) || {};
  var rows = mi_readRows_(mi_sheet_()).rows;
  if (p.check) {
    // 확인 링크: 신청번호와 확인 키가 모두 맞아야 보여 줍니다. 정리(sweep) 결과는 5분 트리거가 시트에 씁니다.
    mi_sweep(rows, now);
    var v = mi_view_(rows, String(p.check));
    if (!v || !mi_tokenOk(v, p.k)) return mi_json_({ ok: false, error: '신청을 찾지 못했습니다. 받은 확인 링크를 그대로 열어 주세요.' });
    return mi_json_(v);
  }
  return mi_json_({ ok: true, open: mi_isOpen(now), openAt: MI.OPEN_AT, now: now, slots: mi_publicSlots(mi_summarize(rows, now)) });
}

function doPost(e) {
  var now = Date.now();
  var f;
  try { f = JSON.parse(e.postData.contents); } catch (err) { return mi_json_({ ok: false, error: '신청서를 읽지 못했습니다.' }); }
  if (f.website) return mi_json_({ ok: true, id: 'ignored' }); // 스팸 방지 칸
  if (f.action === 'extraRequest') return mi_extraRequest_(f, now);
  if (!mi_isOpen(now)) return mi_json_({ ok: false, error: '11/9(월) 밤 9시에 신청이 열립니다.' });
  var errors = mi_validate(f);
  if (errors.length) return mi_json_({ ok: false, error: errors.join(' ') });
  // 추가 오픈 신청만 한 경우는 화면이 action 'extraRequest' 로 따로 보냅니다. 여기에는 정규 타임이 하나 이상 있어야 합니다.
  var picks = mi_slotsOf(f).slice().sort(function (a, b) { return mi_slotStart(a.date, a.time) - mi_slotStart(b.date, b.time); });
  if (!picks.length) return mi_json_({ ok: false, error: '고른 타임이 없습니다.' });
  var closed = picks.filter(function (x) { return now >= mi_bookingClosesAt(x.date, x.time); })[0];
  if (closed) return mi_json_({ ok: false, error: closed.date + ' ' + closed.time + '은 신청이 마감되었습니다.' });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return mi_json_({ ok: false, error: '신청이 몰리고 있습니다. 잠시 뒤 다시 눌러 주세요.' });
  try {
    var sheet = mi_sheet_();
    var data = mi_readRows_(sheet);
    mi_sweep(data.rows, now);
    mi_writeChanged_(sheet, data);

    var phone = mi_phone(f.phone);
    // 같은 휴대폰·같은 타임이 입금 대기·확정이면 새로 만들지 않고 기존 신청을 보여 줍니다(두 번 누름 방지).
    var existing = mi_findActiveDuplicate(data.rows, phone, picks);
    if (existing) {
      var ev = mi_view_(data.rows, existing);
      // 이름까지 같을 때만 기존 신청(확인 링크 포함)을 보여 줍니다. 휴대폰·타임만 아는 다른 사람에게는 보여 주지 않습니다.
      if (ev && mi_sameName_(ev.studentName, f.studentName)) { ev.duplicate = true; return mi_json_(ev); }
      return mi_json_({ ok: false, error: MI.DUP_OTHER_NAME });
    }
    var dup = picks.filter(function (x) {
      return data.rows.some(function (r) {
        return r.phone === phone && r.status !== ST.cancelled && r.kind === '예약' && r.date === x.date && r.time === x.time;
      });
    })[0];
    if (dup) return mi_json_({ ok: false, error: '같은 휴대폰 번호로 이미 신청한 타임입니다(' + dup.date + ' ' + dup.time + ').' });

    var groupId = 'MI-' + Utilities.formatDate(new Date(now), MI.TZ, 'MMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    var stamp = new Date(now);
    var token = Utilities.getUuid().replace(/-/g, '');
    picks.forEach(function (x, i) {
      var id = groupId + '-' + (i + 1);
      // 메모리의 rows 에 먼저 넣어 같은 신청 안에서도 정원을 넘지 않게 합니다.
      var status = mi_initialStatus(data.rows, x.date, x.time);
      var holding = status === ST.pending;
      var position = status === ST.waitlist ? mi_waitlistOf(data.rows, x.date, x.time).length + 1 : null;
      var r = {
        id: id, groupId: groupId, token: token, phone: phone,
        studentName: mi_str(f.studentName, 40), school: mi_str(f.school, 60), track: mi_str(f.track, 60),
        depositor: mi_str(f.depositor || f.studentName, 40), appliedAt: now, kind: f.kind, date: x.date, time: x.time, status: status,
        payDeadline: holding ? now + MI.PAY_WINDOW_MS : null,
        holdStartedAt: holding ? now : null,
        docsDeadline: holding ? mi_docsDeadlineFor(x.date, now) : null,
        log: [mi_fmt(now) + ' ' + status]
      };
      data.rows.push(r);
      var rec = {
        '신청번호': id, '묶음 번호': groupId, '신청 시각': stamp, '구분': f.kind, '날짜': r.date, '시간': r.time, '상태': status,
        '대기 순번': position || '',
        '입금 기한': holding ? new Date(r.payDeadline) : '', '입금 확정': false, '입금 시각': '', '미입금': false,
        '서류 기한': holding ? new Date(r.docsDeadline) : '', '서류 받음': false,
        '학생 이름': mi_str(f.studentName, 40), '지원 학교': mi_str(f.school, 60), '지원 전형': mi_str(f.track, 60),
        // 신청서 칸 '학생이름(입금자명)' 하나를 두 열에 같은 값으로 씁니다(입금 대조는 '입금자명' 열을 봅니다).
        '휴대폰': phone, '입금자명': r.depositor, '확인 키': token,
        // '만 14세 미만'·'보호자 …' 열은 신청서에서 뺐습니다. 열은 그대로 두고 비워 둡니다.
        '개인정보 동의': f.consentPrivacy === true ? 'Y' : 'N', '개인정보 동의 시각': stamp,
        '영상 동의': f.consentVideo === true ? 'Y' : 'N', '영상 동의 시각': stamp,
        '사진 동의': f.consentPhoto === true ? 'Y' : 'N', '사진 동의 시각': stamp,
        '입금 대기 시작': holding ? stamp : '', '취소 사유': '', '처리 기록': r.log.join('\n'), '메모': ''
      };
      sheet.appendRow(data.header.map(function (h) { return rec.hasOwnProperty(h) ? rec[h] : ''; }));
      var last = sheet.getLastRow();
      // 휴대폰 앞자리 0이 지워지지 않도록 글자로 저장합니다.
      ['휴대폰'].forEach(function (h) {
        var ci = data.header.indexOf(h);
        if (ci >= 0 && rec[h]) sheet.getRange(last, ci + 1).setNumberFormat('@').setValue(rec[h]);
      });
      CHECKBOX_COLS.forEach(function (name) {
        var ci = data.header.indexOf(name);
        if (ci >= 0) sheet.getRange(last, ci + 1).insertCheckboxes();
      });
      r.rowNumber = last;
      r.changed = false;
    });
    // 오픈 때부터 대기로 둔 타임에 대기가 2명 모였으면 바로 입금 대기로 올리고 세연님께 알립니다.
    mi_sweep(data.rows, now);
    mi_writeChanged_(sheet, data);
    mi_notifyOwner_(data.rows);
    return mi_json_(mi_view_(data.rows, groupId));
  } finally {
    lock.releaseLock();
  }
}

/** 시간 트리거(5분마다)가 부릅니다. 메뉴에서 직접 눌러도 됩니다. */
function sweepNow() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var sheet = mi_sheet_();
    var now = Date.now();
    var data = mi_readRows_(sheet);
    if (MI.AUTO_DEPOSIT_CHECK) checkDepositMails_(sheet, data, now);
    mi_sweep(data.rows, now);
    mi_writeChanged_(sheet, data);
    mi_notifyOwner_(data.rows);
    mi_purgeExtraRequests_(now);
  } finally {
    lock.releaseLock();
  }
}

/**
 * 확정·대기 승격·확인 필요가 생기면 세연님 메일로 알립니다. 학생에게 보낼 문자 문구도 함께 넣습니다.
 * 같은 입금 묶음(한 번에 신청한 타임)은 메일 한 통으로 모읍니다.
 */
function mi_notifyOwner_(rows) {
  if (!MI.NOTIFY_OWNER) return;
  var keys = [], groups = {};
  rows.forEach(function (r) {
    var type = r.justNeedsCheck ? 'check' : r.justConfirmed ? 'confirmed' : r.justPromoted ? 'promoted' : '';
    if (!type) return;
    var k = type + '|' + mi_payUnitKey(r);
    if (!groups[k]) { groups[k] = { type: type, rows: [] }; keys.push(k); }
    groups[k].rows.push(r);
  });
  keys.forEach(function (k) {
    var g = groups[k], r = g.rows[0];
    var slots = g.rows.map(function (x) { return x.date + ' ' + x.time; }).join(', ');
    var ids = g.rows.map(function (x) { return x.id; }).join(', ');
    var total = (MI.FEE * g.rows.length).toLocaleString() + '원' + (g.rows.length > 1 ? '(' + g.rows.length + '타임)' : '');
    var head = '신청번호: ' + ids + (r.groupId ? '\n묶음 번호: ' + r.groupId : '') + '\n학생: ' + r.studentName +
      '\n휴대폰: ' + r.phone + '\n타임: ' + slots + '\n입금자명: ' + r.depositor + '\n금액: ' + total;
    var subject, body;
    if (g.type === 'check') {
      subject = '[모의면접] 확인 필요 ' + slots + ' ' + r.studentName;
      body = '자동으로 확정하지 않았습니다. 확인해 주세요.\n' + head + '\n사유: ' + r.checkReason +
        '\n\n이 줄은 자리를 잡지 않습니다. 그 타임에 빈자리가 있으면 상태를 \'확정\'으로 바꾸고, 없으면 환불해 주세요.' +
        '\n(환불 규정: 기한이 지난 뒤 입금해 신청이 취소되었다면 전액 환불합니다.)';
    } else if (g.type === 'confirmed') {
      subject = '[모의면접] 예약 확정 ' + slots + ' ' + r.studentName;
      body = '예약을 확정했습니다. 입금액이 ' + total + '인지 확인해 주세요.\n' + head +
        '\n\n학생에게 보낼 문자 예시\n[입시는세연쌤] ' + r.studentName + ' 학생 12월 3:1 모의면접 ' + slots + ' 예약이 확정되었습니다. ' +
        '\n\n서류는 언제 보내나요? 면접 1주 전까지 생기부·자소서를 ' + MI.OWNER_EMAIL + '으로 보내주세요. ' +
        '예: ' + mi_docsExample(r.date) + ' 보내 주세요. 서류를 보내지 않아도 면접은 그대로 진행하며, 당일 즉석 질문으로 진행합니다.';
    } else {
      subject = '[모의면접] 대기 승격, 문자 보내기 필요 ' + slots + ' ' + r.studentName;
      // 자동 문자 발송 수단(문자 API)이 아직 없습니다. 보낼 문자와 받는 번호를 메일에 넣어 세연님이 보냅니다.
      body = '대기에서 입금 대기로 바뀌었습니다. 아래 번호로 문자를 보내 주세요.\n' + head + '\n입금 기한: ' + mi_fmt(r.payDeadline) +
        ' (승격 뒤 ' + Math.round(MI.PROMOTED_PAY_WINDOW_MS / 3600000) + '시간, 기한 + 10분이 지나면 자동 취소)' +
        g.rows.map(function (x) {
          return '\n\n받는 번호: ' + x.phone + '\n보낼 문자:\n[입시는세연쌤] ' +
            mi_promotionText(x.promotedFrom || 1, x.depositor || x.studentName, x.date, x.time, x.payDeadline);
        }).join('');
    }
    try { MailApp.sendEmail(MI.OWNER_EMAIL, subject, body); } catch (err) { console.warn('알림 메일 실패: ' + err); }
  });
}

/** 추가 날짜·시간 오픈 신청 저장(입금 없음, 자리를 잡지 않음) */
function mi_extraRequest_(f, now) {
  if (!mi_isOpen(now)) return mi_json_({ ok: false, error: '11/9(월) 밤 9시부터 신청할 수 있습니다.' });
  var errors = mi_validateExtraRequest(f);
  if (errors.length) return mi_json_({ ok: false, error: errors.join(' ') });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return mi_json_({ ok: false, error: '신청이 몰리고 있습니다. 잠시 뒤 다시 눌러 주세요.' });
  try {
    var sheet = SpreadsheetApp.getActive().getSheetByName(MI.EXTRA_REQUEST_SHEET);
    if (!sheet) throw new Error("'" + MI.EXTRA_REQUEST_SHEET + "' 탭이 없습니다. setup 을 먼저 실행하세요.");
    var phone = mi_phone(f.phone);
    var wishDate = mi_wishDateOf(f), wishTime = mi_wishTimeOf(f);
    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
    var last = sheet.getLastRow();
    if (last > 1) {
      var di = header.indexOf('희망 날짜'), ti = header.indexOf('희망 시간'), pi = header.indexOf('연락처');
      var vals = sheet.getRange(2, 1, last - 1, header.length).getValues();
      var dup = vals.some(function (v) {
        return mi_phone(v[pi]) === phone && mi_toDateStr_(v[di]) === wishDate && mi_toTimeStr_(v[ti]) === wishTime;
      });
      if (dup) return mi_json_({ ok: false, error: '같은 날짜·시간으로 이미 추가 오픈 신청을 했습니다.' });
    }
    var id = 'XR-' + Utilities.formatDate(new Date(now), MI.TZ, 'MMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    var rec = {
      '신청번호': id, '신청 시각': new Date(now), '희망 날짜': wishDate, '희망 시간': wishTime,
      '이름': mi_str(f.name, 40), '연락처': phone,
      // '만 14세 미만'·'보호자 …' 열은 그대로 두고 비워 둡니다.
      '개인정보 동의': 'Y', '동의 시각': new Date(now),
      '이용 목적': MI.EXTRA_REQUEST_PURPOSE, '보관 기한': MI.EXTRA_REQUEST_KEEP_UNTIL, '메모': '',
      '모의면접 신청번호': mi_str(f.applicationId, 40)
    };
    sheet.appendRow(header.map(function (h) { return rec.hasOwnProperty(h) ? rec[h] : ''; }));
    var row = sheet.getLastRow();
    ['희망 날짜', '희망 시간', '연락처'].forEach(function (h) {
      var ci = header.indexOf(h);
      if (ci >= 0) sheet.getRange(row, ci + 1).setNumberFormat('@').setValue(rec[h]);
    });
    return mi_json_({ ok: true, id: id });
  } finally {
    lock.releaseLock();
  }
}

/** 보관 기한(12/20)이 지나면 '추가 오픈 신청' 탭(예전 이름 탭 포함)의 연락처 줄을 모두 지웁니다(머리글은 남김). */
function mi_purgeExtraRequests_(now) {
  if (now <= mi_extraRequestPurgeAt()) return;
  var ss = SpreadsheetApp.getActive();
  [MI.EXTRA_REQUEST_SHEET].concat(MI.EXTRA_REQUEST_OLD_SHEETS).forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() >= 2) sheet.deleteRows(2, sheet.getLastRow() - 1);
  });
}

/**
 * (선택 기능, 기본 꺼짐) [입금알림] 메일을 읽어 입금자명·금액이 정확히 1건과 맞으면 '입금 확정'과 '입금 시각'을 채웁니다.
 * 맞는 신청이 없거나 2건 이상이면 '입금알림 기록' 탭에 '손으로 확인'으로 남깁니다.
 * 켜려면: MI.AUTO_DEPOSIT_CHECK = true, appsscript.json 의 oauthScopes 에 https://mail.google.com/ 추가, 다시 배포.
 */
function checkDepositMails_(sheet, data, now) {
  var ss = SpreadsheetApp.getActive();
  var log = ss.getSheetByName(MI.DEPOSIT_SHEET) || ss.insertSheet(MI.DEPOSIT_SHEET);
  if (log.getLastRow() === 0) log.getRange(1, 1, 1, DEPOSIT_COLS.length).setValues([DEPOSIT_COLS]).setFontWeight('bold');
  var seen = {};
  if (log.getLastRow() > 1) {
    log.getRange(2, DEPOSIT_COLS.indexOf('메일 ID') + 1, log.getLastRow() - 1, 1).getValues()
      .forEach(function (v) { seen[String(v[0])] = true; });
  }
  var col = data.col;
  // GmailApp 은 이 기능을 켰을 때만 부릅니다.
  var threads = GmailApp.search('subject:"[입금알림]" newer_than:2d', 0, 50);
  threads.forEach(function (th) {
    th.getMessages().forEach(function (msg) {
      var mid = msg.getId();
      if (seen[mid]) return;
      var at = msg.getDate().getTime();
      var dep = mi_parseDepositMail(msg.getPlainBody(), at);
      var result = '읽지 못함(손으로 확인)', rid = '';
      if (dep) {
        var unit = mi_matchDeposit(data.rows, dep);
        if (unit) {
          unit.forEach(function (r) {
            sheet.getRange(r.rowNumber, col['입금 확정'] + 1).setValue(true);
            sheet.getRange(r.rowNumber, col['입금 시각'] + 1).setValue(new Date(at));
            r.paidChecked = true; r.paidAt = at;
          });
          result = '자동 확인'; rid = unit.map(function (r) { return r.id; }).join(', ');
        } else result = '맞는 신청 없음 또는 2건 이상(손으로 확인)';
      }
      log.appendRow([new Date(at), dep ? dep.amount : '', dep ? dep.name : '', result, rid, mid]);
      seen[mid] = true;
    });
  });
}

/** 처음 한 번 실행: 머리글, 체크박스, 날짜 형식, 5분 트리거를 만듭니다. */
function setup() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(MI.TZ);
  var sheet = ss.getSheetByName(MI.SHEET) || ss.insertSheet(MI.SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // 예전에 만든 시트에 새 열('확인 필요 사유' 등)이 없으면 맨 뒤에 붙입니다. 있던 열은 옮기지 않습니다.
  var have = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  var missing = COLS.filter(function (n) { return have.indexOf(n) < 0; });
  if (missing.length) sheet.getRange(1, have.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  ['날짜', '시간', '휴대폰', '보호자 연락처'].forEach(function (n) {
    var i = header.indexOf(n);
    if (i >= 0) sheet.getRange(2, i + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  ['신청 시각', '입금 기한', '입금 시각', '서류 기한', '입금 대기 시작', '보호자 동의 시각',
    '개인정보 동의 시각', '영상 동의 시각', '사진 동의 시각'].forEach(function (n) {
    var i = header.indexOf(n);
    if (i >= 0) sheet.getRange(2, i + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  });
  var orSheet = ss.getSheetByName(MI.EXTRA_REQUEST_SHEET) || ss.insertSheet(MI.EXTRA_REQUEST_SHEET);
  if (orSheet.getLastRow() === 0) {
    orSheet.getRange(1, 1, 1, EXTRA_REQ_COLS.length).setValues([EXTRA_REQ_COLS]).setFontWeight('bold');
    orSheet.setFrozenRows(1);
  }
  // 예전에 만든 탭에 새 열('모의면접 신청번호')이 없으면 맨 뒤에 붙입니다.
  var orHave = orSheet.getRange(1, 1, 1, orSheet.getLastColumn()).getValues()[0].map(String);
  var orMissing = EXTRA_REQ_COLS.filter(function (n) { return orHave.indexOf(n) < 0; });
  if (orMissing.length) orSheet.getRange(1, orHave.length + 1, 1, orMissing.length).setValues([orMissing]).setFontWeight('bold');
  var orHeader = orHave.concat(orMissing);
  ['희망 날짜', '희망 시간', '연락처', '보호자 연락처', '보관 기한', '모의면접 신청번호'].forEach(function (n) {
    var i = orHeader.indexOf(n);
    if (i >= 0) orSheet.getRange(2, i + 1, orSheet.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sweepNow') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sweepNow').timeBased().everyMinutes(5).create();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'onSheetEdit') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(ss).onEdit().create();
}

/** '입금 확정'·'미입금'·'서류 받음'을 체크하면 5분을 기다리지 않고 바로 정리합니다(setup 이 만드는 트리거). */
function onSheetEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() !== MI.SHEET || e.range.getRow() < 2) return;
  var name = String(sheet.getRange(1, e.range.getColumn()).getValue());
  if (CHECKBOX_COLS.indexOf(name) < 0 && name !== '입금 시각') return;
  sweepNow();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('모의면접')
    .addItem('지금 정리하기(입금 확정 반영·취소·대기 승격)', 'sweepNow')
    .addItem('처음 설정(한 번만)', 'setup')
    .addToUi();
}

/* ===================== 시트 읽기·쓰기 ===================== */

function mi_sheet_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(MI.SHEET);
  if (!sheet) throw new Error("'" + MI.SHEET + "' 탭이 없습니다. setup 을 먼저 실행하세요.");
  return sheet;
}

function mi_toMs_(v) {
  if (v === '' || v == null) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getTime();
  var s = String(v).trim();
  var m = s.match(/^(\d{4})[-.\/]\s*(\d{1,2})[-.\/]\s*(\d{1,2})\.?\s+(\d{1,2}):(\d{2})/);
  if (m) {
    function p(n) { return (String(n).length < 2 ? '0' : '') + n; }
    return Date.parse(m[1] + '-' + p(m[2]) + '-' + p(m[3]) + 'T' + p(m[4]) + ':' + m[5] + ':00+09:00');
  }
  var t = Date.parse(s);
  return isNaN(t) ? null : t;
}
function mi_toDateStr_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, MI.TZ, 'yyyy-MM-dd');
  return String(v || '').trim();
}
function mi_toTimeStr_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, MI.TZ, 'HH:mm');
  return String(v || '').trim();
}

function mi_readRows_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  var col = {};
  header.forEach(function (h, i) { col[h] = i; });
  var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  var rows = values.map(function (v, i) {
    return {
      rowNumber: i + 2,
      id: String(v[col['신청번호']] || ''),
      groupId: col['묶음 번호'] != null ? String(v[col['묶음 번호']] || '') : '',
      appliedAt: mi_toMs_(v[col['신청 시각']]) || 0,
      kind: String(v[col['구분']] || ''),
      date: mi_toDateStr_(v[col['날짜']]),
      time: mi_toTimeStr_(v[col['시간']]),
      status: String(v[col['상태']] || ''),
      payDeadline: mi_toMs_(v[col['입금 기한']]),
      holdStartedAt: mi_toMs_(v[col['입금 대기 시작']]),
      docsDeadline: mi_toMs_(v[col['서류 기한']]),
      paidChecked: v[col['입금 확정']] === true,
      paidAt: mi_toMs_(v[col['입금 시각']]),
      unpaidChecked: v[col['미입금']] === true,
      docsReceived: v[col['서류 받음']] === true,
      phone: mi_phone(v[col['휴대폰']]),
      studentName: String(v[col['학생 이름']] || ''),
      school: String(v[col['지원 학교']] || ''),
      track: String(v[col['지원 전형']] || ''),
      token: col['확인 키'] != null ? String(v[col['확인 키']] || '') : '',
      depositor: String(v[col['입금자명']] || ''),
      cancelReason: String(v[col['취소 사유']] || ''),
      checkReason: col['확인 필요 사유'] != null ? String(v[col['확인 필요 사유']] || '') : '',
      log: String(v[col['처리 기록']] || '').split('\n').filter(String),
      changed: false
    };
  }).filter(function (r) { return r.id; });
  return { header: header, col: col, rows: rows };
}

/** 바뀐 행의 스크립트 담당 칸만 칸 단위로 씁니다. */
function mi_writeChanged_(sheet, data) {
  var col = data.col;
  // 대기 순번은 매번 다시 매깁니다.
  var positions = {};
  MI.DATES.forEach(function (date) {
    MI.TIMES.forEach(function (time) {
      mi_waitlistOf(data.rows, date, time).forEach(function (r, i) { positions[r.id] = i + 1; });
    });
  });
  data.rows.forEach(function (r) {
    var pos = positions[r.id] || '';
    var set = function (name, value) {
      if (col[name] == null) return;
      sheet.getRange(r.rowNumber, col[name] + 1).setValue(value);
    };
    if (r.changed) {
      set('상태', r.status);
      set('입금 기한', r.payDeadline != null ? new Date(r.payDeadline) : '');
      set('서류 기한', r.docsDeadline != null ? new Date(r.docsDeadline) : '');
      set('입금 대기 시작', r.holdStartedAt != null ? new Date(r.holdStartedAt) : '');
      set('취소 사유', r.cancelReason);
      set('확인 필요 사유', r.checkReason || '');
      set('처리 기록', r.log.join('\n'));
    }
    if (r.kind === '예약' && col['대기 순번'] != null) {
      var cur = sheet.getRange(r.rowNumber, col['대기 순번'] + 1).getValue();
      if (String(cur) !== String(pos)) set('대기 순번', pos);
    }
  });
}

function mi_json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Node 테스트용(Apps Script 에서는 무시됩니다) */
if (typeof module !== 'undefined') {
  module.exports = { MI: MI, ST: ST, COLS: COLS, mi_sweep: mi_sweep, mi_isUnpaidCancel: mi_isUnpaidCancel, mi_initialStatus: mi_initialStatus, mi_summarize: mi_summarize,
    mi_validate: mi_validate, mi_isOpen: mi_isOpen, mi_docsDeadlineFor: mi_docsDeadlineFor, mi_baseDocsDeadline: mi_baseDocsDeadline,
    mi_waitlistOf: mi_waitlistOf, mi_payUnitKey: mi_payUnitKey, mi_decidePay: mi_decidePay, mi_payUnits: mi_payUnits, mi_toMs_: mi_toMs_, mi_validateExtraRequest: mi_validateExtraRequest,
    mi_wishDateOf: mi_wishDateOf, mi_wishTimeOf: mi_wishTimeOf,
    mi_extraRequestPurgeAt: mi_extraRequestPurgeAt, mi_parseDepositMail: mi_parseDepositMail, mi_matchDeposit: mi_matchDeposit,
    EXTRA_REQ_COLS: EXTRA_REQ_COLS, mi_isGated: mi_isGated, mi_publicSlots: mi_publicSlots, mi_findActiveDuplicate: mi_findActiveDuplicate, mi_sameName_: mi_sameName_, MI_DUP_OTHER_NAME: MI.DUP_OTHER_NAME,
    mi_view_: mi_view_, mi_tokenOk: mi_tokenOk, mi_docsExample: mi_docsExample, mi_promotionText: mi_promotionText, SCRIPT_OWNED: SCRIPT_OWNED };
}
