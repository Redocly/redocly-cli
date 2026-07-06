# configure-and-middleware example

The client's DX knobs together: `configure({ serverUrl, retry })` with an exponential,
`Retry-After`-aware retry policy; `use()` middleware that targets `ctx.operation.id`
(a literal union — typos fail the build); the generated `setApiKey()` auth setter; and
`ApiError` handling with the spec's problem document on `error.body`.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The app uses a canned `fetch` so it runs offline and the retry is deterministic: the first
`GET /payments` attempt returns 503 and the policy resends it. The generated client under
`src/api/` is committed and drift-checked against the generator in CI.
