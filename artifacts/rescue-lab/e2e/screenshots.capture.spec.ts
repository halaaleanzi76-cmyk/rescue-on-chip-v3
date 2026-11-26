/** Captures delivery screenshots into docs/screenshots (run: npx playwright test e2e/screenshots.capture.spec.ts --project=desktop with CAPTURE=1). */
import { test, setLang } from './fixtures';
import { devices } from '@playwright/test';

test.skip(!process.env.CAPTURE, 'set CAPTURE=1 to capture delivery screenshots');
const OUT = '../../docs/screenshots';
const PAGES: [string, string][] = [['home', '/'], ['problem', '/problem'], ['invention', '/invention'], ['simulation', '/lab'],
  ['validation', '/validation'], ['results', '/results'], ['evidence', '/evidence'], ['judge', '/judge']];

for (const lang of ['en', 'ar'] as const) {
  test(`screenshots desktop ${lang}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await setLang(page, lang);
    for (const [name, path] of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(name === 'validation' ? 9000 : 1500);
      await page.screenshot({ path: `${OUT}/desktop-${lang}-${name}.png` });
    }
  });
}

test('screenshots mobile ar', async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await ctx.newPage();
  await setLang(page, 'ar');
  for (const [name, path] of PAGES.slice(0, 4)) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/mobile-ar-${name}.png` });
  }
  await ctx.close();
});
