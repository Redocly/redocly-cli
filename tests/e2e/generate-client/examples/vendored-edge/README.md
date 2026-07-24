# vendored-edge example

The self-contained story taken to its end: the client was generated **once** and the single
output file copied into this directory. `src/api/client.ts` imports nothing, so the same file
runs on Cloudflare Workers, Deno Deploy, Bun, or any runtime with web-standard `fetch` —
no npm install, no node_modules at runtime. `worker.ts` is an edge-style handler
(`export default { fetch }`) that proxies the cafe API through the vendored client.

## Use

```bash
npm install         # typescript only — and only to type-check
npm run generate    # generate src/api (the client is gitignored)
npm run typecheck
```

To re-vendor after a spec change, run `redocly generate-client` wherever the CLI is available
and copy the new `client.ts` over. The `redocly.yaml` here records how the file was produced;
the repo's CI uses it to drift-check the vendored copy against the generator.
