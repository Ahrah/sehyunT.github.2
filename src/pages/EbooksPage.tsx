import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { SITE, loadPretendard } from '../config/site';
import {
  EBOOKS,
  EBOOK_CONFIG,
  EMPTY_EB_FORM,
  type EbForm,
  formatKst,
  formatWon,
  isMinor,
  itemsTotal,
  orderTotal,
  priceOf,
  validateOrder,
} from '../lib/ebooks';
import {
  type MockMail,
  type OrderResponse,
  isLiveSiteWithoutBackend,
  isTestMode,
  mockConfirm,
  orderReceivedMail,
  resetMock,
  submitOrder,
} from '../lib/ebooksApi';
import { coverPath, detailPath, preselectFromSearch } from '../lib/ebooksDetail';
import { cartSummary, removeManyFromCart } from '../lib/cart';
import { BooksHeader, useCart } from './BooksCommon';
import { type MemberProfile, type PrefillMap, applyMemberPrefill, loadMemberProfile } from '../lib/memberPrefill';
import './ebooks.css';

/**
 * 회원 프로필 → 주문서 칸. 회원 정보의 이름은 자녀(학생) 이름이라 주문자 이름에는 넣지 않습니다.
 * 이메일은 로그인한 계정 주소라 확인 칸에도 같이 채웁니다.
 */
const EB_PREFILL: PrefillMap<EbForm> = { phone: 'phone', email: 'email' };
const EB_PREFILL_CONFIRM: PrefillMap<EbForm> = { email: 'emailConfirm' };
function prefillEb(f: EbForm, p: MemberProfile | null, touched?: ReadonlySet<keyof EbForm>): EbForm {
  return applyMemberPrefill(applyMemberPrefill(f, p, EB_PREFILL, touched), p, EB_PREFILL_CONFIRM, touched);
}

const MINUTES = EBOOK_CONFIG.sendWithinMinutes;
const PAY_HOURS = EBOOK_CONFIG.payWindowMs / 3600000;
const CONTACT_EMAIL = EBOOK_CONFIG.contactEmail;
const GUIDE_PRICE = EBOOKS.find((b) => b.id !== 'compare')?.price ?? null;
const COMPARE_PRICE = EBOOKS.find((b) => b.id === 'compare')?.price ?? null;

export function EbooksPage() {
  const preview = isTestMode();
  const notReady = isLiveSiteWithoutBackend();
  const sellable = useMemo(() => EBOOKS.filter((b) => priceOf(b) != null), []);
  const open = !notReady && sellable.length > 0;
  // 상세 화면의 '구매하기'(?book=<id>#eb-form)로 오면 그 책을 미리 골라 둡니다.
  const q = new URLSearchParams(window.location.search);
  const fromCart = q.get('checkout') === 'cart';
  // 주문서 화면: 장바구니에서 왔거나(?checkout=cart), 예전 '구매하기' 주소(?book=)로 왔을 때
  const checkout = fromCart || q.has('book') || window.location.hash === '#eb-form';
  const cart = useCart();
  const [form, setForm] = useState<EbForm>(() => ({ ...EMPTY_EB_FORM, books: preselectFromSearch(window.location.search) }));
  const cartLoaded = useRef(false);
  useEffect(() => {
    if (!fromCart || !cart.ready || cartLoaded.current) return;
    cartLoaded.current = true;
    setForm((f) => ({ ...f, books: cart.ids }));
  }, [fromCart, cart.ready, cart.ids]);
  const [errors, setErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<OrderResponse | null>(null);
  const [mail, setMail] = useState<MockMail | null>(null);
  const [orderMail, setOrderMail] = useState<MockMail | null>(null);

  useEffect(() => {
    loadPretendard();
  }, []);
  useEffect(() => {
    if (window.location.hash === '#eb-form') document.getElementById('eb-form')?.scrollIntoView();
  }, []);

  // 주문하면 신청완료 화면으로 바뀝니다. 브라우저 '뒤로'를 누르면 주문 화면으로 돌아갑니다.
  useEffect(() => {
    const onPop = () => {
      if (window.location.hash !== '#done') setResult(null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const backToOrder = () => {
    if (window.location.hash === '#done') window.history.back();
    else setResult(null);
  };

  const total = orderTotal(form.books);
  // 로그인한 회원이면 휴대폰·이메일을 미리 채웁니다. 이미 적은 칸은 그대로 두고, 채운 칸도 고칠 수 있습니다.
  const touched = useRef(new Set<keyof EbForm>());
  const member = useRef<MemberProfile | null>(null);
  useEffect(() => {
    let alive = true;
    void loadMemberProfile({ allowPreviewMember: isTestMode() }).then((profile) => {
      if (!alive || !profile) return;
      member.current = profile;
      setForm((f) => prefillEb(f, profile, touched.current));
    });
    return () => {
      alive = false;
    };
  }, []);

  const set = <K extends keyof EbForm>(k: K, v: EbForm[K]) => {
    touched.current.add(k);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const toggleBook = (id: string, on: boolean) =>
    setForm((f) => ({ ...f, books: on ? EBOOKS.map((b) => b.id).filter((x) => x === id || f.books.includes(x)) : f.books.filter((x) => x !== id) }));
  const allIds = sellable.map((b) => b.id);
  const allOn = allIds.length > 0 && allIds.every((id) => form.books.includes(id));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!open || sending) return;
    const now = Date.now();
    const formWithTimestamp = { ...form, consentParentAt: form.consentParent ? now : undefined };
    const errs = validateOrder(formWithTimestamp, EBOOKS, now);
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setSending(true);
    try {
      const res = await submitOrder(formWithTimestamp, now);
      if (res.ok) {
        // 주문한 책은 장바구니에서 뺍니다.
        if (fromCart && cart.user) removeManyFromCart(cart.user.uid, form.books);
        setResult(res);
        try {
          window.history.pushState({ ebDone: true }, '', `${window.location.pathname}${window.location.search}#done`);
        } catch {
          /* noop */
        }
        window.scrollTo({ top: 0 });
        setMail(null);
        setOrderMail(
          preview && res.id && res.depositor && res.total != null && res.payDeadline != null
            ? orderReceivedMail({
                id: res.id,
                name: form.name.trim(),
                email: res.email || '',
                depositor: res.depositor,
                total: res.total,
                books: res.books || [],
                payDeadline: res.payDeadline,
              })
            : null,
        );
        touched.current = new Set();
        setForm(prefillEb(EMPTY_EB_FORM, member.current));
      } else setErrors([res.error || '주문을 보내지 못했습니다. 잠시 뒤 다시 눌러 주세요.']);
    } catch {
      setErrors(['주문을 보내지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요.']);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="eb-page">
      {preview && (
        <div className="eb-test-banner" role="status">
          <span>
            미리보기(테스트 모드) · 주문은 이 브라우저에만 저장됩니다 · 메일은 보내지 않습니다
          </span>
          <button
            type="button"
            onClick={() => {
              resetMock();
              setResult(null);
              setMail(null);
              setOrderMail(null);
            }}
          >
            테스트 주문 지우기
          </button>
        </div>
      )}

      <BooksHeader count={cart.ids.length} loggedIn={!!cart.user} />

      {result?.ok ? (
        <main className="eb-wrap">
          <section className="eb-hero" role="status">
            <p className="eb-eyebrow">신청완료</p>
            <h1>전자책 주문이 접수되었습니다</h1>
            <p className="eb-lead">아래 입금자명으로 {PAY_HOURS}시간 안에 입금해 주세요. 입금이 확인되면 이메일로 PDF를 보내 드립니다.</p>
          </section>
          <ResultPanel
            result={result}
            preview={preview}
            mail={mail}
            orderMail={orderMail}
            onDemoConfirm={() => result.id && setMail(mockConfirm(result.id, Date.now()))}
          />
          <p className="eb-back">
            <button type="button" className="eb-demo" onClick={backToOrder}>주문 화면으로 돌아가기</button>
          </p>
        </main>
      ) : (
      <main className="eb-wrap">
        {checkout ? (
          <section className="eb-hero">
            <p className="eb-eyebrow">입시는세연쌤books · 주문서</p>
            <h1>{fromCart ? '장바구니 주문' : '전자책 주문'}</h1>
            <p className="eb-lead">고른 책을 확인하고 주문서를 내 주세요. 주문 뒤 {PAY_HOURS}시간 안에 계좌이체로 입금하시면 됩니다.</p>
            {!open && <p className="eb-open-badge">판매 준비 중입니다</p>}
            <p className="eb-note"><a href="/ebooks/">← 입시는세연쌤 books 목록으로</a></p>
          </section>
        ) : (
          <>
            <section className="eb-hero eb-store-hero">
              <p className="eb-eyebrow">입시는세연쌤books</p>
              <h1>입시는세연쌤 books</h1>
              <p className="eb-lead">입시는세연쌤books가 펴낸 전자책(PDF)입니다. '자세히 보기'를 누르면 목차와 샘플 쪽을 볼 수 있습니다. 상세 화면에서 '구매하기'로 주문하거나 '담기'로 장바구니에 담을 수 있습니다.</p>
              <ul className="eb-facts">
                {GUIDE_PRICE != null && <li><b>학교별 가이드</b> 1권 {formatWon(GUIDE_PRICE)}</li>}
                {COMPARE_PRICE != null && <li><b>비교 자료집</b> {formatWon(COMPARE_PRICE)}</li>}
                <li><b>결제</b> 계좌이체</li>
              </ul>
              {!open && <p className="eb-open-badge">판매 준비 중입니다</p>}
            </section>

            <section aria-labelledby="eb-series-title">
              <h2 id="eb-series-title" className="eb-series">2027 경기권 외고 자소서·면접</h2>
              <ul className="eb-shelf">
                {EBOOKS.map((b) => {
                  const price = priceOf(b);
                  return (
                    <li key={b.id} className="eb-card">
                      <a className="eb-card-link" href={detailPath(b.id)}>
                        <span className="eb-card-cover">
                          <img src={coverPath(b.id)} alt="" loading="lazy" width={1100} height={1554} />
                        </span>
                        <span className="eb-card-body">
                          <span className="eb-card-title">{b.title}</span>
                          <span className="eb-card-price">{price == null ? '가격 준비 중' : formatWon(price)}</span>
                          <span className="eb-detail-link">자세히 보기</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
              {cart.ids.length > 0 && (
                <p className="eb-note eb-cart-line">
                  장바구니 {cart.ids.length}권 · {(() => { const c = cartSummary(cart.ids); return c.total != null ? formatWon(c.total) : '-'; })()}{' '}
                  <a href="/?mypage=cart">장바구니 보기</a>
                </p>
              )}
            </section>

            <section className="eb-section" aria-labelledby="eb-about-title">
              <h2 id="eb-about-title">이 시리즈는</h2>
              <p>경기권 외고 일반전형을 학교별로 한 권씩 정리했습니다. 기준은 각 학교의 「2027학년도 신입생 전형요항」과 경기도교육청 「2027학년도 고등학교 입학전형 기본계획」입니다. 자료 기준일은 2026년 10월 29일입니다.</p>
              <p className="eb-note">형식 PDF(학교별 가이드 22~31쪽, 비교 자료집 47쪽) · 입금 확인 후 {MINUTES}분 안에 이메일로 보내 드립니다.</p>
            </section>
          </>
        )}

        <section className="eb-section" aria-labelledby="eb-how-title">
          <h2 id="eb-how-title">이렇게 받습니다</h2>
          <ol className="eb-steps">
            <li>아래에서 책을 고르고 주문서를 냅니다.</li>
            <li>
              주문 뒤 <b>{PAY_HOURS}시간 안에</b> 화면에 나온 <b>입금자명(이름+숫자 2자리)</b>으로 합계 금액을 입금합니다. 기한까지
              입금이 확인되지 않으면 주문은 자동으로 취소됩니다.
            </li>
            <li>입금이 확인되면 {MINUTES}분 안에 주문서에 적은 이메일로 PDF를 보내 드립니다.</li>
          </ol>
        </section>

        {checkout && (
        <section className="eb-section" id="eb-form" aria-labelledby="eb-form-title">
          <h2 id="eb-form-title">주문서</h2>
          <form onSubmit={onSubmit} noValidate>
            <fieldset disabled={!open || sending} className="eb-fieldset">
              <div>
                <h3>책 고르기 (여러 권 고를 수 있습니다)</h3>
                <label className="eb-check">
                  <input type="checkbox" checked={allOn} onChange={(e) => set('books', e.target.checked ? allIds : [])} />
                  {sellable.length === EBOOKS.length
                    ? `${EBOOKS.length}권 모두 고르기`
                    : '판매 중인 책 모두 고르기'}
                </label>
                <div className="eb-books">
                  {EBOOKS.map((b) => {
                    const price = priceOf(b);
                    const on = form.books.includes(b.id);
                    return (
                      <label key={b.id} className={`eb-book${on ? ' is-on' : ''}${price == null ? ' is-off' : ''}`}>
                        <input type="checkbox" checked={on} disabled={price == null} onChange={(e) => toggleBook(b.id, e.target.checked)} />
                        <span>
                          <span className="eb-book-title">{b.title}</span>{b.pages != null && <> <span className="eb-note">({b.pages}쪽)</span></>}
                          <span className="eb-book-sub">{b.summary}</span>
                          <a className="eb-book-more" href={detailPath(b.id)}>샘플·자세히 보기</a>
                        </span>
                        <span className="eb-book-price">{price == null ? '가격 준비 중' : formatWon(price)}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="eb-total" aria-live="polite">
                  <span>고른 책 {form.books.length}권</span>
                  <span>
                    합계 {total == null ? '-' : formatWon(total)}
                  </span>
                </div>
              </div>

              <div className="eb-grid">
                <label>주문자 이름<input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" /></label>
                <label>
                  생년월일
                  <input type="date" value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} autoComplete="bday" placeholder="YYYY-MM-DD" />
                </label>
                <label>휴대폰<input type="tel" value={form.phone} inputMode="tel" placeholder="010-0000-0000" onChange={(e) => set('phone', e.target.value)} autoComplete="tel" aria-describedby="eb-contact-notice" /></label>
                <label>
                  PDF를 받을 이메일
                  <input type="email" value={form.email} placeholder="name@example.com" onChange={(e) => set('email', e.target.value)} autoComplete="email" aria-describedby="eb-contact-notice" />
                </label>
                <label>
                  이메일 한 번 더
                  <input type="email" value={form.emailConfirm} onChange={(e) => set('emailConfirm', e.target.value)} autoComplete="off" onPaste={(e) => e.preventDefault()} aria-describedby="eb-contact-notice" />
                </label>
                <p id="eb-contact-notice" className="eb-contact-notice">
                  수집 항목: 휴대폰 번호, 이메일, 생년월일 · 목적: 전자책 발송과 수정본 안내, 미성년자 확인 · 보관 기간: 2027년 12월 31일까지(2027학년도 입시가 끝날 때까지) 보관한 뒤 파기합니다.
                </p>
                <label>
                  현금영수증용 전화번호(선택)
                  <input type="tel" value={form.cashReceiptPhone} inputMode="tel" placeholder="받지 않으면 비워 두세요" onChange={(e) => set('cashReceiptPhone', e.target.value)} />
                </label>
                <label className="eb-hp" aria-hidden="true">
                  website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set('website', e.target.value)} />
                </label>
              </div>
              <p className="eb-note">
                입금자명은 주문을 내면 '이름+숫자 2자리'로 알려 드립니다. 예: 홍길동27. 이 이름으로 입금해야 확인이 빠릅니다.
              </p>

              <div className="eb-consents">
                <Consent checked={form.consentPrivacy} onChange={(v) => set('consentPrivacy', v)} title="(필수) 개인정보 수집·이용 동의">
                  <li>수집 항목: 주문자 이름, 이메일 주소, 휴대폰 번호, 생년월일, 입금자명, 현금영수증용 전화번호(적은 경우), 미성년자인 경우 부모 동의 여부.</li>
                  <li>이용 목적: 주문과 입금 확인, PDF 발송, 현금영수증 발급, 문의 답변, 미성년자 확인.</li>
                  <li>보관 기간: 거래일로부터 {EBOOK_CONFIG.keepYears}년(전자상거래법에 따른 거래 기록 보관). 기간이 지나면 파기합니다.</li>
                  <li>동의하지 않을 수 있습니다. 동의하지 않으면 주문할 수 없습니다.</li>
                </Consent>
                <Consent checked={form.consentRefund} onChange={(v) => set('consentRefund', v)} title="(필수) 디지털 콘텐츠 환불 제한 안내 확인">
                  <li>이 책은 PDF 파일로 드리는 디지털 콘텐츠입니다.</li>
                  <li>이메일로 PDF를 받은 뒤에는 전자상거래법 제17조 제2항에 따라 단순 변심 환불이 제한됩니다.</li>
                  <li>PDF를 받기 전에는 낸 금액을 모두 돌려 드립니다.</li>
                </Consent>
                {form.birthdate && isMinor(form.birthdate, Date.now()) && (
                  <Consent checked={form.consentParent} onChange={(v) => set('consentParent', v)} title="(필수) 미성년자 부모님·법정대리인 동의">
                    <li>주문자가 만 19세 미만 미성년자인 경우, 부모님 또는 법정대리인의 동의가 필요합니다.</li>
                    <li>부모님 또는 법정대리인이 이 주문을 확인하고 동의했음을 체크해 주세요.</li>
                  </Consent>
                )}
              </div>

              {errors.length > 0 && (
                <ul className="eb-error" role="alert">
                  {errors.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}

              <button type="submit" className="eb-submit">
                {!open ? '판매 준비 중입니다' : sending ? '보내는 중…' : total ? `${formatWon(total)} 주문하기` : '주문하기'}
              </button>
            </fieldset>
          </form>
        </section>
        )}

        <section className="eb-section" aria-labelledby="eb-get-title">
          <h2 id="eb-get-title">PDF 받기 안내</h2>
          <ul className="eb-list">
            <li>입금이 확인되면 {MINUTES}분 안에 주문서에 적은 이메일로 PDF를 보내 드립니다.</li>
            <li>메일이 보이지 않으면 스팸함과 프로모션함을 확인해 주세요. 보내는 이름은 '입시는세연쌤'입니다.</li>
            <li>
              1시간이 지나도 메일이 없으면 주문번호와 함께{' '}
              <a href={SITE.kakaoChannelUrl} target="_blank" rel="noreferrer">카카오톡 채널 '입시는세연쌤'</a>이나{' '}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>으로 알려 주세요.
            </li>
          </ul>
        </section>

        <section className="eb-section" aria-labelledby="eb-refund-title">
          <h2 id="eb-refund-title">환불 안내</h2>
          <ul className="eb-list">
            {REFUND_RULES.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>

        <section className="eb-section" aria-labelledby="eb-qna-title">
          <h2 id="eb-qna-title">자주 묻는 질문</h2>
          <div className="eb-qna">
            <Qna q="입금하면 언제 받나요?">
              입금이 확인되면 {MINUTES}분 안에 이메일로 보내 드립니다. 입금자명이 주문서와 다르면 확인이 늦어집니다.
            </Qna>
            <Qna q="입금 기한이 지났습니다.">
              주문 뒤 {PAY_HOURS}시간이 지나도 입금이 확인되지 않으면 주문은 자동으로 취소됩니다. 다시 사려면 주문서를 새로 내
              주세요. 기한이 지난 뒤 이미 입금하셨다면 확인한 뒤 연락드립니다.
            </Qna>
            <Qna q="입금자명을 다르게 적어 입금했습니다.">
              주문번호와 실제 입금한 이름을 카카오톡 채널로 알려 주세요. 확인한 뒤 보내 드립니다.
            </Qna>
            <Qna q="여러 권을 사면 어떻게 받나요?">
              한 번에 주문하면 합계 금액을 한 번만 입금합니다. PDF는 메일 한 통에 모두 첨부합니다. 파일이 크면 여러 통으로
              나눠 보냅니다.
            </Qna>
            <Qna q="현금영수증을 받을 수 있나요?">
              주문서에 현금영수증용 전화번호를 적어 주세요. 입금 확인 뒤 그 번호로 발급합니다.
            </Qna>
            <Qna q="내용은 언제 기준인가요?">
              2026년 10월 29일 기준입니다. 면접 문항 수와 시간은 학교가 1단계 발표 뒤 다시 공지합니다. 지원 학교의 공지를 꼭
              함께 확인하세요.
            </Qna>
            <Qna q="휴대폰에서도 볼 수 있나요?">
              PDF를 열 수 있는 앱이 있으면 휴대폰, 태블릿, 컴퓨터에서 모두 볼 수 있습니다.
            </Qna>
          </div>
        </section>
      </main>
      )}

      <footer className="eb-footer">
        <div className="eb-wrap">
          <p>입시는세연쌤 / 대표: {SITE.founder}</p>
          <p>사업자등록번호 {SITE.businessNumber} · 통신판매업 신고번호 {SITE.mailOrderSalesNumber}</p>
          <p>{SITE.address} · {SITE.phone}</p>
          <p>문의: 카카오톡 채널 '입시는세연쌤' · {CONTACT_EMAIL}</p>
        </div>
      </footer>
    </div>
  );
}

/** 환불 안내. 바꾸면 위 동의 문구와 Q&A 도 함께 고칩니다. */
export const REFUND_RULES: string[] = [
  'PDF를 받기 전에 취소하면 낸 금액을 모두 돌려 드립니다. 카카오톡 채널이나 이메일로 알려 주세요.',
  'PDF는 디지털 콘텐츠입니다. 이메일로 받은 뒤에는 전자상거래법 제17조 제2항에 따라 단순 변심 환불이 제한됩니다.',
  '파일이 열리지 않으면 다시 보내 드립니다. 다시 보내도 열리지 않으면 낸 금액을 모두 돌려 드립니다.',
  '내용이 이 페이지의 안내와 다르면 PDF를 받은 날부터 3개월 안에, 그 사실을 안 날부터 30일 안에 환불을 요청할 수 있습니다.',
  '금액을 잘못 입금하셨다면 연락 주세요. 더 낸 금액은 돌려 드리고, 모자란 금액은 추가 입금을 안내합니다.',
  '환불은 입금하신 계좌로 요청을 받은 날부터 3영업일 안에 돌려 드립니다.',
];

function Qna({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="eb-qna-item">
      <summary>{q}</summary>
      <p>{children}</p>
    </details>
  );
}

function Consent({ checked, onChange, title, children }: { checked: boolean; onChange: (v: boolean) => void; title: string; children: ReactNode }) {
  return (
    <div className="eb-consent">
      <label className="eb-check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span>{title}</span>
      </label>
      <ul className="eb-list eb-small">{children}</ul>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="eb-copy"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {done ? '복사했습니다' : '복사'}
    </button>
  );
}

function ResultPanel({
  result,
  preview,
  mail,
  orderMail,
  onDemoConfirm,
}: {
  result: OrderResponse;
  preview: boolean;
  mail: MockMail | null;
  orderMail: MockMail | null;
  onDemoConfirm: () => void;
}) {
  return (
    <section className="eb-result" role="status">
      <h2>입금 안내</h2>
      <div className="eb-pay">
        <div className="eb-pay-row"><b>입금자명</b><span className="eb-big">{result.depositor}</span>{result.depositor && <CopyButton text={result.depositor} />}</div>
        <div className="eb-pay-row"><b>금액</b><span className="eb-big">{result.total != null ? formatWon(result.total) : ''}</span></div>
        <div className="eb-pay-row"><b>계좌</b><span>{EBOOK_CONFIG.bankAccount}</span><CopyButton text={EBOOK_CONFIG.bankNumber.replace(/-/g, '')} /></div>
        {result.payDeadline != null && (
          <div className="eb-pay-row"><b>입금 기한</b><span className="eb-big">{formatKst(result.payDeadline)}</span><span className="eb-note">(한국 시간)</span></div>
        )}
      </div>
      <p className="eb-strong">입금자명을 꼭 위와 같이 적어 주세요. 숫자 2자리까지 같아야 확인이 빠릅니다.</p>
      <p>
        주문 뒤 {PAY_HOURS}시간 안에 입금해 주세요. 입금 기한까지 입금이 확인되지 않으면 주문은 자동으로 취소됩니다.
      </p>
      <p>
        입금이 확인되면 {MINUTES}분 안에 <b>{result.email}</b>으로 PDF를 보내 드립니다. 메일이 보이지 않으면 스팸함을
        확인해 주세요.
      </p>
      <p className="eb-strong">
        입금 후 {MINUTES}분 이내로 이메일이 오지 않으면{' '}
        <a href={SITE.kakaoChannelUrl} target="_blank" rel="noreferrer">카카오톡 채널 '입시는세연쌤'</a>으로 문의해 주세요.
      </p>
      {result.id && <p className="eb-note">주문번호 {result.id} · 같은 내용을 입금 안내 메일로도 보내 드립니다.</p>}
      {preview && orderMail && (
        <details className="eb-mail">
          <summary>(미리보기) 주문하자마자 나가는 입금 안내 메일 보기</summary>
          <p className="eb-note">미리보기: 실제로 보내지 않았습니다.</p>
          <p><b>받는 사람</b> {orderMail.to}</p>
          <p><b>제목</b> {orderMail.subject}</p>
          <pre>{orderMail.body}</pre>
        </details>
      )}
      {preview && !mail && (
        <button type="button" className="eb-demo" onClick={onDemoConfirm}>
          (미리보기) 세연쌤이 '입금 확정'을 체크하면 나가는 메일 보기
        </button>
      )}
      {mail && (
        <div className="eb-mail">
          <p className="eb-note">미리보기: 실제로 보내지 않았습니다.</p>
          <p><b>받는 사람</b> {mail.to}</p>
          <p><b>제목</b> {mail.subject}</p>
          <p><b>첨부</b> {mail.attachments.join(', ')}</p>
          <pre>{mail.body}</pre>
        </div>
      )}
    </section>
  );
}
