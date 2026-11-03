import { useCallback, useEffect, useState } from 'react';
import { SITE, loadPretendard } from '../config/site';
import { EBOOKS, EBOOK_CONFIG, formatWon, priceOf } from '../lib/ebooks';
import { detailById, detailPath, type SamplePage } from '../lib/ebooksDetail';
import { isLiveSiteWithoutBackend } from '../lib/ebooksApi';
import { AddToCart, BooksHeader, useCart } from './BooksCommon';
import './ebooks.css';

/** 전자책 1권의 샘플·목차 화면(/ebooks/<id>/) */
export function EbookDetailPage({ id }: { id: string }) {
  const book = EBOOKS.find((b) => b.id === id)!;
  const detail = detailById(id)!;
  const price = priceOf(book);
  const open = !isLiveSiteWithoutBackend() && price != null;
  const [zoom, setZoom] = useState<number | null>(null);
  const cart = useCart();
  const here = detailPath(id);

  useEffect(() => {
    loadPretendard();
  }, []);

  return (
    <div className="eb-page">
      <BooksHeader count={cart.ids.length} loggedIn={!!cart.user} />

      <main className="eb-wrap">
        <p className="eb-crumb">
          <a href="/ebooks/">← 입시는세연쌤 books 목록으로</a>
        </p>
        <section className="eb-hero eb-detail-hero">
          <p className="eb-eyebrow">전자책(PDF) · 입시는세연쌤books</p>
          <h1>{book.title}</h1>
          <p className="eb-lead">{book.summary}</p>
          <ul className="eb-facts">
            <li><b>가격</b> {price == null ? '가격 준비 중' : formatWon(price)}</li>
            {book.pages != null && <li><b>분량</b> PDF {book.pages}쪽</li>}
            <li><b>받는 방법</b> 입금 확인 후 {EBOOK_CONFIG.sendWithinMinutes}분 안에 이메일</li>
            <li><b>자료 기준일</b> 2026.10.29</li>
          </ul>
          <div className="eb-detail-add"><AddToCart id={id} user={cart.user} ready={cart.ready} inCart={cart.ids.includes(id)} disabled={!open} here={here} /></div>
        </section>

        <section className="eb-section" aria-labelledby="eb-sample-title">
          <h2 id="eb-sample-title">샘플 쪽</h2>
          {detail.samples.length === 0 ? (
            <p className="eb-sample-empty">샘플 준비 중입니다.</p>
          ) : (
            <>
              <p className="eb-note">실제 PDF에서 고른 4쪽입니다. 누르면 크게 볼 수 있습니다. 샘플에는 워터마크가 들어 있고, 마지막 쪽은 내용을 흐리게 처리했습니다.</p>
              <ul className="eb-samples">
                {detail.samples.map((s, i) => (
                  <li key={s.src}>
                    <button type="button" className="eb-sample" onClick={() => setZoom(i)} aria-label={`${s.page}쪽 ${s.caption} 크게 보기`}>
                      <img src={s.src} alt={`${book.title} ${s.page}쪽 ${s.caption}`} loading="lazy" width={1100} height={1556} />
                    </button>
                    <span className="eb-sample-cap">{s.page}쪽 · {s.caption}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="eb-section" aria-labelledby="eb-for-title">
          <h2 id="eb-for-title">이런 분께 맞습니다</h2>
          <ul className="eb-list">
            {detail.audience.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>

        <section className="eb-section" aria-labelledby="eb-toc-title">
          <h2 id="eb-toc-title">목차</h2>
          <ol className="eb-toc">
            {detail.toc.map((t) => (
              <li key={`${t.label}-${t.page}`}>
                <span className="eb-toc-label">{t.label}</span>
                <span className="eb-toc-title">{t.title}</span>
                <span className="eb-toc-page">{t.page}쪽</span>
              </li>
            ))}
          </ol>
          <p className="eb-note">1쪽은 표지입니다.{book.pages != null && ` 전체 ${book.pages}쪽입니다.`}</p>
        </section>

        <section className="eb-section" aria-labelledby="eb-basis-title">
          <h2 id="eb-basis-title">이 책의 기준</h2>
          <ul className="eb-list">
            {detail.basis.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>


        <section className="eb-section eb-buy-end">
          <div className="eb-detail-add"><AddToCart id={id} user={cart.user} ready={cart.ready} inCart={cart.ids.includes(id)} disabled={!open} here={here} /></div>
          <p className="eb-note">'담기'를 누르면 마이페이지 장바구니에 담깁니다. 장바구니에서 주문하면 계좌이체로 결제합니다.</p>
          <p><a href="/ebooks/">← 입시는세연쌤 books 목록으로</a></p>
        </section>

        <nav className="eb-section" aria-labelledby="eb-other-title">
          <h2 id="eb-other-title">다른 책 샘플 보기</h2>
          <ul className="eb-other">
            {EBOOKS.filter((b) => b.id !== id).map((b) => (
              <li key={b.id}><a href={detailPath(b.id)}>{b.title}</a></li>
            ))}
          </ul>
        </nav>
      </main>

      <footer className="eb-footer">
        <div className="eb-wrap">
          <p>입시는세연쌤 / 대표: {SITE.founder}</p>
          <p>사업자등록번호 {SITE.businessNumber} · 통신판매업 신고번호 {SITE.mailOrderSalesNumber}</p>
          <p>{SITE.address} · {SITE.phone}</p>
          <p>문의: 카카오톡 채널 '입시는세연쌤' · {EBOOK_CONFIG.contactEmail}</p>
        </div>
      </footer>

      {zoom != null && detail.samples[zoom] && (
        <Lightbox samples={detail.samples} index={zoom} title={book.title} onChange={setZoom} onClose={() => setZoom(null)} />
      )}
    </div>
  );
}


function Lightbox({
  samples,
  index,
  title,
  onChange,
  onClose,
}: {
  samples: readonly SamplePage[];
  index: number;
  title: string;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const s = samples[index];
  const go = useCallback((d: number) => onChange((index + d + samples.length) % samples.length), [index, onChange, samples.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);
  return (
    <div className="eb-lightbox" role="dialog" aria-modal="true" aria-label={`${title} 샘플 ${s.page}쪽`} onClick={onClose}>
      <div className="eb-lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span>{s.page}쪽 · {s.caption} ({index + 1}/{samples.length})</span>
        <button type="button" onClick={onClose} aria-label="닫기">닫기 ✕</button>
      </div>
      <img src={s.src} alt={`${title} ${s.page}쪽 ${s.caption}`} onClick={(e) => e.stopPropagation()} />
      {samples.length > 1 && (
        <div className="eb-lightbox-nav" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => go(-1)}>← 이전 쪽</button>
          <button type="button" onClick={() => go(1)}>다음 쪽 →</button>
        </div>
      )}
    </div>
  );
}
