import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { EbooksPage } from './pages/EbooksPage';
import { EbookDetailPage } from './pages/EbookDetailPage';
import { detailIdFromPath } from './lib/ebooksDetail';

// /ebooks/<id>/ 이면 책 상세(샘플·목차) 화면, 아니면 판매 페이지
const detailId = detailIdFromPath(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {detailId ? <EbookDetailPage id={detailId} /> : <EbooksPage />}
  </StrictMode>,
);
