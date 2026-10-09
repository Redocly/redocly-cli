import { listReceipts } from './api.js';

// The body-link arm: `listReceipts` follows the next page's URL from the response body
// (`nextLink: /next`), merging that URL's query parameters into the next call.
async function main(): Promise<void> {
  const ids: string[] = [];
  for await (const receipt of listReceipts.items({ query: { limit: 2 } })) {
    ids.push(receipt.id); // compile-time: `receipt` is `Order`
  }
  process.stdout.write(JSON.stringify({ ids }) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
