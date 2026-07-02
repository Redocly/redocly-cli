import { configure, sse } from './api.js';

const serverUrl = process.argv[2] ?? process.env.SSE_BASE_URL ?? 'http://127.0.0.1:3104';

// Aborting an SSE stream via AbortSignal must terminate the `for await` loop
// cleanly — the iterator completes and NO AbortError escapes the loop.
async function main(): Promise<void> {
  configure({ serverUrl });

  const controller = new AbortController();
  let received = 0;
  let error: string | null = null;

  try {
    for await (const ev of sse.streamAbort({ signal: controller.signal })) {
      void ev;
      received++;
      // Abort mid-stream, after the first event, while the server holds open.
      if (received === 1) {
        setTimeout(() => controller.abort(), 50);
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.name : String(e);
  }

  process.stdout.write(JSON.stringify({ aborted: true, received, error }) + '\n');
}

main().catch((e) => {
  process.stderr.write(`UNHANDLED: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
