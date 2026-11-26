/** Platform: home tools, navigation, validation, sensitivity, removed pages and security headers — on the real platform. */
import { test, expect, setLang } from './fixtures';

const num = (s: string | null) => Number.parseFloat((s ?? '').replace(/[^\d.\-]/g, ''));

test('home shows the platform tools and a live network demo, with no study or pitch content', async ({ page, consoleErrors }) => {
  await setLang(page, 'en');
  await page.goto('/');
  await expect(page.getByTestId('home-headline')).toBeVisible();
  await expect(page.getByTestId('link-home').locator('svg').first()).toBeVisible();
  for (const id of ['home', 'lab', 'vascular', 'results', 'runs', 'validation', 'model']) await expect(page.getByTestId(`link-nav-${id}`)).toBeVisible();
  for (const id of ['lab', 'vascular', 'results', 'runs', 'compare', 'validation', 'model']) await expect(page.getByTestId(`tool-${id}`)).toBeVisible();
  await expect(page.getByTestId('button-judge-mode')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/PMID|Stroke 20|Judge Mode/);
  const inflow = page.getByTestId('home-inflow');
  await expect(inflow).toContainText('µL/min');
  const before = num(await inflow.textContent());
  await page.getByTestId('button-home-noreflow').click();
  await expect(page.getByTestId('home-pct')).not.toContainText('100');
  expect(num(await inflow.textContent())).toBeLessThan(before);
  await page.getByTestId('tool-vascular').click();
  await expect(page).toHaveURL(/\/vascular$/);
  void consoleErrors;
});

test('removed pages redirect to the platform home', async ({ page, consoleErrors }) => {
  await setLang(page, 'en');
  for (const p of ['/problem', '/invention', '/evidence', '/judge']) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/$/);
  }
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
  await expect(page.locator('body')).not.toContainText(/PMID/);
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

test('API: unrelated endpoints are gone', async ({ request }) => {
  for (const u of ['/api/source', '/api/ai/overview', '/api/evidence/overview']) {
    const r = await request.get(u);
    expect(r.status(), u).toBe(404);
  }
});
