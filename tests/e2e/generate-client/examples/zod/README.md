# zod example

Generated TypeScript client plus **zod** schemas (`generators: ['sdk', 'zod']`).
The app turns on `zodValidation()` — request bodies and JSON responses are validated
against the generated schemas on every call — and also uses a schema directly.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev        # open the printed local URL
```

The generated client + zod schemas under `src/api/` are gitignored; CI regenerates them and type-checks this example.
