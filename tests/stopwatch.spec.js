import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Stopwatch Manager', () => {
  test.beforeEach(async ({ page }) => {
    const indexPath = path.join(__dirname, '..', 'index.html');
    await page.goto(`file://${indexPath}`);
  });

  test.describe('Adding stopwatches', () => {
    test('should add a stopwatch with a title', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer A');
      await page.click('button:has-text("Add Stopwatch")');

      await expect(page.locator('.stopwatch-card')).toHaveCount(1);
      await expect(page.locator('.stopwatch-title')).toHaveText('Timer A');
      await expect(page.locator('.stopwatch-display')).toHaveText('00:00:00.00');
    });

    test('should not add a stopwatch without a title', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());
      
      await page.click('button:has-text("Add Stopwatch")');
      
      await expect(page.locator('.stopwatch-card')).toHaveCount(0);
    });

    test('should clear input after adding stopwatch', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer B');
      await page.click('button:has-text("Add Stopwatch")');

      const inputValue = await page.inputValue('#stopwatchTitle');
      expect(inputValue).toBe('');
    });

    test('should add stopwatch when Enter key is pressed', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Enter Timer');
      await page.press('#stopwatchTitle', 'Enter');

      await expect(page.locator('.stopwatch-card')).toHaveCount(1);
      await expect(page.locator('.stopwatch-title')).toHaveText('Enter Timer');
    });
  });

  test.describe('Starting and pausing stopwatches', () => {
    test('should start a stopwatch and increment time', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await page.click('.start-btn');
      await page.waitForTimeout(500);
      
      const displayText = await page.locator('.stopwatch-display').textContent();
      expect(displayText).not.toBe('00:00:00.00');
    });

    test('should pause a running stopwatch', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await page.click('.start-btn');
      await page.waitForTimeout(300);
      await page.click('.pause-btn');
      
      const timeAfterPause = await page.locator('.stopwatch-display').textContent();
      await page.waitForTimeout(300);
      const timeAfterWait = await page.locator('.stopwatch-display').textContent();
      
      expect(timeAfterPause).toBe(timeAfterWait);
    });
  });

  test.describe('Single-timer rule', () => {
    test('should pause other stopwatches when starting one', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer A');
      await page.click('button:has-text("Add Stopwatch")');
      await page.fill('#stopwatchTitle', 'Timer B');
      await page.click('button:has-text("Add Stopwatch")');

      const cards = page.locator('.stopwatch-card');
      const timerADisplay = cards.nth(0).locator('.stopwatch-display');
      const timerBDisplay = cards.nth(1).locator('.stopwatch-display');

      await cards.nth(0).locator('.start-btn').click();
      await page.waitForTimeout(300);
      const timerATime = await timerADisplay.textContent();
      expect(timerATime).not.toBe('00:00:00.00');

      await cards.nth(1).locator('.start-btn').click();
      await page.waitForTimeout(300);
      
      const timerATimeAfter = await timerADisplay.textContent();
      const parseTime = (timeStr) => {
        const parts = timeStr.split(/[:.]/).map(Number);
        return parts[0] * 360000 + parts[1] * 6000 + parts[2] * 100 + parts[3];
      };
      const timerAMs = parseTime(timerATime);
      const timerAMsAfter = parseTime(timerATimeAfter);
      expect(Math.abs(timerAMsAfter - timerAMs)).toBeLessThanOrEqual(10);
      
      const timerBTime = await timerBDisplay.textContent();
      expect(timerBTime).not.toBe('00:00:00.00');
    });
  });

  test.describe('Resetting stopwatches', () => {
    test('should reset a stopwatch to zero', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await page.click('.start-btn');
      await page.waitForTimeout(500);
      await page.click('.reset-btn');

      await expect(page.locator('.stopwatch-display')).toHaveText('00:00:00.00');
    });

    test('should reset a running stopwatch and stop it', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await page.click('.start-btn');
      await page.waitForTimeout(300);
      await page.click('.reset-btn');

      await expect(page.locator('.stopwatch-display')).toHaveText('00:00:00.00');
      
      await page.waitForTimeout(300);
      await expect(page.locator('.stopwatch-display')).toHaveText('00:00:00.00');
    });
  });

  test.describe('Deleting stopwatches', () => {
    test('should delete a stopwatch', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await expect(page.locator('.stopwatch-card')).toHaveCount(1);
      
      await page.click('.delete-btn');
      
      await expect(page.locator('.stopwatch-card')).toHaveCount(0);
      await expect(page.locator('.empty-state')).toBeVisible();
    });

    test('should delete the correct stopwatch when multiple exist', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer A');
      await page.click('button:has-text("Add Stopwatch")');
      await page.fill('#stopwatchTitle', 'Timer B');
      await page.click('button:has-text("Add Stopwatch")');
      await page.fill('#stopwatchTitle', 'Timer C');
      await page.click('button:has-text("Add Stopwatch")');

      await expect(page.locator('.stopwatch-card')).toHaveCount(3);
      
      await page.locator('.stopwatch-card').nth(1).locator('.delete-btn').click();
      
      await expect(page.locator('.stopwatch-card')).toHaveCount(2);
      await expect(page.locator('.stopwatch-title').nth(0)).toHaveText('Timer A');
      await expect(page.locator('.stopwatch-title').nth(1)).toHaveText('Timer C');
    });
  });

  test.describe('Total time display', () => {
    test('should show zero total time initially', async ({ page }) => {
      await expect(page.locator('#total-time')).toHaveText('00:00:00.00');
    });

    test('should update total time when a timer runs', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await page.click('.start-btn');
      await page.waitForTimeout(300);

      const totalTime = await page.locator('#total-time').textContent();
      expect(totalTime).not.toBe('00:00:00.00');
    });

    test('should sum multiple stopwatch times', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer A');
      await page.click('button:has-text("Add Stopwatch")');
      await page.fill('#stopwatchTitle', 'Timer B');
      await page.click('button:has-text("Add Stopwatch")');

      const cards = page.locator('.stopwatch-card');
      const timerADisplay = cards.nth(0).locator('.stopwatch-display');
      const timerBDisplay = cards.nth(1).locator('.stopwatch-display');

      await cards.nth(0).locator('.start-btn').click();
      await page.waitForTimeout(300);
      await cards.nth(0).locator('.pause-btn').click();
      await page.waitForTimeout(50);

      await cards.nth(1).locator('.start-btn').click();
      await page.waitForTimeout(200);
      await cards.nth(1).locator('.pause-btn').click();
      await page.waitForTimeout(50);

      const parseCs = (timeStr) => {
        const parts = timeStr.split(/[:.]/).map(Number);
        return parts[0] * 360000 + parts[1] * 6000 + parts[2] * 100 + parts[3];
      };

      const timerAStr = await timerADisplay.textContent();
      const timerBStr = await timerBDisplay.textContent();
      const totalStr = await page.locator('#total-time').textContent();

      const timerACs = parseCs(timerAStr);
      const timerBCs = parseCs(timerBStr);
      const totalCs = parseCs(totalStr);

      expect(Math.abs(totalCs - (timerACs + timerBCs))).toBeLessThanOrEqual(10);
    });

    test('should update total time when stopwatch is reset', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await page.click('.start-btn');
      await page.waitForTimeout(500);
      await page.click('.reset-btn');

      await expect(page.locator('#total-time')).toHaveText('00:00:00.00');
    });

    test('should update total time when stopwatch is deleted', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer A');
      await page.click('button:has-text("Add Stopwatch")');
      await page.fill('#stopwatchTitle', 'Timer B');
      await page.click('button:has-text("Add Stopwatch")');

      const cards = page.locator('.stopwatch-card');

      await cards.nth(0).locator('.start-btn').click();
      await page.waitForTimeout(300);
      await cards.nth(0).locator('.pause-btn').click();
      await page.waitForTimeout(50);

      await cards.nth(1).locator('.start-btn').click();
      await page.waitForTimeout(200);
      await cards.nth(1).locator('.pause-btn').click();
      await page.waitForTimeout(50);

      const timerBStrBefore = await cards.nth(1).locator('.stopwatch-display').textContent();

      await cards.nth(0).locator('.delete-btn').click();

      const parseCs = (timeStr) => {
        const parts = timeStr.split(/[:.]/).map(Number);
        return parts[0] * 360000 + parts[1] * 6000 + parts[2] * 100 + parts[3];
      };

      const totalStr = await page.locator('#total-time').textContent();

      const timerBCs = parseCs(timerBStrBefore);
      const totalCs = parseCs(totalStr);

      expect(Math.abs(totalCs - timerBCs)).toBeLessThanOrEqual(10);
    });
  });

  test.describe('UI rendering', () => {
    test('should show empty state when no stopwatches exist', async ({ page }) => {
      await expect(page.locator('.empty-state')).toBeVisible();
      await expect(page.locator('.empty-state')).toContainText('No stopwatches yet');
    });

    test('should hide empty state when stopwatches are added', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');

      await expect(page.locator('.empty-state')).not.toBeVisible();
    });

    test('should show empty state again when all stopwatches are deleted', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');
      
      await page.click('.delete-btn');

      await expect(page.locator('.empty-state')).toBeVisible();
    });

    test('should render all stopwatch controls', async ({ page }) => {
      await page.fill('#stopwatchTitle', 'Timer 1');
      await page.click('button:has-text("Add Stopwatch")');

      const card = page.locator('.stopwatch-card');
      await expect(card.locator('.start-btn')).toBeVisible();
      await expect(card.locator('.pause-btn')).toBeVisible();
      await expect(card.locator('.reset-btn')).toBeVisible();
      await expect(card.locator('.delete-btn')).toBeVisible();
    });

    test('should display total time bar prominently', async ({ page }) => {
      await expect(page.locator('.total-bar')).toBeVisible();
      await expect(page.locator('.total-label')).toHaveText('Total Time');
      await expect(page.locator('#total-time')).toBeVisible();
    });
  });
});
