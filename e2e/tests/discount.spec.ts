import { APIRequestContext, Page } from '@playwright/test';
import { test, expect } from '../support/fixtures';
import { StorePage } from '../pages/StorePage';
import { createProduct, getOrder, uid } from '../support/api';

interface Case {
  title: string;
  unitPrice: number; // копійки
  quantity: number;
  coupon: boolean;
  expected: number; // копійки
}

// Правило: 10% від 800 грн (80 000 коп., поріг включний, рахується за сумою до знижки) за наявності купона.
const applies: Case[] = [
  { title: '800,00 грн × 1 + купон (поріг включний)', unitPrice: 80_000, quantity: 1, coupon: true, expected: 72_000 },
  { title: '2 × 500,00 грн + купон (поріг за сумою, а не за ціною одиниці)', unitPrice: 50_000, quantity: 2, coupon: true, expected: 90_000 },
];

const notApplies: Case[] = [
  { title: '799,99 грн + купон (нижче порога)', unitPrice: 79_999, quantity: 1, coupon: true, expected: 79_999 },
  { title: '800,00 грн без купона', unitPrice: 80_000, quantity: 1, coupon: false, expected: 80_000 },
];

test.describe('Персональне правило: 10% від 800 грн за підтвердженого купона', () => {
  async function checkCase(store: StorePage, page: Page, request: APIRequestContext, c: Case) {
    const product = await createProduct(request, { unitPrice: c.unitPrice });

    await store.open();
    await store.placeOrder({ reference: uid('E2E-RULE'), productId: product.id, quantity: c.quantity, coupon: c.coupon });

    await store.expectStatus('CONFIRMED');
    await store.expectTotal(c.expected);
    const id = await store.shownOrderId();

    await page.reload(); // збережена сума після перезавантаження
    await store.expectStatus('CONFIRMED');
    await store.expectTotal(c.expected);

    expect((await getOrder(request, id)).total).toBe(c.expected);
  }

  for (const c of applies) {
    test(`4. правило спрацьовує: ${c.title}`, async ({ store, page, request }) => checkCase(store, page, request, c));
  }
  for (const c of notApplies) {
    test(`5. правило не спрацьовує: ${c.title}`, async ({ store, page, request }) => checkCase(store, page, request, c));
  }
});