import { configure, streamMessages } from './api.js';

const serverUrl = process.argv[2] ?? process.env.SSE_BASE_URL ?? 'http://127.0.0.1:3104';

// Iterate to natural completion — no `break`. The server drops the first connection
// (client reconnects via Last-Event-ID), then delivers the final frame WITHOUT a
// trailing delimiter and closes cleanly. Reaching the end of the `for await` proves
// three things: the reconnect resumed from the last event id, the final dangling frame
// was flushed, and a clean close finished the stream instead of looping forever.
async function main(): Promise<void> {
  configure({ serverUrl });

  const collected: Array<{ text: string; id: string | undefined }> = [];
  for await (const ev of streamMessages()) {
    collected.push({ text: ev.data.text, id: ev.id });
  }

  // The `Last-Event-ID` header each connection sent: none first, then '2' on the resume.
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
      finished: true,
    }) + '\n'
  );
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
