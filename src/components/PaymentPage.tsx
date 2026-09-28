import { ArrowLeft, ArrowRight, CheckCircle2, CircleX, Clock3, ShieldCheck, Store } from 'lucide-react';
import { Merchant, merchants, products, validatedPaymentUrl } from '../payment/config';

const won = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 });

const BrandHeader = () => (
  <header className="border-b border-brand-light-gray bg-brand-bg">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
      <a href="/" className="flex items-center gap-3" aria-label="세연쌤 홈페이지">
        <img src="/logo-pic.png" alt="" className="h-10 w-auto" />
        <div>
          <div className="text-xl font-extrabold tracking-tighter">SEH-YUN T</div>
          <div className="text-[8px] font-black uppercase tracking-[0.35em] text-brand-accent">Admissions Lab</div>
        </div>
      </a>
      <a href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-gray transition-colors hover:text-brand-accent">
        <ArrowLeft size={14} /> 홈으로
      </a>
    </div>
  </header>
);

const MerchantInfo = ({ merchant }: { merchant: Merchant }) => {
  const rows = [
    ['대표자', merchant.representative],
    ['사업자등록번호', merchant.businessNumber],
    ['통신판매업 신고번호', merchant.ecommerceNumber],
    ['사업장 주소', merchant.address],
    ['이메일', merchant.email],
  ];

  return (
    <section className="border border-brand-light-gray bg-brand-secondary/60 p-6 sm:p-8">
      <p className="mb-5 text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent">Seller Information</p>
      <h2 className="mb-6 text-xl font-black">{merchant.name}</h2>
      <dl className="space-y-3 text-xs leading-relaxed">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[120px_1fr] gap-3">
            <dt className="font-bold text-brand-gray">{label}</dt>
            <dd className={value ? 'text-brand-text' : 'text-brand-gray/70'}>{value || '설정 필요'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

const PaymentFooter = () => (
  <footer className="border-t border-brand-light-gray px-6 py-10 text-center text-[10px] font-bold uppercase tracking-[0.25em] text-brand-gray">
    © 2023 SEHYUNT. Secure payment by PayUp.
  </footer>
);

export const PaymentPage = () => {
  const productId = new URLSearchParams(window.location.search).get('product');
  const selected = products.find((product) => product.id === productId);

  if (!selected) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text">
        <BrandHeader />
        <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24 lg:px-8">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.45em] text-brand-accent">Payment</p>
          <h1 className="text-4xl font-black tracking-tighter sm:text-6xl">결제할 서비스를 선택해 주세요.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-brand-gray sm:text-base">각 상품은 표시된 판매자의 PayUp 결제 페이지로만 연결됩니다.</p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {products.map((product) => {
              const merchant = merchants[product.merchant];
              return (
                <article key={product.id} className="flex flex-col border border-brand-light-gray bg-white p-7 transition-colors hover:border-brand-text sm:p-9">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-accent">{product.productType}</span>
                    <span className="bg-brand-secondary px-3 py-2 text-[10px] font-bold">{product.paymentType === 'recurring' ? '정기결제' : '일반결제'}</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight">{product.name}</h2>
                  <p className="mt-4 flex-1 text-sm leading-7 text-brand-gray">{product.description}</p>
                  <div className="mt-8 border-t border-brand-light-gray pt-6">
                    <div className="flex items-center gap-2 text-xs text-brand-gray"><Store size={14} /> 판매자 <strong className="text-brand-text">{merchant.name}</strong></div>
                    <div className="mt-4 text-2xl font-black">{product.price ? won.format(product.price) : '가격 설정 필요'}</div>
                  </div>
                  <a href={`/payment?product=${encodeURIComponent(product.id)}`} className="mt-8 flex items-center justify-center gap-3 bg-brand-text px-6 py-5 text-xs font-black uppercase tracking-[0.2em] text-brand-bg transition-colors hover:bg-brand-accent">
                    주문 확인 <ArrowRight size={16} />
                  </a>
                </article>
              );
            })}
          </div>
        </main>
        <PaymentFooter />
      </div>
    );
  }

  const merchant = merchants[selected.merchant];
  const paymentUrl = validatedPaymentUrl(selected);
  const ready = selected.price !== null && paymentUrl !== null;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <BrandHeader />
      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-20 lg:px-8">
        <a href="/payment" className="mb-8 inline-flex items-center gap-2 text-xs font-bold text-brand-gray hover:text-brand-accent"><ArrowLeft size={14} /> 다른 상품 선택</a>
        <div className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <section className="border border-brand-light-gray bg-white p-7 sm:p-10">
            <p className="mb-4 text-[10px] font-black uppercase tracking-[0.35em] text-brand-accent">Order Summary</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{selected.name}</h1>
            <p className="mt-5 text-sm leading-7 text-brand-gray sm:text-base">{selected.description}</p>

            <dl className="mt-10 divide-y divide-brand-light-gray border-y border-brand-light-gray text-sm">
              <div className="flex justify-between gap-6 py-5"><dt className="text-brand-gray">상품 ID</dt><dd className="font-bold">{selected.id}</dd></div>
              <div className="flex justify-between gap-6 py-5"><dt className="text-brand-gray">결제 유형</dt><dd className="font-bold">{selected.paymentType === 'recurring' ? '정기결제' : '일반결제'}</dd></div>
              <div className="flex justify-between gap-6 py-5"><dt className="text-brand-gray">판매자</dt><dd className="font-black">{merchant.name}</dd></div>
              <div className="flex items-end justify-between gap-6 py-6"><dt className="text-brand-gray">결제 금액</dt><dd className="text-3xl font-black">{selected.price ? won.format(selected.price) : '설정 필요'}</dd></div>
            </dl>

            <div className="mt-8 space-y-3 bg-brand-secondary p-5 text-xs leading-6 text-brand-gray">
              <p>· 결제 전 상품명, 금액, 판매자를 다시 확인해 주세요.</p>
              <p>· 취소 및 환불은 서비스 제공 전 판매자에게 문의해 주세요.</p>
              {selected.paymentType === 'recurring' && <p>· 정기결제의 주기와 해지 조건은 PayUp 결제 화면에서 최종 확인해 주세요.</p>}
            </div>
          </section>

          <aside className="lg:sticky lg:top-8">
            <div className="border border-brand-text bg-brand-text p-7 text-brand-bg sm:p-8">
              <div className="flex items-center gap-3 text-xs font-bold text-brand-bg/60"><ShieldCheck size={18} className="text-brand-accent" /> PayUp 안전 결제</div>
              <p className="mt-5 text-sm leading-6 text-brand-bg/60">결제 버튼을 누르면 <strong className="text-brand-bg">{merchant.name}</strong> 명의의 PayUp 결제 페이지로 이동합니다.</p>
              {ready ? (
                <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="mt-8 flex w-full items-center justify-center gap-3 bg-brand-bg px-6 py-5 text-sm font-black text-brand-text transition-colors hover:bg-brand-accent hover:text-brand-bg">
                  {selected.price ? `${won.format(selected.price)} 결제하기` : '결제하기'} <ArrowRight size={17} />
                </a>
              ) : (
                <button type="button" disabled className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-3 bg-white/10 px-6 py-5 text-sm font-black text-white/40">
                  <Clock3 size={17} /> 결제 준비 중
                </button>
              )}
              {!ready && <p className="mt-4 text-center text-[11px] leading-5 text-brand-bg/45">상품 가격과 PayUp 링크 설정 후 자동으로 활성화됩니다.</p>}
            </div>
          </aside>
        </div>

        <div className="mt-8"><MerchantInfo merchant={merchant} /></div>
      </main>
      <PaymentFooter />
    </div>
  );
};

const statusCopy = {
  success: { icon: CheckCircle2, eyebrow: 'Payment Complete', title: '결제가 완료되었습니다.', body: '결제 내역은 PayUp에서 발송한 안내를 확인해 주세요.' },
  cancel: { icon: CircleX, eyebrow: 'Payment Cancelled', title: '결제가 취소되었습니다.', body: '승인된 결제는 없습니다. 원하시면 상품을 다시 선택해 주세요.' },
  fail: { icon: CircleX, eyebrow: 'Payment Failed', title: '결제를 완료하지 못했습니다.', body: '결제수단을 확인한 뒤 다시 시도하거나 판매자에게 문의해 주세요.' },
} as const;

export const PaymentStatusPage = ({ status }: { status: keyof typeof statusCopy }) => {
  const copy = statusCopy[status];
  const Icon = copy.icon;
  return (
    <div className="flex min-h-screen flex-col bg-brand-bg text-brand-text">
      <BrandHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <section className="w-full max-w-xl border border-brand-light-gray bg-white p-8 text-center sm:p-14">
          <Icon size={48} className={`mx-auto ${status === 'success' ? 'text-brand-accent' : 'text-brand-gray'}`} />
          <p className="mt-8 text-[10px] font-black uppercase tracking-[0.35em] text-brand-accent">{copy.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{copy.title}</h1>
          <p className="mt-5 text-sm leading-7 text-brand-gray">{copy.body}</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <a href="/" className="border border-brand-text px-6 py-4 text-xs font-black">홈으로</a>
            <a href="/payment" className="bg-brand-text px-6 py-4 text-xs font-black text-brand-bg">결제 페이지</a>
          </div>
        </section>
      </main>
      <PaymentFooter />
    </div>
  );
};

