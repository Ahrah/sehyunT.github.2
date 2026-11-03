/**
 * 빌드 뒤 dist/ebooks/<id>/index.html 을 만듭니다(GitHub Pages 는 정적 파일만 내보내므로 책마다 파일이 있어야 합니다).
 * dist/ebooks/index.html 을 복사하고 제목·설명·주소만 책에 맞게 바꿉니다. 화면은 src/ebooks-main.tsx 가 주소를 보고 고릅니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { EBOOKS, type Ebook } from '../src/lib/ebooks';
import { detailById, detailPath } from '../src/lib/ebooksDetail';

const DOMAIN = 'https://sehyunt.re.kr';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function detailHtml(base: string, book: Ebook): string {
  const title = `${book.title} 샘플·목차 | 입시는세연쌤`;
  const desc = `${book.title} PDF${book.pages != null ? ` ${book.pages}쪽` : ''}. 목차와 샘플 쪽을 보고 주문할 수 있습니다.`;
  const url = `${DOMAIN}${detailPath(book.id)}`;
  return base
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(desc)}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${url}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(desc)}"`);
}

export function writeDetailPages(outDir: string): string[] {
  const src = path.join(outDir, 'ebooks', 'index.html');
  if (!fs.existsSync(src)) return [];
  const base = fs.readFileSync(src, 'utf-8');
  const written: string[] = [];
  for (const b of EBOOKS) {
    if (!detailById(b.id)) continue;
    const dir = path.join(outDir, 'ebooks', b.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), detailHtml(base, b));
    written.push(path.join('ebooks', b.id, 'index.html'));
  }
  return written;
}

export function ebooksDetailPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'ebooks-detail-pages',
    apply: 'build',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const w = writeDetailPages(outDir);
      if (w.length) console.log(`📚 ebooks detail pages: ${w.length}`);
    },
  };
}
