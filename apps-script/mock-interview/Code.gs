/**
 * 12월 3:1 모의면접 신청 — Google Apps Script 웹 앱 (세연님 구글 시트에 붙여 넣는 코드)
 *
 * - 홈페이지(sehyunt.re.kr/mock-interview/)가 이 웹 앱에 신청을 보냅니다.
 * - 신청 내역은 이 스프레드시트의 '신청' 탭에 쌓입니다.
 * - '추가 날짜·시간 오픈 신청'은 '추가 오픈 신청' 탭에 쌓입니다(희망 날짜·희망 시간·이름·연락처, 입금 없음).
 * - 입금 확인은 손으로 합니다(기본): 세연님이 '입금 확정' 칸에 체크하면 5분 안에 '확정'으로 바뀌고
 *   세연님 메일로 확정 안내 메일이 옵니다. 학생 이메일은 받지 않으므로 학생에게 직접 메일을 보내지 않습니다.
 * - 학생 문자(대기 승격·예약확정)는 세연님 메일로 '[문자발송] 모의면접' 메일을 보내고, 세연님 iPhone 단축어가 문자로 보냅니다.
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
  WAITLIST_AT_OPEN: [],
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
  // '[문자발송]' 메일로 확정을 이미 알리면 같은 내용의 '[모의면접] 예약 확정' 메일은 보내지 않습니다(MailApp 하루 약 100통 한도 절약).
  OWNER_CONFIRM_MAIL_WITH_SMS: false,
  OWNER_EMAIL: ['consultantsyssam', 'gmail.com'].join('@'),
  /**
   * 학생 문자(대기 승격·예약확정)는 세연님 메일로 '[문자발송] 모의면접' 메일을 한 통씩 보내고,
   * 세연님 iPhone 단축어(이메일 자동화)가 그 메일을 읽어 '메시지 보내기'로 보냅니다(세연님 11/3 결정).
   * 제목은 늘 같습니다. 다른 알림 메일 제목에는 '[문자발송]'을 넣지 않습니다.
   */
  SMS_BY_MAIL: true,
  SMS_SUBJECT: '[문자발송] 모의면접',
  SMS_PREFIX: '[입시는세연쌤] ',
  /** 이 시각보다 먼저 신청한 줄(오픈 전 시험 줄)에는 예약확정 문자를 보내지 않습니다. 시트로 시험하려면 잠깐 앞당깁니다. */
  SMS_SINCE: '2026-11-09T21:00:00+09:00',
  /** 처리 기록에 남기는 표시. 이 표시가 있는 줄에는 예약확정 문자를 다시 보내지 않습니다. 고치지 마세요. */
  SMS_MARK_CONFIRM: '예약확정 문자 메일 보냄',
  SMS_MARK_CONFIRM_SKIP: '예약확정 문자 못 보냄(휴대폰 번호 확인 필요)',
  SMS_MARK_PROMOTE: '승격 문자 메일 보냄',
  SMS_MARK_UNPAID: '미입금 취소 문자 메일 보냄',
  /** 미입금 자동 취소 문자(세연님 11/3 문구). 신청 한 건(묶음)에 한 번 보냅니다. */
  UNPAID_CANCEL_TEXT: '[입시는세연쌤] 3:1 모의면접 신청이 미입금으로 취소되었습니다.',
  /** 관리자 화면에서 '취소'를 누르면 남는 취소 사유. 이 사유로 자리가 비면 그 타임 대기 1번이 올라갑니다. */
  ADMIN_CANCEL_REASON: '관리자 취소',
  /** 신청 취소 문의 안내(신청완료 화면·안내 문구와 같음). 학생이 직접 취소하는 버튼은 없습니다. */
  CANCEL_INQUIRY: '신청 취소를 원하시면 카카오채널 입시는세연쌤으로 문의해 주세요.',
  /** 관리자 화면에서 연 추가 타임(스크립트 속성 MI_EXTRA_SLOTS 에 'yyyy-mm-dd HH:mm' 목록으로 저장). mi_loadExtraSlots_ 가 채웁니다. */
  EXTRA_SLOTS: [],
  EXTRA_SLOTS_PROP: 'MI_EXTRA_SLOTS',
  /** 관리자 키(스크립트 속성 MI_ADMIN_KEY, 20자 이상). 없으면 관리자 기능이 꺼집니다. */
  ADMIN_KEY_PROP: 'MI_ADMIN_KEY',
  ADMIN_KEY_MIN: 20,
  /** 관리자 키를 10번 틀리면 10분 동안 관리자 기능을 막습니다. */
  ADMIN_FAIL_LIMIT: 10,
  ADMIN_FAIL_WINDOW_S: 600,
  /**
   * 마감 임박 알림(세연님 11/3 15:18 결정). 다른 타임이 모두 차서(대기·마감) 새로 신청할 수 있는 타임이 하나만 남고,
   * 그 타임 남은 자리가 1명이 되면 한 번 알립니다.
   * - 세연님 휴대폰: MI.SMS_SUBJECT 제목의 문자발송 메일(받는번호 = 스크립트 속성 OWNER_PHONE). OWNER_PHONE 이 없으면 보내지 않습니다.
   * - 카카오채널 봇: 스크립트 속성 ALERT_EMAIL 주소로 '[마감임박] 3:1 모의면접' 메일. 비어 있으면 보내지 않습니다.
   * 보낸 기록은 스크립트 속성 MI_LAST_SEAT 에 남깁니다(같은 타임에 다시 보내지 않음). 조건이 풀리면 지워져 다시 알릴 수 있습니다.
   */
  OWNER_PHONE_PROP: 'OWNER_PHONE',
  ALERT_EMAIL_PROP: 'ALERT_EMAIL',
  LAST_SEAT_PROP: 'MI_LAST_SEAT',
  LAST_SEAT_SUBJECT: '[마감임박] 3:1 모의면접',
  LAST_SEAT_KAKAO_TEXT: '마감 임박! 이후 대기 신청만 가능합니다',
  SITE_URL: 'sehyunt.re.kr/mock-interview',
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
  '모의면접 신청번호',
  /** 추가 타임을 열 때 보낸 알림 기록(날짜마다 한 줄). 이 기록이 있는 날짜는 같은 연락처로 다시 보내지 않습니다. */
  '오픈 알림 기록'];
var DEPOSIT_COLS = ['메일 시각', '금액', '입금자명', '결과', '신청번호', '메일 ID'];

/* ===================== 규칙(순수 함수, 테스트 대상) ===================== */

function mi_slotStart(date, time) { return Date.parse(date + 'T' + time + ':00+09:00'); }
function mi_isOpen(now) { return now >= Date.parse(MI.OPEN_AT); }
/** 정규 타임(DATES × TIMES)인지 */
function mi_isBaseSlot(date, time) { return MI.DATES.indexOf(date) >= 0 && MI.TIMES.indexOf(time) >= 0; }
function mi_isValidSlot(date, time) { return mi_isBaseSlot(date, time) || MI.EXTRA_SLOTS.indexOf(date + ' ' + time) >= 0; }
/** 신청을 받는 모든 타임: 정규 타임 + 관리자 화면에서 연 추가 타임(시작 시각 순) */
function mi_allSlots() {
  var out = [], seen = {};
  MI.DATES.forEach(function (date) {
    MI.TIMES.forEach(function (time) { out.push({ date: date, time: time }); seen[date + ' ' + time] = true; });
  });
  MI.EXTRA_SLOTS.forEach(function (k) {
    var m = String(k).match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/);
    if (m && !seen[k]) { out.push({ date: m[1], time: m[2] }); seen[k] = true; }
  });
  return out.sort(function (a, b) { return mi_slotStart(a.date, a.time) - mi_slotStart(b.date, b.time); });
}
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
  return mi_allSlots().map(function (s) {
    var date = s.date, time = s.time;
    var left = Math.max(0, MI.CAPACITY - mi_heldCount(rows, date, time));
    var waitlist = mi_waitlistOf(rows, date, time).length;
    return {
      date: date, time: time, capacity: MI.CAPACITY, left: left, waitlist: waitlist,
      wait: left === 0 || waitlist > 0 || mi_isGated(rows, date, time),
      closed: now >= mi_bookingClosesAt(date, time)
    };
  });
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
  // 자리를 잡고 있던 줄(입금 대기·확정, 자리를 비워 둔 '확인 필요')이 취소되면 그 타임 대기 1번을 올릴 수 있습니다.
  if (r.status === ST.pending || r.status === ST.confirmed || r.status === ST.check) r.freedSeat = true;
  r.justCancelled = true;
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
  // 대기 승격(세연님 11/3 결정)
  // - 오픈 때부터 대기로 둔 타임(WAITLIST_AT_OPEN): 대기가 WAITLIST_RELEASE_COUNT 명 모이면 빈자리만큼 대기 순서대로 올립니다.
  // - 그 밖의 타임: 앞선 신청자가 취소했을 때만(미입금 자동 취소·관리자 취소) 취소된 자리 수만큼 대기 1번부터 올립니다.
  //   '확인 필요'로 바뀌어 빈 자리는 세연님이 확정·환불을 정할 때까지 올리지 않습니다.
  mi_allSlots().forEach(function (s) {
    var date = s.date, time = s.time;
    (function () {
      if (now >= mi_bookingClosesAt(date, time)) return;
      if (mi_isGated(rows, date, time)) return;
      var slot = mi_slotRows(rows, date, time);
      var releasing = MI.WAITLIST_AT_OPEN.indexOf(date + ' ' + time) >= 0 && !slot.some(function (r) { return r.holdStartedAt != null; });
      var credits = releasing ? MI.CAPACITY : slot.filter(function (r) { return r.freedSeat; }).length;
      var free = Math.min(credits, MI.CAPACITY - mi_heldCount(rows, date, time));
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
    })();
  });
  rows.forEach(function (r) { delete r.freedSeat; });
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
function mi_slotLabel_(date, time) {
  var ymd = date.split('-'), hm = time.split(':');
  return Number(ymd[1]) + '월 ' + Number(ymd[2]) + '일 ' + Number(hm[0]) + '시' + (Number(hm[1]) ? ' ' + Number(hm[1]) + '분' : '');
}
function mi_promotionText(position, depositor, date, time, payDeadline) {
  var slot = mi_slotLabel_(date, time);
  var d = new Date(payDeadline + 9 * 3600000);
  function p(n) { return (n < 10 ? '0' : '') + n; }
  var dl = (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일 ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
  var hours = Math.round(MI.PROMOTED_PAY_WINDOW_MS / 3600000);
  var fee = String(MI.FEE).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return '대기 ' + position + '번 ' + depositor + ' 학생, 현재 ' + slot + ' 3:1 모의면접 신청 가능합니다. ' +
    hours + '시간 이내(' + dl + '까지)에 입금 완료해 주시면 예약이 확정됩니다. ' +
    '입금 계좌: ' + MI.BANK_ACCOUNT + ', ' + fee + '원';
}
/**
 * 예약확정 문자(묶음 하나에 한 통). 기존 확정 메일의 문자 예시를 한 줄로 만든 것입니다.
 * 예: '[입시는세연쌤] 홍길동 학생, 12월 12일 16시 3:1 모의면접 예약이 확정되었습니다. 서류는 면접 1주 전까지 …'
 */
function mi_confirmText(rows) {
  var list = rows.slice().sort(function (a, b) { return mi_slotStart(a.date, a.time) - mi_slotStart(b.date, b.time); });
  var slots = list.map(function (x) { return mi_slotLabel_(x.date, x.time); }).join(', ');
  var dates = [];
  list.forEach(function (x) { if (dates.indexOf(x.date) < 0) dates.push(x.date); });
  return MI.SMS_PREFIX + (list[0].studentName || list[0].depositor) + ' 학생, ' + slots + ' 3:1 모의면접 예약이 확정되었습니다. ' +
    '서류는 언제 보내나요? 면접 1주 전까지 생기부·자소서를 ' + MI.OWNER_EMAIL + '으로 보내주세요. ' +
    '예: ' + dates.map(mi_docsExample).join(', ') + ' 보내 주세요. 서류를 보내지 않아도 면접은 그대로 진행하며, 당일 즉석 질문으로 진행합니다.';
}
/** 문자 본문은 한 줄로(단축어가 '문자:' 줄 하나만 읽습니다) */
function mi_oneLine(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
/**
 * '[문자발송]' 메일 한 통. 본문 첫 두 줄이 늘 '받는번호: 숫자만' / '문자: 한 줄'이고, 빈 줄 뒤에 사람이 볼 내용이 옵니다.
 * 번호가 휴대폰 번호가 아니면 null(보내지 않음).
 */
function mi_smsMail(phone, text, details) {
  var to = mi_phone(phone);
  if (!mi_isPhone(to)) return null;
  var extra = (details || []).map(mi_oneLine).filter(String)
    // 단축어가 잘못 읽지 않도록 사람이 볼 줄에는 '받는번호:'·'문자:'를 쓰지 않습니다.
    .map(function (l) { return l.replace(/받는번호\s*:/g, '받는번호 -').replace(/문자\s*:/g, '문자 -'); });
  return {
    subject: MI.SMS_SUBJECT,
    body: '받는번호: ' + to + '\n문자: ' + mi_oneLine(text) + '\n\n' +
      extra.concat(['이 메일은 iPhone 단축어가 읽어 위 번호로 문자를 보냅니다. 제목과 첫 두 줄을 고치지 마세요.']).join('\n')
  };
}
function mi_hasMark_(r, mark) { return r.log.some(function (l) { return l.indexOf(mark) >= 0; }); }
function mi_details_(list) {
  return ['신청번호: ' + list.map(function (x) { return x.id; }).join(', ') + (list[0].groupId ? ' (묶음 ' + list[0].groupId + ')' : ''),
    '시트 행: ' + list.map(function (x) { return x.rowNumber; }).filter(function (n) { return n != null; }).join(', '),
    '학생: ' + list[0].studentName + ', 입금자명: ' + list[0].depositor,
    '타임: ' + list.map(function (x) { return x.date + ' ' + x.time; }).join(', ')];
}
/**
 * 보낼 문자 목록을 만들고 처리 기록에 표시를 남깁니다(시트에는 아직 쓰지 않습니다).
 * - 대기 승격: 이번 정리에서 올라간 줄마다 한 통.
 * - 예약확정: '확정'인 예약 줄 가운데 표시가 없는 줄을 묶음마다 모아 한 통. 세금 봇이 '입금 확정'을 체크했든,
 *   세연님이 손으로 체크하거나 상태를 '확정'으로 바꿨든 같습니다. 표시가 있으면 다시 보내지 않습니다.
 */
function mi_smsQueue(rows, now) {
  var out = [];
  if (!MI.SMS_BY_MAIL) return out;
  var since = Date.parse(MI.SMS_SINCE);
  var stamp = mi_fmt(now) + ' ';
  rows.forEach(function (r) {
    if (!r.justPromoted) return;
    var dl = r.payDeadline;
    var mail = mi_smsMail(r.phone, MI.SMS_PREFIX + mi_promotionText(r.promotedFrom || 1, r.depositor || r.studentName, r.date, r.time, dl),
      mi_details_([r]).concat(['입금 기한: ' + mi_fmt(dl) + ' (승격 뒤 ' + Math.round(MI.PROMOTED_PAY_WINDOW_MS / 3600000) + '시간, 기한 + 10분이 지나면 자동 취소)']));
    r.log.push(stamp + (mail ? MI.SMS_MARK_PROMOTE : '승격 문자 못 보냄(휴대폰 번호 확인 필요)'));
    r.changed = true;
    if (mail) out.push({ kind: 'promoted', rows: [r], mark: MI.SMS_MARK_PROMOTE, mail: mail });
  });
  var keys = [], groups = {};
  rows.forEach(function (r) {
    if (r.kind !== '예약' || r.status !== ST.confirmed) return;
    if (!(r.appliedAt >= since)) return;
    if (mi_hasMark_(r, MI.SMS_MARK_CONFIRM) || mi_hasMark_(r, MI.SMS_MARK_CONFIRM_SKIP)) return;
    var k = r.groupId || 'row:' + r.id;
    if (!groups[k]) { groups[k] = []; keys.push(k); }
    groups[k].push(r);
  });
  keys.forEach(function (k) {
    var list = groups[k];
    var mail = mi_smsMail(list[0].phone, mi_confirmText(list), mi_details_(list));
    list.forEach(function (r) {
      r.log.push(stamp + (mail ? MI.SMS_MARK_CONFIRM : MI.SMS_MARK_CONFIRM_SKIP));
      r.changed = true;
    });
    if (mail) out.push({ kind: 'confirmed', rows: list, mark: MI.SMS_MARK_CONFIRM, mail: mail });
  });
  // 미입금 자동 취소: 이번 정리에서 미입금으로 취소된 줄을 묶음마다 모아 한 통(신청 한 건에 한 번).
  var ukeys = [], ugroups = {};
  rows.forEach(function (r) {
    if (r.kind !== '예약' || !r.justCancelled || r.status !== ST.cancelled || !mi_isUnpaidCancel(r.cancelReason)) return;
    if (!(r.appliedAt >= since) || mi_hasMark_(r, MI.SMS_MARK_UNPAID)) return;
    var k = mi_payUnitKey(r);
    if (!ugroups[k]) { ugroups[k] = []; ukeys.push(k); }
    ugroups[k].push(r);
  });
  ukeys.forEach(function (k) {
    var list = ugroups[k];
    var mail = mi_smsMail(list[0].phone, MI.UNPAID_CANCEL_TEXT, mi_details_(list).concat(['취소 사유: ' + list[0].cancelReason]));
    list.forEach(function (r) {
      r.log.push(stamp + (mail ? MI.SMS_MARK_UNPAID : '미입금 취소 문자 못 보냄(휴대폰 번호 확인 필요)'));
      r.changed = true;
    });
    if (mail) out.push({ kind: 'unpaid', rows: list, mark: MI.SMS_MARK_UNPAID, mail: mail });
  });
  return out;
}
/**
 * '[문자발송]' 메일을 보냅니다. 시트에 쓰기 전에 보내고, 보내지 못한 예약확정은 표시를 지워 다음 정리(5분 뒤)에 다시 보냅니다.
 * send 는 테스트용으로 바꿀 수 있습니다(기본 MailApp).
 */
function mi_sendSmsMails_(queue, send) {
  send = send || function (to, subject, body) { MailApp.sendEmail(to, subject, body); };
  queue.forEach(function (q) {
    try {
      send(MI.OWNER_EMAIL, q.mail.subject, q.mail.body);
    } catch (err) {
      console.warn('문자발송 메일 실패: ' + err);
      q.rows.forEach(function (r) {
        var i = r.log.length - 1;
        if (i >= 0 && r.log[i].indexOf(q.mark) >= 0) r.log.splice(i, 1);
        // 승격 문자는 다시 만들 수 없으므로 실패를 남기고 확정 알림처럼 세연님이 직접 보냅니다.
        if (q.kind === 'promoted') r.log.push(mi_fmt(Date.now()) + ' 승격 문자 메일 실패(직접 보내 주세요)');
        // 미입금 취소 문자도 다음 정리에서는 다시 만들지 않습니다(이번 정리에서 취소된 줄만 보냄).
        if (q.kind === 'unpaid') r.log.push(mi_fmt(Date.now()) + ' 미입금 취소 문자 메일 실패(직접 보내 주세요)');
      });
    }
  });
}
/* ===================== 마감 임박 알림 ===================== */

/**
 * 새로 신청하면 바로 입금 대기가 되는 타임(마감 전이고 '(대기)'가 아닌 타임)이 하나만 남았고, 그 타임 남은 자리가 1명이면 그 타임.
 * 아니면 null. src/lib/mockInterview.ts lastSeatSlot 과 같습니다.
 */
function mi_lastSeatSlot(rows, now) {
  var open = mi_summarize(rows, now).filter(function (s) { return !s.closed && !s.wait; });
  if (open.length !== 1 || open[0].left !== 1) return null;
  return { date: open[0].date, time: open[0].time, key: open[0].date + ' ' + open[0].time };
}
/** 세연님 휴대폰 문자: '[마감임박] 12월 19일 17시 3:1 모의면접 남은 자리 1명' */
function mi_lastSeatText(date, time) {
  return '[마감임박] ' + mi_slotLabel_(date, time) + ' 3:1 모의면접 남은 자리 1명';
}
/** 카카오채널 봇용 메일. 첫 세 줄('날짜: ', '시간: ', '남은 인원: 1')은 고정입니다. */
function mi_lastSeatAlertMail(date, time) {
  var ymd = date.split('-'), hm = time.split(':');
  var wd = '일월화수목금토'.charAt(new Date(Date.parse(date + 'T00:00:00Z')).getUTCDay());
  return {
    subject: MI.LAST_SEAT_SUBJECT,
    body: '날짜: ' + Number(ymd[1]) + '월 ' + Number(ymd[2]) + '일(' + wd + ')\n' +
      '시간: ' + Number(hm[0]) + '시' + (Number(hm[1]) ? ' ' + Number(hm[1]) + '분' : '') + '\n' +
      '남은 인원: 1\n\n' +
      '안내 문구: ' + MI.LAST_SEAT_KAKAO_TEXT + '\n' +
      '다른 타임은 모두 마감되어 대기 신청만 받습니다. 신청: ' + MI.SITE_URL
  };
}
function mi_isEmail_(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); }
/**
 * 보낼 마감 임박 알림과 다음 기록(state)을 정합니다(순수 함수).
 * state: { key: 알린 타임 'yyyy-mm-dd HH:mm' 또는 '', sms: 문자 메일 보냄, mail: 카카오 봇 메일 보냄 }
 * - 오픈 전·SMS_SINCE 전: 아무것도 보내지 않고 기록도 그대로 둡니다.
 * - 조건이 아니면 기록을 비웁니다(다음에 다시 조건이 되면 또 알림).
 * - 조건이면 그 타임에 아직 안 보낸 쪽만 보냅니다. OWNER_PHONE·ALERT_EMAIL 이 비었거나 틀리면 그쪽은 건너뛴 것으로 칩니다.
 */
function mi_lastSeatPlan(rows, now, state, ownerPhone, alertEmail) {
  state = state && typeof state === 'object' ? state : { key: '' };
  if (!mi_isOpen(now) || now < Date.parse(MI.SMS_SINCE)) return { slot: null, state: state, send: [] };
  var slot = mi_lastSeatSlot(rows, now);
  if (!slot) return { slot: null, state: { key: '' }, send: [] };
  var st = state.key === slot.key ? { key: slot.key, sms: !!state.sms, mail: !!state.mail } : { key: slot.key, sms: false, mail: false };
  var send = [];
  if (!st.sms) {
    var m = mi_smsMail(ownerPhone, mi_lastSeatText(slot.date, slot.time), [
      '타임: ' + slot.key + ' (새로 신청할 수 있는 마지막 타임, 남은 자리 1명)',
      '다른 타임은 모두 차서 대기 신청만 받습니다.',
      '같은 타임에는 한 번만 보냅니다. 자리가 다시 비었다가 1명이 되면 또 보냅니다.'
    ]);
    if (m) send.push({ channel: 'sms', to: MI.OWNER_EMAIL, subject: m.subject, body: m.body });
    else st.sms = true; // OWNER_PHONE 없음·틀림: 건너뜀
  }
  if (!st.mail) {
    if (mi_isEmail_(alertEmail)) {
      var a = mi_lastSeatAlertMail(slot.date, slot.time);
      send.push({ channel: 'mail', to: String(alertEmail).trim(), subject: a.subject, body: a.body });
    } else st.mail = true; // ALERT_EMAIL 없음: 건너뜀
  }
  return { slot: slot, state: st, send: send };
}
/** 보내고 state 를 고칩니다. 보내지 못한 쪽은 다음 정리(5분 뒤)에 다시 보냅니다. send 는 테스트용으로 바꿀 수 있습니다. */
function mi_sendLastSeat_(plan, send) {
  send = send || function (to, subject, body) { MailApp.sendEmail(to, subject, body); };
  plan.send.forEach(function (x) {
    try { send(x.to, x.subject, x.body); plan.state[x.channel] = true; } catch (err) { console.warn('마감 임박 알림 실패(' + x.channel + '): ' + err); }
  });
  return plan.state;
}
/** 정리할 때마다 부릅니다(잠금 안에서). 실패해도 신청·정리는 그대로 진행합니다. */
function mi_checkLastSeat_(rows, now) {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(MI.LAST_SEAT_PROP) || '';
    var state;
    try { state = JSON.parse(raw || '{"key":""}'); } catch (e) { state = { key: '' }; }
    var plan = mi_lastSeatPlan(rows, now, state, props.getProperty(MI.OWNER_PHONE_PROP), props.getProperty(MI.ALERT_EMAIL_PROP));
    var next = JSON.stringify(mi_sendLastSeat_(plan));
    if (next !== raw) props.setProperty(MI.LAST_SEAT_PROP, next);
  } catch (err) {
    console.warn('마감 임박 확인 실패: ' + err);
  }
}

/* ===================== 관리자 기능(취소·추가 오픈 신청 목록·타임 추가) ===================== */

/**
 * 관리자 취소. 이미 취소된 줄이면 아무것도 바꾸지 않습니다(두 번 눌러도 같음).
 * 자리를 잡고 있던 줄이면 바로 정리(mi_sweep)해서 그 타임 대기 1번을 입금 대기(8시간 + 10분)로 올립니다.
 * 승격 문자는 이어서 mi_smsQueue 가 '[문자발송]' 메일로 만듭니다.
 */
function mi_adminCancel(rows, id, now) {
  var r = rows.filter(function (x) { return x.kind === '예약' && x.id === String(id || ''); })[0];
  if (!r) return { ok: false, error: '신청번호를 찾지 못했습니다.' };
  if (r.status === ST.cancelled) return { ok: true, already: true, id: r.id, promoted: [] };
  mi_cancel(r, now, MI.ADMIN_CANCEL_REASON);
  mi_sweep(rows, now);
  var promoted = rows.filter(function (x) { return x.justPromoted && x.date === r.date && x.time === r.time; })
    .map(function (x) { return { id: x.id, name: x.studentName || x.depositor, position: x.promotedFrom || 1, payDeadline: x.payDeadline }; });
  return { ok: true, already: false, id: r.id, promoted: promoted };
}
/** 타임을 새로 열 때 보내는 문자(세연님 11/3 문구) */
function mi_openNoticeText(date, time) {
  return MI.SMS_PREFIX + '3:1 모의면접 추가 날짜(' + mi_slotLabel_(date, time) + ')가 열렸습니다. ' +
    '신청 페이지에서 먼저 신청하신 순서대로 접수됩니다. ' + MI.SITE_URL;
}
/**
 * 추가 오픈 신청의 '희망 날짜' 칸에서 날짜(yyyy-mm-dd)를 꺼냅니다. 목록 날짜(2026-12-19)와 직접 적은 날짜(12/26, 12월 26일)를 모두 읽습니다.
 * 11·12월은 2026년, 1·2월은 2027년으로 봅니다.
 */
function mi_wishDates(text) {
  var s = String(text || ''), out = [];
  function add(y, m, d) {
    m = Number(m); d = Number(d);
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return;
    y = y ? Number(y) : (m <= 2 ? 2027 : 2026);
    var k = y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
    if (out.indexOf(k) < 0) out.push(k);
  }
  var re = /(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\s*[\/.]\s*(\d{1,2})|(\d{1,2})\s*월\s*(\d{1,2})\s*일?/g, m;
  while ((m = re.exec(s))) {
    if (m[1]) add(m[1], m[2], m[3]); else if (m[4]) add(null, m[4], m[5]); else add(null, m[6], m[7]);
  }
  return out;
}
/**
 * 새로 연 타임을 알릴 사람(같은 연락처는 한 명). audience 'date' 는 희망 날짜에 그 날짜가 있는 사람, 'all' 은 추가 오픈 신청한 모든 사람.
 * '오픈 알림 기록'에 그 날짜가 이미 있으면(같은 연락처의 어느 줄이든) 다시 보내지 않습니다.
 * requests: [{ rowNumber, id, at, name, phone, wishDate, wishTime, notified }]
 */
function mi_openNoticeQueue(requests, date, time, audience, now) {
  var sentPhones = {}, picked = {}, order = [];
  requests.forEach(function (q) {
    var ph = mi_phone(q.phone);
    if (String(q.notified || '').split('\n').some(function (l) { return l.indexOf(date) === 0; })) sentPhones[ph] = true;
  });
  requests.slice().sort(function (a, b) { return (a.at || 0) - (b.at || 0); }).forEach(function (q) {
    var ph = mi_phone(q.phone);
    if (!mi_isPhone(ph) || sentPhones[ph] || picked[ph]) return;
    if (audience !== 'all' && mi_wishDates(q.wishDate).indexOf(date) < 0) return;
    picked[ph] = q; order.push(ph);
  });
  var text = mi_openNoticeText(date, time);
  return order.map(function (ph) {
    var q = picked[ph];
    return {
      kind: 'open', request: q, phone: ph,
      mark: date + ' ' + time + ' 알림 메일 보냄(' + mi_fmt(now) + ')',
      mail: mi_smsMail(ph, text, ['추가 오픈 신청: ' + q.id + ', ' + q.name, '희망: ' + q.wishDate + ' / ' + q.wishTime,
        '연 타임: ' + date + ' ' + time])
    };
  });
}
/** 추가 타임 알림 메일 보내기. 보낸 줄에만 기록을 붙입니다(실패한 사람은 다시 누르면 보냅니다). */
function mi_sendOpenNotices_(queue, send) {
  send = send || function (to, subject, body) { MailApp.sendEmail(to, subject, body); };
  var sent = 0, failed = [];
  queue.forEach(function (q) {
    try {
      send(MI.OWNER_EMAIL, q.mail.subject, q.mail.body);
      q.request.notified = (q.request.notified ? q.request.notified + '\n' : '') + q.mark;
      q.request.changed = true;
      sent += 1;
    } catch (err) {
      console.warn('추가 타임 알림 메일 실패: ' + err);
      failed.push(q.request.name);
    }
  });
  return { sent: sent, failed: failed };
}
/** 새로 열 타임 확인. 잘못이면 오류 문구, 괜찮으면 ''. */
function mi_checkNewSlot(date, time, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || isNaN(mi_slotStart(date, '00:00'))) return '날짜를 2026-12-26 형식으로 적어 주세요.';
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) return '시간을 16:00 형식으로 적어 주세요.';
  if (mi_isBaseSlot(date, time)) return '이미 있는 타임입니다.';
  if (now >= mi_bookingClosesAt(date, time)) return '면접 24시간 전이 지난 타임은 열 수 없습니다.';
  return '';
}
/** 관리자 키 비교(키가 짧거나 비어 있으면 늘 거절) */
function mi_adminKeyOk(expected, given) {
  var a = String(expected || '');
  if (a.length < MI.ADMIN_KEY_MIN) return false;
  return mi_tokenOk({ token: a }, given);
}
/** 관리자 화면에 보내는 신청 목록(필요한 칸만) */
function mi_adminRows(rows) {
  var positions = {};
  mi_allSlots().forEach(function (s) {
    mi_waitlistOf(rows, s.date, s.time).forEach(function (r, i) { positions[r.id] = i + 1; });
  });
  return rows.filter(function (r) { return r.kind === '예약'; }).map(function (r) {
    return { id: r.id, groupId: r.groupId, appliedAt: r.appliedAt, date: r.date, time: r.time, status: r.status,
      waitlistPos: positions[r.id] || null, payDeadline: r.status === ST.pending ? r.payDeadline : null,
      studentName: r.studentName, depositor: r.depositor, phone: r.phone, cancelReason: r.cancelReason || '' };
  });
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
  mi_loadExtraSlots_();
  var p = (e && e.parameter) || {};
  var rows = mi_readRows_(mi_sheet_()).rows;
  if (p.check) {
    // 확인 링크: 신청번호와 확인 키가 모두 맞아야 보여 줍니다. 정리(sweep) 결과는 5분 트리거가 시트에 씁니다.
    mi_sweep(rows, now);
    var v = mi_view_(rows, String(p.check));
    if (!v || !mi_tokenOk(v, p.k)) return mi_json_({ ok: false, error: '신청을 찾지 못했습니다. 받은 확인 링크를 그대로 열어 주세요.' });
    return mi_json_(v);
  }
  return mi_json_({ ok: true, open: mi_isOpen(now), openAt: MI.OPEN_AT, now: now, slots: mi_publicSlots(mi_summarize(rows, now)), extraSlots: MI.EXTRA_SLOTS });
}

function doPost(e) {
  var now = Date.now();
  var f;
  try { f = JSON.parse(e.postData.contents); } catch (err) { return mi_json_({ ok: false, error: '신청서를 읽지 못했습니다.' }); }
  mi_loadExtraSlots_();
  if (f.website) return mi_json_({ ok: true, id: 'ignored' }); // 스팸 방지 칸
  if (f.action === 'admin') return mi_json_(mi_admin_(f, now));
  if (f.action === 'ebookOrder') {
    // 전자책 주문(apps-script/ebooks/Ebook.gs). 그 파일을 넣지 않았으면 받지 않습니다.
    if (typeof eb_handleOrder_ !== 'function') return mi_json_({ ok: false, error: '전자책 주문은 준비 중입니다.' });
    return mi_json_(eb_handleOrder_(f, now));
  }
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

    // 묶음 번호는 잠금 안에서 만들고, 시트에 이미 있는 번호와 겹치면 다시 뽑습니다(11/9 21:00 같은 초 동시 신청 대비).
    var taken = {};
    data.rows.forEach(function (r) { taken[r.groupId || r.id] = true; });
    var groupId;
    do {
      groupId = 'MI-' + Utilities.formatDate(new Date(), MI.TZ, 'MMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    } while (taken[groupId]);
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
    mi_sendSmsMails_(mi_smsQueue(data.rows, now));
    mi_writeChanged_(sheet, data);
    mi_notifyOwner_(data.rows);
    mi_checkLastSeat_(data.rows, now);
    return mi_json_(mi_view_(data.rows, groupId));
  } finally {
    lock.releaseLock();
  }
}

/** 관리자 화면에서 연 추가 타임을 읽어 MI.EXTRA_SLOTS 에 넣습니다. */
function mi_loadExtraSlots_() {
  var list = [];
  try {
    // 시험 환경(PropertiesService 없음)이나 속성을 못 읽으면 기본 타임만 씁니다.
    var raw = typeof PropertiesService === 'undefined' ? '' : PropertiesService.getScriptProperties().getProperty(MI.EXTRA_SLOTS_PROP);
    list = JSON.parse(raw || '[]');
  } catch (err) { list = []; }
  MI.EXTRA_SLOTS = (Array.isArray(list) ? list : []).map(String).filter(function (k) { return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(k); });
}

/**
 * 관리자 기능(홈페이지 /mock-interview/?admin 화면이 부릅니다). 스크립트 속성 MI_ADMIN_KEY 와 같은 키가 와야 합니다.
 * op: 'list'(신청·추가 오픈 신청 목록), 'cancel'(id), 'openSlot'(date, time, audience 'date'|'all').
 */
function mi_admin_(f, now) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('mi_admin_fail') || 0);
  if (fails >= MI.ADMIN_FAIL_LIMIT) return { ok: false, error: '관리자 키가 여러 번 틀렸습니다. 10분 뒤에 다시 넣어 주세요.' };
  var expected = PropertiesService.getScriptProperties().getProperty(MI.ADMIN_KEY_PROP);
  if (!expected || expected.length < MI.ADMIN_KEY_MIN) return { ok: false, error: '관리자 키가 아직 설정되지 않았습니다(스크립트 속성 MI_ADMIN_KEY).' };
  if (!mi_adminKeyOk(expected, f.key)) {
    cache.put('mi_admin_fail', String(fails + 1), MI.ADMIN_FAIL_WINDOW_S);
    return { ok: false, error: '관리자 키가 맞지 않습니다.' };
  }
  if (fails) cache.remove('mi_admin_fail'); // 맞는 키가 오면 틀린 횟수를 지웁니다.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: '다른 처리가 진행 중입니다. 잠시 뒤 다시 눌러 주세요.' };
  try {
    var sheet = mi_sheet_();
    var data = mi_readRows_(sheet);
    var res;
    if (f.op === 'cancel') {
      res = mi_adminCancel(data.rows, f.id, now);
    } else if (f.op === 'openSlot') {
      var date = String(f.date || ''), time = String(f.time || '');
      var err = mi_checkNewSlot(date, time, now);
      if (err) return { ok: false, error: err };
      var key = date + ' ' + time;
      var already = MI.EXTRA_SLOTS.indexOf(key) >= 0;
      if (!already) {
        MI.EXTRA_SLOTS = MI.EXTRA_SLOTS.concat([key]).sort();
        PropertiesService.getScriptProperties().setProperty(MI.EXTRA_SLOTS_PROP, JSON.stringify(MI.EXTRA_SLOTS));
      }
      var xr = mi_readExtraRequests_();
      var queue = mi_openNoticeQueue(xr.requests, date, time, f.audience === 'all' ? 'all' : 'date', now);
      var r2 = mi_sendOpenNotices_(queue.filter(function (q) { return q.mail; }));
      mi_writeExtraNotified_(xr);
      res = { ok: true, already: already, slot: key, sent: r2.sent, failed: r2.failed };
    } else if (f.op !== 'list') {
      return { ok: false, error: '알 수 없는 요청입니다.' };
    }
    mi_sweep(data.rows, now);
    mi_sendSmsMails_(mi_smsQueue(data.rows, now));
    mi_writeChanged_(sheet, data);
    mi_notifyOwner_(data.rows);
    mi_checkLastSeat_(data.rows, now);
    var list = mi_readExtraRequests_();
    return Object.assign(res || { ok: true }, {
      rows: mi_adminRows(data.rows),
      extraRequests: list.requests.map(function (q) {
        return { id: q.id, at: q.at, name: q.name, phone: q.phone, wishDate: q.wishDate, wishTime: q.wishTime, notified: q.notified };
      }),
      extraSlots: MI.EXTRA_SLOTS,
      lastSeat: (function (s) { return s ? s.key : null; })(mi_lastSeatSlot(data.rows, now))
    });
  } finally {
    lock.releaseLock();
  }
}

/** '추가 오픈 신청' 탭 읽기('오픈 알림 기록' 열이 없으면 맨 뒤에 붙입니다) */
function mi_readExtraRequests_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(MI.EXTRA_REQUEST_SHEET);
  if (!sheet || sheet.getLastColumn() === 0) return { sheet: null, col: {}, requests: [] };
  var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  if (header.indexOf('오픈 알림 기록') < 0) {
    sheet.getRange(1, header.length + 1).setValue('오픈 알림 기록').setFontWeight('bold');
    header.push('오픈 알림 기록');
  }
  var col = {};
  header.forEach(function (h, i) { col[h] = i; });
  var last = sheet.getLastRow();
  var vals = last > 1 ? sheet.getRange(2, 1, last - 1, header.length).getValues() : [];
  var requests = vals.map(function (v, i) {
    return { rowNumber: i + 2, id: String(v[col['신청번호']] || ''), at: mi_toMs_(v[col['신청 시각']]) || 0,
      wishDate: mi_toDateStr_(v[col['희망 날짜']]), wishTime: mi_toTimeStr_(v[col['희망 시간']]),
      name: String(v[col['이름']] || ''), phone: mi_phone(v[col['연락처']]),
      notified: String(v[col['오픈 알림 기록']] || ''), changed: false };
  }).filter(function (q) { return q.id || q.phone; });
  return { sheet: sheet, col: col, requests: requests };
}
function mi_writeExtraNotified_(xr) {
  if (!xr.sheet) return;
  xr.requests.forEach(function (q) {
    if (q.changed) xr.sheet.getRange(q.rowNumber, xr.col['오픈 알림 기록'] + 1).setValue(q.notified);
  });
}

/** 시트 메뉴 '선택한 줄 관리자 취소': 지금 고른 줄을 관리자 취소합니다(관리자 화면 '취소' 버튼과 같음). */
function adminCancelSelected() {
  var ui = SpreadsheetApp.getUi();
  var sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== MI.SHEET) { ui.alert("'" + MI.SHEET + "' 탭에서 취소할 줄을 골라 주세요."); return; }
  var rowNo = sheet.getActiveRange().getRow();
  var data = mi_readRows_(sheet);
  var r = data.rows.filter(function (x) { return x.rowNumber === rowNo; })[0];
  if (!r) { ui.alert('신청 줄을 골라 주세요.'); return; }
  if (ui.alert(r.id + ' ' + r.studentName + ' (' + r.date + ' ' + r.time + ')을 취소할까요?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { ui.alert('다른 처리가 진행 중입니다. 잠시 뒤 다시 눌러 주세요.'); return; }
  try {
    var now = Date.now();
    mi_loadExtraSlots_();
    data = mi_readRows_(sheet);
    var res = mi_adminCancel(data.rows, r.id, now);
    mi_sweep(data.rows, now);
    mi_sendSmsMails_(mi_smsQueue(data.rows, now));
    mi_writeChanged_(sheet, data);
    mi_notifyOwner_(data.rows);
    mi_checkLastSeat_(data.rows, now);
    ui.alert(res.already ? '이미 취소된 신청입니다.' : '취소했습니다.' + (res.promoted.length ? ' 대기에서 올라간 학생: ' +
      res.promoted.map(function (p) { return p.name; }).join(', ') + "('[문자발송]' 메일 보냄)" : ''));
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
    mi_loadExtraSlots_();
    var data = mi_readRows_(sheet);
    // 전자책(Ebook.gs)을 넣었고 '전자책 주문' 탭이 있으면 함께 정리합니다.
    var eb = typeof eb_load_ === 'function' ? eb_load_() : null;
    if (MI.AUTO_DEPOSIT_CHECK) checkDepositMails_(sheet, data, now, eb);
    mi_sweep(data.rows, now);
    mi_sendSmsMails_(mi_smsQueue(data.rows, now));
    mi_writeChanged_(sheet, data);
    mi_notifyOwner_(data.rows);
    mi_checkLastSeat_(data.rows, now);
    mi_purgeExtraRequests_(now);
    if (eb) eb_process_(eb, now);
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
    // 대기 승격은 '[문자발송]' 메일 하나로 알립니다(아래 사람이 볼 내용 포함). 여기서는 따로 보내지 않습니다.
    var type = r.justNeedsCheck ? 'check' : (r.justConfirmed && (!MI.SMS_BY_MAIL || MI.OWNER_CONFIRM_MAIL_WITH_SMS)) ? 'confirmed' : r.justConfirmed ? '' : (r.justPromoted && !MI.SMS_BY_MAIL) ? 'promoted' : '';
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
        (MI.SMS_BY_MAIL ? '\n\n학생 예약확정 안내는 \'' + MI.SMS_SUBJECT + '\' 메일로 따로 보냈습니다(iPhone 단축어가 문자로 보냅니다).'
          : '\n\n학생에게 보낼 안내\n' + mi_confirmText(g.rows));
    } else {
      // SMS_BY_MAIL 을 끈 경우에만 씁니다. 제목에 '[문자발송]'을 넣지 않습니다(단축어가 읽지 않도록).
      subject = '[모의면접] 대기 승격 ' + slots + ' ' + r.studentName;
      body = '대기에서 입금 대기로 바뀌었습니다. 아래 번호로 직접 안내해 주세요.\n' + head + '\n입금 기한: ' + mi_fmt(r.payDeadline) +
        ' (승격 뒤 ' + Math.round(MI.PROMOTED_PAY_WINDOW_MS / 3600000) + '시간, 기한 + 10분이 지나면 자동 취소)' +
        g.rows.map(function (x) {
          return '\n\n휴대폰 ' + x.phone + '\n' + MI.SMS_PREFIX +
            mi_promotionText(x.promotedFrom || 1, x.depositor || x.studentName, x.date, x.time, x.payDeadline);
        }).join('');
    }
    try { MailApp.sendEmail(MI.OWNER_EMAIL, subject, body); } catch (err) { console.warn('알림 메일 실패: ' + err); }
  });
  try { var left = MailApp.getRemainingDailyQuota(); if (left < 20) console.warn('MailApp 오늘 남은 메일 ' + left + '통'); } catch (e2) {}
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
function checkDepositMails_(sheet, data, now, eb) {
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
        // 전자책 주문도 함께 맞춰 봅니다. 모의면접과 전자책 양쪽에 맞으면 손으로 확인합니다.
        var em = eb && typeof eb_matchDeposit === 'function' ? eb_matchDeposit(eb.rows, dep) : { kind: 'none' };
        if (unit && em.kind !== 'none') {
          result = '모의면접·전자책 양쪽에 맞음(손으로 확인)';
        } else if (em.kind !== 'none') {
          result = eb_applyDeposit_(eb, em, dep);
          rid = em.kind === 'many' ? em.rows.map(function (x) { return x.id; }).join(',') : em.row.id;
        } else if (unit) {
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
  if (typeof eb_setup_ === 'function') eb_setup_();
}

/** '입금 확정'·'미입금'·'서류 받음'을 체크하면 5분을 기다리지 않고 바로 정리합니다(setup 이 만드는 트리거). */
function onSheetEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (typeof EB !== 'undefined' && e.range.getRow() >= 2) {
    if (sheet.getName() === EB.RECEIPT_SHEET) { eb_onReceiptEdit_(e); return; }
    if (sheet.getName() === EB.ORDER_SHEET) {
      var ebName = String(sheet.getRange(1, e.range.getColumn()).getValue());
      if (EB_CHECKBOX_COLS.indexOf(ebName) >= 0) sweepNow();
      return;
    }
  }
  if (sheet.getName() !== MI.SHEET || e.range.getRow() < 2) return;
  var name = String(sheet.getRange(1, e.range.getColumn()).getValue());
  if (CHECKBOX_COLS.indexOf(name) < 0 && name !== '입금 시각') return;
  sweepNow();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('모의면접')
    .addItem('지금 정리하기(입금 확정 반영·취소·대기 승격)', 'sweepNow')
    .addItem('선택한 줄 관리자 취소(대기 1번 승격)', 'adminCancelSelected')
    .addItem('처음 설정(한 번만, 전자책 탭도 만듭니다)', 'setup')
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
  mi_allSlots().forEach(function (s) {
    mi_waitlistOf(data.rows, s.date, s.time).forEach(function (r, i) { positions[r.id] = i + 1; });
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
    mi_view_: mi_view_, mi_tokenOk: mi_tokenOk, mi_docsExample: mi_docsExample, mi_promotionText: mi_promotionText, mi_confirmText: mi_confirmText, mi_oneLine: mi_oneLine,
    mi_smsMail: mi_smsMail, mi_smsQueue: mi_smsQueue, mi_sendSmsMails_: mi_sendSmsMails_, SCRIPT_OWNED: SCRIPT_OWNED,
    mi_allSlots: mi_allSlots, mi_isValidSlot: mi_isValidSlot, mi_adminCancel: mi_adminCancel, mi_openNoticeText: mi_openNoticeText,
    mi_wishDates: mi_wishDates, mi_openNoticeQueue: mi_openNoticeQueue, mi_sendOpenNotices_: mi_sendOpenNotices_,
    mi_checkNewSlot: mi_checkNewSlot, mi_adminKeyOk: mi_adminKeyOk, mi_adminRows: mi_adminRows,
    mi_lastSeatSlot: mi_lastSeatSlot, mi_lastSeatText: mi_lastSeatText, mi_lastSeatAlertMail: mi_lastSeatAlertMail,
    mi_lastSeatPlan: mi_lastSeatPlan, mi_sendLastSeat_: mi_sendLastSeat_ };
}
