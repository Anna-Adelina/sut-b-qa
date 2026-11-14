import { test, expect } from '../support/fixtures';
import { createOrder, createProduct, getOrder } from '../support/api';

test('3. бізнес-відмова: повторне повернення — backend відхиляє (409), UI показує помилку', async ({ store, request }) => {
  const product = await createProduct(request, { unitPrice: 30_000 });
  const order = await createOrder(request, { productId: product.id }); // підготовка через API

  await store.open();
  await store.findOrder(order.id);
  await store.returnOrder(); // перше повернення — успішне
  await store.expectStatus('RETURNED');
  await expect(store.error).toBeHidden();

  // друге повернення: слухаємо реальну відповідь backend, щоб довести, що відмова серверна
  const secondReturn = store.page.waitForResponse(
    (r) => /\/orders\/\d+\/return$/.test(r.url()) && r.request().method() === 'POST',
  );
  await store.returnOrder();
  expect((await secondReturn).status()).toBe(409);

  await store.expectError('Замовлення вже повернено');
  await store.expectStatus('RETURNED'); // стан не зіпсовано

  expect((await getOrder(request, order.id)).status).toBe('RETURNED');
});