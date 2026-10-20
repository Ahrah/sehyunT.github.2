import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { CareerCounselingPage } from './pages/CareerCounselingPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CareerCounselingPage />
  </StrictMode>,
);
