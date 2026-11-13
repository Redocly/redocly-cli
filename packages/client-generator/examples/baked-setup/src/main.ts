import { listMenuItems } from './api/client.js';

const out = document.querySelector<HTMLPreElement>('#out')!;

// No configure()/use() here — the base URL, retry, and headers were baked into the client at
// generation time (see ../client-setup.ts). A downstream consumer just calls operations.
async function main() {
  const menu = await listMenuItems({});
  out.textContent = JSON.stringify(menu, null, 2);
}

void main();
