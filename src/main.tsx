import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {PaymentRouter} from './payment/PaymentRouter';
import './index.css';

const isPaymentRoute = window.location.pathname.startsWith('/payment');
const RootComponent = isPaymentRoute ? PaymentRouter : App;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
