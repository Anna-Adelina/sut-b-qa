import { APIRequestContext, expect } from '@playwright/test';

export interface Product { id: number; sku: string; unitPrice: number; stock: number; onSale: boolean }
export interface Order {
  id: number; reference: string; premium: boolean; couponValid: boolean;
  total: number; status: 'CONFIRMED' | 'RETURNED';
  item: { id: number; productId: number; quantity: number; unitPrice: number; onSale: boolean };
}

/** Унікальний код для sku / reference (до 40 символів), щоб тести не залежали один від одного. */
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Підготовка даних через API. unitPrice — у КОПІЙКАХ. */
export async function createProduct(
  request: APIRequestContext,
  opts: { unitPrice: number; stock?: number; onSale?: boolean },
): Promise<Product> {
  const response = await request.post('/products', {
    data: { sku: uid('E2E-P'), unitPrice: opts.unitPrice, stock: opts.stock ?? 20, onSale: opts.onSale ?? false },
  });
  expect(response.status(), 'POST /products').toBe(201);
  return response.json();
}

export async function createOrder(
  request: APIRequestContext,
  opts: { productId: number; quantity?: number; premium?: boolean; couponValid?: boolean },
): Promise<Order> {
  const response = await request.post('/orders', {
    data: {
      reference: uid('E2E-O'), productId: opts.productId, quantity: opts.quantity ?? 1,
      premium: opts.premium ?? false, couponValid: opts.couponValid ?? false,
    },
  });
  expect(response.status(), 'POST /orders').toBe(201);
  return response.json();
}

export async function getOrder(request: APIRequestContext, id: number | string): Promise<Order> {
  const response = await request.get(`/orders/${id}`);
  expect(response.status(), `GET /orders/${id}`).toBe(200);
  return response.json();
}