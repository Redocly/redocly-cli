import { listOrders } from './api-package.js';

// The package-mode arm: the generated file imports the runtime from
// `@redocly/client-generator`, so `.pages()`/`.items()` ship from the INSTALLED
// package — one full `.items()` walk proves the capability is wired there too.
async function main(): Promise<void> {
  const ids: string[] = [];
  for await (const order of listOrders.items({ params: { limit: 2 } })) {
    ids.push(order.id);
  }

  process.stdout.write(JSON.stringify({ ids }) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
