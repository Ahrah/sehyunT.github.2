import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { isCareerCounselingPath } from './lib/careerCounseling';
import './index.css';

const isCounseling = isCareerCounselingPath();
const root = createRoot(document.getElementById('root')!);

async function boot() {
  if (isCounseling) {
    const { CareerCounselingPage } = await import('./pages/CareerCounselingPage');
    root.render(
      <StrictMode>
        <CareerCounselingPage />
      </StrictMode>,
    );
    return;
  }

  const [{ default: App }, enhancements, headlines, hotfix] = await Promise.all([
    import('./App.tsx'),
    import('./homeEnhancements'),
    import('./homeHeadlineFixes'),
    import('./homeRequestedHotfix'),
  ]);

  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  enhancements.initHomeEnhancements();
  headlines.initHomeHeadlineFixes();
  hotfix.initHomeRequestedHotfix();
}

void boot();
