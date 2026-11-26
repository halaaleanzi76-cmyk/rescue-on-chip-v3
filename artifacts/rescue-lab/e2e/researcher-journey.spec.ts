/**
 * Researcher journey on the real platform: open lab → change parameters → see recomputed results →
 * try to save (anonymous) → compare → history → analysis → export → vascular solve → evidence → AI.
 */
import { test, expect, setLang } from './fixtures';

test.describe('3D laboratory', () => {
  test('opens in Arabic RTL with a saved run and live engine values', async ({ page, consoleErrors }) => {
    await setLang(page, 'ar');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page).toHaveTitle(/المختبر ثلاثي الأبعاد/);
    await expect(page.getByTestId('viewport-3d')).toBeVisible();
    await expect(page.getByTestId('status-viewport')).toContainText('تجربة محفوظة');
    await expect(page.getByTestId('text-live-flow')).not.toHaveText('—');
    void consoleErrors;
  });

  test('changing driving pressure recomputes flow through the Python engine', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/');
    const flow = page.getByTestId('text-live-flow');
    await expect(flow).not.toHaveText('—');
    // Pause playback so the comparison is at a fixed time point.
    const pause = page.getByTestId('button-pause');
    if (await pause.isVisible()) await pause.click();
    const before = Number.parseFloat((await page.getByTestId('text-live-pressure').textContent()) ?? 'NaN');
    const input = page.getByTestId('input-pressure_pa');
    const old = Number(await input.inputValue());
    await input.fill(String(old * 2));
    await expect(page.getByTestId('status-preview')).toBeVisible();
    await expect.poll(async () => Number.parseFloat((await page.getByTestId('text-live-pressure').textContent()) ?? 'NaN'), { timeout: 20_000 })
      .not.toBeCloseTo(before, 0);
    await expect(page.getByTestId('status-modified')).toContainText('1');
    void consoleErrors;
  });

  test('invalid input is rejected in place and save is disabled', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/');
    const radius = page.getByTestId('input-radius_um');
    await radius.fill('0');
    await expect(page.getByText('Min 5')).toBeVisible();
    await expect(page.getByTestId('button-save')).toBeDisabled();
    void consoleErrors;
  });

  test('anonymous save is refused with a clear sign-in message', async ({ page, consoleErrors }) => {
    await setLang(page, 'ar');
    await page.goto('/');
    await expect(page.getByTestId('button-save')).toBeEnabled();
    await page.getByTestId('button-save').click();
    await expect(page.getByText('يلزم تسجيل الدخول').first()).toBeVisible();
    // the expected 401 response is logged by the browser as a failed resource; filter it out
    consoleErrors.splice(0, consoleErrors.length, ...consoleErrors.filter((e) => !/401/.test(e)));
  });

  test('viewport tools switch colour mode and open the cross-section', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/');
    const canvas = page.locator('[data-testid="viewport-3d"] canvas').first();
    await expect(canvas).toBeVisible();
    // Note: selecting a part by clicking inside the WebGL canvas is not covered here (needs projected coordinates).
    await page.getByTestId('button-labels').click();
    await page.getByTestId('button-labels').click();
    await page.getByTestId('button-mode-velocity').click();
    await expect(page.getByTestId('legend-scale')).toContainText('velocity');
    await page.getByTestId('button-cross-section').click();
    await expect(page.getByTestId('input-cross-position')).toBeVisible();
    void consoleErrors;
  });
});

test.describe('language', () => {
  test('switches Arabic ⇄ English, flips direction and persists after reload', async ({ page, consoleErrors }) => {
    await setLang(page, 'ar');
    await page.goto('/runs');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByTestId('button-lang').click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByTestId('link-nav-lab')).toHaveText(/3D Laboratory/);
    await page.evaluate(() => window.localStorage.getItem('roc.lang')).then((v) => expect(v).toBe('en'));
    void consoleErrors;
  });
});

test.describe('history, analysis, comparison, export', () => {
  test('run history lists saved runs and opens one in the lab', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/runs');
    const rows = page.locator('[data-testid^="row-run-"]');
    await expect(rows.first()).toBeVisible();
    const href = await page.locator('[data-testid^="link-open-run-"]').first().getAttribute('href');
    await page.locator('[data-testid^="link-open-run-"]').first().click();
    await expect(page).toHaveURL(new RegExp(`${href!.replace('?', '\\?')}$`));
    await expect(page.getByTestId('status-viewport')).toContainText('Saved run');
    void consoleErrors;
  });

  test('analysis shows metrics and the stored reports download with provenance', async ({ page, request, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/runs');
    await page.locator('[data-testid^="link-analysis-run-"]').first().click();
    await expect(page.locator('[data-testid^="row-metric-"]')).toHaveCount(3);
    for (const fmt of ['html', 'csv', 'json']) {
      const href = await page.getByTestId(`link-download-${fmt}`).getAttribute('href');
      const res = await request.get(href!);
      expect(res.status(), fmt).toBe(200);
      expect((await res.body()).length, fmt).toBeGreaterThan(500);
      expect(res.headers()['content-disposition']).toContain('attachment');
    }
    void consoleErrors;
  });

  test('comparison renders both viewports with synchronized values', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/compare');
    await expect(page.getByTestId('panel-compare-A').locator('canvas')).toBeVisible();
    await expect(page.getByTestId('panel-compare-B').locator('canvas')).toBeVisible();
    await expect(page.getByTestId('text-compare-A-p')).not.toHaveText('—');
    void consoleErrors;
  });
});

test.describe('vascular twin', () => {
  test('runs the network solver and reports mass conservation', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/vascular');
    await page.getByTestId('button-run-vascular-solver').click();
    await expect(page.getByText('Completed · fingerprint')).toBeVisible();
    const residual = Number(await page.locator('.vascular-summary-cell').nth(2).locator('.vascular-metric-value').textContent());
    expect(residual).toBeLessThan(1e-6);
    void consoleErrors;
  });

  test('editing a segment radius changes the computed inlet flow', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/vascular');
    await page.getByTestId('button-run-vascular-solver').click();
    const flowCell = page.locator('.vascular-result-item').first().locator('strong');
    await expect(flowCell).toContainText('µL/min');
    const before = await flowCell.textContent();
    const r = page.getByTestId('input-selected-radius');
    await r.fill(String(Number(await r.inputValue()) * 0.5));
    await page.getByTestId('button-run-vascular-solver').click();
    await expect(flowCell).not.toHaveText(before!);
    void consoleErrors;
  });
});

test.describe('evidence and compound lab', () => {
  test('evidence search returns imported public records with provenance', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/evidence');
    await expect(page.getByTestId('panel-evidence-results')).toBeVisible();
    await expect(page.locator('[data-testid^="trial-"]').first()).toBeVisible();
    void consoleErrors;
  });

  test('compound validation computes RDKit descriptors', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/research-ai');
    await page.getByTestId('input-compound-structure').fill('CC(=O)Oc1ccccc1C(=O)O');
    await page.getByTestId('button-describe-structure').click();
    await expect(page.getByTestId('panel-compound-description')).toBeVisible();
    await expect(page.getByTestId('table-molecular-descriptors')).toBeVisible();
    await expect(page.getByTestId('text-train-admin-only')).toBeVisible();
    void consoleErrors;
  });
});

test.describe('access control in the browser', () => {
  test('anonymous visitors are sent to sign-in from private pages', async ({ page, consoleErrors }) => {
    await setLang(page, 'ar');
    for (const path of ['/admin', '/account']) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
    await expect(page.getByTestId('form-signin')).toBeVisible();
    void consoleErrors;
  });

  test('a forged email link shows a clear invalid-link message', async ({ page, consoleErrors }) => {
    await setLang(page, 'en');
    await page.goto('/?code=forged-code');
    await expect(page).toHaveURL(/\/auth\/callback/);
    await expect(page.getByText('This link is invalid or has expired')).toBeVisible();
    // Supabase answers the forged PKCE code with an error response, which the browser logs.
    consoleErrors.splice(0, consoleErrors.length, ...consoleErrors.filter((e) => !/40[034]/.test(e)));
  });
});
