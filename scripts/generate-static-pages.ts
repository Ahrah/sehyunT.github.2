/**
 * Static Site Generation Script for SEO
 * 
 * Fetches public resources from Firestore and generates:
 * - Individual HTML pages for each public (non-locked) resource
 * - sitemap.xml with all URLs
 * - Enhanced index.html with meta tags and initial content
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { KEYWORD_PAGES, isGatedResource, keywordPageHtml, resourcePageHtml, linksPageHtml } from './seo-pages';
import {
  CAREER_COUNSELING_CANONICAL,
  CAREER_COUNSELING_SLUG,
  applyCareerCounselingSpaShell,
  assertNoSensitiveCopy,
  buildCareerCounselingPrerenderHtml,
} from './career-counseling-prerender';
import { fetchResourcesPublic, type ResourceItem } from './fetch-public-resources';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin initialization
const firebaseAppletConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../firebase-applet-config.json'), 'utf-8')
);

// Initialize Firebase Admin with Application Default Credentials or service account
if (getApps().length === 0) {
  // Try to use service account if FIREBASE_SERVICE_ACCOUNT_KEY is provided
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseAppletConfig.projectId,
    });
  } else {
    // Fallback: use Web SDK approach with public read access
    console.log('⚠️  No FIREBASE_SERVICE_ACCOUNT_KEY found. Using public Firestore access.');
    console.log('   This requires Firestore rules to allow public read on the resources collection.');
  }
}

const DOMAIN = 'https://sehyunt.re.kr';
const DIST_DIR = path.join(__dirname, '../dist');
const RESOURCES_DIR = path.join(DIST_DIR, 'resources');

// Ensure directories exist
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function inlineLocalStylesheets(html: string, distDir: string): string {
  return html.replace(
    /<link rel="stylesheet"[^>]*href="(\/assets\/[^"]+\.css)"[^>]*>/g,
    (full, href: string) => {
      const file = path.join(distDir, href.replace(/^\//, ''));
      if (!fs.existsSync(file)) return full;
      return `<style data-href="${href}">${fs.readFileSync(file, 'utf-8')}</style>`;
    },
  );
}

// Generate HTML for a resource page (full article body for public articles, no redirect)
function generateResourceHTML(resource: ResourceItem): string {
  return resourcePageHtml(resource);
}

// Generate sitemap.xml
function generateSitemap(resources: ResourceItem[]): string {
  const urls: string[] = [
    `  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
    ...KEYWORD_PAGES.map(p => `  <url>
    <loc>${DOMAIN}/${p.slug}/</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`),
    `  <url>
    <loc>${CAREER_COUNSELING_CANONICAL}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`,
  ];

  // Add public (unlocked, not members-only) resources
  resources
    .filter(r => !isGatedResource(r))
    .forEach(resource => {
      const lastmod = resource.createdAt?.toDate
        ? resource.createdAt.toDate().toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

      urls.push(`  <url>
    <loc>${DOMAIN}/resources/${resource.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

// Generate robots.txt
function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${DOMAIN}/sitemap.xml
`;
}

// Main execution
async function main() {
  console.log('🚀 Starting static site generation...');

  try {
    // Fetch resources from Firestore
    console.log('📦 Fetching resources from Firestore...');
    let resources: ResourceItem[] = [];
    
    try {
      resources = await fetchResourcesPublic();
      console.log(`✅ Found ${resources.length} resources`);
    } catch (fetchError) {
      console.warn('⚠️  Failed to fetch resources from Firestore:', fetchError);
      console.log('⚠️  Continuing with empty resource list...');
    }

    // Filter out locked / members-only resources from public full-body pages
    const publicResources = resources.filter(r => !isGatedResource(r));
    const gatedResources = resources.filter(r => isGatedResource(r));
    console.log(`📊 Resource counts: ${publicResources.length} public, ${gatedResources.length} gated (total: ${resources.length})`);

    // Ensure dist and resources directories exist
    ensureDir(DIST_DIR);
    ensureDir(RESOURCES_DIR);

    // Generate individual resource pages
    console.log('📝 Generating resource pages...');
    publicResources.forEach(resource => {
      const html = generateResourceHTML(resource);
      const filename = path.join(RESOURCES_DIR, `${resource.id}.html`);
      fs.writeFileSync(filename, html);
    });
    gatedResources.forEach(resource => {
      const html = resourcePageHtml({
        ...resource,
        content: null,
        description: '',
      });
      const filename = path.join(RESOURCES_DIR, `${resource.id}.html`);
      fs.writeFileSync(filename, html);
    });
    console.log(`✅ Generated ${publicResources.length} public and ${gatedResources.length} gated resource pages`);

    // Generate keyword landing pages (e.g. /saenggibu-consulting/)
    console.log('🔑 Generating keyword landing pages...');
    KEYWORD_PAGES.forEach(page => {
      const dir = path.join(DIST_DIR, page.slug);
      ensureDir(dir);
      fs.writeFileSync(path.join(dir, 'index.html'), keywordPageHtml(page));
    });
    console.log(`✅ Generated ${KEYWORD_PAGES.length} keyword pages`);

    // SPA route + prerender for 진로 컨설팅
    console.log('🧭 Generating /jinro-counseling/ SPA shell with prerender...');
    const counselingPrerenderHtml = buildCareerCounselingPrerenderHtml(Date.now());
    assertNoSensitiveCopy(counselingPrerenderHtml);
    const counselingDir = path.join(DIST_DIR, CAREER_COUNSELING_SLUG);
    const counselingBuilt = path.join(counselingDir, 'index.html');
    if (!fs.existsSync(counselingBuilt)) {
      throw new Error('Vite MPA output dist/jinro-counseling/index.html is required');
    }
    let counselingHtml = applyCareerCounselingSpaShell(
      fs.readFileSync(counselingBuilt, 'utf-8'),
      counselingPrerenderHtml,
    );
    counselingHtml = inlineLocalStylesheets(counselingHtml, DIST_DIR);
    if (/IMG_1441/.test(counselingHtml)) {
      throw new Error('Counseling HTML still preloads the home hero image');
    }
    if (/\/assets\/index-[^"]+\.(js|css)/.test(counselingHtml)) {
      throw new Error('Counseling HTML still references the home bundle');
    }
    if (/rel="modulepreload"[^>]*fb-(?:app|auth|firestore|storage)-/.test(counselingHtml)) {
      throw new Error('Counseling HTML still modulepreloads Firebase chunks');
    }
    if (!/rel="modulepreload"[^>]*\/assets\/site-/.test(counselingHtml)) {
      throw new Error('Counseling HTML must keep the site chunk modulepreload');
    }
    const counselingJsHref = counselingHtml.match(/src="(\/assets\/counseling-[^"]+\.js)"/)?.[1];
    if (!counselingJsHref) {
      throw new Error('Counseling HTML missing counseling JS');
    }
    const counselingJs = fs.readFileSync(path.join(DIST_DIR, counselingJsHref.slice(1)), 'utf-8');
    if (!/assets\/index-[^"]+\.css/.test(counselingJs)) {
      throw new Error('Counseling AuthGate chunk must load the Tailwind stylesheet');
    }
    if (/(?:from|import)"\.\/fb-(?:app|auth|firestore|storage)-/.test(counselingJs)) {
      throw new Error('Counseling entry must not statically import Firebase chunks');
    }
    fs.writeFileSync(counselingBuilt, counselingHtml);
    console.log('✅ Generated /jinro-counseling/');

    // Generate /links page
    console.log('🔗 Generating /links page...');
    const linksDir = path.join(DIST_DIR, 'links');
    ensureDir(linksDir);
    fs.writeFileSync(path.join(linksDir, 'index.html'), linksPageHtml());
    console.log('✅ Generated /links page');

    // Generate sitemap.xml (always, even if no resources)
    console.log('🗺️  Generating sitemap.xml...');
    const sitemap = generateSitemap(publicResources);
    fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap);
    console.log('✅ Generated sitemap.xml');

    // Generate robots.txt (always)
    console.log('🤖 Generating robots.txt...');
    const robotsTxt = generateRobotsTxt();
    fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt);
    console.log('✅ Generated robots.txt');

    const counselingPage = path.join(DIST_DIR, CAREER_COUNSELING_SLUG, 'index.html');
    if (!fs.existsSync(counselingPage)) {
      throw new Error('Failed to write /jinro-counseling/index.html');
    }

    console.log('\n✨ Static site generation complete!');
    console.log(`   - ${publicResources.length} public resource pages`);
    console.log(`   - ${gatedResources.length} gated resource stubs (no body/description)`);
    console.log(`   - ${KEYWORD_PAGES.length} keyword pages`);
    console.log(`   - /jinro-counseling/ prerendered SPA page`);
    console.log(`   - /links page`);
    console.log(`   - sitemap.xml with ${publicResources.length + 2 + KEYWORD_PAGES.length} public URLs`);
    console.log(`   - robots.txt`);
    
  } catch (error) {
    console.error('❌ Error during static site generation:', error);
    
    // Even on error, ensure basic files exist
    try {
      ensureDir(DIST_DIR);
      
      if (!fs.existsSync(path.join(DIST_DIR, 'sitemap.xml'))) {
        console.log('⚠️  Generating minimal sitemap.xml...');
        const minimalSitemap = generateSitemap([]);
        fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), minimalSitemap);
      }
      
      if (!fs.existsSync(path.join(DIST_DIR, 'robots.txt'))) {
        console.log('⚠️  Generating robots.txt...');
        const robotsTxt = generateRobotsTxt();
        fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt);
      }
    } catch (recoveryError) {
      console.error('❌ Could not recover from error:', recoveryError);
    }
  }
  
  if (!fs.existsSync(path.join(DIST_DIR, CAREER_COUNSELING_SLUG, 'index.html'))) {
    console.error('❌ Missing /jinro-counseling/index.html');
    process.exit(1);
  }

  // Explicitly exit to ensure Node process terminates
  process.exit(0);
}

main();
