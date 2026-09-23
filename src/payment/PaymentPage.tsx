import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { getPaymentProduct } from './config';

function useQueryParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

export function PaymentPage() {
  const productId = useQueryParam('product');
  const product = getPaymentProduct(productId);

  if (!product) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <ShieldAlert className="mx-auto text-brand-accent" size={40} />
          <h1 className="text-xl font-extrabold text-brand-text">결제 링크를 찾을 수 없습니다</h1>
          <p className="text-sm text-brand-gray">
            상품 정보가 없거나 아직 결제 링크가 등록되지 않았어요. 링크를 다시 확인해 주세요.
          </p>
          <a href="/" className="inline-flex items-center gap-2 text-sm font-bold text-brand-text hover:opacity-70">
            <ArrowLeft size={16} /> 홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full border border-brand-light-gray bg-brand-secondary p-8 space-y-6">
        <div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-brand-gray mb-1">
            {product.businessName}
          </p>
          <h1 className="text-2xl font-black text-brand-text">{product.name}</h1>
        </div>

        {product.price > 0 && (
          <p className="text-3xl font-black text-brand-text">
            {product.price.toLocaleString()}원
          </p>
        )}

        <a
          href={product.paymentUrl}
          className="block w-full text-center bg-brand-text text-brand-bg font-bold py-3.5 hover:opacity-90 transition-opacity"
        >
          결제하기
        </a>

        <a href="/" className="flex items-center justify-center gap-2 text-xs text-brand-gray hover:text-brand-text">
          <ArrowLeft size={14} /> 취소하고 홈으로
        </a>
      </div>
    </div>
  );
}
