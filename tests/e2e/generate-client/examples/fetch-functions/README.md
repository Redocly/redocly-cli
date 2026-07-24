# fetch-functions example

Generated TypeScript client (`generators: ['sdk']`), consumed as free
functions (`configure()`, `listMenuItems()`), with `ApiError` handling.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev        # open the printed local URL
```

The generated client under `src/api/` is gitignored; CI regenerates it and type-checks this example.
Point `configure({ serverUrl })` at your own server or a mock as needed.
