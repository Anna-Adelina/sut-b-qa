import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const TEST = __ENV.TEST || 'baseline';

// Три профілі навантаження (workload profile). Вибираємо через TEST=...
const profiles = {
  // baseline: 1 користувач, мінімальне навантаження
  baseline: { executor: 'constant-vus', vus: 1, duration: '1m' },

  // load: очікуване робоче навантаження, 20 користувачів
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 20 }, // ramp-up
      { duration: '2m', target: 20 },  // стабільне навантаження
      { duration: '30s', target: 0 },  // ramp-down
    ],
  },

  // spike: різкий стрибок 5 -> 100 -> 5
  spike: {
    executor: 'ramping-vus',
    startVUs: 5,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '20s', target: 100 }, // стрибок
      { duration: '1m', target: 100 },  // тримаємо пік
      { duration: '20s', target: 5 },   // спад
      { duration: '30s', target: 5 },   // відновлення
    ],
  },

   // stress: без пауз, навантаження росте, шукаємо межу
   stress: {
     executor: 'ramping-vus',
     startVUs: 0,
     stages: [
       { duration: '30s', target: 50 },
       { duration: '30s', target: 100 },
       { duration: '30s', target: 200 },
       { duration: '30s', target: 300 },
       { duration: '30s', target: 0 },
     ],
   },
};

export const options = {
  scenarios: { [TEST]: profiles[TEST] },
  // thresholds = критерії прийнятності
  thresholds: {
    http_req_duration: ['p(95)<500'], // p95 < 500 ms
    http_req_failed: ['rate<0.01'],   // error rate < 1%
  },
};

const headers = { 'Content-Type': 'application/json' };

export default function () {
  // унікальний суфікс: sku і reference мають бути UNIQUE у БД (до 40 символів)
  const uid = `${__VU}-${__ITER}-${Date.now()}`;

  // Крок 1: створюємо товар
  const r1 = http.post(
    `${BASE}/products`,
    JSON.stringify({ sku: `K6-${uid}`, unitPrice: 10000, stock: 10, onSale: false }),
    { headers, tags: { name: 'POST /products' } }
  );
  const ok1 = check(r1, { 'POST /products -> 201': (r) => r.status === 201 });
  if (!ok1) return;

  // dynamic data: беремо id з відповіді кроку 1
  const productId = r1.json('id');

  // Крок 2: створюємо замовлення з цим productId
  const r2 = http.post(
    `${BASE}/orders`,
    JSON.stringify({ reference: `O-${uid}`, productId: productId, quantity: 2, premium: false, couponValid: false }),
    { headers, tags: { name: 'POST /orders' } }
  );
  const ok2 = check(r2, { 'POST /orders -> 201': (r) => r.status === 201 });
  if (!ok2) return;

  // dynamic data: беремо id замовлення з відповіді кроку 2
  const orderId = r2.json('id');

  // Крок 3: читаємо замовлення за цим id
  // tags.name потрібен, щоб k6 не рахував кожен /orders/<id> окремим URL
  const r3 = http.get(`${BASE}/orders/${orderId}`, { tags: { name: 'GET /orders/{id}' } });
  check(r3, {
    'GET /orders/{id} -> 200': (r) => r.status === 200,
    'status = CONFIRMED': (r) => r.json('status') === 'CONFIRMED',
    'total = 20000': (r) => r.json('total') === 20000,
  });

  sleep(TEST === 'stress' ? 0 : 1); // у stress без think time
}