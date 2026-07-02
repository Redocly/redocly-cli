import type { NamedSchemaModel, SchemaModel } from '../../intermediate-representation/model.js';
import { fakerExpression } from '../faker.js';
import { printNodes } from '../ts.js';

/** Emit `schema`'s faker expression and print it to source for substring assertions. */
function emit(
  schema: SchemaModel,
  schemas: NamedSchemaModel[] = [],
  dateType?: 'string' | 'Date'
): string {
  return printNodes([fakerExpression(schema, schemas, { dateType })]);
}

describe('fakerExpression', () => {
  it('maps a boolean scalar to faker.datatype.boolean()', () => {
    expect(emit({ kind: 'scalar', scalar: 'boolean' })).toContain('faker.datatype.boolean()');
  });

  it('maps an integer scalar to faker.number.int()', () => {
    expect(emit({ kind: 'scalar', scalar: 'integer' })).toBe('faker.number.int()');
  });

  it('passes { min, max } to faker.number.int when bounds are present', () => {
    const out = emit({ kind: 'scalar', scalar: 'integer', metadata: { minimum: 1, maximum: 9 } });
    expect(out).toContain('faker.number.int(');
    expect(out).toContain('min: 1');
    expect(out).toContain('max: 9');
  });

  it('maps a number scalar to faker.number.float(), respecting bounds', () => {
    expect(emit({ kind: 'scalar', scalar: 'number' })).toBe('faker.number.float()');
    const out = emit({ kind: 'scalar', scalar: 'number', metadata: { minimum: 0, maximum: 1 } });
    expect(out).toContain('faker.number.float(');
    expect(out).toContain('min: 0');
    expect(out).toContain('max: 1');
  });

  it('maps string formats to the matching faker call', () => {
    const str = (format: string) =>
      emit({ kind: 'scalar', scalar: 'string', metadata: { format } });
    expect(str('email')).toBe('faker.internet.email()');
    expect(str('uuid')).toBe('faker.string.uuid()');
    expect(str('uri')).toBe('faker.internet.url()');
    expect(str('url')).toBe('faker.internet.url()');
    expect(str('hostname')).toBe('faker.internet.domainName()');
    expect(str('ipv4')).toBe('faker.internet.ipv4()');
  });

  it('maps date-time/date to faker.date.recent() honoring dateType', () => {
    const dt = { kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } } as const;
    const d = { kind: 'scalar', scalar: 'string', metadata: { format: 'date' } } as const;
    expect(emit(dt, [], 'Date')).toBe('faker.date.recent()');
    expect(emit(dt, [], 'string')).toBe('faker.date.recent().toISOString()');
    expect(emit(d, [], 'Date')).toBe('faker.date.recent()');
    expect(emit(d, [], 'string')).toBe('faker.date.recent().toISOString().slice(0, 10)');
  });

  it('maps a binary field to new Blob([]) (faker cannot make a Blob)', () => {
    expect(emit({ kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } })).toBe(
      'new Blob([])'
    );
  });

  it('falls back to faker.lorem.word() for a plain string', () => {
    expect(emit({ kind: 'scalar', scalar: 'string' })).toBe('faker.lorem.word()');
  });

  it('maps an enum to faker.helpers.arrayElement([...] as const)', () => {
    const out = emit({ kind: 'enum', scalar: 'string', values: ['a', 'b'] });
    expect(out).toContain('faker.helpers.arrayElement(');
    expect(out).toContain('"a"');
    expect(out).toContain('"b"');
    expect(out).toContain('as const');
  });

  it('emits a literal value as-is (a const cannot be randomized)', () => {
    expect(emit({ kind: 'literal', value: 'fixed' })).toBe('"fixed"');
    expect(emit({ kind: 'literal', value: 42 })).toBe('42');
    expect(emit({ kind: 'literal', value: -3 })).toBe('-3');
    expect(emit({ kind: 'literal', value: true })).toBe('true');
  });

  it('maps an array to faker.helpers.multiple(() => <item>, { count: 1 })', () => {
    const out = emit({ kind: 'array', items: { kind: 'scalar', scalar: 'boolean' } });
    expect(out).toContain('faker.helpers.multiple(');
    expect(out).toContain('faker.datatype.boolean()');
    expect(out).toContain('count: 1');
  });

  it('maps an object to an object literal of per-property faker exprs', () => {
    const out = emit({
      kind: 'object',
      properties: [
        { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
        { name: 'x-h', schema: { kind: 'scalar', scalar: 'string' }, required: true },
      ],
    });
    expect(out).toContain('id: faker.number.int()');
    expect(out).toContain('"x-h": faker.lorem.word()');
  });

  it('maps a record to { key: <value expr> }', () => {
    const out = emit({ kind: 'record', value: { kind: 'scalar', scalar: 'boolean' } });
    expect(out).toContain('key: faker.datatype.boolean()');
  });

  it('uses the first member of a union', () => {
    const out = emit({
      kind: 'union',
      members: [
        { kind: 'scalar', scalar: 'boolean' },
        { kind: 'scalar', scalar: 'integer' },
      ],
    });
    expect(out).toBe('faker.datatype.boolean()');
  });

  it('emits null for an empty union', () => {
    expect(emit({ kind: 'union', members: [] })).toBe('null');
  });

  it('merges object members of an intersection', () => {
    const out = emit({
      kind: 'intersection',
      members: [
        {
          kind: 'object',
          properties: [
            { name: 'a', schema: { kind: 'scalar', scalar: 'boolean' }, required: true },
          ],
        },
        {
          kind: 'object',
          properties: [
            { name: 'b', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
          ],
        },
        // a non-object member contributes nothing
        { kind: 'scalar', scalar: 'string' },
      ],
    });
    expect(out).toContain('a: faker.datatype.boolean()');
    expect(out).toContain('b: faker.number.int()');
    expect(out).not.toContain('faker.lorem.word()');
  });

  it('resolves a ref and inlines its faker expr', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Pet',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
          ],
        },
      },
    ];
    const out = emit({ kind: 'ref', name: 'Pet' }, schemas);
    expect(out).toContain('id: faker.number.int()');
    // Inlined — NOT a createPet() factory call (that would infinitely recurse on cycles).
    expect(out).not.toContain('createPet');
  });

  it('emits null for an unresolvable ref', () => {
    expect(emit({ kind: 'ref', name: 'Missing' }, [])).toBe('null');
  });

  it('terminates a cyclic ref with null', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Node',
        schema: {
          kind: 'object',
          properties: [
            { name: 'value', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            { name: 'next', schema: { kind: 'ref', name: 'Node' }, required: true },
          ],
        },
      },
    ];
    const out = emit({ kind: 'ref', name: 'Node' }, schemas);
    expect(out).toContain('value: faker.number.int()');
    expect(out).toContain('next: null');
  });

  it('terminates a cyclic ref behind an ARRAY with an empty array (a valid `T[]`, not `[null]`)', () => {
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
    const out = emit({ kind: 'ref', name: 'Category' }, schemas);
    expect(out).toContain('children: []');
    expect(out).not.toContain('null');
  });

  it('terminates a cyclic ref behind an OPTIONAL property by omitting it', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Node',
        schema: {
          kind: 'object',
          properties: [
            { name: 'value', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            { name: 'next', schema: { kind: 'ref', name: 'Node' }, required: false },
          ],
        },
      },
    ];
    const out = emit({ kind: 'ref', name: 'Node' }, schemas);
    expect(out).toContain('value: faker.number.int()');
    expect(out).not.toContain('next');
  });

  it('terminates a cyclic ref behind a RECORD with an empty object', () => {
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
    const out = emit({ kind: 'ref', name: 'Tree' }, schemas);
    expect(out).toContain('nodes: {}');
    expect(out).not.toContain('null');
  });

  it('resolves a self-referential union with no inhabitable member to null', () => {
    const schemas: NamedSchemaModel[] = [
      { name: 'A', schema: { kind: 'union', members: [{ kind: 'ref', name: 'A' }] } },
    ];
    expect(emit({ kind: 'ref', name: 'A' }, schemas)).toBe('null');
  });

  it('builds an omit as the base faker expr minus the dropped keys', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Pet',
        schema: {
          kind: 'object',
          properties: [
            { name: 'id', schema: { kind: 'scalar', scalar: 'integer' }, required: true },
            { name: 'name', schema: { kind: 'scalar', scalar: 'string' }, required: true },
          ],
        },
      },
    ];
    const out = emit({ kind: 'omit', base: 'Pet', keys: ['id'] }, schemas);
    expect(out).toContain('name: faker.lorem.word()');
    expect(out).not.toContain('id:');
  });

  it('emits null for an omit whose base is unresolvable', () => {
    expect(emit({ kind: 'omit', base: 'Missing', keys: [] }, [])).toBe('null');
  });

  it('emits the base expr unchanged for an omit whose base is not an object', () => {
    const schemas: NamedSchemaModel[] = [
      { name: 'Name', schema: { kind: 'scalar', scalar: 'string' } },
    ];
    expect(emit({ kind: 'omit', base: 'Name', keys: ['x'] }, schemas)).toBe('faker.lorem.word()');
  });

  it('emits null for null and unknown schemas', () => {
    expect(emit({ kind: 'null' })).toBe('null');
    expect(emit({ kind: 'unknown' })).toBe('null');
  });

  it('ignores example/default (faker mode generates data)', () => {
    const out = emit({ kind: 'scalar', scalar: 'string', metadata: { example: 'ignored' } });
    expect(out).toBe('faker.lorem.word()');
  });

  it('defaults dateType to string when opts is omitted', () => {
    const out = printNodes([
      fakerExpression({ kind: 'scalar', scalar: 'string', metadata: { format: 'date-time' } }, []),
    ]);
    expect(out).toBe('faker.date.recent().toISOString()');
  });

  it('renders boolean enum values as literals', () => {
    const out = emit({ kind: 'enum', scalar: 'boolean', values: [true, false] });
    expect(out).toContain('true');
    expect(out).toContain('false');
  });

  it('drops a quoted (non-identifier) key from an omit', () => {
    const schemas: NamedSchemaModel[] = [
      {
        name: 'Trace',
        schema: {
          kind: 'object',
          properties: [
            { name: 'x-id', schema: { kind: 'scalar', scalar: 'string' }, required: true },
            { name: 'ok', schema: { kind: 'scalar', scalar: 'boolean' }, required: true },
          ],
        },
      },
    ];
    const out = emit({ kind: 'omit', base: 'Trace', keys: ['x-id'] }, schemas);
    expect(out).not.toContain('x-id');
    expect(out).toContain('ok: faker.datatype.boolean()');
  });

  it('still honors a binary type-demand over an example', () => {
    const out = emit({
      kind: 'scalar',
      scalar: 'string',
      metadata: { format: 'binary', example: 'ignored' },
    });
    expect(out).toBe('new Blob([])');
  });
});
