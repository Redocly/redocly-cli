// Deletion test guarding the SSE surface of the descriptor-wired client: the old
// template's `__sse` runtime block and the `export const sse = { … }` namespace are
// gone for good. An SSE operation now exists as a descriptor (`responseKind: "sse"`),
// a typed client method (`kind: "sse"` in Ops), and a flat sugar export; the runtime's
// sse capability module is embedded ONLY when a model declares a `text/event-stream`
// operation — a non-streaming model is byte-free of it.
import type { ApiModel } from '../../intermediate-representation/model.js';
import { emitClientSingleFile } from '../package-client.js';
import { apiModel, namedSchema, operation } from './fixtures.js';

/** A model with one SSE op (event-stream success + an `itemSchema` ref). */
function sseModel(): ApiModel {
  return apiModel({
    schemas: [namedSchema('Message', { kind: 'object', properties: [] })],
    services: [
      {
        name: 'Default',
        operations: [
          operation({
            name: 'streamMessages',
            path: '/stream',
            successResponses: [
              {
                contentType: 'text/event-stream',
                status: 200,
                schema: { kind: 'unknown' },
                itemSchema: { kind: 'ref', name: 'Message' },
              },
            ],
          }),
        ],
      },
    ],
  });
}

/** A model with one plain JSON op (no streaming). */
function plainModel(): ApiModel {
  return apiModel({
    schemas: [namedSchema('Thing', { kind: 'object', properties: [] })],
    services: [
      {
        name: 'Default',
        operations: [
          operation({
            name: 'getThing',
            path: '/thing',
            successResponses: [
              {
                contentType: 'application/json',
                schema: { kind: 'ref', name: 'Thing' },
                status: 200,
              },
            ],
          }),
        ],
      },
    ],
  });
}

describe('SSE surface (deletion test)', () => {
  it('never emits the old template surface: no __sse helper, no sse namespace', () => {
    const out = emitClientSingleFile(sseModel());
    expect(out).not.toContain('__sse');
    expect(out).not.toContain('export const sse =');
  });

  it('exposes an SSE op as descriptor + typed Ops member + flat sugar', () => {
    const out = emitClientSingleFile(sseModel());
    expect(out).toContain('responseKind: "sse"');
    expect(out).toContain('kind: "sse";');
    expect(out).toContain(
      'export const streamMessages = (init: SseOptions = {}) => client.streamMessages({}, init);'
    );
    // The runtime's sse capability module is embedded and wired.
    expect(out).toContain('async function* sse');
    expect(out).toContain('createClientCore<Ops, Id, Path, Tag>(operations, config, { sse })');
  });

  it('embeds NO sse capability when no op streams', () => {
    const out = emitClientSingleFile(plainModel());
    expect(out).not.toContain('async function* sse');
    expect(out).not.toContain('responseKind: "sse"');
    expect(out).toContain('createClientCore<Ops, Id, Path, Tag>(operations, config, {})');
  });
});
