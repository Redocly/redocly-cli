# sse-streaming example

A `text/event-stream` operation consumed as a typed async generator: `for await` over
`streamOrderEvents()` yields `ServerSentEvent<OrderEvent>` with `ev.data` typed from the
spec's `itemSchema`. Shows auto-reconnect resuming via `Last-Event-ID` (tuned with
`reconnectDelay`; opt out with `reconnect: false`) and a clean abort via `AbortController`.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev        # open the printed local URL
```

The app uses a canned SSE `fetch` so it runs offline and the reconnect is deterministic:
connection 1 drops mid-stream, connection 2 resumes from the last event id. The generated
client under `src/api/` is gitignored; CI regenerates it and type-checks this example.
