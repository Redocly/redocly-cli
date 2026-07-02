import type { ApiModel, NamedSchemaModel } from '../../ir/model.js';
import { renderTransformersModule } from '../transformers.js';

const base: Omit<ApiModel, 'schemas'> = {
  title: 'T',
  version: '1',
  serverUrl: 'https://x',
  services: [],
  securitySchemes: [],
};

function render(schemas: NamedSchemaModel[]): string {
  return renderTransformersModule({ ...base, schemas }, { sdkModule: './client.js' });
}

describe('renderTransformersModule', () => {
  it("returns '' when no schema has dates", () => {
    expect(
      render([
        {
          name: 'Plain',
          schema: {
            kind: 'object',
            properties: [
              { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            ],
          },
        },
      ])
    ).toBe('');
  });

  it("returns '' for an empty model", () => {
    expect(render([])).toBe('');
  });

  it('converts a top-level date-time scalar field, guarded', () => {
    const out = render([
      {
        name: 'Event',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'createdAt',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).toContain('export const transformEvent = (data: Event): Event =>');
    expect(out).toContain('if (typeof data["createdAt"] === "string")');
    expect(out).toContain('data["createdAt"] = new Date(data["createdAt"]);');
    expect(out).toContain('return data;');
    expect(out).toContain('import type { Event } from "./client.js";');
  });

  it('converts a `date` (not just date-time) scalar field', () => {
    const out = render([
      {
        name: 'Birthday',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'day',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
              required: false,
            },
          ],
        },
      },
    ]);
    expect(out).toContain('data["day"] = new Date(data["day"]);');
  });

  it('converts an array of date scalars, guarded', () => {
    const out = render([
      {
        name: 'Log',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'timestamps',
              schema: {
                kind: 'array',
                items: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).toContain('if (Array.isArray(data["timestamps"]))');
    expect(out).toContain('data["timestamps"] = data["timestamps"].map(v => new Date(v));');
  });

  it('quotes a non-identifier key', () => {
    const out = render([
      {
        name: 'Trace',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'x-at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).toContain('if (typeof data["x-at"] === "string")');
    expect(out).toContain('data["x-at"] = new Date(data["x-at"]);');
  });

  it('composes via a ref to a date-bearing schema', () => {
    const out = render([
      {
        name: 'Person',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'born',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'Pet',
        schema: {
          kind: 'object',
          properties: [{ name: 'owner', schema: { kind: 'ref', name: 'Person' }, required: false }],
        },
      },
    ]);
    expect(out).toContain('export const transformPerson = (data: Person): Person =>');
    expect(out).toContain('export const transformPet = (data: Pet): Pet =>');
    expect(out).toContain('if (data["owner"])');
    expect(out).toContain('transformPerson(data["owner"]);');
    expect(out).toContain('import type { Person, Pet } from "./client.js";');
  });

  it('does NOT emit a transform for a ref to a date-free schema', () => {
    const out = render([
      {
        name: 'Tag',
        schema: {
          kind: 'object',
          properties: [
            { name: 'label', schema: { kind: 'scalar', scalar: 'string' }, required: true },
          ],
        },
      },
      {
        name: 'Post',
        schema: {
          kind: 'object',
          properties: [
            { name: 'tag', schema: { kind: 'ref', name: 'Tag' }, required: false },
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).not.toContain('transformTag');
    expect(out).toContain('export const transformPost');
    expect(out).not.toContain('transformTag(data["tag"])');
    expect(out).toContain('import type { Post } from "./client.js";');
  });

  it('composes via an array of refs to a date-bearing schema', () => {
    const out = render([
      {
        name: 'Visit',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'on',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'History',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'visits',
              schema: { kind: 'array', items: { kind: 'ref', name: 'Visit' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).toContain('if (Array.isArray(data["visits"]))');
    expect(out).toContain('data["visits"].forEach(transformVisit);');
  });

  it('recurses into a nested inline object with a date', () => {
    const out = render([
      {
        name: 'Order',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'meta',
              required: false,
              schema: {
                kind: 'object',
                properties: [
                  {
                    name: 'placedAt',
                    schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                    required: true,
                  },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(out).toContain('if (data["meta"])');
    expect(out).toContain('if (typeof data["meta"]["placedAt"] === "string")');
    expect(out).toContain('data["meta"]["placedAt"] = new Date(data["meta"]["placedAt"]);');
  });

  it('recurses into an array of inline objects with dates', () => {
    const out = render([
      {
        name: 'Bundle',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'items',
              required: true,
              schema: {
                kind: 'array',
                items: {
                  kind: 'object',
                  properties: [
                    {
                      name: 'shippedAt',
                      schema: {
                        kind: 'scalar',
                        scalar: 'string',
                        metadata: { format: 'date-time' },
                      },
                      required: true,
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    ]);
    expect(out).toContain('data["items"].forEach(item =>');
    expect(out).toContain('if (typeof item["shippedAt"] === "string")');
    expect(out).toContain('item["shippedAt"] = new Date(item["shippedAt"]);');
  });

  it('handles a top-level array named schema of date scalars', () => {
    const out = render([
      {
        name: 'Dates',
        schema: {
          kind: 'array',
          items: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
        },
      },
    ]);
    expect(out).toContain('export const transformDates = (data: Dates): Dates =>');
    expect(out).toContain('if (Array.isArray(data))');
    expect(out).toContain('data = data.map(v => new Date(v));');
  });

  it('handles a top-level ref-to-date named schema', () => {
    const out = render([
      {
        name: 'Inner',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'Alias',
        schema: { kind: 'ref', name: 'Inner' },
      },
    ]);
    expect(out).toContain('export const transformAlias');
    expect(out).toContain('transformInner(data)');
  });

  it('walks union members that bear dates', () => {
    const out = render([
      {
        name: 'A',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'when',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'Holder',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'value',
              required: true,
              schema: {
                kind: 'union',
                members: [
                  { kind: 'ref', name: 'A' },
                  { kind: 'scalar', scalar: 'string' },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(out).toContain('export const transformHolder');
    // The union member's transform must be guarded by a runtime object-check and
    // CAST to the member type — `data["value"]` is typed `A | string`, so a bare
    // `transformA(data["value"])` would fail strict tsc (TS2345). The cast makes
    // it compile; `transformA`'s own internal string guard keeps it a runtime
    // no-op when the value is the string member.
    expect(out).toContain('if (data["value"] && typeof data["value"] === "object")');
    expect(out).toContain('transformA(data["value"] as A);');
  });

  it('guards + casts each date-bearing ref in a union of refs', () => {
    const out = render([
      {
        name: 'A',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'when',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'B',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'on',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'Holder',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'value',
              required: true,
              schema: {
                kind: 'union',
                members: [
                  { kind: 'ref', name: 'A' },
                  { kind: 'ref', name: 'B' },
                ],
              },
            },
          ],
        },
      },
    ]);
    // Both date-bearing members share one object-guard block; each transform is
    // cast to its member type and is internally string-guarded, so applying the
    // wrong member to a runtime value is a safe no-op.
    expect(out).toContain('if (data["value"] && typeof data["value"] === "object")');
    expect(out).toContain('transformA(data["value"] as A);');
    expect(out).toContain('transformB(data["value"] as B);');
  });

  it('keeps the string guard for a date-scalar union member', () => {
    const out = render([
      {
        name: 'H',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'v',
              required: true,
              schema: {
                kind: 'union',
                members: [
                  { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                  { kind: 'scalar', scalar: 'number' },
                ],
              },
            },
          ],
        },
      },
    ]);
    // A scalar date member's type is `Date` under --date-type Date, so the
    // assignment type-checks against the `string` guard — no object-guard needed.
    expect(out).toContain('if (typeof data["v"] === "string")');
    expect(out).toContain('data["v"] = new Date(data["v"]);');
    expect(out).not.toContain('typeof data["v"] === "object"');
  });

  it('skips a date-free ref member of a union', () => {
    const out = render([
      {
        name: 'Plain',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
          ],
        },
      },
      {
        name: 'A',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'when',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'H',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'v',
              required: true,
              schema: {
                kind: 'union',
                members: [
                  { kind: 'ref', name: 'Plain' },
                  { kind: 'ref', name: 'A' },
                ],
              },
            },
          ],
        },
      },
    ]);
    expect(out).toContain('transformA(data["v"] as A);');
    expect(out).not.toContain('transformPlain');
  });

  it('guards then recurses into an inline-object union member with a date', () => {
    const out = render([
      {
        name: 'H',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'v',
              required: true,
              schema: {
                kind: 'union',
                members: [
                  {
                    kind: 'object',
                    properties: [
                      {
                        name: 'at',
                        schema: {
                          kind: 'scalar',
                          scalar: 'string',
                          metadata: { format: 'date-time' },
                        },
                        required: true,
                      },
                    ],
                  },
                  { kind: 'scalar', scalar: 'string' },
                ],
              },
            },
          ],
        },
      },
    ]);
    // The object-guard narrows the union to its object member, so the inner
    // property access + string-guarded assign type-checks.
    expect(out).toContain('if (data["v"] && typeof data["v"] === "object")');
    expect(out).toContain('if (typeof data["v"]["at"] === "string")');
    expect(out).toContain('data["v"]["at"] = new Date(data["v"]["at"]);');
  });

  it('writes back into a record of date scalars by key', () => {
    const out = render([
      {
        name: 'Calendar',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'days',
              required: true,
              schema: {
                kind: 'record',
                value: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
              },
            },
          ],
        },
      },
    ]);
    // Records of date scalars must write back through the slot — a forEach loop
    // variable can't, so iterate the keys and assign into the record.
    expect(out).toContain('if (data["days"])');
    expect(out).toContain('for (const __k of Object.keys(data["days"]))');
    expect(out).toContain('if (typeof data["days"][__k] === "string")');
    expect(out).toContain('data["days"][__k] = new Date(data["days"][__k]);');
  });

  it('does not iterate a record whose values bear no dates', () => {
    const out = render([
      {
        name: 'Mixed',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'tags',
              required: true,
              schema: { kind: 'record', value: { kind: 'scalar', scalar: 'string' } },
            },
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).not.toContain('Object.values(data["tags"])');
    expect(out).toContain('data["at"] = new Date(data["at"]);');
  });

  it('walks intersection members that bear dates', () => {
    const out = render([
      {
        name: 'WithDate',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'on',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } },
              required: true,
            },
          ],
        },
      },
      {
        name: 'Combined',
        schema: {
          kind: 'intersection',
          members: [
            { kind: 'ref', name: 'WithDate' },
            {
              kind: 'object',
              properties: [
                { name: 'note', schema: { kind: 'scalar', scalar: 'string' }, required: true },
              ],
            },
          ],
        },
      },
    ]);
    expect(out).toContain('export const transformCombined');
    expect(out).toContain('transformWithDate(data);');
  });

  it('omits an array-of-refs to a date-free schema', () => {
    const out = render([
      {
        name: 'Plain',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
          ],
        },
      },
      {
        name: 'Wrapper',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'list',
              schema: { kind: 'array', items: { kind: 'ref', name: 'Plain' } },
              required: true,
            },
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).not.toContain('data["list"].forEach');
    expect(out).toContain('data["at"] = new Date(data["at"]);');
  });

  it('iterates nested loop vars for arrays of arrays of dates', () => {
    const out = render([
      {
        name: 'Grid',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'rows',
              required: true,
              schema: {
                kind: 'array',
                items: {
                  kind: 'array',
                  items: {
                    kind: 'object',
                    properties: [
                      {
                        name: 'at',
                        schema: {
                          kind: 'scalar',
                          scalar: 'string',
                          metadata: { format: 'date-time' },
                        },
                        required: true,
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ]);
    expect(out).toContain('data["rows"].forEach(item =>');
    expect(out).toContain('item.forEach(item1 =>');
    expect(out).toContain('item1["at"] = new Date(item1["at"]);');
  });

  it('maps-and-reassigns an array of arrays of date scalars', () => {
    const out = render([
      {
        name: 'Matrix',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'rows',
              required: true,
              schema: {
                kind: 'array',
                items: {
                  kind: 'array',
                  items: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
              },
            },
          ],
        },
      },
    ]);
    // Scalar elements are replace-by-value: reassigning a loop var is lost, so we
    // map and write back into the slot at every array level.
    expect(out).toContain('if (Array.isArray(data["rows"]))');
    expect(out).toContain('data["rows"] = data["rows"].map(row => row.map(v => new Date(v)));');
  });

  it('maps-and-reassigns a three-level array of date scalars with distinct vars', () => {
    const out = render([
      {
        name: 'Cube',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'c',
              required: true,
              schema: {
                kind: 'array',
                items: {
                  kind: 'array',
                  items: {
                    kind: 'array',
                    items: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                  },
                },
              },
            },
          ],
        },
      },
    ]);
    // Each array level gets a distinct map var (`row`, `row2`, `v`) to avoid
    // shadowing; every level maps-and-reassigns up to the slot.
    expect(out).toContain(
      'data["c"] = data["c"].map(row => row.map(row2 => row2.map(v => new Date(v))));'
    );
  });

  it('iterates a record of date-bearing objects via Object.values', () => {
    const out = render([
      {
        name: 'M',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'm',
              required: true,
              schema: {
                kind: 'record',
                value: {
                  kind: 'object',
                  properties: [
                    {
                      name: 'at',
                      schema: {
                        kind: 'scalar',
                        scalar: 'string',
                        metadata: { format: 'date-time' },
                      },
                      required: true,
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    ]);
    // Objects mutate in place, so a forEach over the values is enough — no
    // per-key write-back needed (unlike record-of-scalars).
    expect(out).toContain('if (data["m"])');
    expect(out).toContain('Object.values(data["m"]).forEach(item =>');
    expect(out).toContain('if (typeof item["at"] === "string")');
    expect(out).toContain('item["at"] = new Date(item["at"]);');
  });

  it('maps-and-reassigns each slot of a record of arrays of date scalars', () => {
    const out = render([
      {
        name: 'Buckets',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'b',
              required: true,
              schema: {
                kind: 'record',
                value: {
                  kind: 'array',
                  items: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
                },
              },
            },
          ],
        },
      },
    ]);
    expect(out).toContain('if (data["b"])');
    expect(out).toContain('for (const __k of Object.keys(data["b"]))');
    expect(out).toContain('if (Array.isArray(data["b"][__k]))');
    expect(out).toContain('data["b"][__k] = data["b"][__k].map(v => new Date(v));');
  });

  it('skips a date-free nested inline object sibling', () => {
    const out = render([
      {
        name: 'Doc',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'meta',
              required: false,
              schema: {
                kind: 'object',
                properties: [
                  { name: 'title', schema: { kind: 'scalar', scalar: 'string' }, required: true },
                ],
              },
            },
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).not.toContain('if (data["meta"])');
    expect(out).toContain('data["at"] = new Date(data["at"]);');
  });

  it('ignores a ref to a name absent from the model', () => {
    const out = render([
      {
        name: 'Card',
        schema: {
          kind: 'object',
          properties: [
            { name: 'link', schema: { kind: 'ref', name: 'Missing' }, required: false },
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
          ],
        },
      },
    ]);
    expect(out).not.toContain('data["link"]');
    expect(out).toContain('data["at"] = new Date(data["at"]);');
  });

  it('guards ref cycles via a visited set', () => {
    const out = render([
      {
        name: 'Node',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'at',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
              required: true,
            },
            { name: 'next', schema: { kind: 'ref', name: 'Node' }, required: false },
          ],
        },
      },
    ]);
    expect(out).toContain('export const transformNode');
    expect(out).toContain('if (data["next"])');
    expect(out).toContain('transformNode(data["next"]);');
  });
});
