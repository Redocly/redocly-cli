# mock example

Generated TypeScript client plus **MSW** mocks (`generators: ['sdk', 'mock']`), shown two ways from the
same generated `src/api/` and the same `handlers`:

- **Browser** (`src/main.ts`) — starts an MSW browser worker with `setupWorker` and renders the result.
- **Node** (`src/node.ts`) — starts a server with `msw/node`'s `setupServer` and exports `loadMockedMenu()`.
  Node has no Service Worker, so msw patches global `fetch` directly (no `public/mockServiceWorker.js`).

Either way, requests are served by the mocks — no real backend required.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # browser: open the printed local URL
```

For the Node variant, import and call `loadMockedMenu()` from `src/node.ts` in your own entrypoint or test.

The generated client + MSW mocks under `src/api/` are committed and drift-checked against the
generator in CI.
