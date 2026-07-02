import { configure, sse } from './api.js';

const serverUrl = process.argv[2] ?? process.env.SSE_BASE_URL ?? 'http://127.0.0.1:3104';

type Collected = { text: string; id: string | undefined };

async function main(): Promise<void> {
  configure({ serverUrl });

  // Collect events across an auto-reconnect: the server drops after `b`, the
  // client resumes with `Last-Event-ID: 2` and receives `c`. `ev.data` is the
  // typed `Message`, so `ev.data.text` is statically a string.
  const collected: Collected[] = [];
  for await (const ev of sse.streamMessages()) {
    collected.push({ text: ev.data.text, id: ev.id });
    if (collected.length >= 3) break;
  }

  const logResponse = await fetch(`${serverUrl}/__test__/log`);
  const log = (await logResponse.json()) as Array<{ path: string; lastEventId: string | null }>;
  const lastEventIds = log
    .filter((entry) => entry.path === '/messages')
    .map((entry) => entry.lastEventId);

  process.stdout.write(
    JSON.stringify({
      events: collected.map((e) => e.text),
      ids: collected.map((e) => e.id),
      lastEventIds,
    }) + '\n'
  );
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
