import type { NamedSchemaModel, SchemaModel } from '../../intermediate-representation/model.js';
import { sampleValue, SampleExpression } from '../sample.js';

describe('sampleValue', () => {
  it('samples scalars with deterministic, format-aware values', () => {
    expect(sampleValue({ kind: 'scalar', scalar: 'string' }, [])).toBe('string');
    expect(sampleValue({ kind: 'scalar', scalar: 'integer' }, [])).toBe(0);
    expect(sampleValue({ kind: 'scalar', scalar: 'number' }, [])).toBe(0);
    expect(sampleValue({ kind: 'scalar', scalar: 'boolean' }, [])).toBe(true);
    expect(
      sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'email' } }, [])
    ).toBe('user@example.com');
    expect(
      sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'uuid' } }, [])
    ).toBe('00000000-0000-4000-8000-000000000000');
    expect(
      sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } }, [])
    ).toBe('2024-01-01T00:00:00Z');
    expect(
      sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'date' } }, [])
    ).toBe('2024-01-01');
    expect(sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'uri' } }, [])).toBe(
      'https://example.com'
    );
    expect(sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'url' } }, [])).toBe(
      'https://example.com'
    );
  });

  it('samples a `format: binary` field as a `new Blob([])` raw expression (not a JSON literal)', () => {
    const sampled = sampleValue(
      { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
      []
    );
    expect(sampled).toBeInstanceOf(SampleExpression);
    expect((sampled as SampleExpression).code).toBe('new Blob([])');
  });

  it('samples a `format: binary` field as `new Blob([])` even when an example is present', () => {
    // The generated type is `Blob` regardless of any spec example, so baking the
    // example string would not type-check — the type-demanded expression wins.
    expect(
      sampleValue(
        { kind: 'scalar', scalar: 'string', metadata: { format: 'binary', example: 'AAAA' } },
        []
      )
    ).toBeInstanceOf(SampleExpression);
  });

  it('samples date/date-time as `new Date(...)` when dateType is `Date`', () => {
    const dt = sampleValue(
      { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } },
      [],
      { dateType: 'Date' }
    );
    expect(dt).toBeInstanceOf(SampleExpression);
    expect((dt as SampleExpression).code).toBe('new Date("2024-01-01T00:00:00Z")');

    const d = sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'date' } }, [], {
      dateType: 'Date',
    });
    expect((d as SampleExpression).code).toBe('new Date("2024-01-01")');
  });

  it('samples date-time as `new Date(...)` even with an example when dateType is `Date`', () => {
    expect(
      sampleValue(
        {
          kind: 'scalar',
          scalar: 'string',
          metadata: { format: 'date-time', example: '2020-05-05T00:00:00Z' },
        },
        [],
        { dateType: 'Date' }
      )
    ).toBeInstanceOf(SampleExpression);
  });

  it('under dateType `Date`, a non-date scalar still samples normally (no type demand)', () => {
    expect(
      sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'email' } }, [], {
        dateType: 'Date',
      })
    ).toBe('user@example.com');
  });

  it('regression: default dateType `string` bakes the ISO string and still honors an example', () => {
    expect(
      sampleValue({ kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } }, [])
    ).toBe('2024-01-01T00:00:00Z');
    expect(
      sampleValue(
        {
          kind: 'scalar',
          scalar: 'string',
          metadata: { format: 'date-time', example: '2020-01-01T00:00:00Z' },
        },
        []
      )
    ).toBe('2020-01-01T00:00:00Z');
  });

  it('prefers example then default over synthesis', () => {
    expect(
      sampleValue({ kind: 'scalar', scalar: 'string', metadata: { example: 'Ada' } }, [])
    ).toBe('Ada');
    expect(sampleValue({ kind: 'scalar', scalar: 'string', metadata: { default: 'D' } }, [])).toBe(
      'D'
    );
    expect(
      sampleValue(
        { kind: 'scalar', scalar: 'string', metadata: { example: 'E', default: 'D' } },
        []
      )
    ).toBe('E');
  });

  it('samples enum (first value) and literal (its value)', () => {
    expect(sampleValue({ kind: 'enum', scalar: 'string', values: ['a', 'b'] }, [])).toBe('a');
    expect(sampleValue({ kind: 'literal', value: 42 }, [])).toBe(42);
  });

  it('samples objects (all properties) and arrays (one item)', () => {
    const obj: SchemaModel = {
      kind: 'object',
      properties: [
        { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
        { name: 'tag', schema: { kind: 'scalar', scalar: 'string' }, required: false },
      ],
    };
    expect(sampleValue(obj, [])).toEqual({ id: 0, tag: 'string' });
    expect(
      sampleValue({ kind: 'array', items: { kind: 'scalar', scalar: 'boolean' } }, [])
    ).toEqual([true]);
  });

  it('resolves refs against the named-schema set', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Pet',
        schema: {
          kind: 'object',
          properties: [
            { name: 'name', schema: { kind: 'scalar', scalar: 'string' }, required: true },
          ],
        },
      },
    ];
    expect(sampleValue({ kind: 'ref', name: 'Pet' }, schemas)).toEqual({ name: 'string' });
  });

  it('returns null for an unresolved ref', () => {
    expect(sampleValue({ kind: 'ref', name: 'Missing' }, [])).toBeNull();
  });

  it('terminates a recursive ref behind an OPTIONAL property by omitting it (a null would not type-check)', () => {
    // `next?: Node` is `Node | undefined`; a `null` there is a TS2322. Omitting the
    // optional property is the type-correct way to break the cycle.
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Node',
        schema: {
          kind: 'object',
          properties: [{ name: 'next', schema: { kind: 'ref', name: 'Node' }, required: false }],
        },
      },
    ];
    expect(sampleValue({ kind: 'ref', name: 'Node' }, schemas)).toEqual({});
  });

  it('terminates a recursive ref behind an ARRAY with an empty array (a valid `T[]`)', () => {
    // A tree: `children: Category[]` (required). At the cycle the array must collapse to
    // `[]` — which IS a valid `Category[]` — rather than `[null]` (TS2322).
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Category',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            {
              name: 'children',
              schema: { kind: 'array', items: { kind: 'ref', name: 'Category' } },
              required: true,
            },
          ],
        },
      },
    ];
    expect(sampleValue({ kind: 'ref', name: 'Category' }, schemas)).toEqual({
      id: 0,
      children: [],
    });
  });

  it('terminates a recursive ref behind a RECORD with an empty record', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Tree',
        schema: {
          kind: 'object',
          properties: [
            {
              name: 'nodes',
              schema: { kind: 'record', value: { kind: 'ref', name: 'Tree' } },
              required: true,
            },
          ],
        },
      },
    ];
    expect(sampleValue({ kind: 'ref', name: 'Tree' }, schemas)).toEqual({
      nodes: {},
    });
  });

  it('a REQUIRED direct self-ref is genuinely uninhabitable, so it falls back to null', () => {
    // `self: Node` (required, not behind an array/optional) cannot be finitely constructed;
    // null is the only available stand-in (and the schema itself is uninhabitable).
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Node',
        schema: {
          kind: 'object',
          properties: [{ name: 'self', schema: { kind: 'ref', name: 'Node' }, required: true }],
        },
      },
    ];
    expect(sampleValue({ kind: 'ref', name: 'Node' }, schemas)).toEqual({ self: null });
  });

  it('a self-referential union with no inhabitable member resolves to null', () => {
    const schemas: NamedSchemaModel[] = [
      { name: 'A', schema: { kind: 'union', members: [{ kind: 'ref', name: 'A' }] } },
    ];
    expect(sampleValue({ kind: 'ref', name: 'A' }, schemas)).toBeNull();
  });

  it('samples union (first member), intersection (merged objects), null, unknown, record', () => {
    expect(
      sampleValue(
        { kind: 'union', members: [{ kind: 'literal', value: 'x' }, { kind: 'null' }] },
        []
      )
    ).toBe('x');
    expect(
      sampleValue(
        {
          kind: 'intersection',
          members: [
            {
              kind: 'object',
              properties: [
                { name: 'a', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
              ],
            },
            {
              kind: 'object',
              properties: [
                { name: 'b', schema: { kind: 'scalar', scalar: 'boolean' }, required: true },
              ],
            },
          ],
        },
        []
      )
    ).toEqual({ a: 0, b: true });
    expect(sampleValue({ kind: 'null' }, [])).toBeNull();
    expect(sampleValue({ kind: 'unknown' }, [])).toBeNull();
    expect(
      sampleValue({ kind: 'record', value: { kind: 'scalar', scalar: 'string' } }, [])
    ).toEqual({ key: 'string' });
  });

  it('samples omit by dropping the named keys from the base named schema', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Full',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            { name: 'secret', schema: { kind: 'scalar', scalar: 'string' }, required: false },
          ],
        },
      },
    ];
    // omit.base is a string (named schema reference), not a SchemaModel
    expect(sampleValue({ kind: 'omit', base: 'Full', keys: ['secret'] }, schemas)).toEqual({
      id: 0,
    });
  });

  it('returns null for omit with an unresolved base', () => {
    expect(sampleValue({ kind: 'omit', base: 'Missing', keys: ['x'] }, [])).toBeNull();
  });

  it('returns base value unchanged for omit when base resolves to a non-object', () => {
    const schemas: NamedSchemaModel[] = [
      { name: 'Scalar', schema: { kind: 'scalar', scalar: 'string' } },
    ];
    expect(sampleValue({ kind: 'omit', base: 'Scalar', keys: ['x'] }, schemas)).toBe('string');
  });

  it('omit does not mutate the base schema — sampling the same omit node twice yields independent objects', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Full',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            { name: 'secret', schema: { kind: 'scalar', scalar: 'string' }, required: false },
          ],
        },
      },
    ];
    const omitSchema: SchemaModel = { kind: 'omit', base: 'Full', keys: ['secret'] };
    // First sample should drop 'secret'
    const first = sampleValue(omitSchema, schemas) as Record<string, unknown>;
    expect(first).toEqual({ id: 0 });
    // The base named schema 'Full' must still produce both keys (no mutation leaked)
    expect(sampleValue({ kind: 'ref', name: 'Full' }, schemas)).toEqual({
      id: 0,
      secret: 'string',
    });
    // Second omit sample must still work correctly
    const second = sampleValue(omitSchema, schemas) as Record<string, unknown>;
    expect(second).toEqual({ id: 0 });
  });

  it('returns null for a union with no members', () => {
    expect(sampleValue({ kind: 'union', members: [] }, [])).toBeNull();
  });

  it('a scalar-narrowing intersection (enum ref + unmodeled `not`) samples the scalar member', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'PaymentMethod',
        schema: { kind: 'enum', scalar: 'string', values: ['payment-card', 'ach', 'other'] },
      },
    ];
    expect(
      sampleValue(
        {
          kind: 'intersection',
          members: [{ kind: 'ref', name: 'PaymentMethod' }, { kind: 'unknown' }],
        },
        schemas
      )
    ).toBe('payment-card');
  });

  it('a nullable date field under dateType Date samples new Date() even with an example', () => {
    const sampled = sampleValue(
      {
        kind: 'union',
        members: [
          { kind: 'scalar', scalar: 'string', metadata: { format: 'date', example: '1980-04-01' } },
          { kind: 'null' },
        ],
        metadata: { example: '1980-04-01' },
      },
      [],
      { dateType: 'Date' }
    );
    expect(sampled).toBeInstanceOf(SampleExpression);
    expect((sampled as SampleExpression).code).toBe('new Date("2024-01-01")');
  });

  it('intersection skips non-object members', () => {
    // A union member that resolves to a scalar (non-object) should be skipped in reduce
    expect(
      sampleValue(
        {
          kind: 'intersection',
          members: [
            { kind: 'scalar', scalar: 'string' },
            {
              kind: 'object',
              properties: [
                { name: 'a', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
              ],
            },
          ],
        },
        []
      )
    ).toEqual({ a: 0 });
  });
});
