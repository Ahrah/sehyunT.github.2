import { ArrowLeft, ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { getPaymentProduct, listPaymentProducts, type PaymentProduct } from './config';

function useQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

function priceLabel(price: number): string {
  return price > 0 ? `${price.toLocaleString()}원` : '가격 문의';
}

function ProductTag({ product }: { product: PaymentProduct }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gray border border-brand-light-gray px-2 py-0.5">
        {product.productType}
      </span>
      {product.paymentType === 'recurring' && (
        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand-accent">
          <RefreshCw size={10} /> 정기결제
        </span>
      )}
    </div>
  );
}

/** `/payment` — no ?product= yet: pick from the available products. */
function ProductListView() {
  const products = listPaymentProducts();

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">
        <h1 className="text-2xl font-black text-brand-text text-center">상품 선택</h1>

        {products.length === 0 ? (
          <p className="text-sm text-brand-gray text-center">아직 결제 가능한 상품이 없어요.</p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <a
                key={product.id}
                href={`/payment?product=${encodeURIComponent(product.id)}`}
                className="block border border-brand-light-gray bg-brand-secondary p-6 hover:border-brand-text transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <ProductTag product={product} />
                    <h2 className="text-lg font-extrabold text-brand-text">{product.name}</h2>
                    <p className="text-sm text-brand-gray">{product.description}</p>
                    <p className="text-xs text-brand-gray">판매자: {product.merchant.businessName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-bold text-brand-text whitespace-nowrap">{priceLabel(product.price)}</p>
                    <ArrowRight size={16} className="text-brand-gray group-hover:text-brand-text transition-colors" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <a href="/" className="flex items-center justify-center gap-2 text-xs text-brand-gray hover:text-brand-text">
          <ArrowLeft size={14} /> 홈으로
        </a>
      </div>
    </div>
  );
}

/** `/payment?product=<id>` — order confirmation before handing off to PayUp. */
function OrderConfirmView({ product }: { product: PaymentProduct }) {
  const { merchant } = product;

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="border border-brand-light-gray bg-brand-secondary p-8 space-y-6">
          <div className="space-y-2">
            <ProductTag product={product} />
            <h1 className="text-2xl font-black text-brand-text">{product.name}</h1>
            <p className="text-sm text-brand-gray">{product.description}</p>
          </div>

          <div className="flex items-center justify-between border-t border-brand-light-gray pt-4">
            <span className="text-xs text-brand-gray">판매자</span>
            <span className="text-sm font-bold text-brand-text">{merchant.businessName}</span>
          </div>

          <p className="text-3xl font-black text-brand-text">{priceLabel(product.price)}</p>

          <a
            href={product.paymentUrl}
            className="block w-full text-center bg-brand-text text-brand-bg font-bold py-3.5 hover:opacity-90 transition-opacity"
          >
            결제하기
          </a>

          <a href="/payment" className="flex items-center justify-center gap-2 text-xs text-brand-gray hover:text-brand-text">
            <ArrowLeft size={14} /> 다른 상품 보기
          </a>
        </div>

        <div className="border border-brand-light-gray p-5 text-xs text-brand-gray space-y-1">
          <p className="font-bold text-brand-text mb-2">판매자 정보</p>
          <p>상호: {merchant.businessName}</p>
          <p>대표자: {merchant.representativeName}</p>
          <p>사업자등록번호: {merchant.businessRegistrationNumber}</p>
          <p>통신판매업 신고번호: {merchant.mailOrderSalesNumber}</p>
          <p>주소: {merchant.address}</p>
          <p>이메일: {merchant.email}</p>
        </div>
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <ShieldAlert className="mx-auto text-brand-accent" size={40} />
        <h1 className="text-xl font-extrabold text-brand-text">결제 링크를 찾을 수 없습니다</h1>
        <p className="text-sm text-brand-gray">
          상품 정보가 없거나 아직 결제 링크가 등록되지 않았어요. 링크를 다시 확인해 주세요.
        </p>
        <a href="/payment" className="inline-flex items-center gap-2 text-sm font-bold text-brand-text hover:opacity-70">
          <ArrowLeft size={16} /> 상품 목록으로
        </a>
      </div>
    </div>
  );
}

export function PaymentPage() {
  const productId = useQueryParam('product');

  if (!productId) return <ProductListView />;

  const product = getPaymentProduct(productId);
  if (!product) return <NotFoundView />;

  return <OrderConfirmView product={product} />;
}
