import { ApiError } from './errors.js';
import { readError } from './parse.js';
import { sleep } from './retry.js';
import { send } from './send.js';
import type { ClientConfig, OperationContext, ServerSentEvent, SseOptions } from './types.js';

/**
 * A frame delimiter: two consecutive line terminators (each CR, LF, or CRLF, per the SSE
 * spec — so mixed endings like `\n\r\n` are valid boundaries, not just matching pairs).
 */
const FRAME_DELIMITER = /(?:\r\n|\r|\n){2}/;

/** An event's JSON `data` failed to parse — a stable bad payload, not a dropped connection. */
export class SseParseError extends Error {}

/**
 * Consume a `text/event-stream` operation as typed events (capability module — wired
 * into `createClient`). Auto-reconnects on dropped connections, resuming from the last
 * seen event id via `Last-Event-ID` (backoff: the server's `retry:` value, then
 * `reconnectDelay`, then 1s — exponential with jitter, capped at 30s). A clean stream
 * end flushes a trailing frame and finishes; `break`/abort end the iterator cleanly.
 */
export async function* sse<T>(
  config: ClientConfig,
  op: OperationContext,
  url: string,
  init: SseOptions,
  dataKind: 'json' | 'text' = 'text'
): AsyncGenerator<ServerSentEvent<T>> {
  const { reconnect = true, reconnectDelay, ...rest } = init;
  const signal = rest.signal ?? undefined;
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    ...(rest.headers as Record<string, string> | undefined),
  };
  let lastEventId: string | undefined;
  let serverRetry: number | undefined;
  let failures = 0;
  while (true) {
    if (signal?.aborted) return;
    const sendHeaders =
      lastEventId === undefined ? headers : { ...headers, 'Last-Event-ID': lastEventId };
    try {
      const { response } = await send(
        config,
        op,
        url,
        { ...rest, method: rest.method ?? 'GET', headers: sendHeaders },
        undefined,
        false,
        {}
      );
      if (!response.ok) {
        const errorBody = await readError(response);
        throw new ApiError(url, response.status, response.statusText, errorBody);
      }
      failures = 0;
      const body = response.body;
      if (!body) return;
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
          let match: RegExpMatchArray | null;
          while ((match = buffer.match(FRAME_DELIMITER)) !== null) {
            const index = match.index!;
            const raw = buffer.slice(0, index);
            buffer = buffer.slice(index + match[0].length);
            const event = parseSseFrame(raw, dataKind);
            if (event) {
              if (event.id !== undefined) lastEventId = event.id;
              if (event.retry !== undefined) serverRetry = event.retry;
              yield event as ServerSentEvent<T>;
            }
          }
          if (done) {
            // Stream closed cleanly. Flush a final event that arrived without a trailing
            // delimiter, then finish — a clean end is not a dropped connection, so do not reconnect.
            const event = buffer.length > 0 ? parseSseFrame(buffer, dataKind) : undefined;
            if (event) {
              if (event.id !== undefined) lastEventId = event.id;
              if (event.retry !== undefined) serverRetry = event.retry;
              yield event as ServerSentEvent<T>;
            }
            return;
          }
          // Bound memory: a server that never sends a frame delimiter would otherwise
          // grow `buffer` without limit. 1 MiB is far above any real SSE frame.
          if (buffer.length > 1048576) {
            throw new Error('SSE frame exceeded 1048576 characters without a delimiter');
          }
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
    } catch (error) {
      if (signal?.aborted) return;
      // A non-OK HTTP response (4xx/5xx) or an unparseable JSON payload is a definitive
      // error, not a transient drop — surface it instead of reconnecting in a loop (a
      // stable bad payload would otherwise reconnect forever).
      if (error instanceof ApiError || error instanceof SseParseError) throw error;
      // A transport failure (connect/DNS/reset) when opening the request, or a mid-stream
      // read error, is a dropped connection: fall through to backoff/reconnect when enabled.
      if (!reconnect) throw error;
    }
    // Only the swallowed-drop path reaches here: reconnect is on and the signal not aborted.
    failures++;
    const base = serverRetry ?? reconnectDelay ?? 1000;
    const delay = Math.min(base * Math.pow(2, failures - 1), 30_000);
    try {
      await sleep(Math.random() * delay, signal);
    } catch {
      return; // sleep rejects only on abort — end the iterator cleanly
    }
  }
}

/** Parse one raw SSE frame (its lines) into an event; returns undefined for comment-only frames. */
export function parseSseFrame(
  raw: string,
  dataKind: 'json' | 'text'
): ServerSentEvent<unknown> | undefined {
  let event: string | undefined;
  const dataLines: string[] = [];
  let id: string | undefined;
  let retry: number | undefined;
  let sawField = false;
  for (const line of raw.split(/\r\n|\n|\r/)) {
    if (line === '' || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let val = colon === -1 ? '' : line.slice(colon + 1);
    if (val.startsWith(' ')) val = val.slice(1);
    sawField = true;
    if (field === 'event') event = val;
    else if (field === 'data') dataLines.push(val);
    else if (field === 'id') id = val;
    else if (field === 'retry') {
      const n = Number(val);
      if (!Number.isNaN(n)) retry = n;
    }
  }
  if (!sawField) return undefined;
  const dataText = dataLines.join('\n');
  let data: unknown = dataText;
  if (dataKind === 'json' && dataText !== '') {
    try {
      data = JSON.parse(dataText);
    } catch (error) {
      throw new SseParseError(
        `Failed to parse SSE event data as JSON: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return { event, data, id, retry };
}
