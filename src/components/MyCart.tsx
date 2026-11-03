import { useEffect, useState } from 'react';
import { CART_EVENT, cartSummary, checkoutPath, readCart, removeFromCart } from '../lib/cart';
import { EBOOK_CONFIG, bookById, formatWon } from '../lib/ebooks';

/** 마이페이지 장바구니(입시는세연쌤books) */
export function MyCart({ uid }: { uid: string }) {
  const [ids, setIds] = useState<string[]>(() => readCart(uid));
  useEffect(() => {
    const sync = () => setIds(readCart(uid));
    sync();
    window.addEventListener(CART_EVENT, sync);
    return () => window.removeEventListener(CART_EVENT, sync);
  }, [uid]);
  const sum = cartSummary(ids);

  return (
    <div id="my-cart" className="space-y-4">
      <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-brand-accent">장바구니 · 입시는세연쌤books</h3>
      {ids.length === 0 ? (
        <div className="border border-brand-light-gray bg-brand-secondary p-5 text-sm">
          <p className="font-bold">담은 책이 없습니다.</p>
          <a href="/ebooks/" className="mt-3 inline-block font-black text-brand-accent underline">입시는세연쌤 books 둘러보기</a>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-brand-light-gray border border-brand-light-gray bg-white">
            {ids.map((id) => {
              const b = bookById(id)!;
              return (
                <li key={id} className="flex items-start justify-between gap-3 p-3 text-sm">
                  <span className="font-bold leading-6">{b.title}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-black">{b.price != null ? formatWon(b.price) : '-'}</span>
                    <button type="button" onClick={() => removeFromCart(uid, id)} className="text-xs text-brand-gray underline">빼기</button>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="space-y-1 border border-brand-ink bg-brand-secondary p-4 text-sm">
            <p className="flex justify-between"><span>합계 ({sum.count}권)</span><span>{sum.itemsSum != null ? formatWon(sum.itemsSum) : '-'}</span></p>
            <p className="flex justify-between pt-2 text-lg font-black"><span>결제 금액</span><span>{sum.total != null ? formatWon(sum.total) : '-'}</span></p>
          </div>
          <a href={checkoutPath()} className="flex h-14 w-full items-center justify-center bg-brand-text text-sm font-black text-brand-bg hover:bg-brand-accent">
            {sum.total != null ? `${formatWon(sum.total)} 주문하기` : '주문하기'}
          </a>
          <p className="text-xs text-brand-gray">주문서를 내면 입금 안내가 나옵니다. 계좌이체로 {EBOOK_CONFIG.payWindowMs / 3600000}시간 안에 입금하시면 됩니다.</p>
        </>
      )}
    </div>
  );
}
