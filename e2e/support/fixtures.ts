import { test as base, expect } from '@playwright/test';
import { StorePage } from '../pages/StorePage';

/**
 * Фікстура `store` = Page Object + журнал браузера.
 * При падінні тесту журнал (console, pageerror, HTTP >= 400) додається до звіту як browser-log.
 * Screenshot і trace при падінні вмикає playwright.config.ts.
 */
export const test = base.extend<{ store: StorePage }>({
  store: async ({ page }, use, testInfo) => {
    const log: string[] = [];
    page.on('console', (m) => log.push(`[console.${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => log.push(`[pageerror] ${e.message}`));
    page.on('response', (r) => {
      if (r.status() >= 400) log.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`);
    });

    await use(new StorePage(page));

    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('browser-log', {
        body: log.join('\n') || '(порожньо)',
        contentType: 'text/plain',
      });
    }
  },
});

export { expect };