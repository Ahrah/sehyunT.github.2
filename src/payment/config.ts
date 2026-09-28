export type MerchantId = 'admission' | 'hobby';
export type PaymentType = 'single' | 'recurring';

export interface Merchant {
  id: MerchantId;
  name: string;
  representative: string | null;
  businessNumber: string | null;
  ecommerceNumber: string | null;
  address: string | null;
  email: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  productType: string;
  merchant: MerchantId;
  paymentType: PaymentType;
  price: number | null;
  paymentUrl: string;
}

const optional = (value: string | undefined) => value?.trim() || null;

const price = (value: string | undefined) => {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const merchants: Record<MerchantId, Merchant> = {
  admission: {
    id: 'admission',
    name: '입시는세연쌤',
    representative: '조세연',
    businessNumber: '612-69-00756',
    ecommerceNumber: optional(import.meta.env.VITE_ADMISSION_ECOMMERCE_NUMBER),
    address: optional(import.meta.env.VITE_ADMISSION_BUSINESS_ADDRESS),
    email: 'consultantsyssam@gmail.com',
  },
  hobby: {
    id: 'hobby',
    name: '취미상점',
    representative: optional(import.meta.env.VITE_HOBBY_REPRESENTATIVE),
    businessNumber: optional(import.meta.env.VITE_HOBBY_BUSINESS_NUMBER),
    ecommerceNumber: optional(import.meta.env.VITE_HOBBY_ECOMMERCE_NUMBER),
    address: optional(import.meta.env.VITE_HOBBY_BUSINESS_ADDRESS),
    email: optional(import.meta.env.VITE_HOBBY_EMAIL),
  },
};

export const products: Product[] = [
  {
    id: 'admission-consulting',
    name: '입시 컨설팅 결제',
    description: '상담 후 안내받은 입시 컨설팅 및 교육 프로그램 비용을 결제합니다.',
    productType: '입시 컨설팅·교육 서비스',
    merchant: 'admission',
    paymentType: 'single',
    price: price(import.meta.env.VITE_PAYUP_ADMISSION_CONSULTING_PRICE),
    paymentUrl: import.meta.env.VITE_PAYUP_ADMISSION_CONSULTING_URL?.trim() || '',
  },
  {
    id: 'hobby-subscription',
    name: '취미상점 구독 서비스',
    description: '취미상점에서 안내받은 구독 상품 및 서비스 비용을 결제합니다.',
    productType: '구독 서비스',
    merchant: 'hobby',
    paymentType: 'recurring',
    price: price(import.meta.env.VITE_PAYUP_HOBBY_SUBSCRIPTION_PRICE),
    paymentUrl: import.meta.env.VITE_PAYUP_HOBBY_SUBSCRIPTION_URL?.trim() || '',
  },
];

const allowedHosts = (import.meta.env.VITE_PAYUP_ALLOWED_HOSTS || 'payup.co.kr,insio.co.kr')
  .split(',')
  .map((host: string) => host.trim().toLowerCase())
  .filter(Boolean);

export const validatedPaymentUrl = (product: Product) => {
  if (!product.paymentUrl) return null;

  try {
    const url = new URL(product.paymentUrl);
    const host = url.hostname.toLowerCase();
    const allowed = allowedHosts.some((allowedHost: string) =>
      host === allowedHost || host.endsWith(`.${allowedHost}`),
    );
    return url.protocol === 'https:' && allowed ? url.toString() : null;
  } catch {
    return null;
  }
};

