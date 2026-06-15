import type { OperationModel, SchemaModel } from '../model.js';
import { collectOperationRefs, collectSchemaRefs } from '../refs.js';

const ref = (name: string): SchemaModel => ({ kind: 'ref', name });

function operation(overrides: Partial<OperationModel> = {}): OperationModel {
  return {
    name: 'op',
    method: 'get',
    path: '/p',
    pathParams: [],
    queryParams: [],
    headerParams: [],
    successResponses: [],
    errorResponses: [],
    security: [],
    tags: [],
    ...overrides,
  };
}

describe('collectSchemaRefs', () => {
  it('collects a direct ref', () => {
    expect([...collectSchemaRefs(ref('Pet'))]).toEqual(['Pet']);
  });

  it('collects the base of an omit schema', () => {
    expect([...collectSchemaRefs({ kind: 'omit', base: 'Pet', keys: ['id'] })]).toEqual(['Pet']);
  });

  it('returns nothing for scalar / literal / enum / null / unknown', () => {
    expect([...collectSchemaRefs({ kind: 'scalar', scalar: 'string' })]).toEqual([]);
    expect([...collectSchemaRefs({ kind: 'literal', value: 'a' })]).toEqual([]);
    expect([...collectSchemaRefs({ kind: 'enum', values: ['a', 'b'], scalar: 'string' })]).toEqual(
      []
    );
    expect([...collectSchemaRefs({ kind: 'null' })]).toEqual([]);
    expect([...collectSchemaRefs({ kind: 'unknown' })]).toEqual([]);
  });

  it('recurses into array items', () => {
    expect([...collectSchemaRefs({ kind: 'array', items: ref('Pet') })]).toEqual(['Pet']);
  });

  it('recurses into record values', () => {
    expect([...collectSchemaRefs({ kind: 'record', value: ref('Pet') })]).toEqual(['Pet']);
  });

  it('recurses into object properties', () => {
    const schema: SchemaModel = {
      kind: 'object',
      properties: [
        { name: 'pet', schema: ref('Pet'), required: true },
        { name: 'owner', schema: ref('Owner'), required: false },
        { name: 'count', schema: { kind: 'scalar', scalar: 'integer' }, required: false },
      ],
    };
    expect([...collectSchemaRefs(schema)]).toEqual(['Pet', 'Owner']);
  });

  it('recurses into union members', () => {
    const schema: SchemaModel = { kind: 'union', members: [ref('Cat'), ref('Dog')] };
    expect([...collectSchemaRefs(schema)]).toEqual(['Cat', 'Dog']);
  });

  it('recurses into intersection members', () => {
    const schema: SchemaModel = { kind: 'intersection', members: [ref('A'), ref('B')] };
    expect([...collectSchemaRefs(schema)]).toEqual(['A', 'B']);
  });

  it('dedupes a ref that appears more than once', () => {
    const schema: SchemaModel = {
      kind: 'array',
      items: { kind: 'union', members: [ref('Pet'), ref('Pet')] },
    };
    expect([...collectSchemaRefs(schema)]).toEqual(['Pet']);
  });

  it('accumulates into a caller-provided set', () => {
    const into = new Set<string>(['Existing']);
    collectSchemaRefs(ref('Pet'), into);
    expect([...into]).toEqual(['Existing', 'Pet']);
  });
});

describe('collectOperationRefs', () => {
  it('gathers refs across path/query/header params, body, and responses', () => {
    const op = operation({
      pathParams: [{ name: 'id', in: 'path', required: true, schema: ref('PetId') }],
      queryParams: [{ name: 'filter', in: 'query', required: false, schema: ref('PetFilter') }],
      headerParams: [{ name: 'x', in: 'header', required: false, schema: ref('TraceId') }],
      requestBody: { contentType: 'application/json', schema: ref('PetInput'), required: true },
      successResponses: [
        {
          contentType: 'application/json',
          schema: { kind: 'array', items: ref('Pet') },
          status: 200,
        },
      ],
    });
    expect([...collectOperationRefs(op)]).toEqual([
      'PetId',
      'PetFilter',
      'TraceId',
      'PetInput',
      'Pet',
    ]);
  });

  it('walks error responses for referenced types only in result mode', () => {
    const op = operation({
      errorResponses: [{ contentType: 'application/json', schema: ref('ApiErr'), status: 200 }],
    });
    // Result mode emits the `<Op>Error` union that names the body, so it must import it.
    expect([...collectOperationRefs(op, 'result')]).toContain('ApiErr');
    // Throw mode never names the error body — importing it would trip `noUnusedLocals`.
    expect([...collectOperationRefs(op)]).not.toContain('ApiErr');
    expect([...collectOperationRefs(op, 'throw')]).not.toContain('ApiErr');
  });

  it('returns an empty set for an operation with no referenced types', () => {
    expect([...collectOperationRefs(operation())]).toEqual([]);
  });

  it('includes itemSchema refs from success responses', () => {
    const op = operation({
      successResponses: [
        {
          contentType: 'text/event-stream',
          status: 200,
          schema: { kind: 'unknown' },
          itemSchema: ref('Message'),
        },
      ],
    });
    expect([...collectOperationRefs(op)]).toContain('Message');
  });
});
