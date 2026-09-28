/**
 * Static Site Generation Script for SEO
 * 
 * Fetches public resources from Firestore and generates:
 * - Individual HTML pages for each public (non-locked) resource
 * - sitemap.xml with all URLs
 * - Enhanced index.html with meta tags and initial content
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

interface ResourceItem {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  createdAt: any;
  content?: string;
  locked?: boolean;
  category?: '대입' | '고입';
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

// Fetch resources from Firestore using Web SDK (for public access)
async function fetchResourcesPublic(): Promise<ResourceItem[]> {
  const { initializeApp: webInitializeApp, getApps: webGetApps, deleteApp } = await import('firebase/app');
  const { getFirestore: webGetFirestore, collection, getDocs, query, orderBy, terminate } = await import('firebase/firestore');

  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
    appId: process.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId
  };

  const app = webGetApps().length === 0 ? webInitializeApp(firebaseConfig, 'ssg-app') : webGetApps()[0];
  
  // Use the specific Firestore database ID if configured (matches live app behavior)
  const db = firebaseAppletConfig.firestoreDatabaseId
    ? webGetFirestore(app, firebaseAppletConfig.firestoreDatabaseId)
    : webGetFirestore(app);

  const resources: ResourceItem[] = [];
  
  try {
    // Add timeout to Firestore operations (30 seconds)
    const fetchWithTimeout = async () => {
      const q = query(collection(db, 'resources'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        resources.push({ id: doc.id, ...doc.data() } as ResourceItem);
      });
    };

    await Promise.race([
      fetchWithTimeout(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firestore fetch timeout')), 30000)
      )
    ]);
  } catch (orderErr: any) {
    if (orderErr.message === 'Firestore fetch timeout') {
      console.warn('⚠️  Firestore fetch timed out after 30 seconds');
    } else {
      console.warn('Ordered query failed, falling back to unordered:', orderErr.message);
      
      try {
        const fetchUnorderedWithTimeout = async () => {
          const querySnapshot = await getDocs(collection(db, 'resources'));
          
          querySnapshot.forEach((doc) => {
            resources.push({ id: doc.id, ...doc.data() } as ResourceItem);
          });
          
          resources.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
            return timeB - timeA;
          });
        };

        await Promise.race([
          fetchUnorderedWithTimeout(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore fetch timeout')), 30000)
          )
        ]);
      } catch (fallbackErr: any) {
        if (fallbackErr.message === 'Firestore fetch timeout') {
          console.warn('⚠️  Firestore unordered fetch also timed out');
        } else {
          console.warn('⚠️  Fallback fetch also failed:', fallbackErr.message);
        }
      }
    }
  } finally {
    // Clean up Firestore connection
    try {
      await terminate(db);
      await deleteApp(app);
    } catch (cleanupErr) {
      console.warn('Warning: Could not clean up Firebase app:', cleanupErr);
    }
  }

  return resources;
}

// Generate HTML for a resource page
function generateResourceHTML(resource: ResourceItem): string {
  const title = resource.title;
  const description = resource.description || '입시는세연쌤의 전략 자료';
  const category = resource.category || '대입';
  const publishedDate = resource.createdAt?.toDate 
    ? resource.createdAt.toDate().toISOString() 
    : new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | 입시는세연쌤</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${DOMAIN}/resources/${resource.id}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${DOMAIN}/resources/${resource.id}">
  <meta property="og:site_name" content="입시는세연쌤">
  <meta property="article:published_time" content="${publishedDate}">
  <meta property="article:author" content="조세연">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  
  <!-- JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title}",
    "description": "${description}",
    "author": {
      "@type": "Person",
      "name": "조세연"
    },
    "publisher": {
      "@type": "Organization",
      "name": "입시는세연쌤",
      "logo": {
        "@type": "ImageObject",
        "url": "${DOMAIN}/logo-pic.png"
      }
    },
    "datePublished": "${publishedDate}",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "${DOMAIN}/resources/${resource.id}"
    }
  }
  </script>
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    .category { background: #1a4f8b; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; }
    .content { margin-top: 2rem; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <span class="category">${category}</span>
    <span>${new Date(publishedDate).toLocaleDateString('ko-KR')}</span>
  </div>
  ${description ? `<p><strong>${description}</strong></p>` : ''}
  <div class="content">
    <p>이 자료는 회원 전용입니다. <a href="${DOMAIN}">사이트로 이동하여</a> 로그인 후 열람하실 수 있습니다.</p>
  </div>
  
  <!-- Redirect to SPA -->
  <script>
    // For JS-enabled browsers, redirect to the SPA
    window.location.href = '${DOMAIN}/#resources';
  </script>
</body>
</html>`;
}

// Generate sitemap.xml
function generateSitemap(resources: ResourceItem[]): string {
  const urls: string[] = [
    `  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
  ];

  // Add public (non-locked) resources
  resources
    .filter(r => !r.locked)
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

    // Filter out locked resources
    const publicResources = resources.filter(r => !r.locked);
    const lockedCount = resources.length - publicResources.length;
    console.log(`📊 Resource counts: ${publicResources.length} unlocked, ${lockedCount} locked (total: ${resources.length})`);

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
    console.log(`✅ Generated ${publicResources.length} resource pages`);

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

    console.log('\n✨ Static site generation complete!');
    console.log(`   - ${publicResources.length} resource pages`);
    console.log(`   - sitemap.xml with ${publicResources.length + 1} URLs`);
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
  
  // Explicitly exit to ensure Node process terminates
  process.exit(0);
}

main();
