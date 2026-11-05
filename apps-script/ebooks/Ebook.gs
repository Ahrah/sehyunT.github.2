/**
 * 전자책 계좌이체 판매 — Google Apps Script (모의면접과 같은 Apps Script 프로젝트에 '파일 추가'로 넣는 코드)
 *
 * - 홈페이지(sehyunt.re.kr/ebooks/)가 주문을 보내면 '전자책 주문' 탭에 쌓입니다.
 * - 입금 확인 두 가지
 *   1) 손으로(기본): 세연님이 '입금 확정'을 체크하면 바로(늦어도 5분 안에) 주문자에게 PDF 메일이 나갑니다.
 *   2) 자동(선택): 모의면접 Code.gs 의 [입금알림] 메일 읽기(MI.AUTO_DEPOSIT_CHECK)를 켜면
 *      입금자명(이름+숫자 2자리)과 금액이 맞는 주문이 정확히 1건일 때만 '입금 확정'을 자동으로 체크합니다.
 * - 입금 기한은 주문 뒤 1시간입니다('입금 기한' 칸). 기한까지 '입금 확정'이 없으면 5분 정리가 '미입금 취소'로 바꿉니다.
 *   기한 뒤 입금(입금 시각이 기한 뒤이거나, '미입금 취소' 줄에 입금 확정)은 자동으로 보내지 않고 '확인 필요'로 둡니다.
 * - 메일은 이 스크립트를 설치한 세연님 계정에서 나갑니다. PDF 는 세연님 Drive 파일을 읽어 첨부합니다(읽기 권한만 씁니다).
 * - 규칙은 홈페이지 코드 src/lib/ebooks.ts 와 같습니다. 책·가격을 바꾸면 두 파일을 함께 고치세요.
 *
 * 설치 방법은 같은 폴더의 README.md 를 보세요.
 */

var EB = {
  ORDER_SHEET: '전자책 주문',
  SEND_LOG_SHEET: '전자책 발송 기록',
  RECEIPT_SHEET: '현금영수증 발급 대기',
  /**
   * 책 목록. fileId 에 세연님 Drive 의 PDF 파일 ID 를 넣으세요(파일 주소 /d/ 와 /view 사이 글자).
   * price 는 가격(원). null 이면 그 책은 주문을 받지 않습니다.
   * 가격(11/3 세연님 결정): 학교별 가이드 15000. 11/3 21:48 변경: 비교 자료집 79000, 묶음 가격 없음. src/lib/ebooks.ts 와 같아야 합니다.
   */
  BOOKS: [
    { id: 'compare', title: '입시는세연쌤books 2027 경기권 외고 8개교 비교 자료집', price: 79000, fileId: 'PDF_파일_ID_01_비교자료집', attachName: '2027학년도_경기권외고_8개교_비교자료집.pdf' },
    { id: 'gyeonggi', title: '입시는세연쌤books 2027 경기외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_02_경기외고', attachName: '2027학년도_경기외고_자소서면접및원서접수가이드.pdf' },
    { id: 'goyang', title: '입시는세연쌤books 2027 고양외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_03_고양외고', attachName: '2027학년도_고양외고_자소서면접및원서접수가이드.pdf' },
    { id: 'gwacheon', title: '입시는세연쌤books 2027 과천외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_04_과천외고', attachName: '2027학년도_과천외고_자소서면접및원서접수가이드.pdf' },
    { id: 'gimpo', title: '입시는세연쌤books 2027 김포외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_05_김포외고', attachName: '2027학년도_김포외고_자소서면접및원서접수가이드.pdf' },
    { id: 'dongducheon', title: '입시는세연쌤books 2027 동두천외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_06_동두천외고', attachName: '2027학년도_동두천외고_자소서면접및원서접수가이드.pdf' },
    { id: 'seongnam', title: '입시는세연쌤books 2027 성남외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_07_성남외고', attachName: '2027학년도_성남외고_자소서면접및원서접수가이드.pdf' },
    { id: 'suwon', title: '입시는세연쌤books 2027 수원외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_08_수원외고', attachName: '2027학년도_수원외고_자소서면접및원서접수가이드.pdf' },
    { id: 'anyang', title: '입시는세연쌤books 2027 안양외고 자소서·면접 가이드', price: 15000, fileId: 'PDF_파일_ID_09_안양외고', attachName: '2027학년도_안양외고_자소서면접및원서접수가이드.pdf' }
  ],
  /** 입금 기한: 주문 뒤 1시간(모의면접과 같음). src/lib/ebooks.ts EBOOK_CONFIG.payWindowMs 와 같아야 합니다. */
  PAY_WINDOW_MS: 60 * 60 * 1000,
  /** 입금 기한 뒤 10분 여유(자동 취소는 기한 + 10분 뒤). src/lib/ebooks.ts EBOOK_CONFIG.payGraceMs 와 같아야 합니다. */
  PAY_GRACE_MS: 10 * 60 * 1000,
  BANK_NAME: '카카오뱅크',
  BANK_NUMBER: '3333-38-6269721',
  BANK_HOLDER: '입시는세연쌤',
  BANK_ACCOUNT: '카카오뱅크 3333-38-6269721 (입시는세연쌤)',
  SENDER_NAME: '입시는세연쌤',
  OWNER_EMAIL: ['consultantsyssam', 'gmail.com'].join('@'),
  SEND_WITHIN_MINUTES: 30,
  DEPOSITOR_NAME_MAX: 5,
  /** 메일 한 통 첨부 합계 한도(Gmail 25MB 보다 여유 있게). 넘으면 여러 통으로 나눕니다. */
  MAX_MAIL_BYTES: 18 * 1024 * 1024,
  /** 주문이 들어오면 주문자에게 '주문 접수(입금 안내)' 메일을 보낼지 */
  SEND_ORDER_RECEIVED_MAIL: true,
  /** 새 주문·확인 필요를 세연님 메일로 알릴지 */
  NOTIFY_OWNER: true,
  TZ: 'Asia/Seoul'
};

var EBS = { pending: '입금 대기', sent: '발송 완료', check: '확인 필요', cancelled: '취소', expired: '미입금 취소' };

/**
 * 시트 열. 이름은 바꾸지 마세요(코드와 사업자 세무 관리 봇은 머리글 이름으로 찾습니다).
 * 새 칸은 맨 뒤에만 덧붙입니다('입금 기한'은 11/3 추가).
 */
var EB_COLS = [
  '주문번호', '주문 시각', '상태', '입금자명', '금액', '책',
  '입금 확정', '입금 시각', '다시 보내기', '취소',
  '이름', '이메일', '휴대폰', '현금영수증 번호',
  '개인정보 동의', '환불 제한 확인', '동의 시각',
  '발송 시각', '발송 횟수', '확인 필요 사유', '처리 기록', '메모',
  '입금 기한'
];
var EB_CHECKBOX_COLS = ['입금 확정', '다시 보내기', '취소'];
var EB_SEND_LOG_COLS = ['시각', '주문번호', '받는 사람', '책', '메일 수', '결과', '내용'];
var EB_RECEIPT_COLS = ['주문번호', '입금 확인 시각', '이름', '현금영수증 번호', '금액', '발급함', '발급 시각', '메모'];

/* ===================== 규칙(순수 함수, 테스트 대상) ===================== */

function eb_book(id) {
  for (var i = 0; i < EB.BOOKS.length; i++) if (EB.BOOKS[i].id === id) return EB.BOOKS[i];
  return null;
}
function eb_phone(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function eb_isPhone(v) { return /^01[016789][0-9]{7,8}$/.test(eb_phone(v)); }
function eb_email(v) { return String(v || '').trim().toLowerCase(); }
function eb_isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(eb_email(v)); }
function eb_str(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 100); }

/** 낼 금액(원) = 낱권 합계(묶음 할인 없음). 모르는 책이나 가격 없는 책이 있으면 null. */
function eb_total(ids) {
  var sum = 0;
  for (var i = 0; i < ids.length; i++) {
    var b = eb_book(ids[i]);
    if (!b || b.price == null) return null;
    sum += b.price;
  }
  return sum;
}

function eb_validate(f) {
  var e = [];
  var name = String(f.name || '').trim();
  if (!name) e.push('주문자 이름을 적어 주세요.');
  else if (name.length > 20) e.push('주문자 이름은 20자 안으로 적어 주세요.');
  if (!eb_isEmail(f.email)) e.push('PDF를 받을 이메일 주소를 확인해 주세요.');
  else if (eb_email(f.email) !== eb_email(f.emailConfirm)) e.push('이메일 주소 두 칸이 서로 다릅니다.');
  if (!eb_isPhone(f.phone)) e.push('휴대폰 번호를 확인해 주세요.');
  var ids = Array.isArray(f.books) ? f.books : [];
  var seen = {}, bad = false;
  ids.forEach(function (id) { if (seen[id] || !eb_book(id)) bad = true; seen[id] = true; });
  if (ids.length === 0) e.push('책을 1권 이상 골라 주세요.');
  else if (bad) e.push('고른 책을 다시 확인해 주세요.');
  var cr = String(f.cashReceiptPhone || '').trim();
  if (cr && !eb_isPhone(cr)) e.push('현금영수증용 전화번호를 확인해 주세요. 받지 않으려면 비워 두세요.');
  if (f.consentPrivacy !== true) e.push('개인정보 수집·이용에 동의해 주세요.');
  if (f.consentRefund !== true) e.push('디지털 콘텐츠 환불 제한 안내를 확인해 주세요.');
  return e;
}

function eb_depositorBase(name) { return String(name || '').replace(/\s+/g, '').slice(0, EB.DEPOSITOR_NAME_MAX); }

/** 취소되지 않은 주문과 겹치지 않는 '이름+숫자 2자리'. 남은 번호가 없으면 null. */
function eb_pickDepositor(rows, name, rand) {
  rand = rand || Math.random;
  var base = eb_depositorBase(name);
  var used = {};
  rows.forEach(function (r) { if (r.status !== EBS.cancelled) used[String(r.depositor).replace(/\s+/g, '')] = true; });
  var free = [];
  for (var n = 10; n <= 99; n++) if (!used[base + n]) free.push(base + n);
  if (!free.length) return null;
  return free[Math.floor(rand() * free.length) % free.length];
}

/** 입금 알림 1건 대조: none / one(자동 확인) / amount(금액 다름) / many(2건 이상) */
function eb_matchDeposit(rows, dep) {
  var same = function (r) { return !r.paidChecked && String(r.depositor).replace(/\s+/g, '') === dep.name; };
  var hits = rows.filter(function (r) { return r.status === EBS.pending && same(r); });
  if (!hits.length) {
    // 기한이 지나 '미입금 취소'된 주문의 입금: 자동으로 보내지 않고 '확인 필요'
    var late = rows.filter(function (r) { return r.status === EBS.expired && same(r); });
    return late.length ? { kind: 'late', row: late[0] } : { kind: 'none' };
  }
  if (hits.length > 1) return { kind: 'many', rows: hits };
  return hits[0].total === dep.amount ? { kind: 'one', row: hits[0] } : { kind: 'amount', row: hits[0] };
}

/**
 * 한 줄에서 할 일: 'send' | 'resend' | 'cancel' | 'expire' | 'late' | null (src/lib/ebooks.ts decideAction 과 같음)
 * - 입금 기한(payDeadline)이 비어 있는 줄은 기한 규칙을 쓰지 않습니다.
 * - 입금 시각(paidAt)이 없으면 지금 시각(now)으로 기한과 비교합니다.
 */
function eb_decideAction(r, now) {
  now = now || 0;
  var closed = r.status === EBS.cancelled || r.status === EBS.expired;
  if (r.cancelChecked) return closed ? null : 'cancel';
  if (r.status === EBS.cancelled) return null;
  if (r.resendChecked) return 'resend';
  if (r.status === EBS.expired) return r.paidChecked ? 'late' : null;
  if (r.status !== EBS.pending) return null;
  var dl = r.payDeadline == null ? null : r.payDeadline;
  if (r.paidChecked) {
    if (dl == null) return 'send';
    var paidAt = r.paidAt == null ? now : r.paidAt;
    return paidAt > dl + EB.PAY_GRACE_MS ? 'late' : 'send';
  }
  return dl != null && now > dl + EB.PAY_GRACE_MS ? 'expire' : null;
}

/** '11/3(화) 14:05' (한국 시간). src/lib/ebooks.ts formatKst 와 같습니다. */
function eb_fmtKst(ms) {
  var d = new Date(ms + 9 * 60 * 60 * 1000);
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return (d.getUTCMonth() + 1) + '/' + d.getUTCDate() + '(' + '일월화수목금토'.charAt(d.getUTCDay()) + ') ' +
    p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
}

/** 첨부를 메일 여러 통으로 나눕니다. 한 파일이 한도보다 크면 oversize. */
function eb_packAttachments(files, maxBytes) {
  var mails = [], oversize = [], cur = [], size = 0;
  files.forEach(function (f) {
    if (f.size > maxBytes) { oversize.push(f); return; }
    if (cur.length && size + f.size > maxBytes) { mails.push(cur); cur = []; size = 0; }
    cur.push(f); size += f.size;
  });
  if (cur.length) mails.push(cur);
  return { mails: mails, oversize: oversize };
}

function eb_fmt(ms) {
  return Utilities.formatDate(new Date(ms), EB.TZ, 'M/d HH:mm');
}
function eb_won(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '원'; }

/** 주문 접수(입금 안내) 메일. src/lib/ebooksApi.ts orderReceivedMail 과 같은 문구입니다. */
function eb_orderMail(o) {
  var titles = eb_sortBooks_(o.books).map(function (id) { var b = eb_book(id); return '- ' + (b ? b.title : id); });
  var lines = [o.name + '님, 전자책 주문을 받았습니다.', '', '주문번호: ' + o.id].concat(titles);
  lines = lines.concat([
    '',
    '[입금 안내]',
    '은행: ' + EB.BANK_NAME,
    '계좌번호: ' + EB.BANK_NUMBER,
    '예금주: ' + EB.BANK_HOLDER,
    '금액: ' + eb_won(o.total),
    '입금자명: ' + o.depositor,
    '입금 기한: ' + eb_fmtKst(o.payDeadline) + ' (주문 뒤 1시간, 한국 시간)',
    '',
    '입금자명을 위와 같이 적어 주세요. 숫자 2자리까지 같아야 확인이 빠릅니다.',
    '입금 기한까지 입금이 확인되지 않으면 주문은 자동으로 취소됩니다. 기한이 지난 뒤 입금하셨다면 확인한 뒤 연락드립니다.',
    '입금이 확인되면 ' + EB.SEND_WITHIN_MINUTES + '분 안에 이 주소로 PDF를 보내 드립니다.',
    '메일이 보이지 않으면 스팸함과 프로모션함을 확인해 주세요.',
    '',
    "문의: 카카오톡 채널 '입시는세연쌤' 또는 이 메일에 답장"
  ]);
  return {
    subject: '[입시는세연쌤] 전자책 주문 입금 안내 (' + o.id + ')',
    body: lines.join('\n')
  };
}

/**
 * 오늘 남은 메일 한도(받는 사람 수). 알 수 없으면 null(그냥 보내 봅니다).
 * 일반 구글 계정은 하루 100명입니다.
 */
function eb_mailQuota_() {
  try {
    if (typeof MailApp !== 'undefined' && typeof MailApp.getRemainingDailyQuota === 'function') return MailApp.getRemainingDailyQuota();
  } catch (err) { console.warn('메일 한도 확인 실패: ' + err); }
  return null;
}

/** 한도가 남았을 때만 보냅니다. 결과: 'sent' | 'quota' | 'error' */
function eb_sendIfQuota_(what, mail) {
  var q = eb_mailQuota_();
  if (q != null && q < 1) {
    console.warn(what + ' 건너뜀: 오늘 메일 한도가 남지 않았습니다');
    return 'quota';
  }
  try {
    MailApp.sendEmail(mail);
    return 'sent';
  } catch (err) {
    console.warn(what + ' 실패: ' + err);
    return 'error';
  }
}
function eb_pdfMail(o, partNo, partCount, titles) {
  var part = partCount > 1 ? ' ' + partNo + '/' + partCount : '';
  return {
    subject: '[입시는세연쌤] 주문하신 전자책 PDF를 보내 드립니다' + part + ' (' + o.id + ')',
    body: o.name + '님, 입금을 확인했습니다. 주문하신 전자책 PDF를 이 메일에 첨부했습니다.' +
      (partCount > 1 ? '\n파일이 커서 메일 ' + partCount + '통으로 나눠 보냅니다. 이 메일은 ' + partNo + '번째입니다.' : '') +
      '\n\n' + titles.map(function (t) { return '- ' + t; }).join('\n') +
      '\n\n다른 사람에게 보내거나 인터넷에 올리면 법적 처벌의 대상이 될 수 있습니다.' +
      '\n파일이 열리지 않으면 카카오톡 채널 \'입시는세연쌤\'으로 알려 주세요.'
  };
}

/* ===================== 웹 앱 주문 받기 (Code.gs doPost 가 부릅니다) ===================== */

function eb_handleOrder_(f, now) {
  var errors = eb_validate(f);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  var total = eb_total(f.books);
  if (total == null) return { ok: false, error: '가격을 정하는 중인 책이 있습니다. 그 책을 빼고 주문해 주세요.' };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, error: '주문이 몰리고 있습니다. 잠시 뒤 다시 눌러 주세요.' };
  try {
    var sheet = eb_sheet_(EB.ORDER_SHEET);
    var data = eb_readRows_(sheet);
    var depositor = eb_pickDepositor(data.rows, f.name);
    if (!depositor) return { ok: false, error: '같은 이름의 주문이 많습니다. 카카오톡 채널로 문의해 주세요.' };
    var id = 'EB-' + Utilities.formatDate(new Date(now), EB.TZ, 'MMdd-HHmmss') + '-' + Math.floor(Math.random() * 900 + 100);
    var stamp = new Date(now);
    var payDeadline = now + EB.PAY_WINDOW_MS;
    var o = { id: id, name: eb_str(f.name, 20), email: eb_email(f.email), depositor: depositor, total: total, books: eb_sortBooks_(f.books), payDeadline: payDeadline };
    var rec = {
      '주문번호': id, '주문 시각': stamp, '상태': EBS.pending, '입금자명': depositor, '금액': total,
      '책': o.books.join(','), '입금 확정': false, '입금 시각': '', '다시 보내기': false, '취소': false,
      '이름': o.name, '이메일': o.email, '휴대폰': eb_phone(f.phone),
      '현금영수증 번호': eb_phone(f.cashReceiptPhone),
      '개인정보 동의': 'Y', '환불 제한 확인': 'Y', '동의 시각': stamp,
      '발송 시각': '', '발송 횟수': 0, '확인 필요 사유': '', '처리 기록': eb_fmt(now) + ' 주문 (입금 기한 ' + eb_fmtKst(payDeadline) + ')', '메모': '',
      '입금 기한': new Date(payDeadline)
    };
    sheet.appendRow(data.header.map(function (h) { return rec.hasOwnProperty(h) ? rec[h] : ''; }));
    var last = sheet.getLastRow();
    var logCol = data.header.indexOf('처리 기록');
    ['휴대폰', '현금영수증 번호'].forEach(function (n) {
      var i = data.header.indexOf(n);
      if (i >= 0 && rec[n]) sheet.getRange(last, i + 1).setNumberFormat('@').setValue(rec[n]);
    });
    EB_CHECKBOX_COLS.forEach(function (n) {
      var i = data.header.indexOf(n);
      if (i >= 0) sheet.getRange(last, i + 1).insertCheckboxes();
    });
  } finally {
    lock.releaseLock();
  }
  var mailNote = '';
  if (EB.SEND_ORDER_RECEIVED_MAIL) {
    var m = eb_orderMail(o);
    var res = eb_sendIfQuota_('주문 접수 메일', { to: o.email, subject: m.subject, body: m.body, name: EB.SENDER_NAME, replyTo: EB.OWNER_EMAIL });
    mailNote = res === 'sent' ? '입금 안내 메일 보냄'
      : res === 'quota' ? '입금 안내 메일 못 보냄(오늘 메일 한도 없음, 화면 안내만)'
      : '입금 안내 메일 실패(화면 안내만)';
    // 처리 기록 칸에만 남깁니다(입금 시각·입금 확정·메모 칸은 건드리지 않습니다).
    if (logCol >= 0) {
      try { sheet.getRange(last, logCol + 1).setValue(rec['처리 기록'] + '\n' + eb_fmt(Date.now()) + ' ' + mailNote); } catch (e3) { console.warn('처리 기록 실패: ' + e3); }
    }
  }
  if (EB.NOTIFY_OWNER) {
    eb_sendIfQuota_('새 주문 알림 메일', {
      to: EB.OWNER_EMAIL,
      subject: '[전자책] 새 주문 ' + o.depositor + ' ' + eb_won(total),
      body: '새 주문이 들어왔습니다.\n주문번호: ' + id + '\n입금자명: ' + o.depositor + '\n금액: ' + eb_won(total) +
        '\n입금 기한: ' + eb_fmtKst(payDeadline) +
        '\n책: ' + o.books.map(function (b) { return (eb_book(b) || {}).title; }).join(', ') +
        (mailNote ? '\n주문자 메일: ' + mailNote : '') +
        "\n\n입금을 확인하면 '" + EB.ORDER_SHEET + "' 탭에서 '입금 확정'을 체크해 주세요."
    });
  }
  return { ok: true, id: id, depositor: depositor, total: total, email: o.email, books: o.books, payDeadline: payDeadline };
}

/* ===================== 정리(5분마다·체크할 때, Code.gs sweepNow 가 부릅니다) ===================== */

/** 탭이 없으면 null(전자책을 아직 설치하지 않은 상태). */
function eb_load_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(EB.ORDER_SHEET);
  if (!sheet) return null;
  var data = eb_readRows_(sheet);
  data.sheet = sheet;
  return data;
}

/** [입금알림] 대조 결과를 시트에 반영합니다(Code.gs checkDepositMails_ 가 부릅니다). 기록에 남길 결과 문구를 돌려줍니다. */
function eb_applyDeposit_(eb, m, dep) {
  var col = eb.col, sheet = eb.sheet;
  if (m.kind === 'one') {
    sheet.getRange(m.row.rowNumber, col['입금 확정'] + 1).setValue(true);
    sheet.getRange(m.row.rowNumber, col['입금 시각'] + 1).setValue(new Date(dep.at));
    m.row.paidChecked = true; m.row.paidAt = dep.at;
    eb_addLog_(m.row, '입금 알림 자동 확인 ' + eb_won(dep.amount));
    m.row.changed = true;
    return '전자책 자동 확인';
  }
  var targets = m.kind === 'many' ? m.rows : [m.row];
  var reason = m.kind === 'amount'
    ? '입금 금액 ' + eb_won(dep.amount) + ' (주문 ' + eb_won(m.row.total) + ')'
    : m.kind === 'late'
      ? '입금 기한(' + eb_fmtKst(m.row.payDeadline) + ') + 10분 뒤 입금 ' + eb_won(dep.amount) + ' (' + eb_fmtKst(dep.at) + ')'
      : '같은 입금자명 주문 ' + m.rows.length + '건';
  targets.forEach(function (r) { eb_markCheck_(r, reason); });
  return '전자책 확인 필요: ' + reason;
}

function eb_markCheck_(r, reason) {
  r.status = EBS.check;
  r.checkReason = reason;
  eb_addLog_(r, '확인 필요: ' + reason);
  r.changed = true;
  r.justNeedsCheck = true;
}
function eb_addLog_(r, text) { r.log.push(eb_fmt(Date.now()) + ' ' + text); }

function eb_process_(eb, now) {
  var sheet = eb.sheet, col = eb.col;
  eb.rows.forEach(function (r) {
    var action = eb_decideAction(r, now);
    if (!action) return;
    if (action === 'cancel') {
      r.status = EBS.cancelled; eb_addLog_(r, '취소'); r.changed = true;
      return;
    }
    if (action === 'expire') {
      // 상태와 처리 기록만 바꿉니다(입금 시각·입금 확정·메모 칸은 건드리지 않습니다).
      r.status = EBS.expired;
      eb_addLog_(r, '미입금 취소 (입금 기한 ' + eb_fmtKst(r.payDeadline) + ' + 10분 지남)');
      r.changed = true;
      return;
    }
    if (action === 'late') {
      // 기한 뒤 입금: 자동으로 보내지 않습니다. 세연님이 확인한 뒤 '다시 보내기'(보냄) 또는 '취소'를 체크합니다.
      eb_markCheck_(r, (r.status === EBS.expired ? '미입금 취소 뒤 입금 확정, ' : '') + '입금 기한(' + eb_fmtKst(r.payDeadline) + ') + 10분 뒤 입금' +
        (r.paidAt != null ? ' (입금 시각 ' + eb_fmtKst(r.paidAt) + ')' : ' (입금 확정 체크 ' + eb_fmtKst(now) + ')'));
      return;
    }
    if (action === 'resend') sheet.getRange(r.rowNumber, col['다시 보내기'] + 1).setValue(false);
    var res = eb_sendPdfs_(r);
    eb_logSend_(r, res, action);
    if (res.ok) {
      var first = r.sendCount === 0;
      r.sendCount += 1;
      r.sentAt = now;
      r.status = EBS.sent;
      r.checkReason = '';
      if (!r.paidChecked) { sheet.getRange(r.rowNumber, col['입금 확정'] + 1).setValue(true); r.paidChecked = true; }
      // 입금 시각을 세무 봇이나 세연님이 이미 적었으면 그대로 둡니다.
      if (!r.paidAt && !r.paidAtRaw) { r.paidAt = now; sheet.getRange(r.rowNumber, col['입금 시각'] + 1).setValue(new Date(now)); }
      eb_addLog_(r, (action === 'resend' ? '다시 보냄' : '발송') + ' (메일 ' + res.mails + '통)');
      if (first && r.receiptPhone) eb_addReceipt_(r);
    } else {
      eb_markCheck_(r, '발송 실패: ' + res.error);
    }
    r.changed = true;
  });
  eb_writeChanged_(eb);
  eb_notifyOwner_(eb.rows);
}

/** 책 순서를 목록 순서(비교 자료집 먼저)로 맞춥니다. */
function eb_sortBooks_(ids) {
  var order = EB.BOOKS.map(function (b) { return b.id; });
  return ids.slice().sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
}

function eb_sendPdfs_(r) {
  try {
    var files = [];
    for (var i = 0; i < r.books.length; i++) {
      var b = eb_book(r.books[i]);
      if (!b) return { ok: false, error: '모르는 책 ' + r.books[i] };
      if (!b.fileId || /^PDF_파일_ID/.test(b.fileId)) return { ok: false, error: b.title + ' 파일 ID가 없습니다' };
      var file = DriveApp.getFileById(b.fileId);
      files.push({ book: b, file: file, size: file.getSize() });
    }
    var pack = eb_packAttachments(files, EB.MAX_MAIL_BYTES);
    if (pack.oversize.length) {
      return { ok: false, error: pack.oversize.map(function (f) { return f.book.title; }).join(', ') + ' 파일이 커서 첨부할 수 없습니다(Drive 링크로 직접 보내 주세요)' };
    }
    pack.mails.forEach(function (group, idx) {
      var m = eb_pdfMail(r, idx + 1, pack.mails.length, group.map(function (f) { return f.book.title; }));
      MailApp.sendEmail({
        to: r.email, subject: m.subject, body: m.body, name: EB.SENDER_NAME, replyTo: EB.OWNER_EMAIL,
        attachments: group.map(function (f) { return f.file.getBlob().setName(f.book.attachName); })
      });
    });
    return { ok: true, mails: pack.mails.length };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err).slice(0, 200) };
  }
}

function eb_logSend_(r, res, action) {
  var log = eb_sheet_(EB.SEND_LOG_SHEET);
  log.appendRow([new Date(), r.id, r.email, r.books.map(function (b) { return (eb_book(b) || {}).title || b; }).join(', '),
    res.ok ? res.mails : 0, res.ok ? (action === 'resend' ? '다시 보냄' : '보냄') : '실패', res.ok ? '' : res.error]);
}

function eb_addReceipt_(r) {
  var sh = eb_sheet_(EB.RECEIPT_SHEET);
  var last = sh.getLastRow();
  if (last > 1) {
    var ids = sh.getRange(2, 1, last - 1, 1).getValues().map(function (v) { return String(v[0]); });
    if (ids.indexOf(r.id) >= 0) return;
  }
  sh.appendRow([r.id, new Date(r.paidAt || Date.now()), r.name, r.receiptPhone, r.total, false, '', '']);
  var row = sh.getLastRow();
  sh.getRange(row, 4).setNumberFormat('@').setValue(r.receiptPhone);
  sh.getRange(row, 6).insertCheckboxes();
}

/** '현금영수증 발급 대기' 탭에서 '발급함'을 체크하면 발급 시각을 적습니다. */
function eb_onReceiptEdit_(e) {
  var sh = e.range.getSheet();
  if (e.range.getRow() < 2 || e.range.getColumn() !== EB_RECEIPT_COLS.indexOf('발급함') + 1) return;
  var cell = sh.getRange(e.range.getRow(), EB_RECEIPT_COLS.indexOf('발급 시각') + 1);
  cell.setValue(e.range.getValue() === true ? new Date() : '');
}

function eb_notifyOwner_(rows) {
  if (!EB.NOTIFY_OWNER) return;
  var list = rows.filter(function (r) { return r.justNeedsCheck; });
  if (!list.length) return;
  var body = "'" + EB.ORDER_SHEET + "' 탭에서 확인이 필요한 주문입니다.\n\n" + list.map(function (r) {
    return r.id + ' / ' + r.depositor + ' / ' + eb_won(r.total) + ' / ' + r.checkReason;
  }).join('\n') + "\n\n확인한 뒤 보내려면 '다시 보내기', 보내지 않으려면 '취소'를 체크해 주세요.";
  try { MailApp.sendEmail(EB.OWNER_EMAIL, '[전자책] 확인 필요 ' + list.length + '건', body); } catch (err) { console.warn('알림 메일 실패: ' + err); }
}

/* ===================== 설정과 시트 읽기·쓰기 ===================== */

/** Code.gs setup() 이 부릅니다. 탭 3개를 만들고 머리글·서식을 넣습니다. */
function eb_setup_() {
  var ss = SpreadsheetApp.getActive();
  [[EB.ORDER_SHEET, EB_COLS], [EB.SEND_LOG_SHEET, EB_SEND_LOG_COLS], [EB.RECEIPT_SHEET, EB_RECEIPT_COLS]].forEach(function (p) {
    var sh = ss.getSheetByName(p[0]) || ss.insertSheet(p[0]);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, p[1].length).setValues([p[1]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });
  var order = ss.getSheetByName(EB.ORDER_SHEET);
  // 예전에 만든 탭에 새 칸('입금 기한' 등)이 없으면 맨 뒤에 덧붙입니다(기존 칸 이름·순서는 그대로).
  var have = order.getRange(1, 1, 1, Math.max(order.getLastColumn(), 1)).getValues()[0].map(String);
  EB_COLS.forEach(function (n) {
    if (have.indexOf(n) >= 0) return;
    order.getRange(1, have.length + 1).setValue(n).setFontWeight('bold');
    have.push(n);
  });
  ['휴대폰', '현금영수증 번호'].forEach(function (n) {
    order.getRange(2, have.indexOf(n) + 1, order.getMaxRows() - 1, 1).setNumberFormat('@');
  });
  ['주문 시각', '입금 시각', '동의 시각', '발송 시각', '입금 기한'].forEach(function (n) {
    order.getRange(2, have.indexOf(n) + 1, order.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  });
}

function eb_sheet_(name) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error("'" + name + "' 탭이 없습니다. setup 을 먼저 실행하세요.");
  return sh;
}

/**
 * 칸 값 → ms. 날짜 칸이면 그대로, 글자 '2026-11-03 12:07'(세무 봇이 Sheets API 로 적는 모양)은 한국 시간으로 읽습니다.
 * (입금 기한과 비교하므로 스크립트 시간대 설정과 상관없이 같은 값이 나와야 합니다.)
 */
function eb_toMs_(v) {
  if (v === '' || v == null) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getTime();
  var m = String(v).trim().match(/^(\d{4})[-.\/] ?(\d{1,2})[-.\/] ?(\d{1,2})\.?[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - 9 * 60 * 60 * 1000;
  var t = Date.parse(String(v));
  return isNaN(t) ? null : t;
}

/** 체크박스 값. Sheets API 로 'TRUE' 글자가 들어와도 체크로 봅니다(사업자 세무 관리 봇이 '입금 확정'을 씁니다). */
function eb_isTrue_(v) { return v === true || String(v).trim().toUpperCase() === 'TRUE'; }

function eb_readRows_(sheet) {
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  var col = {};
  header.forEach(function (h, i) { col[h] = i; });
  var values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  var rows = values.map(function (v, i) {
    return {
      rowNumber: i + 2,
      id: String(v[col['주문번호']] || ''),
      status: String(v[col['상태']] || ''),
      depositor: String(v[col['입금자명']] || ''),
      total: Number(v[col['금액']]) || 0,
      books: String(v[col['책']] || '').split(',').map(function (s) { return s.trim(); }).filter(String),
      paidChecked: eb_isTrue_(v[col['입금 확정']]),
      paidAt: eb_toMs_(v[col['입금 시각']]),
      paidAtRaw: String(v[col['입금 시각']] == null ? '' : v[col['입금 시각']]).trim() !== '',
      payDeadline: col['입금 기한'] == null ? null : eb_toMs_(v[col['입금 기한']]),
      resendChecked: eb_isTrue_(v[col['다시 보내기']]),
      cancelChecked: eb_isTrue_(v[col['취소']]),
      name: String(v[col['이름']] || ''),
      email: eb_email(v[col['이메일']]),
      receiptPhone: eb_phone(v[col['현금영수증 번호']]),
      sentAt: eb_toMs_(v[col['발송 시각']]),
      sendCount: Number(v[col['발송 횟수']]) || 0,
      checkReason: String(v[col['확인 필요 사유']] || ''),
      log: String(v[col['처리 기록']] || '').split('\n').filter(String),
      changed: false
    };
  }).filter(function (r) { return r.id; });
  return { header: header, col: col, rows: rows };
}

function eb_writeChanged_(eb) {
  var sheet = eb.sheet, col = eb.col;
  eb.rows.forEach(function (r) {
    if (!r.changed) return;
    var set = function (name, value) { if (col[name] != null) sheet.getRange(r.rowNumber, col[name] + 1).setValue(value); };
    set('상태', r.status);
    set('발송 시각', r.sentAt != null ? new Date(r.sentAt) : '');
    set('발송 횟수', r.sendCount);
    set('확인 필요 사유', r.checkReason);
    set('처리 기록', r.log.join('\n'));
  });
}

/* Node 테스트용(Apps Script 에서는 무시됩니다) */
if (typeof module !== 'undefined') {
  module.exports = { EB: EB, EBS: EBS, EB_COLS: EB_COLS, eb_validate: eb_validate, eb_total: eb_total,
    eb_pickDepositor: eb_pickDepositor, eb_matchDeposit: eb_matchDeposit, eb_decideAction: eb_decideAction, eb_fmtKst: eb_fmtKst, eb_toMs_: eb_toMs_,
    eb_packAttachments: eb_packAttachments, eb_orderMail: eb_orderMail, eb_pdfMail: eb_pdfMail, eb_depositorBase: eb_depositorBase };
}
