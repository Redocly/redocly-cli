import { listOrders } from './api.js';

// Aborting mid-iteration: `init` (the AbortSignal) is forwarded to every page request,
// so aborting after the first yielded item lets the current page drain from memory and
// makes the NEXT page fetch reject — the iteration terminates with an AbortError.
async function main(): Promise<void> {
  const controller = new AbortController();
  let received = 0;
  let error: string | null = null;

  try {
    for await (const order of listOrders.items(
      { params: { limit: 2 } },
      { signal: controller.signal }
    )) {
      void order;
      received++;
      if (received === 1) {
        controller.abort();
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.name : String(e);
  }

  process.stdout.write(JSON.stringify({ received, error }) + '\n');
}

main().catch((e) => {
  process.stderr.write(`UNHANDLED: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
