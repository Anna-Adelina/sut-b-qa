import { test } from '../support/fixtures';
import { createProduct, uid } from '../support/api';

// ДЕМО для захисту (п.9): за замовчуванням пропускається.
// Запуск: $env:E2E_DEMO_FAIL="1"; npx playwright test demo-failure --project=chromium
test('DEMO: навмисне падіння — screenshot, trace і browser-log у звіті', async ({ store, request }) => {
  test.skip(!process.env.E2E_DEMO_FAIL, 'демо вмикається змінною E2E_DEMO_FAIL=1');

  const product = await createProduct(request, { unitPrice: 80_000 });
  await store.open();
  await store.placeOrder({ reference: uid('E2E-DEMO'), productId: product.id, coupon: true });
  await store.expectTotal(80_000); // хибне очікування: правильно 72 000 (знижка 10%)
});