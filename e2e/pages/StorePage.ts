import { expect, Locator, Page } from '@playwright/test';

export interface OrderInput {
  reference: string;
  productId: number;
  quantity?: number;
  premium?: boolean;
  coupon?: boolean;
}

/** Page Object для SUT C (index.html). Усі локатори — за роллю, підписом або data-testid. */
export class StorePage {
  readonly page: Page;
  // форма замовлення
  readonly orderForm: Locator;
  readonly reference: Locator;
  readonly productId: Locator;
  readonly quantity: Locator;
  readonly premium: Locator;
  readonly coupon: Locator;
  readonly submitOrder: Locator;
  // пошук замовлення
  readonly lookupId: Locator;
  readonly lookupButton: Locator;
  // результат
  readonly orderResult: Locator;
  readonly orderReference: Locator;
  readonly orderStatus: Locator;
  readonly orderTotal: Locator;
  readonly orderIdValue: Locator;
  readonly returnButton: Locator;
  // повідомлення
  readonly notice: Locator;
  readonly error: Locator;

  constructor(page: Page) {
    this.page = page;
    this.orderForm = page.getByTestId('order-form');
    this.reference = this.orderForm.getByLabel('Код замовлення');
    this.productId = this.orderForm.getByLabel('Ідентифікатор товару');
    this.quantity = this.orderForm.getByLabel('Кількість');
    this.premium = this.orderForm.getByLabel('Преміальний покупець');
    this.coupon = this.orderForm.getByLabel('Купон підтверджено');
    this.submitOrder = this.orderForm.getByRole('button', { name: 'Оформити замовлення' });

    this.lookupId = page.getByLabel('Ідентифікатор замовлення', { exact: true });
    this.lookupButton = page.getByRole('button', { name: 'Знайти замовлення' });

    this.orderResult = page.getByTestId('order-result');
    this.orderReference = this.orderResult.getByRole('heading', { level: 3 });
    this.orderStatus = page.getByTestId('order-status');
    this.orderTotal = page.getByTestId('order-total');
    this.orderIdValue = page.getByTestId('order-id');
    this.returnButton = this.orderResult.getByRole('button', { name: 'Повернути замовлення' });

    this.notice = page.getByRole('status');
    this.error = page.getByRole('alert');
  }

  async open() {
    await this.page.goto('/index.html');
    await expect(this.orderForm).toBeVisible();
  }

  async placeOrder(input: OrderInput) {
    await this.reference.fill(input.reference);
    await this.productId.fill(String(input.productId));
    await this.quantity.fill(String(input.quantity ?? 1));
    await this.premium.setChecked(input.premium ?? false);
    await this.coupon.setChecked(input.coupon ?? false);
    await this.submitOrder.click();
  }

  async findOrder(id: number | string) {
    await this.lookupId.fill(String(id));
    await this.lookupButton.click();
  }

  async returnOrder() {
    await this.returnButton.click();
  }

  /** Id замовлення з UI (чекаємо, поки результат з'явиться). */
  async shownOrderId(): Promise<string> {
    await expect(this.orderIdValue).toHaveText(/^\d+$/);
    return (await this.orderIdValue.textContent())!;
  }

  // --- перевірки (assertions) ---
  async expectStatus(status: 'CONFIRMED' | 'RETURNED') {
    await expect(this.orderStatus).toHaveAttribute('data-status', status);
  }

  /** Сума в копійках — береться з data-kopecks, тож не залежить від формату валюти/локалі. */
  async expectTotal(kopecks: number) {
    await expect(this.orderTotal).toHaveAttribute('data-kopecks', String(kopecks));
  }

  async expectNotice(text: string) {
    await expect(this.notice).toHaveText(text);
  }

  async expectError(text: string) {
    await expect(this.error).toBeVisible();
    await expect(this.error).toHaveText(text);
  }
}