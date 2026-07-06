// configure-and-middleware — the client's DX knobs in one place.
//
// * `configure()`: server URL + a retry policy (idempotent methods only by default;
//   `Retry-After` honored; per-call override via `init.retry`).
// * `use()`: middleware that targets `ctx.operation.id` — a LITERAL UNION of this
//   spec's operation ids, so a typo fails the build instead of silently never matching.
// * `setApiKey()`: per-scheme auth sugar; injected only on operations whose
//   `security` names the scheme.
// * `ApiError`: a non-2xx response throws, carrying the decoded problem document
//   on `error.body`.
import {
  ApiError,
  configure,
  createPayment,
  getPayment,
  listPayments,
  setApiKey,
  use,
  type ProblemDetails,
} from './api/client.js';

const out = document.querySelector<HTMLPreElement>('#out')!;
const log: string[] = [];

// A canned transport so the example runs offline — and fails deterministically:
// the FIRST `GET /payments` attempt returns 503 with `Retry-After: 0`, so the
// configured retry policy resends it; an unknown payment id returns a 404 problem.
let listAttempts = 0;
const canned = (async (url: string, init: RequestInit) => {
  const { pathname } = new URL(url);
  const problem = (status: number, title: string, detail: string) =>
    new Response(JSON.stringify({ type: 'about:blank', title, status, detail }), {
      status,
      headers: { 'content-type': 'application/problem+json', 'retry-after': '0' },
    });
  if (init.method === 'GET' && pathname === '/payments') {
    if (++listAttempts === 1) return problem(503, 'Service Unavailable', 'Warming up — retry.');
    return new Response(
      JSON.stringify({
        items: [{ id: 'pay_1', amount: 1250, currency: 'EUR', status: 'settled' }],
      }),
      { headers: { 'content-type': 'application/json' } }
    );
  }
  if (init.method === 'POST' && pathname === '/payments') {
    return new Response(
      JSON.stringify({ id: 'pay_2', status: 'pending', ...JSON.parse(String(init.body)) }),
      { status: 201, headers: { 'content-type': 'application/json' } }
    );
  }
  return problem(404, 'Payment not found', `No payment at ${pathname}.`);
}) as unknown as typeof fetch;

configure({
  serverUrl: 'https://api.payments.example.com',
  fetch: canned,
  // Retries apply to idempotent methods on transport errors and transient statuses
  // (408/429/5xx); `Retry-After` wins over the backoff when the server sends it.
  retry: { retries: 2, retryDelay: 100, retryStrategy: 'exponential' },
});

// Auth sugar generated from the spec's `ApiKeyAuth` scheme: every operation whose
// `security` requires it gets an `X-Api-Key` header — nothing to wire by hand.
setApiKey('demo-key-123');

use({
  onRequest: (ctx) => {
    // `ctx.operation.id` is typed 'listPayments' | 'createPayment' | 'getPayment' —
    // misspell it and the comparison fails to compile.
    if (ctx.operation.id === 'createPayment') {
      ctx.headers['Idempotency-Key'] = crypto.randomUUID();
    }
    log.push(`→ ${ctx.operation.id} ${ctx.method} ${ctx.operation.path}`);
  },
  // `onResponse` runs per ATTEMPT — watch the 503 and the retried 200 both arrive.
  onResponse: (response, ctx) => {
    log.push(`← ${ctx.operation.id} ${response.status}`);
  },
});

async function main() {
  const payments = await listPayments(); // 503 first, then retried to 200
  const payment = await createPayment({ amount: 4200, currency: 'EUR', reference: 'INV-17' });
  try {
    await getPayment('pay_missing');
  } catch (error) {
    if (error instanceof ApiError) {
      // `error.body` is the decoded response body; per the spec's 4xx contract
      // it is a problem document, so narrow it to the generated type.
      const problem = error.body as ProblemDetails;
      log.push(`✗ getPayment ${error.status}: ${problem.title} — ${problem.detail}`);
    }
  }
  out.textContent = [...log, '', JSON.stringify({ payments, payment }, null, 2)].join('\n');
}

void main();
