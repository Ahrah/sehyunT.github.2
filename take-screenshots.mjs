import { chromium } from 'playwright';

const screenshots = [
  {
    name: 'hero-desktop',
    url: 'http://localhost:4173',
    width: 1280,
    height: 1024,
    selector: 'section:has(h1)',
    fullPage: false
  },
  {
    name: 'hero-mobile',
    url: 'http://localhost:4173',
    width: 375,
    height: 812,
    selector: 'section:has(h1)',
    fullPage: false
  },
  {
    name: 'contact-desktop',
    url: 'http://localhost:4173#contact',
    width: 1280,
    height: 1024,
    selector: '#contact',
    fullPage: false
  },
  {
    name: 'contact-mobile',
    url: 'http://localhost:4173#contact',
    width: 375,
    height: 812,
    selector: '#contact',
    fullPage: false
  }
];

const branch = process.argv[2] || 'current';
const outputDir = `/opt/cursor/artifacts/screenshots`;

console.log(`Taking screenshots for branch: ${branch}`);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

for (const shot of screenshots) {
  const page = await context.newPage();
  await page.setViewportSize({ width: shot.width, height: shot.height });
  
  console.log(`Navigating to ${shot.url}...`);
  await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  
  // Wait a bit for fonts and images to load
  await page.waitForTimeout(3000);
  
  // If selector specified, screenshot that element
  if (shot.selector) {
    try {
      const element = await page.locator(shot.selector).first();
      await element.waitFor({ state: 'visible', timeout: 5000 });
      const outputPath = `${outputDir}/${shot.name}-${branch}.png`;
      await element.screenshot({ path: outputPath });
      console.log(`✓ Saved ${outputPath}`);
    } catch (e) {
      console.error(`Failed to screenshot ${shot.selector}:`, e.message);
      // Fallback to full page
      const outputPath = `${outputDir}/${shot.name}-${branch}.png`;
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`✓ Saved ${outputPath} (full page fallback)`);
    }
  } else {
    const outputPath = `${outputDir}/${shot.name}-${branch}.png`;
    await page.screenshot({ 
      path: outputPath, 
      fullPage: shot.fullPage 
    });
    console.log(`✓ Saved ${outputPath}`);
  }
  
  await page.close();
}

await browser.close();
console.log('Done!');
