import { test as base, expect, type Page } from '@playwright/test';

/** Every test fails if the page logs an uncaught error or a console error (except known benign ones). */
const BENIGN = [/favicon\.ico/i, /Download the React DevTools/i];

export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error' && !BENIGN.some((re) => re.test(m.text()))) errors.push(`console: ${m.text()}`);
    });
    await use(errors);
    expect(errors, 'browser console errors').toEqual([]);
  },
});
export { expect };

export async function setLang(page: Page, lang: 'ar' | 'en', opts: { guideSeen?: boolean } = {}) {
  const guideSeen = opts.guideSeen ?? true; // most tests start as a returning user; guided.spec covers the first visit
  await page.addInitScript(([l, g]) => {
    window.localStorage.setItem('roc.lang', l as string);
    if (g) window.localStorage.setItem('roc.guideSeen', '1'); else window.localStorage.removeItem('roc.guideSeen');
  }, [lang, guideSeen] as const);
}
