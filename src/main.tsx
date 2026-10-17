import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { CareerCounselingPage } from './pages/CareerCounselingPage';
import { isCareerCounselingPath } from './lib/careerCounseling';
import './index.css';
import { initHomeEnhancements } from './homeEnhancements';
import { initHomeHeadlineFixes } from './homeHeadlineFixes';
import { initHomeRequestedHotfix } from './homeRequestedHotfix';

const isCounseling = isCareerCounselingPath();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCounseling ? <CareerCounselingPage /> : <App />}
  </StrictMode>,
);

if (!isCounseling) {
  initHomeEnhancements();
  initHomeHeadlineFixes();
  initHomeRequestedHotfix();
}
