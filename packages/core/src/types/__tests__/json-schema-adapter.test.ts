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
    expect(ctx['root.newOption'].deprecatedProperties).toBeUndefined();
  });

  it('marks the types that the schema does not name', () => {
    const schema = {
      type: 'object',
      properties: {
        sso: {
          type: 'object',
          nodeTypeName: 'Sso',
          properties: { enabled: { type: 'boolean' } },
        },
        seo: { type: 'object', properties: { title: { type: 'string' } } },
        providers: {
          type: 'array',
          items: {
            type: 'object',
            discriminator: { propertyName: 'type' },
            oneOf: [
              {
                type: 'object',
                properties: { type: { type: 'string', const: 'OIDC' } },
              },
            ],
          },
        },
      },
    } as const;

    const { ctx } = getNodeTypesFromJSONSchema('root', schema);

    expect(
      Object.fromEntries(Object.entries(ctx).map(([name, type]) => [name, type.hasGeneratedName]))
    ).toEqual({
      root: true,
      Sso: false,
      'root.seo': true,
      'root.providers': true,
      OIDC: false,
    });
  });
});
