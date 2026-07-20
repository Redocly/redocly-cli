# node-native

Run the generated client with plain `node` — no tsx, no loader, no build step.

Node 22.7+ strips TypeScript types natively but resolves import specifiers literally:
there is no `.js` → `.ts` remap, so the default generated imports (`./client.schemas.js`) don't resolve.
Setting `importExt: ts` (or passing `--import-ext ts`) makes the generator emit real on-disk `.ts` specifiers instead,
and your own code imports the client the same way (`./api/client.ts`).

Keep the default `js` extension when the client goes through `tsc` or a bundler — this option targets literal-resolution runtimes only.

```bash
npm install
npm run generate
npm start
```
