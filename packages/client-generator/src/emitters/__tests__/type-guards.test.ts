import { emitClientSingleFile } from '../package-client.js';
import { apiModel, namedSchema } from './fixtures.js';

// The package arm keeps the emitted text free of the embedded runtime, so the
// absence assertions below test the schema types/guards alone.
const emitPackage: typeof emitClientSingleFile = (model, options = {}) =>
  emitClientSingleFile(model, { ...options, runtime: 'package' });

describe('discriminated-union type guards (C6.4)', () => {
  const beverage = namedSchema('Beverage', {
    kind: 'object',
    properties: [
      {
        name: 'category',
        schema: { kind: 'literal', value: 'beverage' },
        required: true,
      },
    ],
  });
  const dessert = namedSchema('Dessert', {
    kind: 'object',
    properties: [
      {
        name: 'category',
        schema: { kind: 'literal', value: 'dessert' },
        required: true,
      },
    ],
  });

  it('emits is<Member>() guards for an explicit discriminator', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          dessert,
          namedSchema('MenuItem', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'Beverage' },
              { kind: 'ref', name: 'Dessert' },
            ],
            discriminator: {
              propertyName: 'category',
              mapping: [
                { value: 'beverage', schemaName: 'Beverage' },
                { value: 'dessert', schemaName: 'Dessert' },
              ],
            },
          }),
        ],
      })
    );
    expect(out).toContain('export function isBeverage(value: MenuItem): value is Beverage {');
    expect(out).toContain('(value as Record<string, unknown>)["category"] === "beverage"');
    expect(out).toContain('export function isDessert(value: MenuItem): value is Dessert {');
    expect(out).toContain('(value as Record<string, unknown>)["category"] === "dessert"');
  });

  it('skips a discriminator entry whose target is not a named schema', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          namedSchema('MenuItem', {
            kind: 'union',
            members: [{ kind: 'ref', name: 'Beverage' }],
            discriminator: {
              propertyName: 'category',
              mapping: [
                { value: 'beverage', schemaName: 'Beverage' },
                { value: 'ghost', schemaName: 'NotAType' },
              ],
            },
          }),
        ],
      })
    );
    expect(out).toContain('export function isBeverage(');
    expect(out).not.toContain('isNotAType');
  });

  it('emits a single guard when two discriminant values map to the same type', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Pet', { kind: 'object', properties: [] }),
          namedSchema('Other', { kind: 'object', properties: [] }),
          namedSchema('Animal', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'Pet' },
              { kind: 'ref', name: 'Other' },
            ],
            discriminator: {
              propertyName: 'kind',
              mapping: [
                { value: 'dog', schemaName: 'Pet' },
                { value: 'puppy', schemaName: 'Pet' },
                { value: 'thing', schemaName: 'Other' },
              ],
            },
          }),
        ],
      })
    );
    expect(out.match(/export function isPet\(/g)).toHaveLength(1);
    expect(out).toContain(
      '(["dog", "puppy"] as readonly unknown[]).includes((value as Record<string, unknown>)["kind"])'
    );
  });

  it('synthesizes an implicit discriminator from a shared distinct string const', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          dessert,
          namedSchema('MenuItem', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'Beverage' },
              { kind: 'ref', name: 'Dessert' },
            ],
          }),
        ],
      })
    );
    expect(out).toContain('export function isBeverage(value: MenuItem): value is Beverage {');
    expect(out).toContain('(value as Record<string, unknown>)["category"] === "beverage"');
  });

  it('finds the implicit discriminant through intersection (allOf) members', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('A', {
            kind: 'intersection',
            members: [
              {
                kind: 'object',
                properties: [
                  {
                    name: 't',
                    schema: { kind: 'literal', value: 'a' },
                    required: true,
                  },
                ],
              },
              { kind: 'ref', name: 'Base' },
            ],
          }),
          namedSchema('B', {
            kind: 'intersection',
            members: [
              {
                kind: 'object',
                properties: [
                  {
                    name: 't',
                    schema: { kind: 'literal', value: 'b' },
                    required: true,
                  },
                ],
              },
              { kind: 'ref', name: 'Base' },
            ],
          }),
          namedSchema('AB', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'A' },
              { kind: 'ref', name: 'B' },
            ],
          }),
        ],
      })
    );
    expect(out).toContain('export function isA(value: AB): value is A {');
    expect(out).toContain('(value as Record<string, unknown>)["t"] === "a"');
  });

  it('emits no guards for an undiscriminated union (no shared const)', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('StringOrNumber', {
            kind: 'union',
            members: [
              { kind: 'scalar', scalar: 'string' },
              { kind: 'scalar', scalar: 'number' },
            ],
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });

  it('emits no implicit guard when a member is not a ref to a named schema', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          namedSchema('Mixed', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'Beverage' },
              { kind: 'scalar', scalar: 'string' },
            ],
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });

  it('emits no implicit guard when the shared const values are not distinct', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('X', {
            kind: 'object',
            properties: [
              {
                name: 'k',
                schema: { kind: 'literal', value: 'same' },
                required: true,
              },
            ],
          }),
          namedSchema('Y', {
            kind: 'object',
            properties: [
              {
                name: 'k',
                schema: { kind: 'literal', value: 'same' },
                required: true,
              },
            ],
          }),
          namedSchema('XY', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'X' },
              { kind: 'ref', name: 'Y' },
            ],
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });

  it('emits no implicit guard for a single-member union', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          namedSchema('Solo', {
            kind: 'union',
            members: [{ kind: 'ref', name: 'Beverage' }],
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });

  it('emits no implicit guard when a member ref points to an unknown schema', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          namedSchema('Ghosty', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'Beverage' },
              { kind: 'ref', name: 'DoesNotExist' },
            ],
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });

  it('emits no implicit guard when members pin different property names', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('P', {
            kind: 'object',
            properties: [
              {
                name: 'a',
                schema: { kind: 'literal', value: 'x' },
                required: true,
              },
            ],
          }),
          namedSchema('Q', {
            kind: 'object',
            properties: [
              {
                name: 'b',
                schema: { kind: 'literal', value: 'y' },
                required: true,
              },
            ],
          }),
          namedSchema('PQ', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'P' },
              { kind: 'ref', name: 'Q' },
            ],
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });

  it('ignores non-literal properties while detecting the implicit discriminant', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('R1', {
            kind: 'object',
            properties: [
              {
                name: 'note',
                schema: { kind: 'scalar', scalar: 'string' },
                required: false,
              },
              {
                name: 'kind',
                schema: { kind: 'literal', value: 'one' },
                required: true,
              },
            ],
          }),
          namedSchema('R2', {
            kind: 'object',
            properties: [
              {
                name: 'note',
                schema: { kind: 'scalar', scalar: 'string' },
                required: false,
              },
              {
                name: 'kind',
                schema: { kind: 'literal', value: 'two' },
                required: true,
              },
            ],
          }),
          namedSchema('R12', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'R1' },
              { kind: 'ref', name: 'R2' },
            ],
          }),
        ],
      })
    );
    expect(out).toContain('export function isR1(value: R12): value is R1 {');
    expect(out).toContain('(value as Record<string, unknown>)["kind"] === "one"');
  });

  it('emits guards for a discriminated union nested as array items', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('SuccessItem', {
            kind: 'object',
            properties: [
              { name: 'status', schema: { kind: 'literal', value: 'ok' }, required: true },
            ],
          }),
          namedSchema('ErrorItem', {
            kind: 'object',
            properties: [
              { name: 'status', schema: { kind: 'literal', value: 'error' }, required: true },
            ],
          }),
          // The union is the array's *items*, not a top-level named union.
          namedSchema('BulkResponse', {
            kind: 'array',
            items: {
              kind: 'union',
              members: [
                { kind: 'ref', name: 'SuccessItem' },
                { kind: 'ref', name: 'ErrorItem' },
              ],
              discriminator: {
                propertyName: 'status',
                mapping: [
                  { value: 'ok', schemaName: 'SuccessItem' },
                  { value: 'error', schemaName: 'ErrorItem' },
                ],
              },
            },
          }),
        ],
      })
    );
    // Param is the inline member union; predicate narrows to the named member.
    expect(out).toContain(
      'export function isSuccessItem(value: SuccessItem | ErrorItem): value is SuccessItem {'
    );
    expect(out).toContain(
      'export function isErrorItem(value: SuccessItem | ErrorItem): value is ErrorItem {'
    );
    expect(out).toContain('(value as Record<string, unknown>)["status"] === "ok"');
  });

  it('emits guards for a discriminated union nested under a record value', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Cat', {
            kind: 'object',
            properties: [
              { name: 'kind', schema: { kind: 'literal', value: 'cat' }, required: true },
            ],
          }),
          namedSchema('Dog', {
            kind: 'object',
            properties: [
              { name: 'kind', schema: { kind: 'literal', value: 'dog' }, required: true },
            ],
          }),
          namedSchema('PetMap', {
            kind: 'record',
            value: {
              kind: 'union',
              members: [
                { kind: 'ref', name: 'Cat' },
                { kind: 'ref', name: 'Dog' },
              ],
            },
          }),
        ],
      })
    );
    expect(out).toContain('export function isCat(value: Cat | Dog): value is Cat {');
    expect(out).toContain('export function isDog(value: Cat | Dog): value is Dog {');
  });

  it('emits guards for a discriminated union nested under an object property', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('Cat', {
            kind: 'object',
            properties: [
              { name: 'kind', schema: { kind: 'literal', value: 'cat' }, required: true },
            ],
          }),
          namedSchema('Dog', {
            kind: 'object',
            properties: [
              { name: 'kind', schema: { kind: 'literal', value: 'dog' }, required: true },
            ],
          }),
          namedSchema('Envelope', {
            kind: 'object',
            properties: [
              {
                name: 'pet',
                schema: {
                  kind: 'union',
                  members: [
                    { kind: 'ref', name: 'Cat' },
                    { kind: 'ref', name: 'Dog' },
                  ],
                },
                required: true,
              },
            ],
          }),
        ],
      })
    );
    // Implicit discriminator (shared distinct `kind` const) on a nested union.
    expect(out).toContain('export function isCat(value: Cat | Dog): value is Cat {');
    expect(out).toContain('export function isDog(value: Cat | Dog): value is Dog {');
  });

  it('emits a guard once when the same nested union appears in two schemas', () => {
    const item = (name: string, value: string) =>
      namedSchema(name, {
        kind: 'object',
        properties: [{ name: 'status', schema: { kind: 'literal', value }, required: true }],
      });
    const arrayOfUnion = (name: string) =>
      namedSchema(name, {
        kind: 'array',
        items: {
          kind: 'union',
          members: [
            { kind: 'ref', name: 'Ok' },
            { kind: 'ref', name: 'Err' },
          ],
          discriminator: {
            propertyName: 'status',
            mapping: [
              { value: 'ok', schemaName: 'Ok' },
              { value: 'error', schemaName: 'Err' },
            ],
          },
        },
      });
    const out = emitPackage(
      apiModel({
        schemas: [
          item('Ok', 'ok'),
          item('Err', 'error'),
          arrayOfUnion('ListA'),
          arrayOfUnion('ListB'),
        ],
      })
    );
    expect(out.match(/export function isOk\(/g)).toHaveLength(1);
    expect(out.match(/export function isErr\(/g)).toHaveLength(1);
  });

  it('prefers the top-level named union param when a member also nests elsewhere', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          dessert,
          // Top-level named union processed first → guard param is `MenuItem`.
          namedSchema('MenuItem', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'Beverage' },
              { kind: 'ref', name: 'Dessert' },
            ],
            discriminator: {
              propertyName: 'category',
              mapping: [
                { value: 'beverage', schemaName: 'Beverage' },
                { value: 'dessert', schemaName: 'Dessert' },
              ],
            },
          }),
          // Same members nested as array items; the dedup keeps the top-level guard.
          namedSchema('MenuList', {
            kind: 'array',
            items: {
              kind: 'union',
              members: [
                { kind: 'ref', name: 'Beverage' },
                { kind: 'ref', name: 'Dessert' },
              ],
              discriminator: {
                propertyName: 'category',
                mapping: [
                  { value: 'beverage', schemaName: 'Beverage' },
                  { value: 'dessert', schemaName: 'Dessert' },
                ],
              },
            },
          }),
        ],
      })
    );
    expect(out.match(/export function isBeverage\(/g)).toHaveLength(1);
    expect(out).toContain('export function isBeverage(value: MenuItem): value is Beverage {');
  });

  it('skips a nested union whose members are not all named refs', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          beverage,
          namedSchema('Wrapper', {
            kind: 'array',
            items: {
              kind: 'union',
              members: [
                { kind: 'ref', name: 'Beverage' },
                { kind: 'scalar', scalar: 'string' },
              ],
              discriminator: {
                propertyName: 'category',
                mapping: [{ value: 'beverage', schemaName: 'Beverage' }],
              },
            },
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });

  it('ignores non-string shared const when detecting implicit discriminators', () => {
    const out = emitPackage(
      apiModel({
        schemas: [
          namedSchema('N1', {
            kind: 'object',
            properties: [
              {
                name: 'v',
                schema: { kind: 'literal', value: 1 },
                required: true,
              },
            ],
          }),
          namedSchema('N2', {
            kind: 'object',
            properties: [
              {
                name: 'v',
                schema: { kind: 'literal', value: 2 },
                required: true,
              },
            ],
          }),
          namedSchema('N12', {
            kind: 'union',
            members: [
              { kind: 'ref', name: 'N1' },
              { kind: 'ref', name: 'N2' },
            ],
          }),
        ],
      })
    );
    expect(out).not.toContain('value is');
  });
});
