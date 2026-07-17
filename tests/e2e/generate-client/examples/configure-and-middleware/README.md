# configure-and-middleware example

Customizing the client **without editing the generated file** — every mechanism composes
from the hand-written `src/main.ts`, so it survives regeneration
(see [ADR-0014](../../../../packages/client-generator/docs/adr/0014-request-response-customization.md)):

- `configure({ serverUrl, retry, fetch })` — an exponential, `Retry-After`-aware retry
  policy and a custom transport (here a canned `fetch`, so the demo runs offline).
- `use()` middleware targeting `ctx.operation.id` / `ctx.operation.tags` (typed literal
  unions — typos fail the build), mutating the request body (`ctx.body` edits are sent),
  and observing each attempt's raw `Response`.
- The generated `setApiKey()` auth setter.
- A per-call header via the trailing `RequestOptions` argument.
- `ApiError` handling with the spec's problem document on `error.body`.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev        # open the printed local URL
```

The app uses a canned `fetch` so it runs offline and the retry is deterministic: the first
`GET /payments` attempt returns 503 and the policy resends it. The generated client under
`src/api/` is gitignored; CI regenerates it and type-checks this example.
