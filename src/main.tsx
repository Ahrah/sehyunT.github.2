import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { isCareerCounselingPath } from './lib/careerCounselingPath';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

if (isCareerCounselingPath()) {
  void import('./pages/CareerCounselingPage').then(({ CareerCounselingPage }) => {
    root.render(
      <StrictMode>
        <CareerCounselingPage />
      </StrictMode>,
    );
  });
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
