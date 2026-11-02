/**
 * 12월 3:1 모의면접 신청 — Google Apps Script 웹 앱 (세연님 구글 시트에 붙여 넣는 코드)
 *
 * - 홈페이지(sehyunt.re.kr/mock-interview/)가 이 웹 앱에 신청을 보냅니다.
 * - 신청 내역은 이 스프레드시트의 '신청' 탭에 쌓입니다.
 * - 학생에게 메일·문자를 자동으로 보내지 않습니다.
 * - 좌석·대기·기한 규칙은 홈페이지 코드 src/lib/mockInterview.ts 와 같습니다.
 *
 * 설치 방법은 같은 폴더의 README.md 를 보세요.
 */

var MI = {
  SHEET: '신청',
  OPEN_AT: '2026-11-09T21:00:00+09:00',
  DATES: ['2026-12-12', '2026-12-13', '2026-12-19', '2026-12-20'],
  TIMES: ['10:00', '11:00', '12:00'],
  CAPACITY: 4,
  PAY_WINDOW_MS: 60 * 60 * 1000,
  DOCS_DAYS_BEFORE: 7,
  DOCS_GRACE_MS: 24 * 60 * 60 * 1000,
  BOOKING_CLOSE_MS: 24 * 60 * 60 * 1000,
  PHOTO_CONSENT_REQUIRED: true,
  TZ: 'Asia/Seoul'
};

var ST = { pending: '입금 대기', confirmed: '확정', waitlist: '대기', cancelled: '취소', request: '요청 접수' };

/** 시트 열. 순서를 바꿔도 코드는 머리글 이름으로 찾습니다. 이름은 바꾸지 마세요. */
var COLS = [
  '신청번호', '신청 시각', '구분', '날짜', '시간', '상태', '대기 순번',
  '입금 기한', '입금 확인', '입금 시각', '미입금',
  '서류 기한', '서류 받음',
  '학생 이름', '지원 학교', '지원 전형', '휴대폰', '입금자명', '희망 일시(요청)',
  '만 14세 미만', '보호자 이름', '보호자 연락처', '보호자 동의', '보호자 동의 시각',
  '개인정보 동의', '개인정보 동의 시각', '영상 동의', '영상 동의 시각', '사진 동의', '사진 동의 시각',
  '입금 대기 시작', '취소 사유', '처리 기록', '메모'
];
/** 스크립트가 고치는 열(세연님이 입력하는 칸은 덮어쓰지 않습니다) */
var SCRIPT_OWNED = ['상태', '대기 순번', '입금 기한', '서류 기한', '입금 대기 시작', '취소 사유', '처리 기록'];
var CHECKBOX_COLS = ['입금 확인', '미입금', '서류 받음'];

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
function mi_initialStatus(rows, date, time) {
  var full = mi_heldCount(rows, date, time) >= MI.CAPACITY;
  var queued = mi_waitlistOf(rows, date, time).length > 0;
  return (full || queued) ? ST.waitlist : ST.pending;
}
function mi_summarize(rows, now) {
  var out = [];
  MI.DATES.forEach(function (date) {
    MI.TIMES.forEach(function (time) {
      out.push({
        date: date, time: time, capacity: MI.CAPACITY,
        left: Math.max(0, MI.CAPACITY - mi_heldCount(rows, date, time)),
        waitlist: mi_waitlistOf(rows, date, time).length,
        closed: now >= mi_bookingClosesAt(date, time)
      });
    });
  });
  return out;
}
function mi_cancel(r, now, reason) {
  r.status = ST.cancelled;
  r.cancelReason = reason;
  r.log.push(mi_fmt(now) + ' 취소: ' + reason);
  r.changed = true;
}
/** 시간 트리거 규칙. rows 를 직접 고치고, 고친 행에 changed=true 를 붙입니다. */
function mi_sweep(rows, now) {
  rows.forEach(function (r) {
    if (r.kind !== '예약') return;
    if (r.status === ST.pending && r.payDeadline != null) {
      if (r.paidAt != null && r.paidAt > r.payDeadline) {
        mi_cancel(r, now, '입금 기한 뒤 입금(환불 안내 필요)');
      } else if (r.paidChecked && r.paidAt != null) {
        r.status = ST.confirmed;
        r.log.push(mi_fmt(now) + ' 확정');
        r.changed = true;
      } else if (now > r.payDeadline && r.unpaidChecked) {
        mi_cancel(r, now, '1시간 안에 입금하지 않음');
      }
    }
    if (r.status === ST.confirmed && r.docsDeadline != null && now > r.docsDeadline && !r.docsReceived) {
      mi_cancel(r, now, '서류 미제출');
    }
  });
  MI.DATES.forEach(function (date) {
    MI.TIMES.forEach(function (time) {
      if (now >= mi_bookingClosesAt(date, time)) return;
      var free = MI.CAPACITY - mi_heldCount(rows, date, time);
      var queue = mi_waitlistOf(rows, date, time);
      while (free > 0 && queue.length > 0) {
        var next = queue.shift();
        next.status = ST.pending;
        next.holdStartedAt = now;
        next.payDeadline = now + MI.PAY_WINDOW_MS;
        next.docsDeadline = mi_docsDeadlineFor(date, now);
        next.log.push(mi_fmt(now) + ' 대기에서 입금 대기로 승격');
        next.changed = true;
        free -= 1;
      }
    });
  });
  return rows;
}
function mi_fmt(ms) {
  var d = new Date(ms + 9 * 3600000);
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}
function mi_phone(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function mi_isPhone(v) { return /^01[016789][0-9]{7,8}$/.test(mi_phone(v)); }
function mi_str(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 100); }
/** 신청서 검사. 빈 배열이면 통과 */
function mi_validate(f) {
  var e = [];
  if (f.kind !== '예약' && f.kind !== '요청') e.push('신청 구분이 올바르지 않습니다.');
  if (f.kind === '예약' && !mi_isValidSlot(f.date, f.time)) e.push('날짜와 시간을 골라 주세요.');
  if (f.kind === '요청' && mi_str(f.requestText).length < 2) e.push('원하는 날짜·요일·시간을 적어 주세요.');
  if (!mi_str(f.studentName)) e.push('학생 이름을 적어 주세요.');
  if (!mi_str(f.school)) e.push('지원 학교를 적어 주세요.');
  if (!mi_str(f.track)) e.push('지원 전형을 적어 주세요.');
  if (!mi_isPhone(f.phone)) e.push('휴대폰 번호를 확인해 주세요.');
  if (f.kind === '예약' && !mi_str(f.depositor)) e.push('입금자명을 적어 주세요.');
  if (f.under14 === true) {
    if (!mi_str(f.guardianName)) e.push('보호자 이름을 적어 주세요.');
    if (!mi_isPhone(f.guardianPhone)) e.push('보호자 연락처를 확인해 주세요.');
    if (f.guardianConsent !== true) e.push('만 14세 미만은 보호자 동의가 있어야 신청할 수 있습니다.');
  }
  if (f.consentPrivacy !== true) e.push('개인정보 수집·이용에 동의해야 신청할 수 있습니다.');
  if (f.consentVideo !== true) e.push('면접 영상 촬영에 동의해야 신청할 수 있습니다.');
  if (MI.PHOTO_CONSENT_REQUIRED && f.consentPhoto !== true) e.push('사진 활용에 동의해야 신청할 수 있습니다.');
  return e;
}

/* ===================== 웹 앱 ===================== */

function doGet(e) {
  var now = Date.now();
  var rows = mi_readRows_(mi_sheet_()).rows;
  return mi_json_({ ok: true, open: mi_isOpen(now), openAt: MI.OPEN_AT, now: now, slots: mi_summarize(rows, now) });
}

function doPost(e) {
  var now = Date.now();
  var f;
  try { f = JSON.parse(e.postData.contents); } catch (err) { return mi_json_({ ok: false, error: '신청서를 읽지 못했습니다.' }); }
  if (f.website) return mi_json_({ ok: true, id: 'ignored', status: ST.request }); // 스팸 방지 칸
  if (!mi_isOpen(now)) return mi_json_({ ok: false, error: '11/9(월) 밤 9시에 신청이 열립니다.' });
  var errors = mi_validate(f);
  if (errors.length) return mi_json_({ ok: false, error: errors.join(' ') });
  if (f.kind === '예약' && now >= mi_bookingClosesAt(f.date, f.time)) {
    return mi_json_({ ok: false, error: '이 시간은 신청이 마감되었습니다.' });
  }

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return mi_json_({ ok: false, error: '신청이 몰리고 있습니다. 잠시 뒤 다시 눌러 주세요.' });
  try {
    var sheet = mi_sheet_();
    var data = mi_readRows_(sheet);
    mi_sweep(data.rows, now);
    mi_writeChanged_(sheet, data);

    var phone = mi_phone(f.phone);
    var dup = data.rows.some(function (r) {
      return r.phone === phone && r.status !== ST.cancelled &&
        (f.kind === '요청' ? r.kind === '요청' : (r.kind === '예약' && r.date === f.date && r.time === f.time));
    });
    if (dup) return mi_json_({ ok: false, error: '같은 휴대폰 번호로 이미 신청한 시간입니다.' });

    var id = 'MI-' + Utilities.formatDate(new Date(now), MI.TZ, 'MMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    var status = f.kind === '예약' ? mi_initialStatus(data.rows, f.date, f.time) : ST.request;
    var holding = status === ST.pending;
    var r = {
      id: id, appliedAt: now, kind: f.kind,
      date: f.kind === '예약' ? f.date : '', time: f.kind === '예약' ? f.time : '',
      status: status,
      payDeadline: holding ? now + MI.PAY_WINDOW_MS : null,
      holdStartedAt: holding ? now : null,
      docsDeadline: holding ? mi_docsDeadlineFor(f.date, now) : null,
      log: [mi_fmt(now) + ' ' + status]
    };
    var position = null;
    if (status === ST.waitlist) position = mi_waitlistOf(data.rows, f.date, f.time).length + 1;
    var stamp = new Date(now);
    var rec = {
      '신청번호': id, '신청 시각': stamp, '구분': f.kind, '날짜': r.date, '시간': r.time, '상태': status,
      '대기 순번': position || '',
      '입금 기한': holding ? new Date(r.payDeadline) : '', '입금 확인': false, '입금 시각': '', '미입금': false,
      '서류 기한': holding ? new Date(r.docsDeadline) : '', '서류 받음': false,
      '학생 이름': mi_str(f.studentName, 40), '지원 학교': mi_str(f.school, 60), '지원 전형': mi_str(f.track, 60),
      '휴대폰': mi_phone(f.phone), '입금자명': mi_str(f.depositor, 40), '희망 일시(요청)': f.kind === '요청' ? mi_str(f.requestText, 300) : '',
      '만 14세 미만': f.under14 === true ? 'Y' : 'N',
      '보호자 이름': f.under14 === true ? mi_str(f.guardianName, 40) : '',
      '보호자 연락처': f.under14 === true ? mi_phone(f.guardianPhone) : '',
      '보호자 동의': f.under14 === true ? (f.guardianConsent === true ? 'Y' : 'N') : '', '보호자 동의 시각': f.under14 === true ? stamp : '',
      '개인정보 동의': f.consentPrivacy === true ? 'Y' : 'N', '개인정보 동의 시각': stamp,
      '영상 동의': f.consentVideo === true ? 'Y' : 'N', '영상 동의 시각': stamp,
      '사진 동의': f.consentPhoto === true ? 'Y' : 'N', '사진 동의 시각': stamp,
      '입금 대기 시작': holding ? stamp : '', '취소 사유': '', '처리 기록': r.log.join('\n'), '메모': ''
    };
    var row = data.header.map(function (h) { return rec.hasOwnProperty(h) ? rec[h] : ''; });
    // 휴대폰 앞자리 0이 지워지지 않도록 글자로 저장합니다.
    var phoneIdx = data.header.indexOf('휴대폰');
    sheet.appendRow(row);
    var last = sheet.getLastRow();
    if (phoneIdx >= 0) sheet.getRange(last, phoneIdx + 1).setNumberFormat('@').setValue(rec['휴대폰']);
    var gIdx = data.header.indexOf('보호자 연락처');
    if (gIdx >= 0 && rec['보호자 연락처']) sheet.getRange(last, gIdx + 1).setNumberFormat('@').setValue(rec['보호자 연락처']);
    CHECKBOX_COLS.forEach(function (name) {
      var i = data.header.indexOf(name);
      if (i >= 0) sheet.getRange(last, i + 1).insertCheckboxes();
    });
    return mi_json_({ ok: true, id: id, status: status, payDeadline: r.payDeadline, waitlistPosition: position });
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
    var data = mi_readRows_(sheet);
    mi_sweep(data.rows, Date.now());
    mi_writeChanged_(sheet, data);
  } finally {
    lock.releaseLock();
  }
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
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sweepNow') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sweepNow').timeBased().everyMinutes(5).create();
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('모의면접')
    .addItem('지금 정리하기(확정·취소·대기 승격)', 'sweepNow')
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
      appliedAt: mi_toMs_(v[col['신청 시각']]) || 0,
      kind: String(v[col['구분']] || ''),
      date: mi_toDateStr_(v[col['날짜']]),
      time: mi_toTimeStr_(v[col['시간']]),
      status: String(v[col['상태']] || ''),
      payDeadline: mi_toMs_(v[col['입금 기한']]),
      holdStartedAt: mi_toMs_(v[col['입금 대기 시작']]),
      docsDeadline: mi_toMs_(v[col['서류 기한']]),
      paidChecked: v[col['입금 확인']] === true,
      paidAt: mi_toMs_(v[col['입금 시각']]),
      unpaidChecked: v[col['미입금']] === true,
      docsReceived: v[col['서류 받음']] === true,
      phone: mi_phone(v[col['휴대폰']]),
      cancelReason: String(v[col['취소 사유']] || ''),
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
  module.exports = { MI: MI, ST: ST, COLS: COLS, mi_sweep: mi_sweep, mi_initialStatus: mi_initialStatus, mi_summarize: mi_summarize,
    mi_validate: mi_validate, mi_isOpen: mi_isOpen, mi_docsDeadlineFor: mi_docsDeadlineFor, mi_baseDocsDeadline: mi_baseDocsDeadline,
    mi_waitlistOf: mi_waitlistOf, mi_toMs_: mi_toMs_ };
}
