/**
 * Central registry of the businesses (사업자) that can sell a product
 * through /payment. Kept separate from config.ts's product list so one
 * business's registration info isn't duplicated across every product it
 * sells.
 */

export interface Merchant {
  id: string;
  /** 상호명 */
  businessName: string;
  /** 대표자 */
  representativeName: string;
  /** 사업자등록번호 */
  businessRegistrationNumber: string;
  /** 통신판매업 신고번호 */
  mailOrderSalesNumber: string;
  address: string;
  email: string;
}

// TODO: 실제 사업자 정보로 교체. 전자상거래법상 통신판매 페이지에 고지해야 하는 항목들이라
// placeholder 상태로는 결제 페이지를 공개하면 안 됩니다.
export const MERCHANTS: Record<string, Merchant> = {
  sehyunt: {
    id: 'sehyunt',
    businessName: '입시는세연쌤',
    representativeName: '(대표자명 미정)',
    businessRegistrationNumber: '(사업자등록번호 미정)',
    mailOrderSalesNumber: '(통신판매업 신고번호 미정)',
    address: '(사업장 주소 미정)',
    email: 'consultantsyssam@gmail.com',
  },
  hobbyshop: {
    id: 'hobbyshop',
    businessName: '취미상점',
    representativeName: '(대표자명 미정)',
    businessRegistrationNumber: '(사업자등록번호 미정)',
    mailOrderSalesNumber: '(통신판매업 신고번호 미정)',
    address: '(사업장 주소 미정)',
    email: '(이메일 미정)',
  },
};

export function getMerchant(id: string): Merchant | null {
  return MERCHANTS[id] ?? null;
}
