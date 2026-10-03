import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initHomeEnhancements } from './homeEnhancements';
import { initHomeHeadlineFixes } from './homeHeadlineFixes';
import { initHomeRequestedHotfix } from './homeRequestedHotfix';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initHomeEnhancements();
initHomeHeadlineFixes();
initHomeRequestedHotfix();
