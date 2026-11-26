import { test, expect, setLang } from './fixtures';

for (const path of ['/', '/lab', '/vascular', '/results', '/runs', '/compare', '/validation', '/model', '/signup']) {
  test(`mobile Arabic layout has no horizontal overflow: ${path}`, async ({ page, consoleErrors }) => {
    await setLang(page, 'ar');
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const { sw, w } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    expect(sw, `scrollWidth ${sw} > viewport ${w}`).toBeLessThanOrEqual(w + 1);
    void consoleErrors;
  });
}
