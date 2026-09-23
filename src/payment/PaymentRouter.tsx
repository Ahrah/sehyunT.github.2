import { PaymentPage } from './PaymentPage';
import { PaymentResultPage } from './PaymentResultPage';

/** Renders the /payment* views by pathname. Mounted instead of <App/> in main.tsx. */
export function PaymentRouter() {
  const path = window.location.pathname.replace(/\/$/, '');

  if (path === '/payment/success') return <PaymentResultPage status="success" />;
  if (path === '/payment/cancel') return <PaymentResultPage status="cancel" />;
  if (path === '/payment/fail') return <PaymentResultPage status="fail" />;
  return <PaymentPage />;
}
