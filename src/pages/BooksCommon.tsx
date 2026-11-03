import { useEffect, useState } from 'react';
import { CART_EVENT, type CartUser, MYPAGE_CART_PATH, addToCart, loadCartUser, loginPath, readCart, removeFromCart } from '../lib/cart';
import { isTestMode } from '../lib/ebooksApi';

/** 로그인한 회원과 그 장바구니 */
export function useCart() {
  const [user, setUser] = useState<CartUser | null>(null);
  const [ready, setReady] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void loadCartUser({ allowPreviewMember: isTestMode() }).then((u) => {
      if (!alive) return;
      setUser(u);
      setIds(readCart(u?.uid));
      setReady(true);
    });
    const sync = () => setUser((u) => (setIds(readCart(u?.uid)), u));
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      alive = false;
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  return { user, ready, ids };
}

export function BooksHeader({ count, loggedIn }: { count: number; loggedIn: boolean }) {
  return (
    <header className="eb-top">
      <div className="eb-wrap eb-top-row">
        <a href="/" className="eb-brand">입시는세연쌤</a>
        <nav className="eb-top-nav">
          <a href="/ebooks/" className="eb-top-books">입시는세연쌤 books</a>
          <a href={loggedIn ? MYPAGE_CART_PATH : loginPath('/ebooks/')} className="eb-top-cart" aria-label={`장바구니 ${count}권`}>
            장바구니<span className="eb-cart-count">{count}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}

/** '담기' 버튼. 로그인하지 않았으면 로그인 안내를 띄웁니다. */
export function AddToCart({ id, user, ready, inCart, disabled, here }: { id: string; user: CartUser | null; ready: boolean; inCart: boolean; disabled?: boolean; here: string }) {
  const [ask, setAsk] = useState(false);
  if (disabled) return <span className="eb-add is-off">판매 준비 중</span>;
  if (inCart && user) {
    return (
      <span className="eb-add-row">
        <a className="eb-add is-in" href={MYPAGE_CART_PATH}>담았습니다 · 장바구니 보기</a>
        <button type="button" className="eb-add-undo" onClick={() => removeFromCart(user.uid, id)}>빼기</button>
      </span>
    );
  }
  return (
    <span className="eb-add-wrap">
      <button
        type="button"
        className="eb-add"
        disabled={!ready}
        onClick={() => (user ? addToCart(user.uid, id) : setAsk(true))}
      >
        담기
      </button>
      {ask && (
        <span className="eb-login-ask" role="alert">
          장바구니는 로그인한 회원만 쓸 수 있습니다. <a href={loginPath(here)}>로그인하기</a>
        </span>
      )}
    </span>
  );
}
