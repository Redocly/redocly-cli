import type { ResponseBodyModel, SchemaModel } from '../../intermediate-representation/model.js';
import { eventSchema, isSseOp, sseDataKind } from '../sse.js';
import { operation } from './fixtures.js';

/** An operation whose success response streams `text/event-stream`. */
function sseOp(response: Partial<ResponseBodyModel>, name = 'streamMessages') {
  return operation({
    name,
    successResponses: [
      { contentType: 'text/event-stream', schema: { kind: 'unknown' }, ...response, status: 200 },
    ],
  });
}

describe('isSseOp', () => {
  it('is true for a success response with the text/event-stream content type', () => {
    expect(isSseOp(sseOp({}))).toBe(true);
  });

  it('matches with parameters and is case-insensitive', () => {
    expect(isSseOp(sseOp({ contentType: 'text/event-stream; charset=utf-8' }))).toBe(true);
    expect(isSseOp(sseOp({ contentType: 'Text/Event-Stream' }))).toBe(true);
  });

  it('is false for a plain JSON operation', () => {
    expect(
      isSseOp(
        operation({
          successResponses: [
            { contentType: 'application/json', schema: { kind: 'ref', name: 'Pet' }, status: 200 },
          ],
        })
      )
    ).toBe(false);
  });

  it('is false for an operation with no responses', () => {
    expect(isSseOp(operation({}))).toBe(false);
  });
});

describe('eventSchema (drives the streamed payload type)', () => {
  it('uses the per-item schema when present', () => {
    expect(eventSchema(sseOp({ itemSchema: { kind: 'ref', name: 'Message' } }))).toEqual({
      kind: 'ref',
      name: 'Message',
    });
  });

  it('falls back to the response schema when it is meaningful', () => {
    expect(eventSchema(sseOp({ schema: { kind: 'ref', name: 'Token' } }))).toEqual({
      kind: 'ref',
      name: 'Token',
    });
  });

  it('ignores a typeless `itemSchema` and falls back to the response schema', () => {
    expect(
      eventSchema(
        sseOp({ itemSchema: { kind: 'unknown' }, schema: { kind: 'ref', name: 'Token' } })
      )
    ).toEqual({ kind: 'ref', name: 'Token' });
  });

  it('is undefined when no schema is declared (payload types as `string`)', () => {
    expect(eventSchema(sseOp({}))).toBeUndefined();
    expect(eventSchema(operation({}))).toBeUndefined();
  });
});

describe('sseDataKind', () => {
  it("is 'json' for object/ref/array/record/union/intersection event types", () => {
    const json: SchemaModel[] = [
      { kind: 'object', properties: [] },
      { kind: 'ref', name: 'Message' },
      { kind: 'array', items: { kind: 'scalar', scalar: 'string' } },
      { kind: 'record', value: { kind: 'scalar', scalar: 'string' } },
      { kind: 'union', members: [{ kind: 'ref', name: 'A' }] },
      { kind: 'intersection', members: [{ kind: 'ref', name: 'A' }] },
    ];
    for (const itemSchema of json) expect(sseDataKind(sseOp({ itemSchema }))).toBe('json');
  });

  it("is 'text' for the string fallback (no schema)", () => {
    expect(sseDataKind(sseOp({}))).toBe('text');
  });

  it("is 'text' for a typeless `itemSchema` (no meaningful schema)", () => {
    expect(sseDataKind(sseOp({ itemSchema: { kind: 'unknown' } }))).toBe('text');
  });

  it("is 'text' for scalar/literal/enum/null event types", () => {
    const text: SchemaModel[] = [
      { kind: 'scalar', scalar: 'string' },
      { kind: 'literal', value: 'x' },
      { kind: 'enum', values: ['a'], scalar: 'string' },
      { kind: 'null' },
    ];
    for (const itemSchema of text) expect(sseDataKind(sseOp({ itemSchema }))).toBe('text');
  });
});
