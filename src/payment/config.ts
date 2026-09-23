/**
 * Central config for PayUp "URL 링크 결제" products, shared across businesses.
 *
 * PayUp's link-payment product bakes the actual charge amount into the link
 * itself (set up in the PayUp merchant admin) — our app never sends a price
 * to PayUp, so there is no amount parameter here for anyone to tamper with.
 * `price` below is display-only, for the product card the user sees before
 * they click through.
 */

import { getMerchant, type Merchant } from './merchants';

export type PaymentType = 'single' | 'recurring';

export interface PaymentProduct {
  id: string;
  name: string;
  description: string;
  /** Free-text category shown as a small tag on the product card, e.g. "상담" / "구독". */
  productType: string;
  paymentType: PaymentType;
  /** Display-only KRW amount; the real charge is fixed on PayUp's side. 0 = not set yet. */
  price: number;
  merchant: Merchant;
  /** PayUp checkout link for this product, from a GitHub repo Variable. */
  paymentUrl: string;
}

// payup.co.kr is always allowed; VITE_PAYUP_ALLOWED_HOSTS can add more
// (comma-separated) for cases where the actual checkout link ends up on a
// different PayUp-managed domain. This is the guard against someone
// crafting a malicious ?product= or env value that points the "결제하기"
// button somewhere else — so treat additions to this list carefully.
const DEFAULT_ALLOWED_HOSTS = ['payup.co.kr'];

function getAllowedHosts(): string[] {
  const extra = (import.meta.env.VITE_PAYUP_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h: string) => h.trim())
    .filter(Boolean);
  return [...DEFAULT_ALLOWED_HOSTS, ...extra];
}

function isAllowedPaymentUrl(url: string): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return getAllowedHosts().some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );
}

function envPrice(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

interface RawProductInput {
  merchantId: string;
  description: string;
  productType: string;
  paymentType: PaymentType;
  /** Env var name holding the checkout URL. */
  urlEnvKey: string;
  /** Env var name holding the display name; falls back to `fallbackName` if unset. */
  nameEnvKey: string;
  fallbackName: string;
  /** Env var name holding the display price (KRW, digits only); 0/unset shows "가격 문의". */
  priceEnvKey: string;
}

const RAW_PRODUCTS: Record<string, RawProductInput> = {
  'admission-consulting': {
    merchantId: 'sehyunt',
    description: '입시 컨설팅 1:1 상담 신청',
    productType: '상담',
    paymentType: 'single',
    urlEnvKey: 'VITE_PAYUP_ADMISSION_CONSULTING_URL',
    nameEnvKey: 'VITE_PAYUP_ADMISSION_CONSULTING_NAME',
    fallbackName: '입시 컨설팅 (상품명 미정)',
    priceEnvKey: 'VITE_PAYUP_ADMISSION_CONSULTING_PRICE',
  },
  'hobby-subscription': {
    merchantId: 'hobbyshop',
    description: '견적함 프리미엄 월 구독',
    productType: '구독',
    paymentType: 'recurring',
    urlEnvKey: 'VITE_PAYUP_HOBBY_SUBSCRIPTION_URL',
    nameEnvKey: 'VITE_PAYUP_HOBBY_SUBSCRIPTION_NAME',
    fallbackName: '견적함 프리미엄 구독 (상품명 미정)',
    priceEnvKey: 'VITE_PAYUP_HOBBY_SUBSCRIPTION_PRICE',
  },
};

function buildProduct(id: string, raw: RawProductInput): PaymentProduct | null {
  const merchant = getMerchant(raw.merchantId);
  if (!merchant) return null;
  const env = import.meta.env as Record<string, string | undefined>;
  return {
    id,
    name: env[raw.nameEnvKey] || raw.fallbackName,
    description: raw.description,
    productType: raw.productType,
    paymentType: raw.paymentType,
    price: envPrice(env[raw.priceEnvKey]),
    merchant,
    paymentUrl: env[raw.urlEnvKey] ?? '',
  };
}

/**
 * Returns the product config for a given id, or null if it doesn't exist,
 * has no payment URL configured yet, or the configured URL isn't an
 * allowed PayUp link.
 */
export function getPaymentProduct(id: string | null): PaymentProduct | null {
  if (!id) return null;
  const raw = RAW_PRODUCTS[id];
  if (!raw) return null;
  const product = buildProduct(id, raw);
  if (!product || !isAllowedPaymentUrl(product.paymentUrl)) return null;
  return product;
}

/** Products ready to sell — i.e. with a valid checkout URL configured. */
export function listPaymentProducts(): PaymentProduct[] {
  return Object.entries(RAW_PRODUCTS)
    .map(([id, raw]) => buildProduct(id, raw))
    .filter((p): p is PaymentProduct => !!p && isAllowedPaymentUrl(p.paymentUrl));
}
