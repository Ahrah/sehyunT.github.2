import {StrictMode} from 'react';
import {createRoot, hydrateRoot} from 'react-dom/client';
import { CareerCounselingPage } from './pages/CareerCounselingPage';

const rootEl = document.getElementById('root')!;
const tree = (
  <StrictMode>
    <CareerCounselingPage />
  </StrictMode>
);

if (rootEl.firstElementChild) {
  hydrateRoot(rootEl, tree);
} else {
  createRoot(rootEl).render(tree);
}
