import { getNodeTypesFromJSONSchema } from '../json-schema-adapter.js';

describe('getNodeTypesFromJSONSchema', () => {
  it('records each deprecated property on the type of its parent object', () => {
    const schema = {
      type: 'object',
      properties: {
        newOption: { type: 'object', properties: { enabled: { type: 'boolean' } } },
        oldOption: {
          type: 'object',
          properties: { enabled: { type: 'boolean' } },
          deprecated: true,
          replacement: 'newOption',
        },
        oldFlag: { type: 'boolean', deprecated: true, replacement: '/settings/flag' },
        oldLogin: {
          oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
          deprecated: true,
        },
      },
    } as const;

    const { ctx } = getNodeTypesFromJSONSchema('root', schema);

    expect(ctx.root.deprecatedProperties).toEqual({
      oldOption: { replacement: 'newOption' },
      oldFlag: { replacement: '/settings/flag' },
      oldLogin: { replacement: undefined },
    });
    expect(ctx['root.newOption']).not.toHaveProperty('deprecatedProperties');
  });
});
