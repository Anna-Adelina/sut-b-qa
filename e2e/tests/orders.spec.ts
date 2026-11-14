import { test, expect } from '../support/fixtures';
import { createOrder, createProduct, getOrder, uid } from '../support/api';

test.describe('Замовлення через UI', () => {
  test('1. створення замовлення: UI показує збережені дані, вони переживають reload і збігаються з API', async ({ store, page, request }) => {
    const product = await createProduct(request, { unitPrice: 50_000, stock: 10 }); // 500,00 грн
    const reference = uid('E2E-CREATE');

    await store.open();
    await store.placeOrder({ reference, productId: product.id, quantity: 2 });

    await store.expectNotice('Замовлення створено.');
    await expect(store.orderReference).toHaveText(reference);
    await store.expectStatus('CONFIRMED');
    await store.expectTotal(100_000); // 2 × 500 грн, без купона знижки нема
    const id = await store.shownOrderId();

    // reload: сторінка повторно завантажує замовлення з backend за ?order=<id>
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`[?&]order=${id}\\b`));
    await expect(store.orderReference).toHaveText(reference);
    await store.expectStatus('CONFIRMED');
    await store.expectTotal(100_000);

    // дані справді в БД: те саме віддає API
    const saved = await getOrder(request, id);
    expect(saved.reference).toBe(reference);
    expect(saved.status).toBe('CONFIRMED');
    expect(saved.total).toBe(100_000);
  });

  test('2. бізнес-дія: повернення замовлення через UI, статус зберігається після reload', async ({ store, page, request }) => {
    const product = await createProduct(request, { unitPrice: 30_000 });
    const order = await createOrder(request, { productId: product.id, quantity: 1 }); // підготовка через API

    await store.open();
    await store.findOrder(order.id);
    await store.expectStatus('CONFIRMED');

    await store.returnOrder();

    await store.expectNotice('Замовлення повернено.');
    await store.expectStatus('RETURNED');
    await store.expectTotal(30_000); // сума при поверненні не змінюється

    await page.reload();
    await store.expectStatus('RETURNED');
    await store.expectTotal(30_000);

    expect((await getOrder(request, order.id)).status).toBe('RETURNED');
  });
});