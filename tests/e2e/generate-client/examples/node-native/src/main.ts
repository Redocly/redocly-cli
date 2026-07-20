// node-native — run the TypeScript client directly with `node`, no loader, no build step.
//
// The client was generated with `importExt: ts`, so its internal imports use real
// on-disk `.ts` specifiers — what Node's built-in type stripping resolves (Node 22.7+).
// The import below uses a `.ts` extension for the same reason.
import { listMenuItems, type MenuItem } from './api/client.ts';

const menu = await listMenuItems({ limit: 3 });
for (const item of menu.items satisfies MenuItem[]) {
  console.log(`${item.name} — $${(item.price / 100).toFixed(2)}`);
}
