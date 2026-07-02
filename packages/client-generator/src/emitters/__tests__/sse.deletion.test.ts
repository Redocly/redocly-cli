// Deletion test guarding the SSE gating seam: the `__sse` runtime block and the
// public `sse` aggregate must appear ONLY when a model declares a
// `text/event-stream` operation. A non-streaming model must be byte-free of
// both — this protects the "non-SSE clients are unchanged" invariant.
import type { ApiModel } from '../../intermediate-representation/model.js';
import { emitSingleFile } from '../client.js';
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

describe('SSE gating seam (deletion test)', () => {
  it('emits the __sse runtime + the sse aggregate when an op streams', () => {
    const out = emitSingleFile(sseModel());
    expect(out).toContain('async function* __sse');
    expect(out).toContain('export const sse =');
  });

  it('emits NEITHER __sse NOR the sse aggregate when no op streams', () => {
    const out = emitSingleFile(plainModel());
    expect(out).not.toContain('async function* __sse');
    expect(out).not.toContain('export const sse =');
  });
});
