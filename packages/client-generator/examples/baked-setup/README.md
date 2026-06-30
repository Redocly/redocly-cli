# baked-setup

Shows the **publisher** story: an SDK that ships request/response defaults *built into* the generated
client, so downstream users call operations with no setup of their own (see
[ADR-0015](../../docs/adr/0015-publisher-setup-bake-in.md)).

- `client-setup.ts` — the publisher's `defineClientSetup({ config, middleware })`, importing the
  contract from `@redocly/client-generator` (so it resolves and is unit-testable before the client exists).
- `redocly.yaml` — `setup: ./client-setup.ts` bakes it into `src/api/client.ts` at generation time.
- `src/main.ts` — a consumer that just calls operations; the defaults are already active.

Because the setup imports its contract from the package (not the not-yet-generated client), it is
**unit-testable in isolation** — its middleware are plain functions on an inspectable object:

```ts
import setup from './client-setup.ts';

const ctx = {
  url: '/orders',
  method: 'POST',
  headers: {} as Record<string, string>,
  operation: { id: 'createOrder', path: '/orders', tags: ['Orders'] },
};
setup.middleware![0].onRequest!(ctx as never);
// ctx.headers['X-Idempotency-Key'] is now set; ctx.headers['X-Cafe-SDK'] === '1.0.0'
```

The generated client under `src/api/` is checked in and drift-checked in CI.

## Run

```bash
npm install
npm run dev
```
