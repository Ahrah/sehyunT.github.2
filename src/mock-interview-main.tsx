import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MockInterviewPage } from './pages/MockInterviewPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MockInterviewPage />
  </StrictMode>,
);
