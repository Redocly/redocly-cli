# tanstack-query example

Generated TypeScript client plus **TanStack Query** (React) factories
(`generators: ['sdk', 'tanstack-query']`). The app uses `useQuery(<op>Options())` under a
`QueryClientProvider`.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev        # open the printed local URL
```

The generated client + TanStack factories under `src/api/` are gitignored; CI regenerates them and type-checks this example.
