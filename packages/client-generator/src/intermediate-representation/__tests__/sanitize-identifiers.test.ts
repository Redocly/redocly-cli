import type { ApiModel, OperationModel, SchemaModel } from '../model.js';
import { assertSafeIdentifiers, sanitizeIdentifiers } from '../sanitize-identifiers.js';

function model(schemas: ApiModel['schemas'], operations: OperationModel[] = []): ApiModel {
  return {
    title: 'T',
    version: '1',
    serverUrl: '',
    services: [{ name: 'Default', operations }],
    schemas,
    securitySchemes: [],
  };
}

function op(partial: Partial<OperationModel>): OperationModel {
  return {
    name: 'op',
    method: 'get',
    path: '/',
    pathParams: [],
    queryParams: [],
    headerParams: [],
    cookieParams: [],
    successResponses: [],
    errorResponses: [],
    tags: [],
    security: [],
    ...partial,
  };
}

const ref = (name: string): SchemaModel => ({ kind: 'ref', name });

describe('sanitizeIdentifiers', () => {
  it('renames a non-identifier schema name and rewrites refs that target it', () => {
    const m = model([
      { name: 'Bad.Name', schema: { kind: 'object', properties: [] } },
      {
        name: 'Holder',
        schema: {
          kind: 'object',
          properties: [{ name: 'x', schema: ref('Bad.Name'), required: true }],
        },
      },
    ]);
    sanitizeIdentifiers(m);
    expect(m.schemas[0].name).toBe('Bad_Name');
    const holder = m.schemas[1].schema as Extract<SchemaModel, { kind: 'object' }>;
    expect(holder.properties[0].schema).toEqual(ref('Bad_Name'));
  });

  it('renames an operation whose name collides with a schema', () => {
    // Rebilly shape: operationId `PatchCreditMemo` AND schema `PatchCreditMemo`. The
    // free function's own signature (`body: PatchCreditMemo`) would resolve to the
    // function value, and the entry's `export *` would drop the shadowed type.
    const m = model(
      [{ name: 'PatchCreditMemo', schema: { kind: 'object', properties: [] } }],
      [op({ name: 'PatchCreditMemo' })]
    );
    sanitizeIdentifiers(m);
    expect(m.schemas[0].name).toBe('PatchCreditMemo');
    expect(m.services[0].operations[0].name).toBe('PatchCreditMemo_2');
    expect(m.services[0].operations[0].specName).toBe('PatchCreditMemo');
  });

  it('leaves valid identifier names untouched', () => {
    const m = model(
      [{ name: 'Pet', schema: { kind: 'scalar', scalar: 'string' } }],
      [op({ name: 'getPet' })]
    );
    sanitizeIdentifiers(m);
    expect(m.schemas[0].name).toBe('Pet');
    expect(m.services[0].operations[0].name).toBe('getPet');
  });

  it('rewrites refs through array, record, union (with and without discriminator), and intersection', () => {
    const m = model([
      { name: 'A.B', schema: { kind: 'object', properties: [] } },
      { name: 'Arr', schema: { kind: 'array', items: ref('A.B') } },
      { name: 'Rec', schema: { kind: 'record', value: ref('A.B') } },
      {
        name: 'Uni',
        schema: {
          kind: 'union',
          members: [ref('A.B'), { kind: 'scalar', scalar: 'string' }],
          discriminator: { propertyName: 'k', mapping: [{ value: 'a', schemaName: 'A.B' }] },
        },
      },
      { name: 'Plain', schema: { kind: 'union', members: [ref('A.B'), { kind: 'null' }] } },
      { name: 'Inter', schema: { kind: 'intersection', members: [ref('A.B')] } },
    ]);
    sanitizeIdentifiers(m);
    expect((m.schemas[1].schema as Extract<SchemaModel, { kind: 'array' }>).items).toEqual(
      ref('A_B')
    );
    expect((m.schemas[2].schema as Extract<SchemaModel, { kind: 'record' }>).value).toEqual(
      ref('A_B')
    );
    const uni = m.schemas[3].schema as Extract<SchemaModel, { kind: 'union' }>;
    expect(uni.members[0]).toEqual(ref('A_B'));
    expect(uni.discriminator?.mapping[0].schemaName).toBe('A_B');
    expect(
      (m.schemas[5].schema as Extract<SchemaModel, { kind: 'intersection' }>).members[0]
    ).toEqual(ref('A_B'));
  });

  it('rewrites an `omit` base that targets a renamed schema', () => {
    const m = model([
      { name: 'Bad.Name', schema: { kind: 'object', properties: [] } },
      { name: 'Body', schema: { kind: 'omit', base: 'Bad.Name', keys: ['id'] } },
    ]);
    sanitizeIdentifiers(m);
    expect((m.schemas[1].schema as Extract<SchemaModel, { kind: 'omit' }>).base).toBe('Bad_Name');
  });

  it('sanitizes a dangling ref whose target has no declaration', () => {
    const m = model([{ name: 'Holder', schema: { kind: 'array', items: ref('Un.known') } }]);
    sanitizeIdentifiers(m);
    expect((m.schemas[0].schema as Extract<SchemaModel, { kind: 'array' }>).items).toEqual(
      ref('Un_known')
    );
  });

  it('uniquifies schema names that sanitize to the same identifier, refs following each', () => {
    const m = model([
      { name: 'A.B', schema: { kind: 'object', properties: [] } },
      { name: 'A-B', schema: { kind: 'object', properties: [] } },
      {
        name: 'Holder',
        schema: {
          kind: 'object',
          properties: [
            { name: 'x', schema: ref('A.B'), required: true },
            { name: 'y', schema: ref('A-B'), required: true },
          ],
        },
      },
    ]);
    sanitizeIdentifiers(m);
    expect(m.schemas[0].name).toBe('A_B');
    expect(m.schemas[1].name).toBe('A_B_2');
    const holder = m.schemas[2].schema as Extract<SchemaModel, { kind: 'object' }>;
    expect(holder.properties[0].schema).toEqual(ref('A_B'));
    expect(holder.properties[1].schema).toEqual(ref('A_B_2'));
  });

  it('renames a non-identifier security-scheme key and rewrites operation.security to match', () => {
    const m = model([], [op({ name: 'getX', security: [['k(){};evil', 'clean']] })]);
    m.securitySchemes = [
      { kind: 'apiKeyHeader', key: 'k(){};evil', headerName: 'X-Api-Key' },
      { kind: 'apiKeyHeader', key: 'clean', headerName: 'X-Other' },
    ];
    sanitizeIdentifiers(m);
    expect(m.securitySchemes[0].key).toBe('k_____evil');
    expect(m.securitySchemes[1].key).toBe('clean');
    // The operation's security list follows the rename so the runtime literals match.
    expect(m.services[0].operations[0].security).toEqual([['k_____evil', 'clean']]);
  });

  it('sanitizes an operation.security entry with no matching scheme', () => {
    const m = model([], [op({ name: 'getX', security: [['gone.key']] })]);
    sanitizeIdentifiers(m);
    expect(m.services[0].operations[0].security).toEqual([['gone_key']]);
  });

  it('renames operations and rewrites refs in every operation slot', () => {
    const m = model(
      [{ name: 'A.B', schema: { kind: 'object', properties: [] } }],
      [
        op({
          name: 'do-thing',
          pathParams: [{ name: 'id', in: 'path', schema: ref('A.B'), required: true }],
          queryParams: [{ name: 'q', in: 'query', schema: ref('A.B'), required: false }],
          headerParams: [{ name: 'h', in: 'header', schema: ref('A.B'), required: false }],
          requestBody: { contentType: 'application/json', schema: ref('A.B'), required: true },
          successResponses: [
            {
              contentType: 'application/json',
              schema: ref('A.B'),
              itemSchema: ref('A.B'),
              status: 200,
            },
          ],
          errorResponses: [{ contentType: 'application/json', schema: ref('A.B'), status: 200 }],
        }),
      ]
    );
    sanitizeIdentifiers(m);
    const o = m.services[0].operations[0];
    expect(o.name).toBe('do_thing');
    // The spec operationId survives the rename so user config keys can still match.
    expect(o.specName).toBe('do-thing');
    expect(o.pathParams[0].schema).toEqual(ref('A_B'));
    expect(o.queryParams[0].schema).toEqual(ref('A_B'));
    expect(o.headerParams[0].schema).toEqual(ref('A_B'));
    expect(o.requestBody?.schema).toEqual(ref('A_B'));
    expect(o.successResponses[0].schema).toEqual(ref('A_B'));
    expect(o.successResponses[0].itemSchema).toEqual(ref('A_B'));
    expect(o.errorResponses[0].schema).toEqual(ref('A_B'));
  });
});

describe('assertSafeIdentifiers', () => {
  it('passes for a fully sanitized model', () => {
    const m = model(
      [{ name: 'Pet', schema: { kind: 'object', properties: [] } }],
      [op({ name: 'getPet' })]
    );
    expect(() => assertSafeIdentifiers(m)).not.toThrow();
  });

  it('throws when a schema name is not a safe identifier', () => {
    const m = model([{ name: 'Bad.Name', schema: { kind: 'object', properties: [] } }]);
    expect(() => assertSafeIdentifiers(m)).toThrow(/schema name .* is not a safe identifier/);
  });

  it('throws when an operation name is not a safe identifier', () => {
    const m = model([], [op({ name: 'bad-op' })]);
    expect(() => assertSafeIdentifiers(m)).toThrow(/operation name .* is not a safe identifier/);
  });

  it('throws when a security-scheme key is not a safe identifier', () => {
    const m = model([]);
    m.securitySchemes = [{ kind: 'apiKeyHeader', key: 'bad.key', headerName: 'X' }];
    expect(() => assertSafeIdentifiers(m)).toThrow(
      /security scheme name .* is not a safe identifier/
    );
  });
});
