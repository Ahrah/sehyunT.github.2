import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  persistHomeMiPopupClosedForSession,
  persistHomeMiPopupHiddenToday,
  shouldShowHomeMiPopupNow,
} from '../lib/homeMiPopup';

const OPEN_DELAY_MS = 400;

type HomeMiPopupProps = {
  onOpenChange?: (open: boolean) => void;
};

export function HomeMiPopup({ onOpenChange }: HomeMiPopupProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLAnchorElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const setVisible = (next: boolean) => {
    setOpen(next);
    onOpenChangeRef.current?.(next);
  };

  useEffect(() => {
    if (!shouldShowHomeMiPopupNow()) return;
    const id = window.setTimeout(() => {
      if (!shouldShowHomeMiPopupNow()) return;
      setVisible(true);
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const focusId = window.requestAnimationFrame(() => {
      primaryRef.current?.focus({ preventScroll: true });
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        persistHomeMiPopupClosedForSession();
        setVisible(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(focusId);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  const dismissSession = () => {
    persistHomeMiPopupClosedForSession();
    setVisible(false);
  };

  const hideForToday = () => {
    persistHomeMiPopupHiddenToday();
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/50 p-4 sm:p-6"
      onClick={dismissSession}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[380px] rounded-[1.6rem] border border-brand-ink/10 bg-white px-6 pb-5 pt-6 shadow-[0_28px_80px_rgba(17,17,17,0.2)]"
      >
        <button
          type="button"
          onClick={dismissSession}
          aria-label="닫기"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-brand-ink/50 hover:bg-brand-mist hover:text-brand-ink"
        >
          <X size={18} />
        </button>

        <p className="text-[11px] font-black tracking-[0.16em] text-brand-accent">신청 안내</p>
        <h2 id={titleId} className="mt-2 pr-8 text-[1.65rem] font-black leading-tight tracking-[-0.045em] text-brand-ink">
          12월 3:1 모의면접
        </h2>
        <p className="mt-3 text-sm font-medium leading-6 text-brand-ink/72">
          특목·자사고 면접을 앞둔 학생을 위한 3:1 모의면접입니다.
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-brand-ink">
          12/12(토) · 12/13(일) · 12/19(토) · 12/20(일)
        </p>
        <p className="mt-4 text-sm font-black text-brand-accent">11/9(월) 밤 9시 신청 오픈</p>
        <p className="mt-2 text-[12px] font-medium leading-5 text-brand-gray">
          회원가입 후 로그인하면 신청서에 이름과 휴대폰 번호가 자동으로 들어갑니다.
        </p>

        <a
          ref={primaryRef}
          href="/mock-interview/"
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-ink px-5 text-sm font-bold text-white transition-colors hover:bg-brand-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          모의면접 신청하러 가기
        </a>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={hideForToday}
            className="text-left text-[12px] font-semibold text-brand-ink/45 hover:text-brand-ink"
          >
            오늘 하루 보지 않기
          </button>
          <button
            type="button"
            onClick={dismissSession}
            className="text-[12px] font-bold text-brand-ink/70 hover:text-brand-ink"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
