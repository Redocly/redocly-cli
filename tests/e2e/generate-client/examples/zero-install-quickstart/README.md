# zero-install-quickstart example

The first-touch loop: `redocly generate-client` → import → call. The generated
`src/api/client.ts` is one self-contained file with **zero runtime dependencies** —
nothing to install, nothing to keep in sync with a client library.

## Run

```bash
npm install        # dev tooling only (the CLI + tsx); the client itself needs nothing
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm start          # calls the live cafe demo API and prints the menu
```

The generated client under `src/api/` is committed and drift-checked against the generator in CI.
