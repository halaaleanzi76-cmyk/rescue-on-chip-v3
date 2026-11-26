/** Competition site: home, navigation, validation lab, sensitivity, judge mode and evidence downloads — on the real platform. */
import { test, expect, setLang } from './fixtures';

const num = (s: string | null) => Number.parseFloat((s ?? '').replace(/[^\d.\-]/g, ''));

test('home shows the logo, headline, disclaimer and a live no-reflow demo', async ({ page, consoleErrors }) => {
  await setLang(page, 'en');
  await page.goto('/');
  await expect(page.getByTestId('home-headline')).toHaveText(/When the artery reopens, why doesn.t the brain recover\?/);
  await expect(page.getByTestId('link-home').locator('svg').first()).toBeVisible();
  await expect(page.getByTestId('home-disclaimer')).toBeVisible();
  await expect(page.getByTestId('button-judge-mode')).toBeVisible();
  for (const id of ['home', 'problem', 'invention', 'lab', 'validation', 'results', 'evidence']) {
    await expect(page.getByTestId(`link-nav-${id}`)).toBeVisible();
  }
  const inflow = page.getByTestId('home-inflow');
  await expect(inflow).toContainText('µL/min');
  const before = num(await inflow.textContent());
  await page.getByTestId('button-home-noreflow').click();
  await expect(page.getByTestId('home-pct')).not.toContainText('100');
  expect(num(await inflow.textContent())).toBeLessThan(before);
  await page.getByTestId('cta-simulation').click();
  await expect(page).toHaveURL(/\/lab$/);
  void consoleErrors;
});

test('validation lab keeps the four verdicts separate and lists the negative finding', async ({ page, consoleErrors }) => {
  test.setTimeout(90_000);
  await setLang(page, 'en');
  await page.goto('/validation');
  await expect(page.getByTestId('verdict-A')).toContainText('PASS', { timeout: 60_000 });
  await expect(page.getByTestId('verdict-B')).toContainText(/not possible/i);
  await expect(page.getByTestId('verdict-C')).toContainText(/not performed/i);
  await expect(page.getByTestId('list-negative-findings')).toBeVisible();
  await expect(page.getByTestId('table-validation').locator('tbody tr').first()).toBeVisible();
  void consoleErrors;
});

test('sensitivity sweep runs the engine and states a verdict', async ({ page, consoleErrors }) => {
  test.setTimeout(90_000);
  await setLang(page, 'en');
  await page.goto('/results');
  await page.getByTestId('button-run-sensitivity').click();
  await expect(page.getByTestId('chart-sensitivity')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('text-sensitivity-verdict')).not.toBeEmpty();
  void consoleErrors;
});

test('judge mode: chapters navigate and the A/B/C ranking is computed, not fixed', async ({ page, consoleErrors }) => {
  test.setTimeout(90_000);
  await setLang(page, 'en');
  await page.goto('/');
  await page.getByTestId('button-judge-mode').click();
  await expect(page.getByTestId('judge-mode')).toBeVisible();
  await expect(page.getByTestId('judge-clock')).toBeVisible();
  for (let i = 0; i < 6; i++) await expect(page.getByTestId(`judge-chapter-${i}`)).toBeVisible();
  let found = false;
  for (let i = 0; i < 6 && !found; i++) {
    await page.getByTestId(`judge-chapter-${i}`).click();
    found = await page.getByTestId('judge-abc').isVisible();
  }
  expect(found).toBe(true);
  const best = page.getByTestId('judge-best');
  await page.getByTestId('judge-regwait').fill('0');
  await expect(best).toBeVisible({ timeout: 30_000 });
  const atZero = await best.textContent();
  await page.getByTestId('judge-regwait').fill('15');
  await expect(best).not.toHaveText(atZero!, { timeout: 30_000 });
  void consoleErrors;
});

test('evidence hub downloads are real files', async ({ page, request, consoleErrors }) => {
  await setLang(page, 'en');
  await page.goto('/evidence');
  const links = page.getByTestId('evidence-downloads').locator('a[href^="/evidence/"]');
  const n = await links.count();
  expect(n).toBeGreaterThanOrEqual(7);
  for (let i = 0; i < n; i++) {
    const href = (await links.nth(i).getAttribute('href'))!;
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
    const body = await res.body();
    expect(body.length, href).toBeGreaterThan(300);
    expect(body.subarray(0, 15).toString(), href).not.toContain('<!doctype');
  }
  void consoleErrors;
});
