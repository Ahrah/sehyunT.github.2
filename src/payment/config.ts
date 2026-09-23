/**
 * Central config for PayUp "URL 링크 결제" products, shared across businesses.
 *
 * PayUp's link-payment product bakes the actual charge amount into the link
 * itself (set up in the PayUp merchant admin) — our app never sends a price
 * to PayUp, so there is no amount parameter here for anyone to tamper with.
 * `price` below is display-only, for the product card the user sees before
 * they click through.
 */

export interface PaymentProduct {
  id: string;
  name: string;
  /** Display-only KRW amount; the real charge is fixed on PayUp's side. */
  price: number;
  businessName: string;
  /** PayUp checkout link for this product, from a GitHub repo Variable. */
  paymentUrl: string;
}

// Only PayUp's own domain may be used as a payment destination — this is
// the guard against someone crafting a malicious ?product= or env value
// that points the "결제하기" button somewhere else.
const ALLOWED_PAYMENT_HOSTS = ['payup.co.kr'];

function isAllowedPaymentUrl(url: string): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return ALLOWED_PAYMENT_HOSTS.some(
    (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
  );
}

const RAW_PRODUCTS: Record<string, Omit<PaymentProduct, 'id'>> = {
  'admission-consulting': {
    name: '입시 컨설팅',
    // TODO: 실제 상담 상품 금액으로 교체 (표시 전용, 결제 금액은 PayUp 링크가 결정)
    price: 0,
    businessName: '입시는세연쌤',
    paymentUrl: import.meta.env.VITE_PAYUP_ADMISSION_CONSULTING_URL ?? '',
  },
  'hobby-subscription': {
    name: '견적함 프리미엄 구독',
    price: 9900,
    businessName: '취미상점',
    paymentUrl: import.meta.env.VITE_PAYUP_HOBBY_SUBSCRIPTION_URL ?? '',
  },
};

/**
 * Returns the product config for a given id, or null if it doesn't exist,
 * has no payment URL configured yet, or the configured URL isn't a genuine
 * PayUp link.
 */
export function getPaymentProduct(id: string | null): PaymentProduct | null {
  if (!id) return null;
  const raw = RAW_PRODUCTS[id];
  if (!raw) return null;
  if (!isAllowedPaymentUrl(raw.paymentUrl)) return null;
  return { id, ...raw };
}

export function listPaymentProducts(): PaymentProduct[] {
  return Object.entries(RAW_PRODUCTS)
    .map(([id, raw]) => ({ id, ...raw }))
    .filter((p) => isAllowedPaymentUrl(p.paymentUrl));
}
