# nested-facade

A resource-grouped call shape — `api.orders.listOrders(…)` — derived from the
spec's **tags** by a small [custom generator](./nested-facade-generator.mjs)
(the experimental plugin API), so the nesting regenerates with the spec instead
of living in a hand-maintained facade file. Everything stays fully typed: the
facade just re-exports the sdk's generated functions in nested objects.

## Run

```bash
npm install
npm run generate
npm start
```
