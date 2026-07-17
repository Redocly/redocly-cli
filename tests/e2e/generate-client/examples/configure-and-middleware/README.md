# configure-and-middleware example

The client's DX knobs together: `configure({ serverUrl, retry })` with an exponential,
`Retry-After`-aware retry policy; `use()` middleware that targets `ctx.operation.id`
(a literal union — typos fail the build); the generated `setApiKey()` auth setter; and
`ApiError` handling with the spec's problem document on `error.body`.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev        # open the printed local URL
```

The app uses a canned `fetch` so it runs offline and the retry is deterministic: the first
`GET /payments` attempt returns 503 and the policy resends it. The generated client under
`src/api/` is gitignored; CI regenerates it and type-checks this example.
