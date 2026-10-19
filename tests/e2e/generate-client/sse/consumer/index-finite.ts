import { configure, streamMessages } from './api.js';

// The test passes the in-process mock server's URL.
const serverUrl = process.argv[2];

// Iterate to natural completion — no `break`. The server drops the first connection
// (client reconnects via Last-Event-ID), then delivers the final frame WITHOUT a
// trailing delimiter and closes cleanly. Reaching the end of the `for await` proves
// three things: the reconnect resumed from the last event id, the final dangling frame
// was flushed, and a clean close finished the stream instead of looping forever.
// The test reads the `Last-Event-ID` of each connection from the server's request records.
async function main(): Promise<void> {
  configure({ serverUrl });

  const collected: Array<{ text: string; id: string | undefined }> = [];
  for await (const ev of streamMessages()) {
    collected.push({ text: ev.data.text, id: ev.id });
  }

  process.stdout.write(
    JSON.stringify({
      events: collected.map((e) => e.text),
      ids: collected.map((e) => e.id),
      finished: true,
    }) + '\n'
  );
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
