/** Guided research mode, "Explain this experiment" tour and vascular occlusion — on the real platform. */
import { test, expect, setLang } from './fixtures';

const pct = (s: string | null) => Number.parseFloat((s ?? '').replace(/[^\d.\-]/g, ''));

test('first visit opens the explanation; the tour drives the real engine', async ({ page, consoleErrors }) => {
  await setLang(page, 'en', { guideSeen: false });
  await page.goto('/');
  const guide = page.getByTestId('panel-experiment-guide');
  await expect(guide).toBeVisible();
  await expect(page.getByTestId('text-guide-step')).toHaveText('Step 1 of 8');
  await page.getByTestId('button-guide-load-reference').click();

  for (let i = 0; i < 5; i++) await page.getByTestId('button-guide-next').click();   // -> step 6 (results)
  const table = page.getByTestId('table-guide-results');
  await expect(table.locator('tbody tr')).toHaveCount(3);
  const eqRow = table.locator('tbody tr').filter({ hasText: 'Equalized' });
  const peakBefore = pct(await eqRow.locator('td').nth(1).locator('span').first().textContent());

  await page.getByTestId('button-guide-next').click();                               // -> step 7
  await page.getByTestId('button-guide-zero-wait').click();
  await expect(page.getByTestId('input-equalization_s')).toHaveValue('0');
  await expect(page.getByTestId('status-preview')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('button-guide-prev').click();                               // back to results
  await expect.poll(async () => pct(await eqRow.locator('td').nth(1).locator('span').first().textContent()), { timeout: 20_000 })
    .toBeGreaterThan(peakBefore);

  await page.getByTestId('button-guide-next').click();
  await page.getByTestId('button-guide-next').click();                               // -> step 8 (limits)
  await page.getByTestId('button-guide-finish').click();
  await expect(guide).toBeHidden();
  await expect(page.getByTestId('button-open-guide')).toBeVisible();                 // reopen stays one click away
  expect(await page.evaluate(() => window.localStorage.getItem('roc.guideSeen'))).toBe('1'); // won't auto-open on next visit
  void consoleErrors;
});

test('guided mode shows the 5 key parameters; advanced shows all, and the choice persists', async ({ page, consoleErrors }) => {
  await setLang(page, 'ar');
  await page.goto('/');
  await page.getByTestId('button-mode-guided-config').click();
  const inputs = page.locator('[data-testid="panel-config"] input[data-testid^="input-"]');
  await expect(inputs).toHaveCount(5);
  await page.getByTestId('button-toggle-config-mode').click();
  await expect(page.getByTestId('button-mode-advanced-config')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('input-seed')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('button-mode-advanced-config')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('button-mode-guided-config').click();
  void consoleErrors;
});

test('blocking a capillary changes the solved network flow; reopening restores it', async ({ page, consoleErrors }) => {
  await setLang(page, 'en');
  await page.goto('/vascular');
  const flow = page.locator('.vascular-result-item').first().locator('strong');
  await page.getByTestId('button-run-vascular-solver').click();
  await expect(flow).toContainText('µL/min');
  const open = await flow.textContent();

  await page.getByTestId('select-segment').selectOption('capillary_u_1_2');
  await page.getByTestId('button-toggle-occlusion').click();
  await expect(page.getByTestId('text-occluded-count')).toContainText('1 blocked');
  await page.getByTestId('button-run-vascular-solver').click();
  await expect(flow).toContainText('µL/min');
  const blocked = await flow.textContent();
  expect(pct(blocked)).toBeLessThan(pct(open));          // more resistance -> less flow at fixed pressure

  await page.getByTestId('button-clear-occlusions').click();
  await page.getByTestId('button-run-vascular-solver').click();
  await expect(flow).toHaveText(open!);
  void consoleErrors;
});

test('blocking the only feeding artery stops all perfusion and says so', async ({ page, consoleErrors }) => {
  await setLang(page, 'ar');
  await page.goto('/vascular');
  await page.getByTestId('select-segment').selectOption('artery_feed');
  await page.getByTestId('button-toggle-occlusion').click();
  await page.getByTestId('button-run-vascular-solver').click();
  // Physically correct outcome: the inlet is isolated, the rest of the graph stays tied to the outlet -> zero flow.
  await expect(page.getByTestId('status-no-flow')).toContainText('ما يوصل أي تدفق');
  await expect(page.locator('.vascular-result-item').first().locator('strong')).toContainText('0 µL/min');
  void consoleErrors;
});
